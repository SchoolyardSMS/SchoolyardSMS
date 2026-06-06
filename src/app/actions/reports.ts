"use server"

import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { assertRole } from "@/lib/rbac"

const getDefaultLayout = () => ({
  sections: [
    { id: "header", type: "HEADER", config: { title: "Official Report Card", subtitle: "Schoolyard Academy", showLogo: true } },
    { id: "student_info", type: "STUDENT_INFO", config: { fields: ["name", "id", "gradeLevel"] } },
    { id: "grades", type: "GRADES_TABLE", config: { columns: ["Subject", "Instructor", "Term", "Percentage", "Grade"], headerColorHex: "#4F46E5" } },
    { id: "attendance", type: "ATTENDANCE_SUMMARY", config: { showTardy: true, showAbsent: true } },
    { id: "gpa", type: "GPA_SUMMARY", config: { label: "Cumulative Average" } },
    { id: "footer", type: "FOOTER", config: { text: "Official Enrollment Record - Schoolyard Academy" } }
  ]
})

export async function createReportCardTemplate(name: string) {
  const session = await getServerSession(authOptions)
  assertRole(session, ["ADMIN"])

  // Set as default if it's the first template
  const templateCount = await db.reportCardTemplate.count()
  
  const template = await db.reportCardTemplate.create({
    data: {
      name,
      layout: getDefaultLayout(),
      isDefault: templateCount === 0
    }
  })

  revalidatePath("/dashboard/academics/reports")
  return template
}

export async function updateReportCardTemplate(id: string, data: { name?: string, layout?: any, isDefault?: boolean }) {
  const session = await getServerSession(authOptions)
  assertRole(session, ["ADMIN"])

  // If setting as default, unset others first
  if (data.isDefault) {
    await db.reportCardTemplate.updateMany({
      where: { isDefault: true },
      data: { isDefault: false }
    })
  }

  const template = await db.reportCardTemplate.update({
    where: { id },
    data
  })

  revalidatePath("/dashboard/academics/reports")
  revalidatePath(`/dashboard/academics/reports/templates/${id}`)
  return template
}

export async function deleteReportCardTemplate(id: string) {
  const session = await getServerSession(authOptions)
  assertRole(session, ["ADMIN"])

  const template = await db.reportCardTemplate.findUnique({ where: { id } })
  if (template?.isDefault) throw new Error("Cannot delete the default template")

  await db.reportCardTemplate.delete({ where: { id } })
  
  revalidatePath("/dashboard/academics/reports")
  redirect("/dashboard/academics/reports")
}

export async function getActiveReportCardTemplate() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new Error("Unauthorized")
  }
  const template = await db.reportCardTemplate.findFirst({
    where: { isDefault: true }
  })
  
  if (template) return template

  // Return a fallback if no default is found
  return {
    id: "system-default",
    name: "System Default",
    layout: getDefaultLayout()
  }
}

export async function getSchoolSettings() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new Error("Unauthorized")
  }
  const settings = await db.schoolSettings.findUnique({
    where: { id: "singleton" }
  })
  
  if (settings) return settings

  // Fallback
  return {
    name: "Schoolyard Academy",
    tagline: "Excellence in Education",
    initials: "SA",
    logoUrl: null
  }
}
