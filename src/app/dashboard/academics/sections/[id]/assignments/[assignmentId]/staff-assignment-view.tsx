"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2, Edit3, ArrowLeft, MoreVertical, LayoutGrid, Check, Clock, FileText, Download, Upload, List, Hash, Bell, Lock, CheckCircle } from "lucide-react"
import { StaffAssignmentSubmissions } from "./staff-assignment-submissions"
import { StaffAssignmentGrading } from "./staff-assignment-grading"
import { updateAssignmentGrade, nudgeStudent, nudgeAllPending } from "@/app/actions/academics"
import { MarkdownContent } from "@/components/ui/markdown-content"
import { toast } from "sonner"

export function StaffAssignmentView({ assignment, enrollments, typeConfig }: any) {
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "SUBMISSIONS" | "GRADING">("OVERVIEW")

  const gradeMap = new Map<string, any>(assignment.grades.map((g: any) => [g.studentId, g]))
  const submittedCount = assignment.submissions.length
  const gradedCount = assignment.grades.length

  const now = new Date()
  const due = new Date(assignment.dueDate)
  const isPast   = due < now
  const isDueSoon = !isPast && due.getTime() - now.getTime() < 3 * 24 * 60 * 60 * 1000
  const isClosed = assignment.status === "CLOSED"
  const isScheduled = assignment.status === "PUBLISHED" && assignment.publishDate && new Date(assignment.publishDate) > now
  const tc = typeConfig[assignment.type] ?? typeConfig.OTHER

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

      {activeTab === "SUBMISSIONS" && <StaffAssignmentSubmissions assignment={assignment} enrollments={enrollments} />}

      {activeTab === "GRADING" && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center">
            <StaffAssignmentGrading assignment={assignment} enrollments={enrollments} gradeMap={gradeMap} />
          </div>
        </div>
      )}
    </div>
  )
}
