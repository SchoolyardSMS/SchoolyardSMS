"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { Resend } from "resend"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { resolveAudienceRecipients } from "@/lib/messaging-utils"

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * DIRECT MESSAGING
 */
export async function sendMessage(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error("Unauthorized")

  const receiverId = formData.get("receiverId") as string
  const subject = formData.get("subject") as string
  const body = formData.get("body") as string
  const parentId = formData.get("parentId") as string || undefined

  if (!receiverId || !subject || !body) throw new Error("Missing required fields")

  const receiver = await db.user.findUnique({ where: { id: receiverId } })
  if (!receiver || !receiver.email) throw new Error("Recipient has no email address")

  const fromEmail = `${session.user.name} <messaging@${process.env.RESEND_DOMAIN || 'schoolyard.qzz.io'}>`

  // 1. Save to DB first to get ID
  const newMessage = await db.message.create({
    data: {
      senderId: session.user.id,
      receiverId,
      subject,
      body,
      parentId,
      status: "PENDING"
    }
  })

  const bodyWithRef = `${body}\n\n---\nRef: [${newMessage.id}]`

  // 2. Send via Resend
  let resendId: string | undefined
  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [receiver.email],
      replyTo: `msg-${newMessage.id}@${process.env.RESEND_DOMAIN || 'schoolyard.qzz.io'}`,
      subject: subject,
      text: bodyWithRef,
      headers: {
        'X-Schoolyard-Message-ID': newMessage.id,
        'X-Schoolyard-Parent-ID': parentId || newMessage.id,
        'List-Unsubscribe': `<mailto:unsubscribe@${process.env.RESEND_DOMAIN || 'schoolyard.qzz.io'}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'Precedence': 'bulk'
      }
    })
    
    if (data) resendId = data.id
    if (error) console.error("Resend Send Error:", error)
  } catch (err) {
    console.error("Failed to send email via Resend:", err)
  }

  // 3. Update status and resendId
  await db.message.update({
    where: { id: newMessage.id },
    data: {
      resendId,
      status: resendId ? "SENT" : "FAILED"
    }
  })

  revalidatePath("/dashboard/messages")
  redirect("/dashboard/messages?sent=1")
}

export async function replyToMessage(parentMessageId: string, content: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error("Unauthorized")

  const parentMessage = await db.message.findUnique({
    where: { id: parentMessageId },
    include: { sender: true, receiver: true }
  })

  if (!parentMessage) throw new Error("Message not found")

  const receiverId = parentMessage.senderId === session.user.id ? parentMessage.receiverId : parentMessage.senderId
  const receiver = await db.user.findUnique({ where: { id: receiverId } })
  
  if (!receiver?.email) throw new Error("Receiver has no email address")

  const fromEmail = `${session.user.name} <messaging@${process.env.RESEND_DOMAIN || 'schoolyard.qzz.io'}>`
  // Clean subject: remove "Re:", "Fwd:", and "[*External*]" tags
  const cleanSubject = (s: string) => {
    return s.replace(/(\[|\()?(\*|\s)*External(\*|\s)*(\]|\))?|re:|fwd:/gi, "").trim()
  }
  
  const baseSubject = cleanSubject(parentMessage.subject)
  const subject = `Re: ${baseSubject}`

  const newMessage = await db.message.create({
    data: {
      senderId: session.user.id,
      receiverId,
      subject,
      body: content,
      parentId: parentMessageId,
      status: "PENDING"
    }
  })

  const bodyWithRef = `${content}\n\n---\nRef: [${newMessage.id}]`

  const emailPayload: any = {
    from: fromEmail,
    to: receiver.email,
    subject,
    replyTo: `msg-${newMessage.id}@${process.env.RESEND_DOMAIN || 'schoolyard.qzz.io'}`,
    text: bodyWithRef,
  }

  if (parentMessage.resendId) {
    // Try to find the root of the thread for better Gmail grouping
    let rootMessage = parentMessage
    let current = parentMessage
    while (current.parentId) {
      const parent = await db.message.findUnique({ 
        where: { id: current.parentId },
        select: { id: true, parentId: true, resendId: true }
      })
      if (!parent) break
      rootMessage = parent as any
      current = parent as any
    }

    // Resend/AWS SES uses @email.amazonses.com for its own IDs
    const parentIdRef = parentMessage.resendId.includes("@") 
      ? parentMessage.resendId 
      : `${parentMessage.resendId}@email.amazonses.com`
    
    const rootIdRef = rootMessage.resendId && rootMessage.resendId.includes("@")
      ? rootMessage.resendId
      : rootMessage.resendId ? `${rootMessage.resendId}@email.amazonses.com` : parentIdRef

    emailPayload.headers = {
      "In-Reply-To": `<${parentIdRef}>`,
      "References": `<${rootIdRef}> <${parentIdRef}>`,
      "X-Schoolyard-Message-ID": newMessage.id,
      "X-Schoolyard-Parent-ID": parentMessageId,
      "X-Schoolyard-Root-ID": rootMessage.id
    }
  }

  const result = await resend.emails.send(emailPayload)
  
  if (result.data) {
    await db.message.update({
      where: { id: newMessage.id },
      data: { 
        resendId: result.data.id,
        status: "SENT" 
      }
    })
  }

  revalidatePath("/dashboard/messages")
  return { success: true }
}

/**
 * BROADCAST MESSAGING (School Announcements)
 */
export async function sendSchoolMessage(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== "ADMIN" && session.user?.role !== "TEACHER")) {
    throw new Error("Unauthorized to send school-wide messages.")
  }

  const subject = formData.get("subject") as string
  const content = formData.get("content") as string
  const audience = formData.get("audience") as string 

  if (!subject || !content || !audience) {
    throw new Error("Missing required fields for messaging.")
  }

  const recipients = await resolveAudienceRecipients(audience)

  if (recipients.length === 0) {
    throw new Error("No recipients found for the selected audience.")
  }

  try {
    const fromEmail = `Schoolyard SMS <messaging@${process.env.RESEND_DOMAIN || 'schoolyard.qzz.io'}>`
    
    const broadcast = await db.broadcast.create({
      data: {
        subject: `[School Announcement] ${subject}`,
        body: content,
        audience,
        senderId: session.user.id
      }
    })

    const batchSize = 100
    let totalSent = 0
    
    for (let i = 0; i < recipients.length; i += batchSize) {
      const chunk = recipients.slice(i, i + batchSize)
      const bodyWithRef = `${content}\n\n---\nRef: [BC-${broadcast.id}]`

      const batchData = chunk.map(r => ({
        from: fromEmail,
        to: r.email,
        subject: `[School Announcement] ${subject}`,
        replyTo: `bc-${broadcast.id}@${process.env.RESEND_DOMAIN || 'schoolyard.qzz.io'}`,
        text: bodyWithRef,
        html: `
          <div style="font-family: sans-serif; padding: 20px; background: #f9fafb;">
            <div style="max-w: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px;">
              <h2 style="color: #4f46e5;">${subject}</h2>
              <p style="white-space: pre-wrap;">${content}</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="font-size: 10px; color: #9ca3af;">Ref: [BC-${broadcast.id}]</p>
            </div>
          </div>
        `,
        headers: {
          'X-Schoolyard-Broadcast-ID': broadcast.id,
          'Precedence': 'bulk'
        }
      }))

      const result = await resend.batch.send(batchData)
      
      if (result.data) {
        const responses = Array.isArray(result.data) ? result.data : (result.data as any).data;
        const messageRecords = chunk.map((r, idx) => ({
          senderId: session.user.id,
          receiverId: r.id,
          subject: subject,
          broadcastId: broadcast.id,
          body: null,
          resendId: responses?.[idx]?.id || null,
          status: responses?.[idx]?.id ? "SENT" : "FAILED"
        }))

        await db.message.createMany({ data: messageRecords })
        totalSent += chunk.length
      }
    }

    revalidatePath("/dashboard/messages")
    return { success: true, count: totalSent }
  } catch (error: any) {
    throw new Error(error.message || "Failed to send broadcast.")
  }
}

export async function markAsRead(messageId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error("Unauthorized")

  await db.message.update({
    where: { id: messageId, receiverId: session.user.id },
    data: { read: true }
  })

  revalidatePath("/dashboard/messages")
}

export async function sendSystemMessage(senderId: string, receiverId: string, subject: string, body: string) {
  const receiver = await db.user.findUnique({ where: { id: receiverId } })
  if (!receiver?.email) return null

  const sender = await db.user.findUnique({ where: { id: senderId } })
  const fromEmail = `${sender?.name || 'Schoolyard'} <messaging@${process.env.RESEND_DOMAIN || 'schoolyard.qzz.io'}>`

  const newMessage = await db.message.create({
    data: {
      senderId,
      receiverId,
      subject,
      body,
      status: "PENDING"
    }
  })

  const bodyWithRef = `${body}\n\n---\nRef: [${newMessage.id}]`

  try {
    const { data } = await resend.emails.send({
      from: fromEmail,
      to: [receiver.email],
      replyTo: `msg-${newMessage.id}@${process.env.RESEND_DOMAIN || 'schoolyard.qzz.io'}`,
      subject: subject,
      text: bodyWithRef,
    })
    
    if (data) {
      await db.message.update({
        where: { id: newMessage.id },
        data: { resendId: data.id, status: "SENT" }
      })
    }
  } catch (err) {
    console.error("System message send failed:", err)
  }

  return newMessage
}

export async function sendSystemBatchMessages(senderId: string, recipients: { userId: string, email: string, name: string }[], subject: string, getBody: (name: string) => string) {
  if (recipients.length === 0) return 0

  const sender = await db.user.findUnique({ where: { id: senderId } })
  const fromEmail = `${sender?.name || 'Schoolyard'} <messaging@${process.env.RESEND_DOMAIN || 'schoolyard.qzz.io'}>`

  const batchSize = 100
  let totalSent = 0

  for (let i = 0; i < recipients.length; i += batchSize) {
    const chunk = recipients.slice(i, i + batchSize)
    
    // Create DB records first to get IDs for replyTo
    const messagePromises = chunk.map(r => db.message.create({
      data: {
        senderId,
        receiverId: r.userId,
        subject,
        body: getBody(r.name),
        status: "PENDING"
      }
    }))
    const dbMessages = await Promise.all(messagePromises)

    const batchData = chunk.map((r, idx) => {
      const msg = dbMessages[idx]
      const bodyWithRef = `${msg.body}\n\n---\nRef: [${msg.id}]`
      return {
        from: fromEmail,
        to: r.email,
        subject,
        replyTo: `msg-${msg.id}@${process.env.RESEND_DOMAIN || 'schoolyard.qzz.io'}`,
        text: bodyWithRef,
      }
    })

    const result = await resend.batch.send(batchData)
    
    if (result.data) {
      const responses = Array.isArray(result.data) ? result.data : (result.data as any).data;
      if (Array.isArray(responses)) {
        const updatePromises = responses.map((res: any, idx: number) => {
          if (!res?.id) return Promise.resolve()
          return db.message.update({
            where: { id: dbMessages[idx].id },
            data: { resendId: res.id, status: "SENT" }
          })
        })
        await Promise.all(updatePromises)
        totalSent += chunk.length
      }
    }
  }

  return totalSent
}
