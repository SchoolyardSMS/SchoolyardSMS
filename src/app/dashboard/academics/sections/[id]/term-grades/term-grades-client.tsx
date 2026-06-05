"use client"

import { useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { saveTermGrade } from "@/app/actions/term-grades"
import { Check, Loader2, Save, Search, X, ChevronLeft, ChevronRight, Wand2, BarChart3, BookOpen } from "lucide-react"
import { toast } from "sonner"
import { calculateGrade, getLetterGrade, calculateCompositeSemesterGrade, calculateCompositeYearGrade } from "@/lib/grading"
import { type AssignmentType, type Prisma } from "@prisma/client"

type GradingScaleEntry = { min: number; letter: string }

type TermGradeRecord = {
  termId: string
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

// Comments parser to extract structured exam data without DB migrations
export function parseTermGradeComments(commentsStr?: string | null) {
  if (!commentsStr) return { comment: "", midtermScore: null, finalScore: null, midtermExempt: false, finalExempt: false }
  try {
    const parsed = JSON.parse(commentsStr)
    if (parsed && typeof parsed === "object" && ("midtermScore" in parsed || "finalScore" in parsed || "midtermExempt" in parsed || "finalExempt" in parsed)) {
      return {
        comment: parsed.comment || "",
        midtermScore: parsed.midtermScore !== undefined ? parsed.midtermScore : null,
        finalScore: parsed.finalScore !== undefined ? parsed.finalScore : null,
        midtermExempt: !!parsed.midtermExempt,
        finalExempt: !!parsed.finalExempt
      }
    }
  } catch (e) {
    // Not JSON
  }
  return { comment: commentsStr, midtermScore: null, finalScore: null, midtermExempt: false, finalExempt: false }
}

// Composite grade calculator based on parent-child term hierarchy
export function calculateComposite(
  enr: EnrollmentRecord,
  selectedTerm: any,
  allTerms: any[],
  currentGradesState?: Record<string, any>
): number | null {
  if (!selectedTerm || !allTerms || allTerms.length === 0) return null

  if (selectedTerm.type === "SEMESTER") {
    // Child terms are Quarters
    const childQuarters = allTerms.filter(t => t.parentId === selectedTerm.id && t.type === "QUARTER")
    const childQuarterIds = childQuarters.map(q => q.id)
    
    // Get scores for these child quarters
    const quarterScores: number[] = []
    enr.termGrades?.forEach(tg => {
      if (childQuarterIds.includes(tg.termId) && tg.isPosted) {
        const score = tg.overrideScore ?? tg.calculatedScore
        if (score !== null && score !== undefined) {
          quarterScores.push(score)
        }
      }
    })

    if (quarterScores.length === 0) return null

    // Get exam score and exemption from current state or DB
    let midterm: number | null = null
    let finalExam: number | null = null
    let isMidtermExempt = false
    let isFinalExempt = false

    if (currentGradesState?.[enr.id]) {
      const state = currentGradesState[enr.id]
      midterm = state.midtermScore ? parseFloat(state.midtermScore) : null
      finalExam = state.finalScore ? parseFloat(state.finalScore) : null
      isMidtermExempt = state.midtermExempt
      isFinalExempt = state.finalExempt
    } else {
      const tg = enr.termGrades?.find(t => t.termId === selectedTerm.id)
      const parsed = parseTermGradeComments(tg?.comments)
      midterm = parsed.midtermScore
      finalExam = parsed.finalScore
      isMidtermExempt = parsed.midtermExempt
      isFinalExempt = parsed.finalExempt
    }

    return calculateCompositeSemesterGrade({
      quarterGrades: quarterScores,
      midtermScore: midterm,
      finalScore: finalExam,
      midtermExempt: isMidtermExempt,
      finalExempt: isFinalExempt
    })
  }

  if (selectedTerm.type === "YEAR") {
    // Child terms are Semesters
    const childSemesters = allTerms.filter(t => t.parentId === selectedTerm.id && t.type === "SEMESTER")
    const childSemesterIds = childSemesters.map(s => s.id)

    const semesterScores: number[] = []
    enr.termGrades?.forEach(tg => {
      if (childSemesterIds.includes(tg.termId) && tg.isPosted) {
        const score = tg.overrideScore ?? tg.calculatedScore
        if (score !== null && score !== undefined) {
          semesterScores.push(score)
        }
      }
    })

    if (semesterScores.length === 0) return null
    return calculateCompositeYearGrade(semesterScores)
  }

  return null
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
  selectedTerm = null,
  allTerms = [],
}: {
  sectionId: string
  enrollments: EnrollmentRecord[]
  termId: string
  termName: string
  gradingScale?: Prisma.JsonValue | undefined
  assignments?: AssignmentRecord[]
  grades?: GradeRecord[]
  weightingConfig?: Prisma.JsonValue | undefined
  selectedTerm?: any
  allTerms?: any[]
}) {
  const [loading, setLoading] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [activeStudentBreakdown, setActiveStudentBreakdown] = useState<any | null>(null)

  const isSecondSemester = selectedTerm?.name?.toLowerCase().includes("spring") ||
                           selectedTerm?.name?.toLowerCase().includes("2") ||
                           selectedTerm?.name?.toLowerCase().includes("second") ||
                           selectedTerm?.name?.toLowerCase().includes("final")

  const [grades, setGrades] = useState<Record<string, {
    overrideScore: string
    letterGrade: string
    comments: string
    midtermScore: string
    finalScore: string
    midtermExempt: boolean
    finalExempt: boolean
  }>>(() => {
    const init: Record<string, any> = {}
    allEnrollments.forEach(enr => {
      const tg = enr.termGrades?.find(t => t.termId === termId)
      const parsed = parseTermGradeComments(tg?.comments)
      
      // Auto-compute composite averages for Semester/Year on load
      const composite = calculateComposite(enr, selectedTerm, allTerms)
      const score = tg?.overrideScore?.toString() || tg?.calculatedScore?.toString() || (composite !== null ? composite.toFixed(1) : "") || ""
      
      init[enr.id] = {
        overrideScore: score,
        letterGrade: tg?.letterGrade || (score ? resolveLetterGrade(score, gradingScale) : ""),
        comments: parsed.comment || "",
        midtermScore: parsed.midtermScore?.toString() || "",
        finalScore: parsed.finalScore?.toString() || "",
        midtermExempt: parsed.midtermExempt,
        finalExempt: parsed.finalExempt
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

  const setMidtermScore = useCallback((enrollmentId: string, scoreVal: string) => {
    setGrades(prev => {
      const studentGrades = { ...prev[enrollmentId], midtermScore: scoreVal }
      const enr = allEnrollments.find(e => e.id === enrollmentId)!
      const composite = calculateComposite(enr, selectedTerm, allTerms, { ...prev, [enrollmentId]: studentGrades })
      const overrideScore = composite !== null ? composite.toFixed(1) : ""
      return {
        ...prev,
        [enrollmentId]: {
          ...studentGrades,
          overrideScore,
          letterGrade: overrideScore ? resolveLetterGrade(overrideScore, gradingScale) : studentGrades.letterGrade
        }
      }
    })
  }, [allEnrollments, selectedTerm, allTerms, gradingScale])

  const setFinalScore = useCallback((enrollmentId: string, scoreVal: string) => {
    setGrades(prev => {
      const studentGrades = { ...prev[enrollmentId], finalScore: scoreVal }
      const enr = allEnrollments.find(e => e.id === enrollmentId)!
      const composite = calculateComposite(enr, selectedTerm, allTerms, { ...prev, [enrollmentId]: studentGrades })
      const overrideScore = composite !== null ? composite.toFixed(1) : ""
      return {
        ...prev,
        [enrollmentId]: {
          ...studentGrades,
          overrideScore,
          letterGrade: overrideScore ? resolveLetterGrade(overrideScore, gradingScale) : studentGrades.letterGrade
        }
      }
    })
  }, [allEnrollments, selectedTerm, allTerms, gradingScale])

  const setMidtermExempt = useCallback((enrollmentId: string, exemptVal: boolean) => {
    setGrades(prev => {
      const studentGrades = { ...prev[enrollmentId], midtermExempt: exemptVal }
      const enr = allEnrollments.find(e => e.id === enrollmentId)!
      const composite = calculateComposite(enr, selectedTerm, allTerms, { ...prev, [enrollmentId]: studentGrades })
      const overrideScore = composite !== null ? composite.toFixed(1) : ""
      return {
        ...prev,
        [enrollmentId]: {
          ...studentGrades,
          overrideScore,
          letterGrade: overrideScore ? resolveLetterGrade(overrideScore, gradingScale) : studentGrades.letterGrade
        }
      }
    })
  }, [allEnrollments, selectedTerm, allTerms, gradingScale])

  const setFinalExempt = useCallback((enrollmentId: string, exemptVal: boolean) => {
    setGrades(prev => {
      const studentGrades = { ...prev[enrollmentId], finalExempt: exemptVal }
      const enr = allEnrollments.find(e => e.id === enrollmentId)!
      const composite = calculateComposite(enr, selectedTerm, allTerms, { ...prev, [enrollmentId]: studentGrades })
      const overrideScore = composite !== null ? composite.toFixed(1) : ""
      return {
        ...prev,
        [enrollmentId]: {
          ...studentGrades,
          overrideScore,
          letterGrade: overrideScore ? resolveLetterGrade(overrideScore, gradingScale) : studentGrades.letterGrade
        }
      }
    })
  }, [allEnrollments, selectedTerm, allTerms, gradingScale])

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

      // Serialize exam score details if it's a semester term
      const packedComments = selectedTerm?.type === "SEMESTER"
        ? JSON.stringify({
            comment: data.comments || "",
            midtermScore: data.midtermScore ? parseFloat(data.midtermScore) : null,
            finalScore: data.finalScore ? parseFloat(data.finalScore) : null,
            midtermExempt: data.midtermExempt,
            finalExempt: data.finalExempt
          })
        : data.comments || null

      const res = await saveTermGrade(enrollmentId, termId, {
        overrideScore: data.overrideScore ? parseFloat(data.overrideScore) : null,
        letterGrade: data.letterGrade || null,
        comments: packedComments
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
      return d.overrideScore || d.letterGrade || d.comments || d.midtermScore || d.finalScore
    })
    if (toSave.length === 0) {
      toast.info("No grades to save on this page")
      setLoading(null)
      return
    }

    const results = await Promise.allSettled(
      toSave.map(enr => {
        const data = grades[enr.id]

        // Serialize exam score details if it's a semester term
        const packedComments = selectedTerm?.type === "SEMESTER"
          ? JSON.stringify({
              comment: data.comments || "",
              midtermScore: data.midtermScore ? parseFloat(data.midtermScore) : null,
              finalScore: data.finalScore ? parseFloat(data.finalScore) : null,
              midtermExempt: data.midtermExempt,
              finalExempt: data.finalExempt
            })
          : data.comments || null

        return saveTermGrade(enr.id, termId, {
          overrideScore: data.overrideScore ? parseFloat(data.overrideScore) : null,
          letterGrade: data.letterGrade || null,
          comments: packedComments
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

  const postedCount = allEnrollments.filter(enr => enr.termGrades?.find(t => t.termId === termId)?.isPosted).length

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
            <button type="button" onClick={() => { setSearch(""); setPage(0) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
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
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <th className="py-3 pl-6 text-[10px] font-black uppercase tracking-widest text-slate-500 w-1/4">Student</th>
              {selectedTerm?.type === "SEMESTER" && (
                <th className="py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 w-[240px]">
                  {isSecondSemester ? "Final Exam" : "Midterm Exam"}
                </th>
              )}
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
              const tg = enr.termGrades?.find(t => t.termId === termId)
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
                    <div className="text-[10px] text-slate-400 mt-0.5 font-semibold">
                      {selectedTerm?.type === "SEMESTER" ? (
                        <>
                          Quarters Avg: {(() => {
                            const childQuarters = allTerms.filter(t => t.parentId === selectedTerm.id && t.type === "QUARTER")
                            const quarterScores: { name: string; score: number }[] = []
                            enr.termGrades?.forEach(tgRec => {
                              const match = childQuarters.find(q => q.id === tgRec.termId)
                              if (match && tgRec.isPosted) {
                                const score = tgRec.overrideScore ?? tgRec.calculatedScore
                                if (score !== null && score !== undefined) {
                                  quarterScores.push({ name: match.name, score })
                                }
                              }
                            })
                            if (quarterScores.length > 0) {
                              const avg = quarterScores.reduce((s, v) => s + v.score, 0) / quarterScores.length
                              const listStr = quarterScores.map(q => `${q.name}: ${q.score.toFixed(1)}%`).join(", ")
                              return <span className="text-slate-600 dark:text-slate-400 font-bold">{avg.toFixed(1)}% <span className="text-slate-400 dark:text-slate-500 font-normal">({listStr})</span></span>
                            }
                            return <span className="text-slate-400 italic">No Quarter Grades Posted</span>
                          })()}
                        </>
                      ) : selectedTerm?.type === "YEAR" ? (
                        <>
                          Semesters Avg: {(() => {
                            const childSemesters = allTerms.filter(t => t.parentId === selectedTerm.id && t.type === "SEMESTER")
                            const semesterScores: { name: string; score: number }[] = []
                            enr.termGrades?.forEach(tgRec => {
                              const match = childSemesters.find(s => s.id === tgRec.termId)
                              if (match && tgRec.isPosted) {
                                const score = tgRec.overrideScore ?? tgRec.calculatedScore
                                if (score !== null && score !== undefined) {
                                  semesterScores.push({ name: match.name, score })
                                }
                              }
                            })
                            if (semesterScores.length > 0) {
                              const avg = semesterScores.reduce((s, v) => s + v.score, 0) / semesterScores.length
                              const listStr = semesterScores.map(s => `${s.name}: ${s.score.toFixed(1)}%`).join(", ")
                              return <span className="text-indigo-600 dark:text-indigo-400 font-bold">{avg.toFixed(1)}% <span className="text-slate-400 dark:text-slate-500 font-normal">({listStr})</span></span>
                            }
                            return <span className="text-slate-400 italic">No Semester Grades Posted</span>
                          })()}
                        </>
                      ) : (
                        `Calc: ${tg?.calculatedScore ? `${tg.calculatedScore.toFixed(1)}%` : "—"}`
                      )}
                    </div>
                  </td>
                  {selectedTerm?.type === "SEMESTER" && (
                    <td className="py-3 pr-3">
                      {isSecondSemester ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.1"
                            min={0}
                            max={120}
                            className="h-9 w-24 bg-transparent border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-800 dark:text-slate-200"
                            placeholder="Final Score"
                            value={g?.finalScore || ""}
                            onChange={e => setFinalScore(enr.id, e.target.value)}
                            disabled={g?.finalExempt}
                          />
                          <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
                            <input
                              type="checkbox"
                              checked={g?.finalExempt || false}
                              onChange={e => setFinalExempt(enr.id, e.target.checked)}
                              className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                            />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Exempt</span>
                          </label>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.1"
                            min={0}
                            max={120}
                            className="h-9 w-24 bg-transparent border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-800 dark:text-slate-200"
                            placeholder="Midterm Score"
                            value={g?.midtermScore || ""}
                            onChange={e => setMidtermScore(enr.id, e.target.value)}
                            disabled={g?.midtermExempt}
                          />
                          <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
                            <input
                              type="checkbox"
                              checked={g?.midtermExempt || false}
                              onChange={e => setMidtermExempt(enr.id, e.target.checked)}
                              className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                            />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Exempt</span>
                          </label>
                        </div>
                      )}
                    </td>
                  )}
                  <td className="py-3 pr-3">
                    <Input
                      type="number"
                      step="0.1"
                      min={0}
                      max={120}
                      className="h-9 w-28 bg-transparent border-slate-200 dark:border-slate-700 text-sm font-bold text-indigo-600 dark:text-indigo-400"
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
        </div>


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
      {/* Student Assignment Breakdown Modal */}
      {activeStudentBreakdown && (() => {
        const student = activeStudentBreakdown.student
        const studentGrades = dbGrades.filter(g => g.studentId === student.id)
        
        // Calculate dynamic overall grade based on section configurations
        const studentGradesList = assignments.flatMap(a => {
          const matchingGrade = studentGrades.find(g => g.assignmentId === a.id)
          return matchingGrade !== undefined ? [{ assignmentId: a.id, score: matchingGrade.score }] : []
        }) as { assignmentId: string; score: number }[]

        const isComposite = selectedTerm?.type === "SEMESTER" || selectedTerm?.type === "YEAR"
        
        const calculatedPct = isComposite
          ? calculateComposite(activeStudentBreakdown, selectedTerm, allTerms, grades)
          : (studentGradesList.length > 0
              ? calculateGrade({ weightingConfig }, assignments, studentGradesList)
              : null)

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
                {selectedTerm?.type === "SEMESTER" ? (
                  // SEMESTER COMPOSITE BREAKDOWN
                  (() => {
                    const childQuarters = allTerms.filter(t => t.parentId === selectedTerm.id && t.type === "QUARTER")
                    const quartersInfo: { name: string; score: number | null; letter: string }[] = childQuarters.map(q => {
                      const tgRec = activeStudentBreakdown.termGrades?.find((t: any) => t.termId === q.id)
                      const score = tgRec && tgRec.isPosted ? (tgRec.overrideScore ?? tgRec.calculatedScore ?? null) : null
                      return {
                        name: q.name,
                        score,
                        letter: score !== null ? resolveLetterGrade(score.toString(), gradingScale) : "—"
                      }
                    })

                    // Get current exam score/exemption from our React state
                    const state = grades[activeStudentBreakdown.id]
                    const midterm = state?.midtermScore ? parseFloat(state.midtermScore) : null
                    const finalExam = state?.finalScore ? parseFloat(state.finalScore) : null
                    const isMidtermExempt = !!state?.midtermExempt
                    const isFinalExempt = !!state?.finalExempt

                    const examScore = isSecondSemester ? finalExam : midterm
                    const examExempt = isSecondSemester ? isFinalExempt : isMidtermExempt
                    const examLabel = isSecondSemester ? "Final Exam" : "Midterm Exam"

                    const activeQuarters = quartersInfo.filter(q => q.score !== null) as { name: string; score: number }[]
                    const quartersAvg = activeQuarters.length > 0
                      ? activeQuarters.reduce((s, q) => s + q.score, 0) / activeQuarters.length
                      : null

                    return (
                      <div className="space-y-6">
                        {/* Table */}
                        <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-x-auto shadow-sm">
                          <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 font-bold uppercase tracking-widest text-[9px] text-slate-400">
                                <th className="py-3 px-4">Component</th>
                                <th className="py-3 px-4">Type</th>
                                <th className="py-3 px-4">Weight</th>
                                <th className="py-3 px-4 text-right">Score</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-medium">
                              {quartersInfo.map(q => (
                                <tr key={q.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                                  <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">{q.name}</td>
                                  <td className="py-3.5 px-4 text-slate-400 uppercase font-black tracking-widest text-[9px]">Quarter Grade</td>
                                  <td className="py-3.5 px-4 text-slate-500 font-semibold">{examExempt || examScore === null ? "50%" : "40%"}</td>
                                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                                    {q.score !== null ? `${q.score.toFixed(1)}%` : "—"}
                                    {q.score !== null && <span className="text-[10px] text-indigo-500 ml-1.5 font-bold">({q.letter})</span>}
                                  </td>
                                </tr>
                              ))}
                              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                                <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">{examLabel}</td>
                                <td className="py-3.5 px-4 text-indigo-500 uppercase font-black tracking-widest text-[9px]">Semester Exam</td>
                                <td className="py-3.5 px-4 text-slate-500 font-semibold">{examExempt || examScore === null ? "0% (Exempt)" : "20%"}</td>
                                <td className="py-3.5 px-4 text-right font-mono font-bold">
                                  {examExempt ? (
                                    <span className="text-amber-500 bg-amber-50 dark:bg-amber-950/20 px-2.5 py-0.5 rounded-md text-[10px] uppercase font-black tracking-wider border border-amber-200/50 dark:border-amber-900/30">Exempted</span>
                                  ) : examScore !== null ? (
                                    <span className="text-slate-900 dark:text-white font-black">{examScore.toFixed(1)}%</span>
                                  ) : (
                                    <span className="text-slate-400 italic">Not Graded</span>
                                  )}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Formula box */}
                        <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-3">
                          <h4 className="font-black text-[10px] text-slate-900 dark:text-slate-100 uppercase tracking-widest">Composite Calculation Breakdown</h4>
                          <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2.5 leading-relaxed">
                            {quartersAvg !== null ? (
                              <>
                                <p>1. Quarters Average: <span className="font-bold text-slate-800 dark:text-slate-200">{quartersAvg.toFixed(2)}%</span></p>
                                {examExempt || examScore === null ? (
                                  <div className="bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/20 p-3 rounded-xl text-emerald-800 dark:text-emerald-400 text-xs">
                                    <p className="font-bold mb-0.5">Exam Exempted / Not Graded</p>
                                    <p className="font-normal opacity-90">The semester grade is calculated as 100% of the Quarter average.</p>
                                    <div className="font-mono font-bold mt-2 text-sm text-center">
                                      Formula: {quartersAvg.toFixed(2)}% = {calculatedPct !== null ? `${calculatedPct.toFixed(1)}%` : "—"}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/20 p-3 rounded-xl text-indigo-950 dark:text-indigo-300 text-xs space-y-1.5">
                                    <p className="font-bold">Standard Weighting Applied:</p>
                                    <p className="font-normal">Quarters average contributes 80% and the Semester Exam contributes 20%.</p>
                                    <div className="font-mono font-bold mt-2 text-sm text-center bg-white dark:bg-slate-900 p-2.5 rounded-lg shadow-sm border border-indigo-100 dark:border-slate-800 text-indigo-600 dark:text-indigo-400">
                                      ({quartersAvg.toFixed(2)}% × 0.8) + ({examScore.toFixed(1)}% × 0.2) = {calculatedPct !== null ? `${calculatedPct.toFixed(1)}%` : "—"}
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              <p className="italic text-slate-400 text-center py-2">No Quarter scores available to compute averages.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })()
                ) : selectedTerm?.type === "YEAR" ? (
                  // YEAR COMPOSITE BREAKDOWN
                  (() => {
                    const childSemesters = allTerms.filter(t => t.parentId === selectedTerm.id && t.type === "SEMESTER")
                    const semestersInfo: { name: string; score: number | null; letter: string }[] = childSemesters.map(s => {
                      const tgRec = activeStudentBreakdown.termGrades?.find((t: any) => t.termId === s.id)
                      const score = tgRec && tgRec.isPosted ? (tgRec.overrideScore ?? tgRec.calculatedScore ?? null) : null
                      return {
                        name: s.name,
                        score,
                        letter: score !== null ? resolveLetterGrade(score.toString(), gradingScale) : "—"
                      }
                    })

                    const activeSemesters = semestersInfo.filter(s => s.score !== null) as { name: string; score: number }[]
                    const semestersAvg = activeSemesters.length > 0
                      ? activeSemesters.reduce((s, sem) => s + sem.score, 0) / activeSemesters.length
                      : null

                    return (
                      <div className="space-y-6">
                        {/* Table */}
                        <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-x-auto shadow-sm">
                          <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 font-bold uppercase tracking-widest text-[9px] text-slate-400">
                                <th className="py-3 px-4">Semester</th>
                                <th className="py-3 px-4">Type</th>
                                <th className="py-3 px-4">Weight</th>
                                <th className="py-3 px-4 text-right">Score</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-medium">
                              {semestersInfo.map(s => (
                                <tr key={s.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                                  <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">{s.name}</td>
                                  <td className="py-3.5 px-4 text-indigo-500 uppercase font-black tracking-widest text-[9px]">Semester Grade</td>
                                  <td className="py-3.5 px-4 text-slate-500 font-semibold">50%</td>
                                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                                    {s.score !== null ? `${s.score.toFixed(1)}%` : "—"}
                                    {s.score !== null && <span className="text-[10px] text-indigo-500 ml-1.5 font-bold">({s.letter})</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Formula box */}
                        <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-3">
                          <h4 className="font-black text-[10px] text-slate-900 dark:text-slate-100 uppercase tracking-widest">Composite Calculation Breakdown</h4>
                          <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2.5 leading-relaxed">
                            {semestersAvg !== null ? (
                              <div className="bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/20 p-3 rounded-xl text-indigo-950 dark:text-indigo-300 text-xs space-y-1.5">
                                <p className="font-bold">Standard Year Average Formula:</p>
                                <p className="font-normal">Calculated as the direct average of both semester grades (50% each).</p>
                                <div className="font-mono font-bold mt-2 text-sm text-center bg-white dark:bg-slate-900 p-2.5 rounded-lg shadow-sm border border-indigo-100 dark:border-slate-800 text-indigo-600 dark:text-indigo-400">
                                  ({semestersInfo.map(s => s.score !== null ? `${s.score.toFixed(1)}%` : "—").join(" + ")}) / 2 = {calculatedPct !== null ? `${calculatedPct.toFixed(1)}%` : "—"}
                                </div>
                              </div>
                            ) : (
                              <p className="italic text-slate-400 text-center py-2">No Semester scores available to compute averages.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })()
                ) : (
                  // STANDARD ASSIGNMENT LIST
                  assignments.length === 0 ? (
                    <p className="text-center text-slate-500 italic py-8">No assignments posted for this course.</p>
                  ) : (
                    <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs min-w-[500px]">
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
                  )
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
