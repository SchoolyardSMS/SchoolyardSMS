import { db } from './db'
import { Resend } from 'resend'
import { BroadcastDelivery } from '@prisma/client'

const resend = new Resend(process.env.RESEND_API_KEY || '')

export async function processBroadcast(broadcastId: string) {
  const broadcast = await db.broadcast.findUnique({ where: { id: broadcastId } })
  if (!broadcast) throw new Error('Broadcast not found')

  // Fetch pending deliveries
  const deliveries = await db.broadcastDelivery.findMany({ where: { broadcastId, status: 'PENDING' } })
  if (deliveries.length === 0) return 0

  const batchSize = 100
  let total = 0

  for (let i = 0; i < deliveries.length; i += batchSize) {
    const chunk = deliveries.slice(i, i + batchSize)

    const batchData = chunk.map((d: BroadcastDelivery) => ({
      from: `Schoolyard SMS <messaging@${process.env.RESEND_DOMAIN || 'schoolyard.qzz.io'}>`,
      to: [ /* Will substitute recipient email later */ ],
      subject: broadcast.subject,
      text: broadcast.body
    }))

    // Resend batch requires emails; fetch recipient emails
    const recipientIds = chunk.map((c: BroadcastDelivery) => c.recipientId)
    const users = await db.user.findMany({ where: { id: { in: recipientIds } }, select: { id: true, email: true } })
    const emailById = new Map(users.map(u => [u.id, u.email]))

    const batchPayload = chunk.map((d: BroadcastDelivery) => ({
      from: `Schoolyard SMS <messaging@${process.env.RESEND_DOMAIN || 'schoolyard.qzz.io'}>`,
      to: [emailById.get(d.recipientId)!],
      subject: broadcast.subject,
      text: broadcast.body
    }))

    const result = await resend.batch.send(batchPayload)
    const responses = Array.isArray(result.data) ? result.data : (result.data as any).data

    // Update each delivery with provider id and status
    await Promise.all(chunk.map((d: BroadcastDelivery, idx: number) => {
      const providerId = responses?.[idx]?.id || null
      const status = providerId ? 'SENT' : 'FAILED'
      return db.broadcastDelivery.update({ where: { id: d.id }, data: { providerId, status } })
    }))

    total += chunk.length
  }

  return total
}

export default { processBroadcast }
