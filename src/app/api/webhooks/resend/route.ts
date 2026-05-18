import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    // Basic Webhook Security
    const token = req.nextUrl.searchParams.get("token")
    if (!process.env.RESEND_WEBHOOK_SECRET || token !== process.env.RESEND_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const emailData = body.data

    // 1. Handle Delivery Tracking Events
    if (["email.sent", "email.delivered", "email.bounced", "email.complained"].includes(body.type)) {
      const resendId = emailData?.email_id || emailData?.id
      const status = body.type.split(".")[1].toUpperCase()

      if (resendId) {
        await db.message.updateMany({
          where: { resendId },
          data: { status }
        })
      }
      return NextResponse.json({ success: true, message: `Status updated to ${status}` }, { status: 200 })
    }

    // 2. Handle Inbound Received Email
    if (body.type !== "email.received") {
      return NextResponse.json({ message: "Event not handled" }, { status: 200 })
    }

    // Extract 'from' email (e.g. "John Doe <john.doe@gmail.com>" -> "john.doe@gmail.com")
    let fromEmail = emailData.from || ""
    const fromMatch = fromEmail.match(/<(.+)>/)
    if (fromMatch) {
      fromEmail = fromMatch[1].trim().toLowerCase()
    } else {
      fromEmail = fromEmail.trim().toLowerCase()
    }

    // Extract 'to' address
    // Resend payload 'to' can be an array or string
    let toAddresses: string[] = []
    if (Array.isArray(emailData.to)) {
      toAddresses = emailData.to
    } else if (typeof emailData.to === "string") {
      toAddresses = [emailData.to]
    }

    let toEmail = toAddresses[0] || ""
    const toMatch = toEmail.match(/<(.+)>/)
    if (toMatch) {
      toEmail = toMatch[1].trim().toLowerCase()
    } else {
      toEmail = toEmail.trim().toLowerCase()
    }

    const localPart = toEmail.split("@")[0]

    // 1. Find Sender in DB
    const sender = await db.user.findUnique({
      where: { email: fromEmail }
    })

    if (!sender) {
      console.warn(`[Resend Webhook] Dropped email from unregistered sender: ${fromEmail}`)
      return NextResponse.json({ message: "Sender not registered" }, { status: 200 })
    }

    // 2. Find Receiver in DB
    let receiverId = ""
    let parentId: string | undefined = undefined
    
    // Check if the local part is a threaded recipient (msg-ID or bc-ID)
    if (localPart) {
      if (localPart.startsWith("msg-")) {
        const messageId = localPart.replace("msg-", "")
        const message = await db.message.findUnique({ where: { id: messageId } })
        if (message) {
          receiverId = message.senderId // Reply goes to the original sender
          parentId = message.parentId || message.id
        }
      } else if (localPart.startsWith("bc-")) {
        const broadcastId = localPart.replace("bc-", "")
        const broadcast = await db.broadcast.findUnique({ where: { id: broadcastId } })
        if (broadcast) {
          receiverId = broadcast.senderId
          const firstMessage = await db.message.findFirst({ where: { broadcastId } })
          if (firstMessage) parentId = firstMessage.id
        }
      } else if (localPart.startsWith("c") && localPart.length > 20) {
        // Fallback for old style CUID
        const user = await db.user.findUnique({ where: { id: localPart } })
        if (user) {
          receiverId = user.id
        }
      }
    }

    // Fallback: If no direct recipient is found, do not forward it. 
    if (!receiverId) {
      console.warn(`[Resend Webhook] Dropped unroutable email to: ${toEmail}`)
      return NextResponse.json({ message: "No valid recipient found. Email dropped." }, { status: 200 })
    }

    // 3. Threading Support (Headers & Body)
    const headers = emailData.headers || {}
    const inReplyTo = headers["In-Reply-To"] || headers["in-reply-to"]
    const emailBody = emailData.text || emailData.html || ""
    
    // First try: In-Reply-To header (if not already set by Reply-To address)
    if (!parentId && inReplyTo) {
      const resendIdMatch = inReplyTo.match(/<(.+)@resend\.dev>/) || inReplyTo.match(/<(.+)>/)
      const parentResendId = resendIdMatch ? resendIdMatch[1] : inReplyTo.replace(/[<>]/g, "")
      
      const parentMsg = await db.message.findFirst({
        where: { resendId: parentResendId }
      })
      if (parentMsg) {
        parentId = parentMsg.id
      }
    }

    // Second try: Ref: [id] in body
    if (!parentId) {
      const refMatch = emailBody.match(/Ref: \[(.+)\]/)
      if (refMatch) {
        const refId = refMatch[1]
        
        if (refId.startsWith("BC-")) {
          // Broadcast reference
          const broadcastId = refId.replace("BC-", "")
          const firstMessage = await db.message.findFirst({
            where: { broadcastId }
          })
          if (firstMessage) {
            parentId = firstMessage.id
          }
        } else {
          // Direct message reference
          const message = await db.message.findUnique({
            where: { id: refId }
          })
          if (message) {
            parentId = message.parentId || message.id
          }
        }
      }
    }

    // Third try: Custom headers
    if (!parentId) {
      const customParentId = headers["X-Schoolyard-Parent-ID"] || headers["x-schoolyard-parent-id"]
      if (customParentId) parentId = customParentId
    }

    // 4. Create Internal Message
    const incomingMessageId = headers["Message-ID"] || headers["message-id"]
    
    const cleanSubject = (s: string) => {
      return s.replace(/(\[|\()?(\*|\s)*External(\*|\s)*(\]|\))?|re:|fwd:/gi, "").trim()
    }
    const baseSubject = cleanSubject(emailData.subject || "No Subject")
    const displaySubject = emailData.subject?.toLowerCase().includes("re:") ? `Re: ${baseSubject}` : baseSubject

    await db.message.create({
      data: {
        senderId: sender.id,
        receiverId,
        subject: displaySubject,
        body: emailData.text || null,
        externalId: emailData.email_id || emailData.id,
        resendId: incomingMessageId ? incomingMessageId.replace(/[<>]/g, "") : null, // Store cleaned Message-ID
        parentId,
        read: false,
        status: "SENT"
      }
    })

    return NextResponse.json({ success: true, message: "Email integrated successfully" }, { status: 200 })
    
  } catch (error) {
    console.error("[Resend Webhook] Error processing email:", error)
    // Return 200 so Resend doesn't retry infinitely on fatal parsing errors
    return NextResponse.json({ error: "Internal Server Error" }, { status: 200 })
  }
}
