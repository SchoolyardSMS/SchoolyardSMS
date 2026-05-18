import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { db } from "@/lib/db"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")

  let schoolName    = "Schoolyard"
  let schoolInitials = "S"
  let primaryColor  = "#4f46e5"
  let secondaryColor = "#6b7280"
  let logoUrl       = undefined

  let featuresEnabled: any = { lms: true, discipline: true, community: true }

  try {
    const settings = await db.schoolSettings.findUnique({ where: { id: "singleton" } })
    if (settings) {
      if (settings.name)           schoolName     = settings.name
      if (settings.initials)       schoolInitials = settings.initials
      if (settings.primaryColor)   primaryColor   = settings.primaryColor
      if (settings.secondaryColor) secondaryColor = settings.secondaryColor
      if (settings.logoUrl)        logoUrl        = settings.logoUrl
      if (settings.featuresEnabled) featuresEnabled = settings.featuresEnabled
    }
  } catch { /* fallback */ }

  // Derive a dark-mode-safe version of the school colors by lightening slightly
  // We inject them as CSS custom properties so any component can use them

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-background">
      {/* Inject school color CSS custom properties globally for this layout tree */}
      <style>{`
        :root {
          --school-primary: ${primaryColor};
          --school-secondary: ${secondaryColor};
        }
        .dark {
          --school-primary: ${primaryColor};
          --school-secondary: ${secondaryColor};
        }
      `}</style>

      <Sidebar
        user={{
          name:  session.user.name  ?? "User",
          email: session.user.email ?? "",
          role:  session.user.role  ?? "STUDENT",
        }}
        schoolName={schoolName}
        initials={schoolInitials}
        logoUrl={logoUrl}
        featuresEnabled={featuresEnabled}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
