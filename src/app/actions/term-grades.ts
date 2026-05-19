"use server"

import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { TermGradeUpdateSchema } from "@/lib/validations/sis"
import { assertRole } from "@/lib/rbac"

export async function saveTermGrade(
  enrollmentId: string,
  termId: string,
  data: {
    calculatedScore?: number | null;
    overrideScore?: number | null;
    letterGrade?: string | null;
    comments?: string | null;
  }
) {
  try {
    const session = await getServerSession(authOptions)
    assertRole(session, ["ADMIN", "TEACHER"])

    const parsedData = TermGradeUpdateSchema.parse(data)

    // Ensure the user is the teacher for this section, or an admin
    const enrollment = await db.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { section: { include: { teacher: true } } }
    })

    if (!enrollment) return { success: false, error: "Enrollment not found" }

    if (session.user.role === "TEACHER" && enrollment.section.teacher.userId !== session.user.id) {
      return { success: false, error: "You do not have permission to grade this section" }
    }

    await db.termGrade.upsert({
      where: {
        enrollmentId_termId: {
          enrollmentId,
          termId
        }
      },
      update: {
        ...parsedData,
        isPosted: true,
        postedAt: new Date()
      },
      create: {
        enrollmentId,
        termId,
        ...parsedData,
        isPosted: true,
        postedAt: new Date()
      }
    })

    revalidatePath(`/dashboard/academics/sections/${enrollment.sectionId}/term-grades`)
    return { success: true }
  } catch (error: any) {
    console.error("saveTermGrade error:", error)
    return { success: false, error: error.message || "Failed to save grade" }
  }
}
