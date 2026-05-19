import webpush from 'web-push'
import { env } from './env'

const publicVapidKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const privateVapidKey = env.VAPID_PRIVATE_KEY

webpush.setVapidDetails(
  'mailto:support@schoolyard.qzz.io',
  publicVapidKey,
  privateVapidKey
)

export async function sendPushNotification(
  subscription: {
    endpoint: string
    keys: {
      p256dh: string
      auth: string
    }
  },
  payload: {
    title: string
    body: string
    icon?: string
    url?: string
  }
) {
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify(payload)
    )
    return { success: true }
  } catch (error) {
    console.error('Error sending push notification:', error)
    const err = error as { statusCode?: number; message?: string }
    if (err.statusCode === 404 || err.statusCode === 410) {
      // Subscription has expired or is no longer valid
      return { success: false, error: 'GONE' }
    }
    return { success: false, error: err.message || 'Unknown error' }
  }
}
