export {};

// Use self directly as it is already declared in the webworker lib

self.addEventListener('push', (event: any) => {
  const data = event.data?.json() ?? { title: 'Schoolyard', body: 'New notification' }
  
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192x192.png',
    badge: '/favicon.ico',
    data: {
      url: data.url || '/'
    }
  }

  event.waitUntil((self as any).registration.showNotification(data.title, options))
})

self.addEventListener('notificationclick', (event: any) => {
  event.notification.close()
  event.waitUntil(
    (self as any).clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList: any) => {
      if (clientList.length > 0) {
        let client = clientList[0]
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i]
          }
        }
        return client.focus()
      }
      return (self as any).clients.openWindow(event.notification.data.url)
    })
  )
})
