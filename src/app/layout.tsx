import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { SessionProvider } from "@/components/providers/session-provider"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { PWAInstallPrompt } from "@/components/pwa/pwa-install-prompt"
import { BottomNav } from "@/components/layout/bottom-nav"
import "./globals.css"

import { db } from "@/lib/db"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" })

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
  width: "device-width",
  initialScale: 1,
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await db.schoolSettings.findUnique({ where: { id: "singleton" } })
  return {
    title: settings?.name ? `${settings.name} | Schoolyard` : "Schoolyard SMS",
    description: settings?.tagline || "Modern, blazing-fast School Management System.",
    icons: {
      icon: settings?.faviconUrl || "/favicon.ico",
      apple: "/icon-192x192.png",
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: settings?.name || "Schoolyard",
    },
    manifest: "/manifest.webmanifest",
  }
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const settings = await db.schoolSettings.findUnique({ where: { id: "singleton" } })
  const primaryColor = settings?.primaryColor || "#4f46e5"
  const secondaryColor = settings?.secondaryColor || "#6b7280"

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              --primary: ${primaryColor};
              --school-primary: ${primaryColor};
              --sidebar-primary: ${primaryColor};
              --secondary: ${secondaryColor};
            }
            .dark {
              --primary: ${primaryColor};
              --school-primary: ${primaryColor};
              --sidebar-primary: ${primaryColor};
              --secondary: ${secondaryColor};
            }
          `
        }} />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SessionProvider>
            <div className="flex-1 flex flex-col min-h-0 pb-20 md:pb-0">
              {children}
            </div>
            <BottomNav />
            <PWAInstallPrompt />
            <Toaster position="top-center" richColors />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
