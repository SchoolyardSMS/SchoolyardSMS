export {};

interface PushEvent {
  data?: {
    json(): Record<string, unknown>;
  };
  waitUntil(promise: Promise<unknown>): void;
}

interface WindowClient {
  focused: boolean;
  focus(): Promise<WindowClient>;
}

interface NotificationEvent {
  notification: {
    close(): void;
    data: {
      url: string;
    };
  };
  waitUntil(promise: Promise<unknown>): void;
}

const sw = self as unknown as {
  registration: {
    showNotification(title: string, options: Record<string, unknown>): Promise<void>;
  };
  clients: {
    matchAll(options: { type: string; includeUncontrolled: boolean }): Promise<WindowClient[]>;
    openWindow(url: string): Promise<unknown>;
  };
};

sw.registration.showNotification = sw.registration?.showNotification; // Ensure exists

self.addEventListener('push', (event: unknown) => {
  const pushEvent = event as PushEvent;
  const data = pushEvent.data?.json() ?? { title: 'Schoolyard', body: 'New notification' };
  
  const options = {
    body: String(data.body || ''),
    icon: String(data.icon || '/icon-192x192.png'),
    badge: '/favicon.ico',
    data: {
      url: String(data.url || '/')
    }
  };

  pushEvent.waitUntil(sw.registration.showNotification(String(data.title || 'Schoolyard'), options));
});

self.addEventListener('notificationclick', (event: unknown) => {
  const notifEvent = event as NotificationEvent;
  notifEvent.notification.close();
  notifEvent.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList: WindowClient[]) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return sw.clients.openWindow(notifEvent.notification.data.url);
    })
  );
});
