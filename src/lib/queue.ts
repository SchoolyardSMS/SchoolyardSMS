const useRedis = Boolean(process.env.REDIS_URL)

export async function enqueueBroadcast(broadcastId: string) {
  if (useRedis) {
    // Lazy require to avoid hard dependency in test environments without Redis
    const { Queue } = await import('bullmq')
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    const parsed = new URL(redisUrl)
    const queue = new Queue('broadcasts', {
      connection: {
        host: parsed.hostname,
        port: parseInt(parsed.port || '6379', 10),
        username: parsed.username || undefined,
        password: parsed.password || undefined,
      }
    })
    await queue.add('broadcast', { broadcastId })
  } else {
    // Local in-process fallback: directly import processor
    const { processBroadcast } = await import('./broadcastWorker')
    await processBroadcast(broadcastId)
  }
}

const queueService = { enqueueBroadcast }
export default queueService
