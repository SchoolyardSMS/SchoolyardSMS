import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"
import { updateAssignmentGrade } from "@/app/actions/academics"

function letterGrade(score: number, max: number): string {
  const pct = (score / max) * 100
  if (pct >= 93) return "A"
  if (pct >= 90) return "A-"
  if (pct >= 87) return "B+"
  if (pct >= 83) return "B"
  if (pct >= 80) return "B-"
  if (pct >= 77) return "C+"
  if (pct >= 73) return "C"
  if (pct >= 70) return "C-"
  if (pct >= 67) return "D+"
  if (pct >= 60) return "D"
  return "F"
}

export function StaffAssignmentGrading({ 
  assignment, 
  enrollments, 
  gradeMap 
}: { 
  assignment: any, 
  enrollments: any[],
  gradeMap: Map<string, any>
}) {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center">
        <h3 className="font-semibold">Grade Students</h3>
        {assignment.grades.length > 0 && (
          <span className="text-sm font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-3 py-1 rounded-full">
            Avg: {(assignment.grades.reduce((s: number, g: any) => s + g.score, 0) / assignment.grades.length).toFixed(1)} / {assignment.maxScore}
          </span>
        )}
      </div>
      <div className="divide-y divide-border">
        {enrollments.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No students enrolled.</p>
        ) : (
          enrollments.map((enr: any) => {
            const grade = gradeMap.get(enr.student.id) as any
            const pct = grade ? Math.round((grade.score / assignment.maxScore) * 100) : null
            const submissionDocs = assignment.documents.filter((d: any) => d.studentId === enr.student.id || d.uploaderId === enr.student.userId)
            const submissionRecord = assignment.submissions.find((s: any) => s.studentId === enr.student.id)
            const isSubmitted = !!submissionRecord

            return (
              <form key={enr.student.id} action={updateAssignmentGrade} className="flex flex-col lg:flex-row lg:items-center gap-4 p-4 hover:bg-muted/30">
                <input type="hidden" name="assignmentId" value={assignment.id} />
                <input type="hidden" name="studentId"   value={enr.student.id} />

                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-700 dark:text-slate-300 shrink-0">
                    {enr.student.user.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{enr.student.user.name}</p>
                    <p className={`text-xs ${
                      !assignment.allowUpload && submissionRecord ? (submissionRecord.status === "COMPLETED" ? "text-emerald-600" : submissionRecord.status === "IN_PROGRESS" ? "text-amber-600" : "text-slate-500") : 
                      isSubmitted ? "text-emerald-600" : "text-amber-600"
                    }`}>
                      {!assignment.allowUpload && submissionRecord ? (
                        submissionRecord.status === "COMPLETED" ? "Completed" :
                        submissionRecord.status === "IN_PROGRESS" ? "In Progress" :
                        "To Do"
                      ) : isSubmitted ? "Submitted" : "Pending"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  {submissionDocs.map((s: any) => (
                    <a key={s.id} href={s.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-1 rounded-md hover:underline flex items-center gap-1">
                      <FileText className="h-3 w-3" /> View
                    </a>
                  ))}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    name="score"
                    aria-label={`Score for ${enr.student.user.name}`}
                    min={0}
                    max={assignment.maxScore}
                    defaultValue={grade?.score ?? ""}
                    placeholder="—"
                    className="w-20 h-9 rounded-md border border-input bg-background px-3 text-sm text-right font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-muted-foreground shrink-0">/ {assignment.maxScore}</span>
                  {pct !== null && (
                    <span className={`text-sm font-bold w-8 text-right shrink-0 ${pct >= 90 ? "text-green-600" : pct >= 70 ? "text-amber-500" : "text-rose-500"}`}>
                      {letterGrade(grade!.score, assignment.maxScore)}
                    </span>
                  )}
                </div>

                <input
                  type="text"
                  name="feedback"
                  aria-label={`Feedback for ${enr.student.user.name}`}
                  defaultValue={grade?.feedback ?? ""}
                  placeholder="Feedback (optional)"
                  className="flex-1 lg:max-w-[200px] h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />

                <Button type="submit" size="sm" variant="outline" className="shrink-0">Save</Button>
              </form>
            )
          })
        )}
      </div>
    </div>
  )
}
