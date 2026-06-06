import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { GradeCell } from "./grade-cell"
import { User, TrendingUp } from "lucide-react"
import { calculateGrade, getLetterGrade } from "@/lib/grading"

export function GradebookTable({ 
  section, 
  assignments, 
  gradeMap, 
  snapshots, 
  selectedTermId 
}: { 
  section: any
  assignments: any[]
  gradeMap: Record<string, Record<string, number>>
  snapshots: any[]
  selectedTermId?: string
}) {
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[800px] border-collapse text-xs">
        <TableHeader>
          <TableRow className="bg-slate-50 dark:bg-slate-800/50">
            <TableHead className="w-[180px] sticky left-0 bg-slate-50 dark:bg-slate-800 z-30 border-r dark:border-slate-700 py-6">
              <div className="flex items-center gap-2 font-black uppercase tracking-widest text-[10px] text-slate-400">
                <User className="h-3 w-3" />
                Student
              </div>
            </TableHead>
            {assignments.map(assignment => (
              <TableHead key={assignment.id} className="text-center min-w-[120px] px-2 border-r dark:border-slate-800 last:border-0">
                <div className="flex flex-col items-center">
                  <span className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[100px]">
                    {assignment.title}
                  </span>
                  <div className="flex flex-col items-center gap-0.5 mt-1">
                    <span className="text-[9px] uppercase tracking-tighter text-muted-foreground">
                      {new Date(assignment.dueDate).toLocaleDateString(undefined, { timeZone: "UTC", month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                      / {assignment.maxScore}
                    </span>
                  </div>
                </div>
              </TableHead>
            ))}
            <TableHead className="text-right w-[120px] sticky right-0 bg-slate-50 dark:bg-slate-800 z-30 border-l dark:border-slate-700 px-6">
              <div className="flex items-center justify-end gap-2 text-indigo-600 font-black uppercase tracking-widest text-[10px]">
                <TrendingUp className="h-3 w-3" />
                Average
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {section.enrollments.map((enrollment: any) => {
            const sId = enrollment.student.id
            const studentGradesList = assignments.flatMap(a => {
              const score = gradeMap[sId]?.[a.id]
              return score !== undefined ? [{ assignmentId: a.id, score }] : []
            }) as { assignmentId: string, score: number }[]

            // Determine final GPA either from recalculated average (active) or the saved TermGrade snapshot
            const snapshotGrade = snapshots.find(s => s.enrollmentId === enrollment.id)
            
            const pct = selectedTermId 
              ? (snapshotGrade?.overrideScore ?? snapshotGrade?.calculatedScore ?? null)
              : (studentGradesList.length > 0 
                  ? calculateGrade(section, assignments as any, studentGradesList) 
                  : null)

            return (
              <TableRow key={sId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                <TableCell className="font-bold sticky left-0 bg-white dark:bg-slate-900 z-20 border-r dark:border-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50 py-4 text-slate-900 dark:text-slate-100">
                  {enrollment.student.user.name}
                </TableCell>
                {assignments.map(assignment => {
                  const score = gradeMap[sId]?.[assignment.id] ?? null
                  return (
                    <TableCell key={assignment.id} className="text-center p-2 border-r dark:border-slate-800 last:border-0">
                      <div className="flex flex-col items-center">
                        {selectedTermId ? (
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                            {score !== null ? `${score} / ${assignment.maxScore}` : "—"}
                          </span>
                        ) : (
                          <GradeCell 
                            assignmentId={assignment.id} 
                            studentId={sId}
                            initialScore={score}
                            maxScore={assignment.maxScore ?? 100}
                          />
                        )}
                      </div>
                    </TableCell>
                  )
                })}
                <TableCell className="text-right sticky right-0 bg-white dark:bg-slate-900 z-20 border-l dark:border-slate-800 px-6 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50">
                  <div className="flex flex-col items-end">
                    {pct !== null ? (
                      <>
                        <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{pct.toFixed(1)}%</span>
                        <span className="text-[10px] font-black text-slate-400">
                          {selectedTermId ? (snapshotGrade?.letterGrade || getLetterGrade(pct)) : getLetterGrade(pct)}
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic uppercase tracking-widest">N/A</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
