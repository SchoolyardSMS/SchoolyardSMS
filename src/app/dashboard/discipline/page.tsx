import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Shield, Clock, CheckCircle2, FolderX, ShieldAlert, Plus, Download } from "lucide-react"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { IncidentCard } from "@/components/dashboard/discipline/incident-card"
import { cn } from "@/lib/utils"

export const metadata = { title: "Discipline | Schoolyard" }

const categoryLabel: Record<string, string> = {
  BEHAVIOR:            "Behavior",
  ACADEMIC_DISHONESTY: "Academic Dishonesty",
  ATTENDANCE:          "Attendance",
  BULLYING:            "Bullying",
  PROPERTY_DAMAGE:     "Property Damage",
  SAFETY:              "Safety",
  OTHER:               "Other",
}

export default async function DisciplinePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; severity?: string; category?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  const sp = await searchParams

  const isStaff = session.user?.role === "ADMIN" || session.user?.role === "TEACHER"

  const where: any = {}
  if (sp.status)   where.status   = sp.status
  if (sp.severity) where.severity = sp.severity
  if (sp.category) where.category = sp.category

  if (!isStaff) {
    const student = await db.student.findUnique({ where: { userId: session.user?.id } })
    if (!student) redirect("/dashboard")
    where.studentId = student.id
  }

  const getFilterUrl = (updates: { status?: string | null; severity?: string | null; category?: string | null }) => {
    const params = new URLSearchParams()
    if (sp.status) params.set("status", sp.status)
    if (sp.severity) params.set("severity", sp.severity)
    if (sp.category) params.set("category", sp.category)

    Object.entries(updates).forEach(([key, val]) => {
      if (val === null) {
        params.delete(key)
      } else if (val !== undefined) {
        params.set(key, val)
      }
    })

    const queryStr = params.toString()
    return queryStr ? `/dashboard/discipline?${queryStr}` : "/dashboard/discipline"
  }

  const [incidents, counts] = await Promise.all([
    db.incident.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        student: { include: { user: true } },
        reporter: true,
        _count: { select: { comments: true } },
      },
    }),
    isStaff
      ? db.incident.groupBy({ by: ["status"], _count: { _all: true } })
      : Promise.resolve([]),
  ])

  const statMap = Object.fromEntries(
    (counts as { status: string; _count: { _all: number } }[]).map((c) => [c.status, c._count._all])
  )
  const total = Object.values(statMap).reduce((a, b) => (a as number) + (b as number), 0)

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      <DashboardPageHeader 
        title="Incident Log" 
        description={isStaff ? "Track and manage student behavioral incidents and disciplinary actions." : "Your personal disciplinary records and status updates."}
        icon={Shield}
      >
        {isStaff && (
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild className="border-slate-200 dark:border-slate-800">
              <a href="/api/reports/export/discipline" download>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </a>
            </Button>
            <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              <Link href="/dashboard/discipline/new">
                <Plus className="w-4 h-4 mr-2" />
                Log Incident
              </Link>
            </Button>
          </div>
        )}
      </DashboardPageHeader>

      {/* Stats bar (staff only) */}
      {isStaff && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { key: "OPEN",                icon: Clock,         label: "Open Cases", color: "text-sky-500 bg-sky-50 dark:bg-sky-900/20" },
            { key: "UNDER_INVESTIGATION", icon: ShieldAlert,   label: "Investigating", color: "text-amber-500 bg-amber-50 dark:bg-amber-900/20" },
            { key: "RESOLVED",            icon: CheckCircle2,  label: "Resolved", color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" },
            { key: "CLOSED",              icon: FolderX,       label: "Closed Cases", color: "text-slate-400 bg-slate-50 dark:bg-slate-900/20" },
          ].map(({ key, icon: Icon, label, color }) => (
            <Link
              key={key}
              href={sp.status === key ? getFilterUrl({ status: null }) : getFilterUrl({ status: key })}
              className={cn(
                "group rounded-2xl border p-5 flex items-center gap-4 transition-all shadow-sm",
                sp.status === key 
                  ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20" 
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-800"
              )}
            >
              <div className={cn("p-3 rounded-xl", color)}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 dark:text-white leading-none mb-1">{statMap[key] ?? 0}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Filter pills */}
      {isStaff && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Filter Options:</span>
          <div className="flex flex-wrap gap-2">
            {["MINOR", "MODERATE", "SEVERE"].map((s) => (
              <Link
                key={s}
                href={sp.severity === s ? getFilterUrl({ severity: null }) : getFilterUrl({ severity: s })}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all",
                  sp.severity === s
                    ? "bg-indigo-600 text-white border-transparent shadow-md shadow-indigo-100 dark:shadow-none"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-300"
                )}
              >
                {s}
              </Link>
            ))}
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-2 hidden sm:block" />
            {Object.entries(categoryLabel).map(([key, label]) => (
              <Link
                key={key}
                href={sp.category === key ? getFilterUrl({ category: null }) : getFilterUrl({ category: key })}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all",
                  sp.category === key
                    ? "bg-slate-900 text-white border-transparent dark:bg-white dark:text-slate-900"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-300"
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Incident cards */}
      <div className="space-y-4">
        {incidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-20 text-center bg-slate-50/50 dark:bg-slate-900/20">
            <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
              <Shield className="h-10 w-10 text-slate-300" />
            </div>
            <h4 className="font-bold text-xl text-slate-900 dark:text-white">Clear Record</h4>
            <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
              {Object.keys(sp).length > 0 ? "No incidents match your current filters." : "No disciplinary incidents have been logged yet."}
            </p>
            {Object.keys(sp).length > 0 && (
              <Button variant="link" asChild className="mt-4 text-indigo-600">
                <Link href="/dashboard/discipline">Clear All Filters</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {incidents.map((inc) => (
              <IncidentCard key={inc.id} incident={inc} isStaff={isStaff} />
            ))}
          </div>
        )}
      </div>

      {isStaff && total > incidents.length && (
        <div className="text-center pt-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Showing {incidents.length} of {total} total incidents
          </p>
        </div>
      )}
    </div>
  )
}
