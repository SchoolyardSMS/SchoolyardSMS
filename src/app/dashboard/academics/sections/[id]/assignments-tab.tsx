import { Button } from "@/components/ui/button"
import { ClipboardList, Plus } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { AssignmentActions } from "@/components/dashboard/academics/assignment-actions"

export function AssignmentsTab({ 
  id, 
  visibleAssignments, 
  isStaff, 
  assignmentTypeConfig, 
  now 
}: { 
  id: string
  visibleAssignments: any[]
  isStaff: boolean
  assignmentTypeConfig: Record<string, { label: string; color: string }>
  now: Date
}) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {isStaff && (
        <div className="flex justify-end">
          <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full">
            <Link href={`/dashboard/academics/sections/${id}/assignments/new`}>
              <Plus className="w-4 h-4 mr-2" />
              Create Assignment
            </Link>
          </Button>
        </div>
      )}

      {visibleAssignments.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-20 text-center bg-slate-50/50 dark:bg-slate-900/20">
          <ClipboardList className="h-10 w-10 mx-auto mb-4 text-slate-300" />
          <h4 className="font-bold text-xl text-slate-900 dark:text-white">No Assignments</h4>
          <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">Assignments will appear here once they are created and published.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {visibleAssignments.map((a: any) => {
            const tc = assignmentTypeConfig[a.type] ?? assignmentTypeConfig.OTHER
            const isSubmitted = a.submissions?.length > 0
            const isPast = new Date(a.dueDate) < now

            return (
              <div key={a.id} className="relative flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group">
                <Link href={`/dashboard/academics/sections/${id}/assignments/${a.id}`} className="absolute inset-0 z-0" />
                
                <div className={cn("inline-flex items-center rounded-xl border px-3 py-1 text-[10px] font-black uppercase tracking-widest shrink-0 self-start sm:self-center z-10", tc.color)}>
                  {tc.label}
                </div>

                <div className="relative z-10 flex-1 min-w-0">
                  <p className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors truncate">{a.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <p className={cn(
                      "text-[10px] font-bold uppercase tracking-tight",
                      isSubmitted ? "text-emerald-600" : isPast ? "text-rose-500" : "text-slate-400"
                    )}>
                      {isSubmitted ? "Submitted" : isPast ? "Past Due" : "Active"}
                    </p>
                    <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-800" />
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                      Due {new Date(a.dueDate).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>

                <div className="relative z-20 flex items-center justify-between sm:justify-end gap-6 shrink-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-50 dark:border-slate-800">
                  <div className="flex flex-col items-end">
                    <span className="text-lg font-black text-slate-900 dark:text-white leading-none">{a.maxScore}</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Points</span>
                  </div>
                  <AssignmentActions assignment={a} sectionId={id} isStaff={isStaff} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
