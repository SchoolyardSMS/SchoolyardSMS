"use server"

import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { DemographicUpdateSchema } from "@/lib/validations/sis"

export async function updateStudentDemographics(studentId: string, data: { dateOfBirth: Date; gradeLevel: number }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" }

    const parsedData = DemographicUpdateSchema.parse(data)

    await db.student.update({
      where: { id: studentId },
      data: {
        dateOfBirth: parsedData.dateOfBirth,
        gradeLevel: parsedData.gradeLevel
      }
    })

    revalidatePath(`/dashboard/directory/${studentId}`)
    revalidatePath(`/dashboard/admin/students/${studentId}/edit`)

    return { success: true }
  } catch (error: any) {
    console.error("updateStudentDemographics error:", error)
    return { success: false, error: error.message || "Failed to update demographics" }
  }
}

export async function linkParentToStudent(studentId: string, parentUserId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" }

    const parent = await db.parent.findUnique({
      where: { userId: parentUserId }
    })

    if (!parent) return { success: false, error: "Parent profile not found for this user" }

    await db.parentStudent.upsert({
      where: {
        parentId_studentId: {
          parentId: parent.id,
          studentId
        }
      },
      update: {},
      create: {
        parentId: parent.id,
        studentId
      }
    })

    revalidatePath(`/dashboard/directory/${studentId}`)
    revalidatePath(`/dashboard/admin/students/${studentId}/edit`)
    
    return { success: true }
  } catch (error: any) {
    console.error("linkParentToStudent error:", error)
    return { success: false, error: error.message || "Failed to link parent" }
  }
}

export async function unlinkParentFromStudent(studentId: string, parentId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" }

    await db.parentStudent.delete({
      where: {
        parentId_studentId: {
          parentId,
          studentId
        }
      }
    })

    revalidatePath(`/dashboard/directory/${studentId}`)
    revalidatePath(`/dashboard/admin/students/${studentId}/edit`)
    
    return { success: true }
  } catch (error: any) {
    console.error("unlinkParentFromStudent error:", error)
    return { success: false, error: error.message || "Failed to unlink parent" }
  }
}
