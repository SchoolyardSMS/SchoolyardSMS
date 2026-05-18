import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { FeaturesSettingsClient } from "./features-client"

export const metadata = { title: "Features & Modules | Schoolyard Settings" }

export default async function FeaturesSettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard")

  const settings = await db.schoolSettings.findUnique({ where: { id: "singleton" } })

  const defaultFeatures = { lms: true, discipline: true, community: true }
  const features = settings?.featuresEnabled ? (settings.featuresEnabled as any) : defaultFeatures

  const defaultRolePermissions = `{
  "STUDENT": ["view_grades", "view_assignments", "submit_assignments"],
  "TEACHER": ["edit_grades", "create_assignments", "view_roster", "take_attendance"],
  "PARENT": ["view_grades", "view_attendance", "view_report_cards"],
  "ADMIN": ["all"]
}`

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Features & Modules</h2>
        <p className="text-sm text-slate-500 mt-1">Enable or disable major platforms within Schoolyard.</p>
      </div>

      <FeaturesSettingsClient
        features={features}
        rolePermissionsJson={settings?.rolePermissions ? JSON.stringify(settings.rolePermissions, null, 2) : defaultRolePermissions}
      />
    </div>
  )
}

