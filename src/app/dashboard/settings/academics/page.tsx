import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AcademicSettingsClient } from "./academics-client"

export const metadata = { title: "Academic Standards | Schoolyard Settings" }

export default async function AcademicSettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard")

  const settings = await db.schoolSettings.findUnique({ where: { id: "singleton" } })

  const defaultGradingScale = `[
  {"letter": "A",  "min": 93},
  {"letter": "A-", "min": 90},
  {"letter": "B+", "min": 87},
  {"letter": "B",  "min": 83},
  {"letter": "B-", "min": 80},
  {"letter": "C+", "min": 77},
  {"letter": "C",  "min": 73},
  {"letter": "C-", "min": 70},
  {"letter": "D",  "min": 60},
  {"letter": "F",  "min": 0}
]`

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Academic Standards</h2>
        <p className="text-sm text-slate-500 mt-1">Configure global terms, minimum passing grades, and GPA formulas.</p>
      </div>

      <AcademicSettingsClient
        activeTerm={settings?.activeTerm ?? "Fall 2025"}
        passingGrade={settings?.passingGrade ?? 65}
        gpaScale={settings?.gpaScale?.toString() ?? "4.0"}
        gradingScaleJson={settings?.gradingScale ? JSON.stringify(settings.gradingScale, null, 2) : defaultGradingScale}
      />
    </div>
  )
}

