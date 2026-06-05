import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { updateIncidentStatus } from "@/app/actions/discipline"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { toDateInputValue, formatDate } from "@/lib/dates"

export const metadata = { title: "Edit Incident | Schoolyard" }

export default async function EditIncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== "ADMIN" && session.user?.role !== "TEACHER")) {
    redirect("/dashboard/discipline")
  }

  const { id } = await params
  const incident = await db.incident.findUnique({
    where: { id },
    include: { student: { include: { user: true } } },
  })

  if (!incident) return notFound()

  return (
    <div className="flex-1 p-8 pt-6 max-w-2xl space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Edit Incident Report</h2>
        <p className="text-muted-foreground mt-1">Update status and actions taken for {incident.student.user.name}.</p>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
        <div className="space-y-1">
          <p className="text-sm font-semibold">Incident: {incident.title}</p>
          <p className="text-xs text-muted-foreground">{formatDate(incident.date)} · {incident.severity} severity</p>
        </div>

        <form action={updateIncidentStatus} className="space-y-5">
          <input type="hidden" name="id" value={incident.id} />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="edit-incident-status" className="text-sm font-medium">Status</label>
              <select id="edit-incident-status" name="status" defaultValue={incident.status}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="OPEN">Open</option>
                <option value="UNDER_INVESTIGATION">Under Investigation</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-incident-followup" className="text-sm font-medium">Follow-up Date</label>
              <input id="edit-incident-followup" type="date" name="followUpDate"
                defaultValue={toDateInputValue(incident.followUpDate)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-incident-action" className="text-sm font-medium">Action Taken</label>
            <textarea id="edit-incident-action" name="actionTaken" rows={5} defaultValue={incident.actionTaken ?? ""}
              placeholder="Describe what steps have been taken to address the situation..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" style={{ background: "var(--school-primary, #4f46e5)" }} className="text-white">
              Save Changes
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/dashboard/discipline/${incident.id}`}>Cancel</Link>
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
