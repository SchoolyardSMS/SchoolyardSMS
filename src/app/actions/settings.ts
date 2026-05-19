"use server"

import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { assertRole } from "@/lib/rbac"

export async function updateSchoolSettings(formData: FormData) {
  const session = await getServerSession(authOptions)
  assertRole(session, ["ADMIN"])

  const activeTab = (formData.get("activeSettingsTab") as string)?.trim() || "branding"
  
  let updatePayload: any = {}

  if (activeTab === "branding") {
    const name          = (formData.get("name") as string)?.trim()
    if (!name) throw new Error("School name is required")
    let themeConfigJson = null
    const themeConfigRaw = formData.get("themeConfig") as string
    if (themeConfigRaw && themeConfigRaw.trim()) {
      try {
        themeConfigJson = JSON.parse(themeConfigRaw)
      } catch {
        throw new Error("Invalid JSON format for Theme Config")
      }
    }

    updatePayload = {
      name,
      tagline: (formData.get("tagline") as string)?.trim(),
      initials: (formData.get("initials") as string)?.trim().toUpperCase().slice(0, 3) || "S",
      primaryColor: (formData.get("primaryColor") as string)?.trim() || "#4f46e5",
      secondaryColor: (formData.get("secondaryColor") as string)?.trim() || "#6b7280",
      logoUrl: (formData.get("logoUrl") as string)?.trim(),
      faviconUrl: (formData.get("faviconUrl") as string)?.trim(),
      themeConfig: themeConfigJson,
    }
  } else if (activeTab === "academics") {
    let gradingScaleJson = null
    const gradingScaleRaw = formData.get("gradingScale") as string
    if (gradingScaleRaw && gradingScaleRaw.trim()) {
      try {
        gradingScaleJson = JSON.parse(gradingScaleRaw)
      } catch {
        throw new Error("Invalid JSON format for Grading Scale. Please ensure it is a valid JSON array or object.")
      }
    }

    updatePayload = {
      activeTerm: (formData.get("activeTerm") as string)?.trim() || "Fall 2025",
      passingGrade: parseInt(formData.get("passingGrade") as string, 10) || 65,
      gpaScale: parseFloat(formData.get("gpaScale") as string) || 4.0,
      gradingScale: gradingScaleJson,
    }
  } else if (activeTab === "behavior") {
    const incidentTypesRaw = formData.get("incidentTypes") as string
    let incidentTypesJson = null
    if (incidentTypesRaw && incidentTypesRaw.trim()) {
      try {
        incidentTypesJson = JSON.parse(incidentTypesRaw)
      } catch {
        throw new Error("Invalid JSON format for Incident Types")
      }
    }
    
    const attendanceStatusesRaw = formData.get("attendanceStatuses") as string
    let attendanceStatusesJson = null
    if (attendanceStatusesRaw && attendanceStatusesRaw.trim()) {
      try {
        attendanceStatusesJson = JSON.parse(attendanceStatusesRaw)
      } catch {
        throw new Error("Invalid JSON format for Attendance Statuses")
      }
    }

    updatePayload = {
      attendanceThreshold: parseInt(formData.get("attendanceThreshold") as string, 10) || 5,
      incidentTypes: incidentTypesJson,
      attendanceStatuses: attendanceStatusesJson,
    }
  } else if (activeTab === "features") {
    const rolePermissionsRaw = formData.get("rolePermissions") as string
    let rolePermissionsJson = null
    if (rolePermissionsRaw && rolePermissionsRaw.trim()) {
      try {
        rolePermissionsJson = JSON.parse(rolePermissionsRaw)
      } catch {
        throw new Error("Invalid JSON format for Role Permissions")
      }
    }

    updatePayload = {
      featuresEnabled: {
        lms: formData.get("feature_lms") === "on",
        discipline: formData.get("feature_discipline") === "on",
        community: formData.get("feature_community") === "on"
      },
      rolePermissions: rolePermissionsJson,
    }
  }

  await db.schoolSettings.upsert({
    where: { id: "singleton" },
    update: updatePayload,
    create: { id: "singleton", name: "Schoolyard Academy", ...updatePayload },
  })

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/settings")
}
