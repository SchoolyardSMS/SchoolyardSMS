import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

interface IncidentCardProps {
  incident: any
  isStaff: boolean
}

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
  OPEN:                { label: "Open",               color: "bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800" },
  UNDER_INVESTIGATION: { label: "Under Investigation", color: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
  RESOLVED:            { label: "Resolved",           color: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" },
  CLOSED:              { label: "Closed",             color: "bg-slate-50 dark:bg-slate-900/20 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800" },
}

const severityConfig: Record<string, { label: string; variant: "destructive" | "default" | "secondary"; className?: string }> = {
  MINOR:    { label: "Minor",    variant: "secondary", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  MODERATE: { label: "Moderate", variant: "default",   className: "bg-orange-500 text-white border-transparent" },
  SEVERE:   { label: "Severe",   variant: "destructive", className: "bg-rose-600 text-white border-transparent" },
}

export function IncidentCard({ incident, isStaff }: IncidentCardProps) {
  const sev = severityConfig[incident.severity]
  const sta = statusConfig[incident.status]

  return (
    <Link
      href={`/dashboard/discipline/${incident.id}`}
      className="flex flex-col sm:flex-row items-start gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all group"
    >
      <div className={cn(
        "mt-0.5 rounded-xl p-3 shrink-0",
        incident.severity === "SEVERE" ? "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400" :
        incident.severity === "MODERATE" ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" :
        "bg-slate-50 dark:bg-slate-800 text-slate-500"
      )}>
        <AlertTriangle className="h-6 w-6" />
      </div>

      <div className="flex-1 min-w-0 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight">
              {incident.title}
            </h3>
            {isStaff && (
              <p className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1.5">
                <span className="text-slate-900 dark:text-slate-300 font-bold">{incident.student.user.name}</span>
                <span className="opacity-50">/</span>
                <span>Reported by {incident.reporter.name}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-sm", sta.color)}>
              {sta.label}
            </span>
            <Badge variant={sev.variant} className={cn("text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 shadow-sm", sev.className)}>
              {sev.label}
            </Badge>
          </div>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
          {incident.description}
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-slate-800/50">
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <span>{new Date(incident.date).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })}</span>
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
            <span className="text-indigo-600 dark:text-indigo-400">{categoryLabel[incident.category]}</span>
          </div>
          
          {incident._count.comments > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
              <MessageSquare className="w-3.5 h-3.5" />
              {incident._count.comments}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
