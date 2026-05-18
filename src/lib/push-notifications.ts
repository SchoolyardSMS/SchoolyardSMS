import webpush from 'web-push'

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const privateVapidKey = process.env.VAPID_PRIVATE_KEY!

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
  } catch (error: any) {
    console.error('Error sending push notification:', error)
    if (error.statusCode === 404 || error.statusCode === 410) {
      // Subscription has expired or is no longer valid
      return { success: false, error: 'GONE' }
    }
    return { success: false, error: error.message }
  }
}
