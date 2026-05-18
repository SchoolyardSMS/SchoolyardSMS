"use server"

import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { calculateGPA, getLetterGrade } from "@/lib/grading"

export async function publishReportCards(termId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user?.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" }
    }

    // 1. Find all TermGrades for this term
    const termGrades = await db.termGrade.findMany({
      where: { termId, isPosted: true },
      include: {
        enrollment: {
          include: {
            student: { include: { user: true } },
            section: {
              include: {
                course: true,
                teacher: { include: { user: true } }
              }
            }
          }
        }
      }
    })

    if (termGrades.length === 0) {
      return { success: false, error: "No posted term grades found for this term." }
    }

    // Group by student
    const studentGradesMap = new Map<string, any[]>()
    for (const tg of termGrades) {
      const studentId = tg.enrollment.studentId
      if (!studentGradesMap.has(studentId)) {
        studentGradesMap.set(studentId, [])
      }
      studentGradesMap.get(studentId)!.push(tg)
    }

    // 2. Fetch school settings for GPA calculations
    const schoolSettings = await (db as any).schoolSettings.findUnique({ where: { id: "singleton" } })

    // 3. Create or update ReportCard for each student
    for (const [studentId, grades] of studentGradesMap.entries()) {
      const student = grades[0].enrollment.student

      // Calculate Attendance Summary
      const attendance = await db.attendance.findMany({ 
        where: { 
          studentId, 
          section: { termId } // Only attendance for this term's sections, or all? Usually all for the term's timeframe. 
        } 
      })
      
      // For simplicity, just total attendance for the student
      const totalDays = attendance.length
      const absent = attendance.filter(a => a.status === "ABSENT").length
      const tardy = attendance.filter(a => a.status === "TARDY").length

      // Map grades for snapshot
      const snapshotGrades = grades.map(tg => {
        const score = tg.overrideScore ?? tg.calculatedScore ?? 0
        const letter = tg.letterGrade ?? getLetterGrade(score, schoolSettings?.gradingScale)
        const gpa = calculateGPA(score, schoolSettings?.gpaScale || 4.0, schoolSettings?.gradingScale)

        return {
          courseName: tg.enrollment.section.course.name,
          teacherName: tg.enrollment.section.teacher.user.name,
          score,
          letterGrade: letter,
          comments: tg.comments,
          gpa
        }
      })

      const totalGPA = snapshotGrades.length > 0 
        ? snapshotGrades.reduce((acc, curr) => acc + curr.gpa, 0) / snapshotGrades.length 
        : 0

      const snapshot = {
        student: {
          name: student.user.name,
          id: student.id,
          gradeLevel: student.gradeLevel
        },
        attendance: {
          totalDays,
          absent,
          tardy,
          presence: totalDays > 0 ? ((totalDays - absent) / totalDays * 100).toFixed(0) : "100"
        },
        grades: snapshotGrades,
        totalGPA
      }

      await db.reportCard.upsert({
        where: {
          studentId_termId: {
            studentId,
            termId
          }
        },
        update: {
          snapshot,
          isPublished: true,
          publishedAt: new Date()
        },
        create: {
          studentId,
          termId,
          snapshot,
          isPublished: true,
          publishedAt: new Date()
        }
      })
    }

    revalidatePath("/dashboard/academics/reports")
    return { success: true, count: studentGradesMap.size }
  } catch (error: any) {
    console.error("publishReportCards error:", error)
    return { success: false, error: error.message || "Failed to publish report cards" }
  }
}
