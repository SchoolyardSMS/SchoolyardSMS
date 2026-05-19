"use server"

import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { calculateGrade, getLetterGrade } from "@/lib/grading"
import { assertRole } from "@/lib/rbac"

export async function checkSchoolWideGradesSubmission(termId: string) {
  try {
    const session = await getServerSession(authOptions)
    assertRole(session, ["ADMIN"])

    // 1. Find the selected term
    const term = await db.term.findUnique({
      where: { id: termId }
    })
    if (!term) return { success: false, error: "Term not found" }

    // Collect all ancestor term IDs recursively (e.g. Year 1 under which Q1 resides)
    const ancestorIds: string[] = []
    let currentParentId = term.parentId
    while (currentParentId) {
      ancestorIds.push(currentParentId)
      const parentTerm = await db.term.findUnique({
        where: { id: currentParentId }
      })
      currentParentId = parentTerm?.parentId || null
    }

    const relevantTermIds = [termId, ...ancestorIds]

    // 2. Find all sections that are linked to any of these term IDs
    const sections = await db.section.findMany({
      where: { termId: { in: relevantTermIds } },
      include: {
        course: true,
        teacher: { include: { user: true } },
        enrollments: {
          where: { status: "ENROLLED" }
        }
      }
    })

    const statusList = []
    let allFinished = true

    for (const section of sections) {
      const enrollmentIds = section.enrollments.map(e => e.id)
      
      // Count how many enrollments have posted term grades for this term
      const postedGradesCount = await db.termGrade.count({
        where: {
          termId: termId,
          enrollmentId: { in: enrollmentIds },
          isPosted: true
        }
      })

      const missingCount = section.enrollments.length - postedGradesCount
      const isFinished = missingCount <= 0

      if (!isFinished) {
        allFinished = false
      }

      statusList.push({
        sectionId: section.id,
        courseCode: section.course.code,
        courseName: section.course.name,
        teacherName: section.teacher.user.name,
        enrolledCount: section.enrollments.length,
        postedCount: postedGradesCount,
        missingCount,
        isFinished
      })
    }

    return {
      success: true,
      allFinished,
      statusList
    }
  } catch (error: any) {
    console.error("checkSchoolWideGradesSubmission error:", error)
    return { success: false, error: error.message || "Failed to check submissions" }
  }
}

export async function runSchoolWideReset(termId: string) {
  try {
    const session = await getServerSession(authOptions)
    assertRole(session, ["ADMIN"])

    const term = await db.term.findUnique({
      where: { id: termId }
    })
    if (!term) return { success: false, error: "Term not found" }

    // Collect all ancestor term IDs recursively (e.g. Year 1 under which Q1 resides)
    const ancestorIds: string[] = []
    let currentParentId = term.parentId
    while (currentParentId) {
      ancestorIds.push(currentParentId)
      const parentTerm = await db.term.findUnique({
        where: { id: currentParentId }
      })
      currentParentId = parentTerm?.parentId || null
    }

    const relevantTermIds = [termId, ...ancestorIds]

    // 1. Fetch all active sections for these term IDs
    const sections = await db.section.findMany({
      where: { termId: { in: relevantTermIds } },
      include: {
        enrollments: {
          where: { status: "ENROLLED" },
          include: { student: { include: { user: true } } }
        },
        assignments: {
          where: { isArchived: false, status: { in: ["PUBLISHED", "CLOSED"] } }
        }
      }
    })

    const schoolSettings = await db.schoolSettings.findUnique({
      where: { id: "singleton" }
    })
    const gradingScale = Array.isArray(schoolSettings?.gradingScale) ? schoolSettings.gradingScale : []

    // 2. Loop through every section and snapshot grades & archive assignments
    for (const section of sections) {
      const activeAssignmentIds = section.assignments.map(a => a.id)
      const activeGrades = await db.grade.findMany({
        where: { assignmentId: { in: activeAssignmentIds } }
      })

      for (const enrollment of section.enrollments) {
        const studentGrades = activeGrades.filter(g => g.studentId === enrollment.student.id)
        const studentGradesList = section.assignments.map(a => {
          const matchingGrade = studentGrades.find(g => g.assignmentId === a.id)
          return matchingGrade !== undefined ? { assignmentId: a.id, score: matchingGrade.score } : null
        }).filter(Boolean) as { assignmentId: string; score: number }[]

        const score = studentGradesList.length > 0
          ? calculateGrade(section, section.assignments as any, studentGradesList)
          : null

        if (score !== null) {
          const letter = getLetterGrade(score, gradingScale)
          await db.termGrade.upsert({
            where: {
              enrollmentId_termId: {
                enrollmentId: enrollment.id,
                termId: termId
              }
            },
            update: {
              calculatedScore: score,
              overrideScore: score,
              letterGrade: letter,
              isPosted: true,
              postedAt: new Date()
            },
            create: {
              enrollmentId: enrollment.id,
              termId: termId,
              calculatedScore: score,
              overrideScore: score,
              letterGrade: letter,
              isPosted: true,
              postedAt: new Date()
            }
          })
        }
      }

      // Archive all active assignments in this section and assign them to this term
      await db.assignment.updateMany({
        where: { sectionId: section.id, isArchived: false },
        data: { isArchived: true, archivedInTermId: termId }
      })
    }

    revalidatePath("/dashboard/academics/sections")
    revalidatePath("/dashboard/admin/calendar/terms")

    return { success: true }
  } catch (error: any) {
    console.error("runSchoolWideReset error:", error)
    return { success: false, error: error.message || "Failed to execute school-wide reset" }
  }
}
