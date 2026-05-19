# Messaging & Notification Hub Scale Optimization

This document outlines the high-performance architecture powering Schoolyard's communications system, focusing on storage-efficient broadcasts, batch email deliveries, custom Progressive Web App (PWA) workers, and Web Push notifications.

---

## 🚀 1. The Scale-Optimized Broadcast Model

In traditional architectures, sending a school-wide announcement to 500 students and parents results in creating 500 individual `Message` rows in the database, leading to rapid storage bloat, index degradation, and slow query speeds.

To address this, Schoolyard implements a decoupled **Broadcast-Delivery** split schema:

```
                      ┌──────────────────────┐
                      │    Broadcast Table   │
                      │  (Title, Body, Auth) │
                      └──────────┬───────────┘
                                 │ (1-to-Many Relation)
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                     BroadcastDelivery Join Table                 │
├──────────────────────────────────────────────────────────────────┤
│  • recipientId: User.id     • channel: "email" / "sms" / "push"  │
│  • status: SENT / FAILED    • providerId: Resend-ID              │
└──────────────────────────────────────────────────────────────────┘
```

### Storage Efficiency Comparisons
* **Standard Message Approach (Bloated)**:
  * 500 recipients $\times$ 1 message copy = 500 full content rows.
  * Rapidly duplicates message bodies and title strings, bloating the primary tables.
* **Schoolyard Broadcast-Delivery Approach (Optimized)**:
  * 1 canonical `Broadcast` content row.
  * 500 lightweight `BroadcastDelivery` entries (recipient reference, channel, status flag, provider identifier).
  * Reduces table sizes by over **90%**, keeping database indices fast.

---

## ✉️ 2. Outbound Integration via Resend

To deliver broadcast emails efficiently, Schoolyard uses the **Resend** transactional email API integrated into background workers.

1. **Decoupled Job Dispatch**: When a broadcast is saved, a worker task is queued.
2. **Aggregated Audience Chunking**: The worker queries the recipient matrix and groups targets into batches of **100 recipients**.
3. **Resend Batch Send**: The system compiles the chunks and fires `resend.batch.send()`:
   ```typescript
   await resend.batch.send(
     deliveries.map(d => ({
       from: "Schoolyard <announcements@schoolyard.edu>",
       to: d.recipientEmail,
       subject: broadcast.title,
       html: broadcast.body
     }))
   )
   ```
4. **Immediate Webhook Resolution**: External provider IDs are saved back to `BroadcastDelivery`. Resend invokes our secure webhook endpoint (`/api/webhooks/resend`) to notify the application of delivery outcomes (e.g. `DELIVERED`, `BOUNCED`), allowing administrators to audit deliverability in real time.

---

## 📲 3. Progressive Web App (PWA) & Custom Service Workers

Schoolyard is a fully compliant **Progressive Web App (PWA)** that can be installed on Android and iOS devices, providing native-like experiences.

### The Service Worker (`worker/index.ts`)
* **Caching Strategy**: Extends `@ducanh2912/next-pwa` with a custom service worker implementation. It uses a **Stale-While-Revalidate** caching strategy for static pages and static assets, allowing rapid, sub-10ms offline page loads.
* **Offline Fallbacks**: Automatically intercepts failed network fetches and serves offline-optimized fallback layouts if the device loses connection.
* **Push Event Receiver**: Registers the browser runtime `push` event handler. When the device receives a Web Push payload from our server, the worker wakes up and triggers a native system notification:
  ```typescript
  self.addEventListener('push', (event) => {
    const data = event.data?.json() ?? {}
    event.waitUntil(
      self.registration.showNotification(data.title ?? "Schoolyard Update", {
        body: data.body ?? "You have a new update.",
        icon: "/icons/icon-192x192.png",
        badge: "/icons/badge-72x72.png",
        data: { url: data.url ?? "/dashboard" }
      })
    )
  })
```

---

## 🔑 4. Web Push Notification & VAPID Key Setup

Schoolyard uses standard **Web Push protocol** specifications to send real-time push alerts directly to browser clients.

### Encryption Keys (VAPID)
Web Push notifications require cryptographic verification. Schoolyard uses **VAPID Keys** (Voluntary Application Server Identification) to sign payloads securely:
* **`NEXT_PUBLIC_VAPID_PUBLIC_KEY`**: Exposed to client components to generate a secure device push subscription with the browser's push service (e.g. Apple Push Notification service, Google Cloud Messaging).
* **`VAPID_PRIVATE_KEY`**: Stored securely on the server to encrypt and sign push payloads before sending them.

### Custom PWA Installation Prompt Hook
iOS Safari and Android browsers handle PWA installations differently. Schoolyard implements an elegant, custom **`PWAInstallPrompt`** hook to guide users through the installation process:

1. **Android & Chrome standard intercepts**: Listens for the browser `beforeinstallprompt` event, intercepts the default installer banner, saves the `deferredPrompt` state event, and displays our premium, custom UI prompt.
2. **iOS Safari Detection**: iOS doesn't support the native prompt event. The hook detects user agents for iOS devices, determines if the browser is running standalone, and displays a step-by-step installation helper instructing the user to:
   * **Step 1**: Tap the Safari **Share** icon in the browser bar.
   * **Step 2**: Scroll down and select **"Add to Home Screen"**.
3. **Hydration Syncing**: All synchronous mount state changes are wrapped inside `requestAnimationFrame` frames to avoid hydration conflicts during Next.js initial mounts.
