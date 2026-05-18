import { MetadataRoute } from 'next'
import { db } from "@/lib/db"

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let settings = null;
  try {
    settings = await db.schoolSettings.findUnique({ where: { id: "singleton" } })
  } catch (e) {
    console.error("Failed to load school settings for manifest", e);
  }

  const pwaIcon = "/icon-512x512.png"

  return {
    name: settings?.name ? `${settings.name} | Schoolyard` : 'Schoolyard SMS',
    short_name: settings?.name || 'Schoolyard',
    description: settings?.tagline || 'Modern, blazing-fast School Management System.',
    start_url: '/?source=pwa',
    id: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#ffffff',
    theme_color: '#09090b',
    categories: ['education', 'productivity'],
    icons: [
      {
        src: pwaIcon,
        sizes: 'any',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: pwaIcon,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: pwaIcon,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      }
    ],
    shortcuts: [
      {
        name: 'Assignments',
        url: '/dashboard/academics/assignments',
        description: 'View upcoming assignments and grades',
        icons: [{ src: pwaIcon, sizes: '192x192' }]
      },
      {
        name: 'Directory',
        url: '/dashboard/directory',
        description: 'Search for students and staff',
        icons: [{ src: pwaIcon, sizes: '192x192' }]
      },
      {
        name: 'Schedule',
        url: '/dashboard/schedule',
        description: 'View your daily class schedule',
        icons: [{ src: pwaIcon, sizes: '192x192' }]
      },
      {
        name: 'Messages',
        url: '/dashboard/messages',
        description: 'Check your inbox and send messages',
        icons: [{ src: pwaIcon, sizes: '192x192' }]
      }
    ],
  }
}
