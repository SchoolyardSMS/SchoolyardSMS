"use server"

import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { HealthUpdateSchema } from "@/lib/validations/sis"
import { assertRole } from "@/lib/rbac"
import { encrypt } from "@/lib/encryption"

export async function updateStudentHealth(studentId: string, data: { medicalAlerts?: string | null; accommodations?: string | null }) {
  try {
    const session = await getServerSession(authOptions)
    assertRole(session, ["ADMIN"])

    const parsedData = HealthUpdateSchema.parse(data)

    await db.student.update({
      where: { id: studentId },
      data: {
        medicalAlerts: encrypt(parsedData.medicalAlerts),
        accommodations: encrypt(parsedData.accommodations)
      }
    })

    revalidatePath(`/dashboard/directory/${studentId}`)
    revalidatePath(`/dashboard/admin/students/${studentId}/health`)

    return { success: true }
  } catch (error: any) {
    console.error("updateStudentHealth error:", error)
    return { success: false, error: error.message || "Failed to update health records" }
  }
}
