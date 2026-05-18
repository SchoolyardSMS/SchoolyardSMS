"use client"

import { FileUploader } from "./file-uploader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, Clock, Lock, FileText, Check, AlertCircle } from "lucide-react"
import { submitAssignment } from "@/app/actions/academics"
import { useState } from "react"
import { MarkdownContent } from "@/components/ui/markdown-content"

export function StudentAssignmentView({ assignment, myStudentProfile, myDocuments, grade, isSubmitted, submissionRecord, typeConfig }: any) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const now = new Date()
  const due = new Date(assignment.dueDate)
  const isPast   = due < now
  const isDueSoon = !isPast && due.getTime() - now.getTime() < 3 * 24 * 60 * 60 * 1000
  const isClosed = assignment.status === "CLOSED"
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

  const handleSubmit = async (status: string = "COMPLETED") => {
    setIsSubmitting(true)
    try {
      await submitAssignment(assignment.id, myStudentProfile.id, status)
    } catch (e) {
      console.error(e)
    } finally {
      setIsSubmitting(false)
    }
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
          
          {/* Status Board */}
          <div className="rounded-xl border bg-slate-50 dark:bg-slate-900/50 p-4 min-w-[200px]">
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-2">Assignment Status</p>
            {grade ? (
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
                <CheckCircle className="h-5 w-5" /> Graded
              </div>
            ) : !assignment.allowUpload && submissionRecord ? (
              <div className={`flex items-center gap-2 font-bold ${
                submissionRecord.status === "COMPLETED" ? "text-emerald-600 dark:text-emerald-400" :
                submissionRecord.status === "IN_PROGRESS" ? "text-amber-600 dark:text-amber-400" :
                "text-slate-500"
              }`}>
                {submissionRecord.status === "COMPLETED" ? <CheckCircle className="h-5 w-5" /> : 
                 submissionRecord.status === "IN_PROGRESS" ? <Clock className="h-5 w-5" /> : 
                 <FileText className="h-5 w-5" />}
                {submissionRecord.status === "COMPLETED" ? "Completed" : 
                 submissionRecord.status === "IN_PROGRESS" ? "In Progress" : 
                 "To Do"}
              </div>
            ) : isSubmitted ? (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                <CheckCircle className="h-5 w-5" /> Submitted
              </div>
            ) : myDocuments.length > 0 ? (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold">
                <AlertCircle className="h-5 w-5" /> Draft Saved
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-500 font-bold">
                <Clock className="h-5 w-5" /> Not Started
              </div>
            )}
          </div>
        </div>

        {assignment.description && (
          <div className="border-t border-border pt-4 mt-4">
            <h3 className="text-sm font-semibold mb-2">Instructions</h3>
            <MarkdownContent content={assignment.description} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Submissions Section */}
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
            <h3 className="font-semibold text-lg border-b border-border pb-3">Your Work</h3>
            
            {myDocuments.length > 0 ? (
              <div className="space-y-3">
                {myDocuments.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between rounded-lg border p-4 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-indigo-500" />
                      <div>
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                          {doc.title}
                        </a>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(doc.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : assignment.allowUpload ? (
              <p className="text-sm text-muted-foreground italic">No files uploaded yet.</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No file submission required for this assignment.</p>
            )}

            {!isSubmitted && !isClosed && assignment.allowUpload && (
              <div className="pt-4 border-t border-border">
                <FileUploader assignmentId={assignment.id} />
              </div>
            )}

            {!isSubmitted && !isClosed && myDocuments.length > 0 && assignment.allowUpload && (
              <div className="pt-4 mt-4 border-t border-border flex justify-end">
                <Button 
                  onClick={() => handleSubmit("COMPLETED")} 
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 shadow-md"
                >
                  <Check className="h-4 w-4 mr-2" />
                  {isSubmitting ? "Submitting..." : "Submit Assignment"}
                </Button>
              </div>
            )}

            {!isClosed && !assignment.allowUpload && (
              <div className="pt-4 mt-4 border-t border-border">
                <p className="text-sm font-semibold mb-3">Mark Assignment Status:</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button 
                    variant={submissionRecord?.status === "TODO" ? "default" : "outline"}
                    onClick={() => handleSubmit("TODO")}
                    disabled={isSubmitting}
                  >
                    To Do
                  </Button>
                  <Button 
                    variant={submissionRecord?.status === "IN_PROGRESS" ? "default" : "outline"}
                    onClick={() => handleSubmit("IN_PROGRESS")}
                    disabled={isSubmitting}
                  >
                    In Progress
                  </Button>
                  <Button 
                    variant={submissionRecord?.status === "COMPLETED" ? "default" : "outline"}
                    onClick={() => handleSubmit("COMPLETED")}
                    disabled={isSubmitting}
                  >
                    Completed
                  </Button>
                </div>
              </div>
            )}

            {isSubmitted && assignment.allowUpload && !grade && (
              <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 text-sm mt-4">
                <p className="font-semibold flex items-center"><CheckCircle className="h-4 w-4 mr-2" /> Assignment successfully submitted.</p>
                <p className="mt-1 opacity-80">You can no longer upload files. Waiting for instructor to grade.</p>
              </div>
            )}
            
            {isClosed && !isSubmitted && !grade && (
              <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 text-rose-800 dark:text-rose-300 text-sm mt-4">
                <p className="font-semibold flex items-center"><Lock className="h-4 w-4 mr-2" /> Assignment is closed.</p>
                <p className="mt-1 opacity-80">You can no longer submit work for this assignment.</p>
              </div>
            )}
          </div>
        </div>

        {/* Grading Section */}
        <div className="md:col-span-1 space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4 sticky top-6">
            <h3 className="font-semibold text-lg border-b border-border pb-3">Grade Details</h3>
            
            {grade ? (
              <div className="space-y-6">
                <div className="text-center p-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl border">
                  <p className="text-4xl font-black text-indigo-600 dark:text-indigo-400">
                    {grade.score}<span className="text-xl text-slate-400">/{assignment.maxScore}</span>
                  </p>
                  <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-widest">
                    Grade: {letterGrade(grade.score, assignment.maxScore)}
                  </p>
                </div>
                
                {grade.feedback && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Instructor Feedback</p>
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/40 rounded-lg text-sm text-indigo-900 dark:text-indigo-200">
                      {grade.feedback}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 dark:text-slate-500">
                <p className="text-sm italic">Not graded yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
