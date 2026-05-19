const useRedis = Boolean(process.env.REDIS_URL)

export async function enqueueBroadcast(broadcastId: string) {
  if (useRedis) {
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

export async function enqueueBulkUpload(csvContent: string) {
  if (useRedis) {
    const { Queue } = await import('bullmq')
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    const parsed = new URL(redisUrl)
    const queue = new Queue('bulk-uploads', {
      connection: {
        host: parsed.hostname,
        port: parseInt(parsed.port || '6379', 10),
        username: parsed.username || undefined,
        password: parsed.password || undefined,
      }
    })
    await queue.add('bulk-upload', { csvContent })
  } else {
    // Local in-process fallback: directly process asynchronously to avoid blocking the HTTP thread
    const { processBulkUpload } = await import('./bulkUploadWorker')
    processBulkUpload(csvContent).catch((err) => {
      console.error('Failed to run in-process background bulk upload:', err)
    })
  }
}

const queueService = { enqueueBroadcast, enqueueBulkUpload }
export default queueService
