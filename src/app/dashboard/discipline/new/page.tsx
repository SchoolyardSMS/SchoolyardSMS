import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { createIncident } from "@/app/actions/discipline"
import Link from "next/link"

export const metadata = { title: "Log Incident | Schoolyard" }

export default async function NewIncidentPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== "ADMIN" && session.user?.role !== "TEACHER")) {
    redirect("/dashboard/discipline")
  }

  const students = await db.student.findMany({
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  })

  const todayStr = new Date().toISOString().split("T")[0]

  return (
    <div className="flex-1 p-8 pt-6 max-w-2xl space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Log New Incident</h2>
        <p className="text-muted-foreground mt-1">Document a student behavioral or academic incident.</p>
      </div>

      <form action={createIncident} className="space-y-6">
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">

          {/* Student + Date side-by-side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="incident-student-select" className="text-sm font-medium">Student <span className="text-red-500">*</span></label>
              <select id="incident-student-select" name="studentId" required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">– Select student –</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.user.name} (Grade {s.gradeLevel})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="incident-date" className="text-sm font-medium">Incident Date <span className="text-red-500">*</span></label>
              <input id="incident-date" type="date" name="date" defaultValue={todayStr} required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label htmlFor="incident-title" className="text-sm font-medium">Incident Title <span className="text-red-500">*</span></label>
            <input id="incident-title" name="title" type="text" required placeholder="Brief summary of the incident"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Category + Severity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="incident-category" className="text-sm font-medium">Category <span className="text-red-500">*</span></label>
              <select id="incident-category" name="category" required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="BEHAVIOR">Behavior</option>
                <option value="ACADEMIC_DISHONESTY">Academic Dishonesty</option>
                <option value="ATTENDANCE">Attendance</option>
                <option value="BULLYING">Bullying</option>
                <option value="PROPERTY_DAMAGE">Property Damage</option>
                <option value="SAFETY">Safety</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="incident-severity" className="text-sm font-medium">Severity <span className="text-red-500">*</span></label>
              <select id="incident-severity" name="severity" required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="MINOR">Minor</option>
                <option value="MODERATE">Moderate</option>
                <option value="SEVERE">Severe</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="incident-description" className="text-sm font-medium">Incident Description <span className="text-red-500">*</span></label>
            <textarea id="incident-description" name="description" rows={5} required
              placeholder="Provide a detailed, factual account of what occurred — who was involved, where it happened, what was witnessed..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Divider */}
          <div className="border-t border-border pt-4 space-y-5">
            {/* Action Taken */}
            <div className="space-y-2">
              <label htmlFor="incident-action" className="text-sm font-medium">Immediate Action Taken</label>
              <textarea id="incident-action" name="actionTaken" rows={3}
                placeholder="e.g. Student sent to principal's office, parent notified by phone, verbal warning issued..."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            {/* Follow-up date */}
            <div className="space-y-2">
              <label htmlFor="incident-followup" className="text-sm font-medium">Follow-up Date</label>
              <input id="incident-followup" type="date" name="followUpDate"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground">Schedule a date to check in or close the incident.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit"
            className="inline-flex h-10 items-center justify-center rounded-md px-6 text-sm font-semibold text-white transition-colors"
            style={{ background: "var(--school-primary, #4f46e5)" }}
          >
            File Incident Report
          </button>
          <Link href="/dashboard/discipline"
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-6 text-sm font-medium hover:bg-accent transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
