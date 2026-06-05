"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, Clock, Lock, FileText, Check, Bell } from "lucide-react"
import { updateAssignmentGrade, nudgeStudent, nudgeAllPending } from "@/app/actions/academics"
import { MarkdownContent } from "@/components/ui/markdown-content"
import { toast } from "sonner"

export function StaffAssignmentView({ assignment, enrollments, typeConfig }: any) {
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "SUBMISSIONS" | "GRADING">("OVERVIEW")

  const gradeMap = new Map(assignment.grades.map((g: any) => [g.studentId, g]))
  const submittedCount = assignment.submissions.length
  const gradedCount = assignment.grades.length

  const now = new Date()
  const due = new Date(assignment.dueDate)
  const isPast   = due < now
  const isDueSoon = !isPast && due.getTime() - now.getTime() < 3 * 24 * 60 * 60 * 1000
  const isClosed = assignment.status === "CLOSED"
  const isScheduled = assignment.status === "PUBLISHED" && assignment.publishDate && new Date(assignment.publishDate) > now
  const tc = typeConfig[assignment.type] ?? typeConfig.OTHER

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold ${tc.color}`}>
                {tc.label}
              </span>
              {isClosed ? (
                <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-rose-500/10 text-rose-600 border-rose-500/20">
                  <Lock className="h-3 w-3" /> Closed
                </span>
              ) : isPast ? (
                <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-rose-500/15 text-rose-500 border-rose-500/20">
                  <Clock className="h-3 w-3" /> Past Due
                </span>
              ) : isDueSoon ? (
                <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-amber-500/15 text-amber-600 border-amber-500/20">
                  <Clock className="h-3 w-3" /> Due Soon
                </span>
              ) : isScheduled ? (
                <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-amber-500/10 text-amber-600 border-amber-500/20">
                  <Clock className="h-3 w-3" /> Scheduled
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-green-500/10 text-green-700 border-green-500/20">
                  <CheckCircle className="h-3 w-3" /> On Track
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold">{assignment.title}</h2>
            <p className="text-sm text-muted-foreground">
              {assignment.section.course.name} · Due {due.toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" })} · {assignment.maxScore} pts
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex gap-3">
              <div className="rounded-lg border bg-muted/40 p-3 text-center min-w-[80px]">
                <p className="text-2xl font-bold">{submittedCount}</p>
                <p className="text-xs text-muted-foreground">Submitted</p>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3 text-center min-w-[80px]">
                <p className="text-2xl font-bold">{gradedCount}</p>
                <p className="text-xs text-muted-foreground">Graded</p>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3 text-center min-w-[80px]">
                <p className="text-2xl font-bold">{enrollments.length}</p>
                <p className="text-xs text-muted-foreground">Enrolled</p>
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                const { duplicateAssignment } = await import("@/app/actions/academics")
                try {
                  await duplicateAssignment(assignment.id)
                  alert("Assignment duplicated successfully. You can find it in the assignments list as DRAFT.")
                } catch (e: any) {
                  alert(e.message)
                }
              }}
              className="text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-3 rounded-md transition-colors"
            >
              Duplicate
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 border-b border-border pt-4">
          <button 
            type="button"
            onClick={() => setActiveTab("OVERVIEW")}
            className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${activeTab === "OVERVIEW" ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Overview
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab("SUBMISSIONS")}
            className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${activeTab === "SUBMISSIONS" ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Submissions
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab("GRADING")}
            className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${activeTab === "GRADING" ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Grading
          </button>
        </div>
      </div>

      {activeTab === "OVERVIEW" && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-4">Instructions</h3>
          {assignment.description ? (
            <MarkdownContent content={assignment.description} />
          ) : (
            <p className="text-sm text-muted-foreground italic">No instructions provided.</p>
          )}
        </div>
      )}

      {activeTab === "SUBMISSIONS" && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center">
            <h3 className="font-semibold">Student Submissions</h3>
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-full text-xs font-bold gap-2"
              onClick={async () => {
                try {
                  const res = await nudgeAllPending(assignment.id)
                  toast.success(`Nudged ${res.count} students.`)
                } catch (e: any) {
                  toast.error(e.message)
                }
              }}
            >
              <Bell className="h-3 w-3" />
              Nudge All Pending
            </Button>
          </div>
          <div className="divide-y divide-border">
            {enrollments.length === 0 ? (
               <p className="p-6 text-sm text-muted-foreground">No students enrolled.</p>
            ) : (
               enrollments.map((enr: any) => {
                 const submissionRecord = assignment.submissions.find((s: any) => s.studentId === enr.student.id)
                 const isSubmitted = !!submissionRecord
                 const submissionDocs = assignment.documents.filter((d: any) => d.studentId === enr.student.id || d.uploaderId === enr.student.userId)
                 
                 return (
                   <div key={enr.student.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                          {enr.student.user.name.charAt(0)}
                        </div>
                        <div>
                           <p className="font-semibold">{enr.student.user.name}</p>
                           <div className="flex gap-2 mt-1">
                             {!assignment.allowUpload && submissionRecord ? (
                               <Badge variant="outline" className={
                                 submissionRecord.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800" :
                                 submissionRecord.status === "IN_PROGRESS" ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800" :
                                 "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800"
                               }>
                                 {submissionRecord.status === "COMPLETED" ? <Check className="h-3 w-3 mr-1" /> : 
                                  submissionRecord.status === "IN_PROGRESS" ? <Clock className="h-3 w-3 mr-1" /> : 
                                  <FileText className="h-3 w-3 mr-1" />}
                                 {submissionRecord.status === "COMPLETED" ? "Completed" : 
                                  submissionRecord.status === "IN_PROGRESS" ? "In Progress" : 
                                  "To Do"}
                               </Badge>
                             ) : isSubmitted ? (
                               <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                                 <Check className="h-3 w-3 mr-1" /> Submitted
                               </Badge>
                             ) : (
                               <div className="flex items-center gap-2">
                                 <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                                   Pending
                                 </Badge>
                                 <Button 
                                   variant="ghost" 
                                   size="sm" 
                                   className="h-6 px-2 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                   onClick={async () => {
                                     try {
                                       await nudgeStudent(assignment.id, enr.student.id)
                                       toast.success(`Nudge sent to ${enr.student.user.name}`)
                                     } catch (e: any) {
                                       toast.error(e.message)
                                     }
                                   }}
                                 >
                                   <Bell className="h-2.5 w-2.5 mr-1" />
                                   Nudge
                                 </Button>
                               </div>
                             )}
                           </div>
                        </div>
                      </div>
                      <div className="text-right">
                         {submissionDocs.length > 0 ? (
                            <div className="flex flex-col gap-1 items-end">
                              {submissionDocs.map((s: any) => (
                                <a key={s.id} href={s.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
                                  <FileText className="h-4 w-4" /> {s.title}
                                </a>
                              ))}
                            </div>
                         ) : assignment.allowUpload ? (
                            <p className="text-sm text-muted-foreground italic">No files</p>
                         ) : (
                            <p className="text-sm text-muted-foreground italic">Not required</p>
                         )}
                      </div>
                   </div>
                 )
               })
            )}
          </div>
        </div>
      )}

      {activeTab === "GRADING" && (
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
      )}
    </div>
  )
}
