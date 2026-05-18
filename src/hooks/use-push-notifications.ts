"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushNotifications() {
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [isSupported, setIsSupported] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true)
      checkSubscription()
    } else {
      setLoading(false)
    }
  }, [])

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()
      setSubscription(sub)
    } catch (error) {
      console.error("Error checking subscription:", error)
    } finally {
      setLoading(false)
    }
  }

  const subscribe = async () => {
    try {
      setLoading(true)
      const registration = await navigator.serviceWorker.ready
      
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
      })

      // Send to server
      const response = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: {
            endpoint: sub.endpoint,
            keys: {
              p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(sub.getKey("p256dh")!) as any)),
              auth: btoa(String.fromCharCode.apply(null, new Uint8Array(sub.getKey("auth")!) as any)),
            },
          },
        }),
      })

      if (!response.ok) throw new Error("Failed to save subscription on server")

      setSubscription(sub)
      toast.success("Push notifications enabled!")
    } catch (error: any) {
      console.error("Error subscribing to push:", error)
      toast.error("Failed to enable push notifications")
    } finally {
      setLoading(false)
    }
  }

  const unsubscribe = async () => {
    try {
      setLoading(true)
      if (subscription) {
        await fetch("/api/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        await subscription.unsubscribe()
        setSubscription(null)
        toast.success("Push notifications disabled")
      }
    } catch (error) {
      console.error("Error unsubscribing:", error)
      toast.error("Failed to disable push notifications")
    } finally {
      setLoading(false)
    }
  }

  return {
    subscription,
    isSupported,
    loading,
    subscribe,
    unsubscribe,
  }
}
