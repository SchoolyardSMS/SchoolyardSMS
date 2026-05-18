import { Assignment, Grade, Section } from "@prisma/client"

export function calculateGrade(
  section: { weightingConfig?: any },
  assignments: { id: string, type: string, maxScore: number }[],
  grades: { assignmentId: string, score: number }[]
): number {
  if (!assignments || assignments.length === 0) return 0

  const hasWeighting = section.weightingConfig && Object.keys(section.weightingConfig).length > 0
  const config = section.weightingConfig as Record<string, number>

  if (!hasWeighting) {
    // Unweighted standard calculation (total earned / total possible)
    let earned = 0
    let possible = 0
    for (const g of grades) {
      const a = assignments.find((a) => a.id === g.assignmentId)
      if (a) {
        earned += g.score
        possible += a.maxScore
      }
    }
    return possible > 0 ? (earned / possible) * 100 : 0
  }

  // Weighted calculation
  let finalPercentage = 0
  let totalWeightAccounted = 0

  // Group assignments by type
  const types = Object.keys(config)
  for (const type of types) {
    const weight = config[type]
    const typeAssignments = assignments.filter((a) => a.type === type)
    if (typeAssignments.length === 0) continue

    let typeEarned = 0
    let typePossible = 0

    for (const a of typeAssignments) {
      const g = grades.find((g) => g.assignmentId === a.id)
      if (g) {
        typeEarned += g.score
        typePossible += a.maxScore
      }
    }

    if (typePossible > 0) {
      const typePct = (typeEarned / typePossible) // e.g. 0.85
      finalPercentage += typePct * weight
      totalWeightAccounted += weight
    }
  }

  // Normalize if not all weight categories have assignments yet
  if (totalWeightAccounted > 0 && totalWeightAccounted < 100) {
    return (finalPercentage / totalWeightAccounted) * 100
  }

  return finalPercentage
}

export function getLetterGrade(
  pct: number, 
  gradingScale?: any
): string {
  if (!gradingScale || !Array.isArray(gradingScale)) {
    // Standard default scale
    if (pct >= 93) return "A"
    if (pct >= 90) return "A-"
    if (pct >= 87) return "B+"
    if (pct >= 83) return "B"
    if (pct >= 80) return "B-"
    if (pct >= 77) return "C+"
    if (pct >= 73) return "C"
    if (pct >= 70) return "C-"
    if (pct >= 60) return "D"
    return "F"
  }

  // Sort scale descending by min percentage
  const sortedScale = [...gradingScale].sort((a, b) => b.min - a.min)
  for (const entry of sortedScale) {
    if (pct >= entry.min) return entry.letter
  }
  return "F"
}

export function calculateGPA(
  pct: number, 
  gpaMax: number = 4.0,
  gradingScale?: any
): number {
  // Simple linear mapping for demo, usually scales are stepped (e.g. A=4.0, B=3.0)
  // Let's implement a stepped mapping based on the letter grade
  const letter = getLetterGrade(pct, gradingScale)
  
  const map: Record<string, number> = {
    "A": 4.0, "A-": 3.7,
    "B+": 3.3, "B": 3.0, "B-": 2.7,
    "C+": 2.3, "C": 2.0, "C-": 1.7,
    "D+": 1.3, "D": 1.0,
    "F": 0.0
  }

  const baseGPA = map[letter] ?? 0.0
  
  // Scale based on gpaMax (e.g. if max is 5.0, multiply by 1.25)
  if (gpaMax === 100) return pct
  return (baseGPA / 4.0) * gpaMax
}
