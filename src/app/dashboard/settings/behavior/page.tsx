import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { BehaviorSettingsClient } from "./behavior-client"

export const metadata = { title: "Behavior & Rules | Schoolyard Settings" }

export default async function BehaviorSettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard")

  const settings = await db.schoolSettings.findUnique({ where: { id: "singleton" } })

  const defaultIncidentTypes = `[
  {"id": "TARDY", "label": "Tardiness", "severity": "MINOR"},
  {"id": "DISRUPTIVE", "label": "Disruptive Behavior", "severity": "MINOR"},
  {"id": "FIGHTING", "label": "Fighting", "severity": "MAJOR"},
  {"id": "SUBSTANCE", "label": "Substance Violation", "severity": "CRITICAL"}
]`

  const defaultAttendanceStatuses = `[
  {"id": "PRESENT", "label": "Present", "isExcused": true, "countsAbsent": false},
  {"id": "ABSENT", "label": "Absent", "isExcused": false, "countsAbsent": true},
  {"id": "EXCUSED", "label": "Excused Absence", "isExcused": true, "countsAbsent": false},
  {"id": "TARDY", "label": "Tardy", "isExcused": false, "countsAbsent": false}
]`

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Behavior & Rules</h2>
        <p className="text-sm text-slate-500 mt-1">Configure attendance rules and discipline severity codes.</p>
      </div>

      <BehaviorSettingsClient
        attendanceThreshold={settings?.attendanceThreshold ?? 5}
        incidentTypesJson={settings?.incidentTypes ? JSON.stringify(settings.incidentTypes, null, 2) : defaultIncidentTypes}
        attendanceStatusesJson={settings?.attendanceStatuses ? JSON.stringify(settings.attendanceStatuses, null, 2) : defaultAttendanceStatuses}
      />
    </div>
  )
}

