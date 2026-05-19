const useRedis = Boolean(process.env.REDIS_URL)

export async function enqueueBroadcast(broadcastId: string) {
  if (useRedis) {
    // Lazy require to avoid hard dependency in test environments without Redis
    const { Queue } = require('bullmq')
    const queue = new Queue('broadcasts', { connection: { url: process.env.REDIS_URL } })
    await queue.add('broadcast', { broadcastId })
  } else {
    // Local in-process fallback: directly import processor
    const { processBroadcast } = await import('./broadcastWorker')
    await processBroadcast(broadcastId)
  }
}

export default { enqueueBroadcast }
