"use client"

import { useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { saveTermGrade } from "@/app/actions/term-grades"
import { Check, Loader2, Save, Search, X, ChevronLeft, ChevronRight, Wand2, BarChart3, BookOpen } from "lucide-react"
import { toast } from "sonner"
import { calculateGrade, getLetterGrade } from "@/lib/grading"
import { type AssignmentType, type Prisma } from "@prisma/client"

type GradingScaleEntry = { min: number; letter: string }

type TermGradeRecord = {
  isPosted?: boolean
  overrideScore?: number | null
  calculatedScore?: number | null
  letterGrade?: string | null
  comments?: string | null
}

type EnrollmentRecord = {
  id: string
  student: { user: { name: string } }
  termGrades?: TermGradeRecord[]
}

type AssignmentRecord = { id: string; title: string; dueDate: string | Date; type: AssignmentType; maxScore: number | null }

type GradeRecord = { studentId: string; assignmentId: string; score: number }

// Client-side letter grade lookup — mirrors lib/grading.ts
function resolveLetterGrade(score: string, gradingScale: unknown): string {
  const pct = parseFloat(score)
  if (isNaN(pct) || !Array.isArray(gradingScale)) return ""
  const sorted = [...gradingScale].filter((entry): entry is GradingScaleEntry =>
    typeof entry === "object" && entry !== null &&
    typeof (entry as any).min === "number" &&
    typeof (entry as any).letter === "string"
  ).sort((a, b) => b.min - a.min)
  for (const entry of sorted) {
    if (pct >= entry.min) return entry.letter
  }
  return "F"
}

const PAGE_SIZE = 30

export function TermGradesClient({
  sectionId,
  enrollments: allEnrollments,
  termId,
  termName,
  gradingScale,
  assignments = [],
  grades: dbGrades = [],
  weightingConfig = null,
}: {
  sectionId: string
  enrollments: EnrollmentRecord[]
  termId: string
  termName: string
  gradingScale?: Prisma.JsonValue | undefined
  assignments?: AssignmentRecord[]
  grades?: GradeRecord[]
  weightingConfig?: Prisma.JsonValue | undefined
}) {
  const [loading, setLoading] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [activeStudentBreakdown, setActiveStudentBreakdown] = useState<any | null>(null)

  const [grades, setGrades] = useState<Record<string, { overrideScore: string; letterGrade: string; comments: string }>>(() => {
    const init: Record<string, any> = {}
    allEnrollments.forEach(enr => {
      const tg = enr.termGrades?.[0]
      const score = tg?.overrideScore?.toString() || tg?.calculatedScore?.toString() || ""
      init[enr.id] = {
        overrideScore: score,
        letterGrade: tg?.letterGrade || (score ? resolveLetterGrade(score, gradingScale) : ""),
        comments: tg?.comments || ""
      }
    })
    return init
  })

  const setScore = useCallback((enrollmentId: string, score: string) => {
    setGrades(prev => ({
      ...prev,
      [enrollmentId]: {
        ...prev[enrollmentId],
        overrideScore: score,
        // Auto-derive letter grade from the school's grading scale
        letterGrade: score ? resolveLetterGrade(score, gradingScale) : prev[enrollmentId].letterGrade
      }
    }))
  }, [gradingScale])

  const setLetterGrade = useCallback((enrollmentId: string, letter: string) => {
    setGrades(prev => ({
      ...prev,
      [enrollmentId]: { ...prev[enrollmentId], letterGrade: letter }
    }))
  }, [])

  const setComments = useCallback((enrollmentId: string, comments: string) => {
    setGrades(prev => ({
      ...prev,
      [enrollmentId]: { ...prev[enrollmentId], comments }
    }))
  }, [])

  // Filtered and paginated
  const filtered = useMemo(() =>
    allEnrollments.filter(enr =>
      enr.student.user.name.toLowerCase().includes(search.toLowerCase())
    ),
    [allEnrollments, search]
  )

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageEnrollments = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleSave = async (enrollmentId: string) => {
    setLoading(enrollmentId)
    try {
      const data = grades[enrollmentId]
      const res = await saveTermGrade(enrollmentId, termId, {
        overrideScore: data.overrideScore ? parseFloat(data.overrideScore) : null,
        letterGrade: data.letterGrade || null,
        comments: data.comments || null
      })
      if (res?.error) toast.error(res.error)
      else toast.success(`Saved grade for student`)
    } catch (e) {
      console.error(e)
      toast.error("Failed to save grade")
    } finally {
      setLoading(null)
    }
  }

  const handleSaveAll = async () => {
    // Parallel batch save — much faster for large rosters
    setLoading("all")
    const toSave = pageEnrollments.filter(enr => {
      const d = grades[enr.id]
      return d.overrideScore || d.letterGrade || d.comments
    })
    if (toSave.length === 0) {
      toast.info("No grades to save on this page")
      setLoading(null)
      return
    }

    const results = await Promise.allSettled(
      toSave.map(enr => {
        const data = grades[enr.id]
        return saveTermGrade(enr.id, termId, {
          overrideScore: data.overrideScore ? parseFloat(data.overrideScore) : null,
          letterGrade: data.letterGrade || null,
          comments: data.comments || null
        })
      })
    )

    const failed = results.filter(r => r.status === "rejected" || (r.status === "fulfilled" && r.value?.error)).length
    if (failed > 0) {
      toast.warning(`${toSave.length - failed} saved, ${failed} failed`)
    } else {
      toast.success(`All ${toSave.length} grades saved`)
    }
    setLoading(null)
  }

  const handleAutoFillAll = () => {
    // Auto-derive letter grades for everyone on this page who has a score but no letter grade
    setGrades(prev => {
      const next = { ...prev }
      pageEnrollments.forEach(enr => {
        const d = next[enr.id]
        if (d.overrideScore && !d.letterGrade) {
          next[enr.id] = { ...d, letterGrade: resolveLetterGrade(d.overrideScore, gradingScale) }
        }
      })
      return next
    })
    toast.success("Letter grades auto-filled from grading scale")
  }

  const postedCount = allEnrollments.filter(enr => enr.termGrades?.[0]?.isPosted).length

  const normalizedGradingScale: GradingScaleEntry[] = Array.isArray(gradingScale)
    ? (gradingScale as unknown[]).filter((entry): entry is GradingScaleEntry =>
        typeof entry === "object" && entry !== null &&
        typeof (entry as any).min === "number" &&
        typeof (entry as any).letter === "string"
      )
    : []

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Posting Grades — <span className="text-indigo-600">{termName}</span>
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {postedCount} of {allEnrollments.length} students graded
              {normalizedGradingScale.length > 0 && (
                <span className="ml-2 text-emerald-600 font-semibold">· Grading scale active</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAutoFillAll}
              className="text-violet-600 border-violet-200 hover:bg-violet-50 dark:hover:bg-violet-900/20 font-bold"
            >
              <Wand2 className="w-3.5 h-3.5 mr-1.5" />
              Auto-fill Letters
            </Button>
            <Button
              onClick={handleSaveAll}
              disabled={loading === "all"}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md font-bold"
            >
              {loading === "all" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Page ({pageEnrollments.length})
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: allEnrollments.length > 0 ? `${(postedCount / allEnrollments.length) * 100}%` : "0%" }}
            />
          </div>
        </div>
      </div>

      {/* Search + pagination controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search students…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            className="pl-9 h-10"
          />
          {search && (
            <button onClick={() => { setSearch(""); setPage(0) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <p className="text-sm text-slate-500 font-medium">
          {filtered.length} student{filtered.length !== 1 ? "s" : ""}
          {totalPages > 1 && ` · Page ${page + 1}/${totalPages}`}
        </p>
      </div>

      {/* Grade table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <th className="py-3 pl-6 text-[10px] font-black uppercase tracking-widest text-slate-500 w-1/4">Student</th>
              <th className="py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 w-[130px]">Score (0–100)</th>
              <th className="py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 w-[110px]">
                Letter
                {normalizedGradingScale.length > 0 && <span className="ml-1 text-emerald-500">✦ auto</span>}
              </th>
              <th className="py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 pr-4">Teacher Comments</th>
              <th className="py-3 pr-6 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Save</th>
            </tr>
          </thead>
          <tbody>
            {pageEnrollments.map(enr => {
              const tg = enr.termGrades?.[0]
              const isSaved = tg?.isPosted
              const g = grades[enr.id]
              const derivedLetter = g?.overrideScore ? resolveLetterGrade(g.overrideScore, gradingScale) : ""
              const letterMismatch = derivedLetter && g?.letterGrade && g.letterGrade !== derivedLetter

              return (
                <tr key={enr.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="py-3 pl-6">
                    <div className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      {enr.student.user.name}
                      <Button
                        size="icon"
                        type="button"
                        variant="ghost"
                        className="h-6 w-6 rounded-full text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                        title="View assignment gradebook for this student"
                        onClick={() => setActiveStudentBreakdown(enr)}
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Calc: {tg?.calculatedScore ? `${tg.calculatedScore.toFixed(1)}%` : "—"}
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <Input
                      type="number"
                      step="0.1"
                      min={0}
                      max={120}
                      className="h-9 w-28 bg-transparent border-slate-200 dark:border-slate-700 text-sm"
                      placeholder="92.5"
                      value={g?.overrideScore || ""}
                      onChange={e => setScore(enr.id, e.target.value)}
                    />
                  </td>
                  <td className="py-3 pr-3">
                    <div className="relative">
                      <Input
                        className={`h-9 w-24 bg-transparent text-sm font-mono font-bold ${
                          letterMismatch
                            ? "border-amber-400 dark:border-amber-600 text-amber-600"
                            : "border-slate-200 dark:border-slate-700"
                        }`}
                        placeholder={derivedLetter || "A"}
                        value={g?.letterGrade || ""}
                        onChange={e => setLetterGrade(enr.id, e.target.value)}
                      />
                      {letterMismatch && (
                        <div className="absolute -bottom-4 left-0 text-[9px] text-amber-500 whitespace-nowrap">
                          Scale says {derivedLetter}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <Textarea
                      className="h-9 min-h-[36px] resize-y bg-transparent border-slate-200 dark:border-slate-700 text-xs"
                      placeholder="Optional comment for report card…"
                      value={g?.comments || ""}
                      onChange={e => setComments(enr.id, e.target.value)}
                    />
                  </td>
                  <td className="py-3 pr-6 text-right">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleSave(enr.id)}
                      disabled={loading === enr.id || loading === "all"}
                      title="Save this student's grade"
                      className={isSaved
                        ? "border-emerald-200 text-emerald-600 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : ""
                      }
                    >
                      {loading === enr.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : isSaved
                          ? <Check className="w-4 h-4" />
                          : <Save className="w-4 h-4" />
                      }
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {pageEnrollments.length === 0 && (
          <div className="p-12 text-center text-slate-500 italic">
            {search ? `No students match "${search}"` : "No students enrolled in this section."}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-slate-500 font-medium">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Student Assignment Breakdown Modal */}
      {activeStudentBreakdown && (() => {
        const student = activeStudentBreakdown.student
        const studentGrades = dbGrades.filter(g => g.studentId === student.id)
        
        // Calculate dynamic overall grade based on section configurations
        const studentGradesList = assignments.map(a => {
          const matchingGrade = studentGrades.find(g => g.assignmentId === a.id)
          return matchingGrade !== undefined ? { assignmentId: a.id, score: matchingGrade.score } : null
        }).filter(Boolean) as { assignmentId: string; score: number }[]

        const calculatedPct = studentGradesList.length > 0
          ? calculateGrade({ weightingConfig }, assignments, studentGradesList)
          : null

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">{student.user.name}</h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">Gradebook Breakdown</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {calculatedPct !== null && (
                    <div className="text-right">
                      <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">{calculatedPct.toFixed(1)}%</div>
                      <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Calc Grade: {getLetterGrade(calculatedPct, gradingScale)}</div>
                    </div>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full"
                    onClick={() => setActiveStudentBreakdown(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Scrollable list */}
              <div className="p-6 overflow-y-auto space-y-4">
                {assignments.length === 0 ? (
                  <p className="text-center text-slate-500 italic py-8">No assignments posted for this course.</p>
                ) : (
                  <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 font-bold uppercase tracking-widest text-[9px] text-slate-400">
                          <th className="py-3 px-4">Assignment</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Due Date</th>
                          <th className="py-3 px-4 text-right">Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-medium">
                        {assignments.map(a => {
                          const grade = studentGrades.find(g => g.assignmentId === a.id)
                          const scoreText = grade !== undefined ? `${grade.score} / ${a.maxScore ?? 100}` : "—"
                          const pct = grade !== undefined && a.maxScore ? (grade.score / a.maxScore) * 100 : null
                          
                          return (
                            <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                              <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{a.title}</td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  {a.type}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-400">
                                {new Date(a.dueDate).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" })}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold">
                                <div>{scoreText}</div>
                                {pct !== null && (
                                  <div className="text-[9px] text-indigo-500 font-bold">{pct.toFixed(0)}%</div>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/20 text-right">
                <Button
                  onClick={() => {
                    if (calculatedPct !== null) {
                      setScore(activeStudentBreakdown.id, calculatedPct.toFixed(1))
                      toast.success(`Copied calculated score ${calculatedPct.toFixed(1)}% to input`)
                    }
                    setActiveStudentBreakdown(null)
                  }}
                  disabled={calculatedPct === null}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl"
                >
                  Use Calculated Grade ({calculatedPct !== null ? `${calculatedPct.toFixed(0)}%` : "N/A"})
                </Button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
