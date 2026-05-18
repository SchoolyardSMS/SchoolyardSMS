import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { updateIncidentStatus, addIncidentComment } from "@/app/actions/discipline"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AlertTriangle, Calendar, Clock, MessageSquare, User } from "lucide-react"

export const metadata = { title: "Incident Detail | Schoolyard" }

const categoryLabel: Record<string, string> = {
  BEHAVIOR:            "Behavior",
  ACADEMIC_DISHONESTY: "Academic Dishonesty",
  ATTENDANCE:          "Attendance",
  BULLYING:            "Bullying",
  PROPERTY_DAMAGE:     "Property Damage",
  SAFETY:              "Safety",
  OTHER:               "Other",
}

const statusConfig: Record<string, { label: string; color: string }> = {
  OPEN:                { label: "Open",               color: "bg-sky-500/15 text-sky-600 border-sky-500/30" },
  UNDER_INVESTIGATION: { label: "Under Investigation", color: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  RESOLVED:            { label: "Resolved",           color: "bg-green-500/15 text-green-700 border-green-500/30" },
  CLOSED:              { label: "Closed",             color: "bg-slate-400/15 text-slate-500 border-slate-400/30" },
}

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const { id } = await params
  const isStaff = session.user?.role === "ADMIN" || session.user?.role === "TEACHER"

  const incident = await db.incident.findUnique({
    where: { id },
    include: {
      student: { include: { user: true } },
      reporter: true,
      comments: {
        include: { author: true },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!incident) return notFound()

  // Students can only see their own incidents
  if (!isStaff) {
    const student = await db.student.findUnique({ where: { userId: session.user?.id } })
    if (!student || student.id !== incident.studentId) redirect("/dashboard/discipline")
  }

  const sev = incident.severity
  const sta = statusConfig[incident.status]

  return (
    <div className="flex-1 p-8 pt-6 max-w-3xl space-y-6">
      {/* Back */}
      <Button variant="outline" size="sm" asChild>
        <Link href="/dashboard/discipline">← Back to Incident Log</Link>
      </Button>

      {/* Header card */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`rounded-lg p-2 mt-0.5 ${
              sev === "SEVERE" ? "bg-red-100 dark:bg-red-900/30" :
              sev === "MODERATE" ? "bg-orange-100 dark:bg-orange-900/30" :
              "bg-slate-100 dark:bg-slate-800"
            }`}>
              <AlertTriangle className={`h-5 w-5 ${
                sev === "SEVERE" ? "text-red-600" :
                sev === "MODERATE" ? "text-orange-500" : "text-slate-500"
              }`} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{incident.title}</h2>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${sta.color}`}>
                  {sta.label}
                </span>
                <Badge variant={sev === "SEVERE" ? "destructive" : sev === "MODERATE" ? "default" : "secondary"}
                  className={sev === "MODERATE" ? "bg-orange-500 text-white border-transparent" : ""}>
                  {sev.charAt(0) + sev.slice(1).toLowerCase()} Severity
                </Badge>
                <span className="inline-flex items-center rounded-full bg-muted border px-2.5 py-0.5 text-xs font-medium">
                  {categoryLabel[incident.category]}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t border-border text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            <span><span className="font-medium text-foreground">{incident.student.user.name}</span> (Grade {incident.student.gradeLevel})</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{new Date(incident.date).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" })}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Reported by <span className="font-medium text-foreground">{incident.reporter.name}</span></span>
          </div>
        </div>

        {/* Description */}
        <div className="pt-2 space-y-1">
          <p className="text-sm font-semibold">Incident Description</p>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{incident.description}</p>
        </div>

        {/* Action taken */}
        {incident.actionTaken && (
          <div className="pt-2 space-y-1 rounded-lg bg-muted/40 p-4">
            <p className="text-sm font-semibold">Action Taken</p>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{incident.actionTaken}</p>
          </div>
        )}

        {/* Follow-up */}
        {incident.followUpDate && (
          <p className="text-sm text-muted-foreground">
            📅 Follow-up scheduled:{" "}
            <span className="font-medium text-foreground">
              {new Date(incident.followUpDate).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" })}
            </span>
          </p>
        )}
      </div>

      {/* Update Status (staff only) */}
      {isStaff && (
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h3 className="font-semibold text-base">Update Incident</h3>
          <form action={updateIncidentStatus} className="space-y-4">
            <input type="hidden" name="id" value={incident.id} />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select name="status" defaultValue={incident.status}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="OPEN">Open</option>
                  <option value="UNDER_INVESTIGATION">Under Investigation</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Follow-up Date</label>
                <input type="date" name="followUpDate"
                  defaultValue={incident.followUpDate ? new Date(incident.followUpDate).toISOString().split("T")[0] : ""}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Action Taken / Notes</label>
              <textarea name="actionTaken" rows={3}
                defaultValue={incident.actionTaken ?? ""}
                placeholder="Describe actions taken, consequences assigned, parent communication..."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            <Button type="submit" style={{ background: "var(--school-primary,#4f46e5)" }} className="text-white">
              Save Changes
            </Button>
          </form>
        </div>
      )}

      {/* Timeline / Comments */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold text-base">Investigation Timeline</h3>
        </div>

        <div className="space-y-4">
          {/* Original log entry */}
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                {incident.reporter.name.charAt(0)}
              </div>
              <div className="w-px flex-1 bg-border mt-2" />
            </div>
            <div className="pb-4 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{incident.reporter.name}</span>
                <span className="text-xs text-muted-foreground">filed this incident</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(incident.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            </div>
          </div>

          {/* Comments */}
          {incident.comments.map((comment, i) => (
            <div key={comment.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: "var(--school-primary,#4f46e5)" }}>
                  {comment.author.name.charAt(0)}
                </div>
                {i < incident.comments.length - 1 && <div className="w-px flex-1 bg-border mt-2" />}
              </div>
              <div className={`${i < incident.comments.length - 1 ? "pb-4" : ""} flex-1`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{comment.author.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(comment.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{comment.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Add comment (staff only) */}
        {isStaff && (
          <form action={addIncidentComment} className="mt-4 border-t border-border pt-4 space-y-3">
            <input type="hidden" name="incidentId" value={incident.id} />
            <textarea name="body" rows={3} required
              placeholder="Add a note, update, or observation to the timeline..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <Button type="submit" variant="outline" size="sm">Post Comment</Button>
          </form>
        )}
      </div>
    </div>
  )
}
