import { calculateCompositeSemesterGrade, calculateCompositeYearGrade } from "@/lib/grading"

export type GradingScaleEntry = { min: number; letter: string }

export type TermGradeRecord = {
  termId: string
  isPosted?: boolean
  overrideScore?: number | null
  calculatedScore?: number | null
  letterGrade?: string | null
  comments?: string | null
}

export type EnrollmentRecord = {
  id: string
  student: { user: { name: string } }
  termGrades?: TermGradeRecord[]
}

export type GradeRecord = { studentId: string; assignmentId: string; score: number }
export type AssignmentRecord = { id: string; title: string; dueDate: string | Date; type: any; maxScore: number | null }

// Client-side letter grade lookup — mirrors lib/grading.ts
export function resolveLetterGrade(score: string, gradingScale: unknown): string {
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
