import { describe, it, expect } from "vitest"
import { calculateGrade, getLetterGrade, calculateGPA, calculateCompositeSemesterGrade, calculateCompositeYearGrade } from "../grading"
import type { AssignmentSummary, GradeSummary } from "../grading"
import { AssignmentType } from "@prisma/client"

// ── calculateGrade (unweighted) ──────────────────────────────────────────────
describe("calculateGrade — unweighted", () => {
  it("calculates percentage from total earned / total possible", () => {
    const assignments: AssignmentSummary[] = [
      { id: "a1", type: AssignmentType.HOMEWORK, maxScore: 100 },
      { id: "a2", type: AssignmentType.QUIZ, maxScore: 50 },
    ]
    const grades: GradeSummary[] = [
      { assignmentId: "a1", score: 90 },
      { assignmentId: "a2", score: 40 },
    ]
    // (90 + 40) / (100 + 50) * 100 = 86.67%
    const result = calculateGrade({ weightingConfig: null }, assignments, grades)
    expect(result).toBeCloseTo(86.67, 1)
  })

  it("returns 0 when no assignments", () => {
    expect(calculateGrade({}, [], [])).toBe(0)
  })

  it("returns 0 when all maxScores are null", () => {
    const assignments: AssignmentSummary[] = [
      { id: "a1", type: AssignmentType.HOMEWORK, maxScore: null },
    ]
    const grades: GradeSummary[] = [{ assignmentId: "a1", score: 80 }]
    expect(calculateGrade({}, assignments, grades)).toBe(0)
  })

  it("handles missing grades for some assignments", () => {
    const assignments: AssignmentSummary[] = [
      { id: "a1", type: AssignmentType.HOMEWORK, maxScore: 100 },
      { id: "a2", type: AssignmentType.QUIZ, maxScore: 100 },
    ]
    const grades: GradeSummary[] = [
      { assignmentId: "a1", score: 85 },
      // a2 has no grade
    ]
    // Only a1 is counted: 85/100 = 85%
    expect(calculateGrade({}, assignments, grades)).toBeCloseTo(85, 1)
  })
})

// ── calculateGrade (weighted) ────────────────────────────────────────────────
describe("calculateGrade — weighted", () => {
  it("applies category weights correctly", () => {
    const section = {
      weightingConfig: { HOMEWORK: 30, TEST: 70 },
    }
    const assignments: AssignmentSummary[] = [
      { id: "a1", type: AssignmentType.HOMEWORK, maxScore: 100 },
      { id: "a2", type: AssignmentType.TEST, maxScore: 100 },
    ]
    const grades: GradeSummary[] = [
      { assignmentId: "a1", score: 100 }, // 100% homework
      { assignmentId: "a2", score: 50 },  // 50% test
    ]
    // 1.0 * 30 + 0.5 * 70 = 30 + 35 = 65%
    expect(calculateGrade(section, assignments, grades)).toBeCloseTo(65, 1)
  })

  it("normalizes when not all weight categories have assignments", () => {
    const section = {
      weightingConfig: { HOMEWORK: 40, TEST: 60 },
    }
    const assignments: AssignmentSummary[] = [
      { id: "a1", type: AssignmentType.HOMEWORK, maxScore: 100 },
      // No TEST assignments
    ]
    const grades: GradeSummary[] = [
      { assignmentId: "a1", score: 80 },
    ]
    // Only HOMEWORK contributes: 0.8 * 40 = 32, normalize by 40 → 80%
    expect(calculateGrade(section, assignments, grades)).toBeCloseTo(80, 1)
  })
})

// ── getLetterGrade ───────────────────────────────────────────────────────────
describe("getLetterGrade", () => {
  it("returns A for 93+", () => {
    expect(getLetterGrade(93)).toBe("A")
    expect(getLetterGrade(100)).toBe("A")
  })

  it("returns A- for 90-92.9", () => {
    expect(getLetterGrade(90)).toBe("A-")
    expect(getLetterGrade(92.9)).toBe("A-")
  })

  it("returns B+ for 87-89.9", () => {
    expect(getLetterGrade(87)).toBe("B+")
  })

  it("returns F for below 60", () => {
    expect(getLetterGrade(59)).toBe("F")
    expect(getLetterGrade(0)).toBe("F")
  })

  it("uses custom grading scale when provided", () => {
    const scale = [
      { min: 90, letter: "Excellent" },
      { min: 70, letter: "Good" },
      { min: 50, letter: "Pass" },
      { min: 0, letter: "Fail" },
    ]
    expect(getLetterGrade(95, scale)).toBe("Excellent")
    expect(getLetterGrade(75, scale)).toBe("Good")
    expect(getLetterGrade(30, scale)).toBe("Fail")
  })

  it("returns F when custom scale doesn't cover the value", () => {
    const scale = [{ min: 90, letter: "A" }]
    expect(getLetterGrade(50, scale)).toBe("F")
  })
})

// ── calculateGPA ─────────────────────────────────────────────────────────────
describe("calculateGPA", () => {
  it("returns 4.0 for A on standard scale", () => {
    expect(calculateGPA(95)).toBe(4.0)
  })

  it("returns 0 for F", () => {
    expect(calculateGPA(30)).toBe(0.0)
  })

  it("returns raw percentage when gpaMax is 100", () => {
    expect(calculateGPA(87, 100)).toBe(87)
  })

  it("scales to custom max GPA", () => {
    // A = 4.0 base, scaled to 5.0: (4.0 / 4.0) * 5.0 = 5.0
    expect(calculateGPA(95, 5.0)).toBe(5.0)
  })
})

// ── calculateCompositeSemesterGrade ──────────────────────────────────────────
describe("calculateCompositeSemesterGrade", () => {
  it("averages quarters and applies exam weights (80/20)", () => {
    // Quarters avg = (90 + 80) / 2 = 85
    // 85 * 0.8 + 95 * 0.2 = 68 + 19 = 87
    const result = calculateCompositeSemesterGrade({
      quarterGrades: [90, 80],
      midtermScore: 95,
      finalScore: null
    })
    expect(result).toBeCloseTo(87, 1)
  })

  it("prioritizes final exam over midterm score if present", () => {
    // Quarters avg = 85
    // 85 * 0.8 + 100 * 0.2 = 68 + 20 = 88 (ignores midterm score of 95)
    const result = calculateCompositeSemesterGrade({
      quarterGrades: [90, 80],
      midtermScore: 95,
      finalScore: 100
    })
    expect(result).toBeCloseTo(88, 1)
  })

  it("defaults to 100% quarters average if exam is exempted", () => {
    // Quarters avg = 85. Midterm is 95 but exempted -> returns 85
    const result = calculateCompositeSemesterGrade({
      quarterGrades: [90, 80],
      midtermScore: 95,
      midtermExempt: true
    })
    expect(result).toBeCloseTo(85, 1)
  })

  it("defaults to 100% quarters average if no exam score is provided", () => {
    const result = calculateCompositeSemesterGrade({
      quarterGrades: [90, 80],
      midtermScore: null,
      finalScore: null
    })
    expect(result).toBeCloseTo(85, 1)
  })

  it("returns null if no quarter grades are provided", () => {
    expect(calculateCompositeSemesterGrade({ quarterGrades: [] })).toBeNull()
  })
})

// ── calculateCompositeYearGrade ──────────────────────────────────────────────
describe("calculateCompositeYearGrade", () => {
  it("averages semester averages", () => {
    expect(calculateCompositeYearGrade([90, 80])).toBeCloseTo(85, 1)
  })

  it("returns null if no semester grades", () => {
    expect(calculateCompositeYearGrade([])).toBeNull()
  })
})
