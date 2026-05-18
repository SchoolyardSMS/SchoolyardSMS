"use server"

import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { HealthUpdateSchema } from "@/lib/validations/sis"

export async function updateStudentHealth(studentId: string, data: { medicalAlerts?: string | null; accommodations?: string | null }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user?.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" }
    }

    const parsedData = HealthUpdateSchema.parse(data)

    await db.student.update({
      where: { id: studentId },
      data: {
        medicalAlerts: parsedData.medicalAlerts,
        accommodations: parsedData.accommodations
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
