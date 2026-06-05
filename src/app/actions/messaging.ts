"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"
import { assertRole } from "@/lib/rbac"
import { Resend } from "resend"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { resolveAudienceRecipients } from "@/lib/messaging-utils"
import { enqueueBroadcast } from "@/lib/queue"

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * DIRECT MESSAGING
 */
export async function sendMessage(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error("Unauthorized")
  const receiverId = String(formData.get("receiverId") || "")
  const subject = String(formData.get("subject") || "")
  const body = String(formData.get("body") || "")
  const parentId = formData.get("parentId") ? String(formData.get("parentId")) : undefined

  const schema = z.object({ receiverId: z.string().min(1), subject: z.string().min(1), body: z.string().min(1), parentId: z.string().optional() })
  schema.parse({ receiverId, subject, body, parentId })

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
  assertRole(session, ["ADMIN", "TEACHER"])
  if (!session) throw new Error("Unauthorized")

  const subject = String(formData.get("subject") || "")
  const content = String(formData.get("content") || "")
  const audience = String(formData.get("audience") || "")
  const schema = z.object({ subject: z.string().min(1), content: z.string().min(1), audience: z.string().min(1) })
  schema.parse({ subject, content, audience })

  const recipients = await resolveAudienceRecipients(audience)

  if (recipients.length === 0) {
    throw new Error("No recipients found for the selected audience.")
  }

    try {
      const broadcast = await db.broadcast.create({
        data: {
          subject: `[School Announcement] ${subject}`,
          body: content,
          audience,
          senderId: session.user!.id
        }
      })

      // Pre-create deliveries as PENDING and enqueue a background job to process them
      const deliveryRecords = recipients.map(r => ({
        broadcastId: broadcast.id,
        recipientId: r.id,
        channel: 'email',
        status: 'PENDING'
      }))

      await db.broadcastDelivery.createMany({ data: deliveryRecords })

      // Enqueue background processing
      await enqueueBroadcast(broadcast.id)

      revalidatePath("/dashboard/messages")
      return { success: true, queued: true }
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
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new Error("Unauthorized")
  }
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
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new Error("Unauthorized")
  }
  if (recipients.length === 0) return 0

  const sender = await db.user.findUnique({ where: { id: senderId } })
  const fromEmail = `${sender?.name || 'Schoolyard'} <messaging@${process.env.RESEND_DOMAIN || 'schoolyard.qzz.io'}>`

  const batchSize = 100

  const chunkCount = Math.ceil(recipients.length / batchSize)
  const chunkPromises = Array.from({ length: chunkCount }).map(async (_, chunkIndex) => {
    const chunk = recipients.slice(chunkIndex * batchSize, (chunkIndex + 1) * batchSize)
    
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
        return chunk.length
      }
    }
    return 0
  })

  const results = await Promise.all(chunkPromises)
  const totalSent = results.reduce((sum, count) => sum + count, 0)

  return totalSent
}
