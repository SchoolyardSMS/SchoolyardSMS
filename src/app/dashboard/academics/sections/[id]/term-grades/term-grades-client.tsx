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
import { TermGradesTable } from "./term-grades-table"
import { TermGradesBreakdownModal } from "./term-grades-breakdown-modal"

import { resolveLetterGrade, parseTermGradeComments, calculateComposite, type EnrollmentRecord, type GradingScaleEntry, type GradeRecord, type TermGradeRecord, type AssignmentRecord } from "@/lib/term-grades-utils"

const PAGE_SIZE = 30
const EMPTY_ARRAY: any[] = []

export function TermGradesClient({
  sectionId,
  enrollments: allEnrollments,
  termId,
  termName,
  gradingScale,
  assignments = EMPTY_ARRAY,
  grades: dbGrades = EMPTY_ARRAY,
  weightingConfig = null,
  selectedTerm = null,
  allTerms = EMPTY_ARRAY,
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

      {/* Grade Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <TermGradesTable
          pageEnrollments={pageEnrollments}
          termId={termId}
          grades={grades}
          gradingScale={gradingScale}
          selectedTerm={selectedTerm}
          isSecondSemester={isSecondSemester}
          allTerms={allTerms}
          setScore={setScore}
          setMidtermScore={setMidtermScore}
          setFinalScore={setFinalScore}
          setMidtermExempt={setMidtermExempt}
          setFinalExempt={setFinalExempt}
          setLetterGrade={setLetterGrade}
          setComments={setComments}
          handleSave={handleSave}
          loading={loading}
          setActiveStudentBreakdown={setActiveStudentBreakdown}
          resolveLetterGrade={resolveLetterGrade}
          normalizedGradingScale={normalizedGradingScale}
        />
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
      <TermGradesBreakdownModal
        activeStudentBreakdown={activeStudentBreakdown}
        setActiveStudentBreakdown={setActiveStudentBreakdown}
        dbGrades={dbGrades}
        assignments={assignments}
        selectedTerm={selectedTerm}
        allTerms={allTerms}
        grades={grades}
        gradingScale={gradingScale}
        weightingConfig={weightingConfig}
        isSecondSemester={isSecondSemester}
        setScore={setScore}
      />
    </div>
  )
}
