"use server"

import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { assertRole } from "@/lib/rbac"

export async function createSchoolYear(formData: FormData) {
  const session = await getServerSession(authOptions)
  assertRole(session, ["ADMIN"])

  const name = formData.get("name") as string
  const startDate = new Date(formData.get("startDate") as string)
  const endDate = new Date(formData.get("endDate") as string)

  if (!name || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return { error: "Invalid input" }
  }

  try {
    await db.schoolYear.create({ data: { name, startDate, endDate, isActive: false } })
    revalidatePath("/dashboard/admin/calendar/terms")
    return { success: true }
  } catch (e: any) {
    return { error: e.message || "Failed to create school year" }
  }
}

export async function updateSchoolYear(id: string, formData: FormData) {
  const session = await getServerSession(authOptions)
  assertRole(session, ["ADMIN"])

  const name = formData.get("name") as string
  const startDate = new Date(formData.get("startDate") as string)
  const endDate = new Date(formData.get("endDate") as string)

  if (!name || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return { error: "Invalid input" }
  }

  try {
    await db.schoolYear.update({ where: { id }, data: { name, startDate, endDate } })
    revalidatePath("/dashboard/admin/calendar/terms")
    return { success: true }
  } catch (e: any) {
    return { error: e.message || "Failed to update school year" }
  }
}

export async function deleteSchoolYear(id: string) {
  const session = await getServerSession(authOptions)
  assertRole(session, ["ADMIN"])

  try {
    await db.schoolYear.delete({ where: { id } })
    revalidatePath("/dashboard/admin/calendar/terms")
    return { success: true }
  } catch (e: any) {
    return { error: e.message || "Cannot delete: this school year is in use by active sections." }
  }
}

export async function createTerm(formData: FormData) {
  const session = await getServerSession(authOptions)
  assertRole(session, ["ADMIN"])

  const name = formData.get("name") as string
  const schoolYearId = formData.get("schoolYearId") as string
  const type = (formData.get("type") as any) || "SEMESTER"
  const parentId = (formData.get("parentId") as string) || null
  const startDate = new Date(formData.get("startDate") as string)
  const endDate = new Date(formData.get("endDate") as string)

  if (!name || !schoolYearId || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return { error: "Invalid input" }
  }

  try {
    await db.term.create({ data: { name, schoolYearId, type, parentId, startDate, endDate } })
    revalidatePath("/dashboard/admin/calendar/terms")
    return { success: true }
  } catch (e: any) {
    return { error: e.message || "Failed to create term" }
  }
}

export async function updateTerm(id: string, formData: FormData) {
  const session = await getServerSession(authOptions)
  assertRole(session, ["ADMIN"])

  const name = formData.get("name") as string
  const type = (formData.get("type") as any) || "SEMESTER"
  const parentId = (formData.get("parentId") as string) || null
  const startDate = new Date(formData.get("startDate") as string)
  const endDate = new Date(formData.get("endDate") as string)

  if (!name || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return { error: "Invalid input" }
  }

  try {
    const oldTerm = await db.term.findUnique({ where: { id }, select: { name: true } })
    await db.term.update({ where: { id }, data: { name, type, parentId, startDate, endDate } })

    if (oldTerm && oldTerm.name !== name) {
      const settings = await db.schoolSettings.findUnique({ where: { id: "singleton" } })
      if (settings && settings.activeTerm === oldTerm.name) {
        await db.schoolSettings.update({
          where: { id: "singleton" },
          data: { activeTerm: name }
        })
      }
    }

    revalidatePath("/dashboard/admin/calendar/terms")
    return { success: true }
  } catch (e: any) {
    return { error: e.message || "Failed to update term" }
  }
}

export async function duplicateSchoolYear(
  sourceId: string,
  name: string,
  startDateStr: string,
  endDateStr: string
) {
  const session = await getServerSession(authOptions)
  assertRole(session, ["ADMIN"])

  const startDate = new Date(startDateStr)
  const endDate = new Date(endDateStr)

  if (!name || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return { error: "Invalid input" }
  }

  try {
    const sourceYear = await db.schoolYear.findUnique({
      where: { id: sourceId },
      include: { terms: true }
    })

    if (!sourceYear) {
      return { error: "Source school year not found" }
    }

    // Create the new school year
    const newYear = await db.schoolYear.create({
      data: {
        name,
        startDate,
        endDate,
        isActive: false
      }
    })

    // Calculate offset
    const offsetMs = startDate.getTime() - sourceYear.startDate.getTime()

    // Map to duplicate terms
    const sourceTerms = sourceYear.terms

    async function cloneTermsRecursively(oldParentId: string | null, newParentId: string | null) {
      const levelTerms = sourceTerms.filter(t => t.parentId === oldParentId)
      for (const term of levelTerms) {
        const created = await db.term.create({
          data: {
            name: term.name,
            type: term.type,
            schoolYearId: newYear.id,
            parentId: newParentId,
            startDate: new Date(term.startDate.getTime() + offsetMs),
            endDate: new Date(term.endDate.getTime() + offsetMs),
          }
        })
        await cloneTermsRecursively(term.id, created.id)
      }
    }

    await cloneTermsRecursively(null, null)

    revalidatePath("/dashboard/admin/calendar/terms")
    return { success: true }
  } catch (e: any) {
    return { error: e.message || "Failed to duplicate school year" }
  }
}

export async function duplicateTerm(
  termId: string,
  targetSchoolYearId: string,
  newName: string,
  startDateStr: string,
  endDateStr: string,
  duplicateChildren: boolean
) {
  const session = await getServerSession(authOptions)
  assertRole(session, ["ADMIN"])

  const startDate = new Date(startDateStr)
  const endDate = new Date(endDateStr)

  if (!newName || !targetSchoolYearId || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return { error: "Invalid input" }
  }

  try {
    const originalTerm = await db.term.findUnique({
      where: { id: termId }
    })

    if (!originalTerm) {
      return { error: "Original term not found" }
    }

    const createdTerm = await db.term.create({
      data: {
        name: newName,
        type: originalTerm.type,
        schoolYearId: targetSchoolYearId,
        parentId: null, // Duplicated terms start at root
        startDate,
        endDate
      }
    })

    if (duplicateChildren) {
      const offsetMs = startDate.getTime() - originalTerm.startDate.getTime()
      
      const allTermsInYear = await db.term.findMany({
        where: { schoolYearId: originalTerm.schoolYearId }
      })

      async function cloneChildrenRecursively(oldParentId: string, newParentId: string) {
        const children = allTermsInYear.filter(t => t.parentId === oldParentId)
        for (const child of children) {
          const createdChild = await db.term.create({
            data: {
              name: child.name,
              type: child.type,
              schoolYearId: targetSchoolYearId,
              parentId: newParentId,
              startDate: new Date(child.startDate.getTime() + offsetMs),
              endDate: new Date(child.endDate.getTime() + offsetMs),
            }
          })
          await cloneChildrenRecursively(child.id, createdChild.id)
        }
      }

      await cloneChildrenRecursively(originalTerm.id, createdTerm.id)
    }

    revalidatePath("/dashboard/admin/calendar/terms")
    return { success: true }
  } catch (e: any) {
    return { error: e.message || "Failed to duplicate term" }
  }
}

export async function deleteTerm(id: string) {
  const session = await getServerSession(authOptions)
  assertRole(session, ["ADMIN"])

  try {
    await db.term.delete({ where: { id } })
    revalidatePath("/dashboard/admin/calendar/terms")
    return { success: true }
  } catch (e: any) {
    return { error: e.message || "Cannot delete: this term is linked to active sections or grades." }
  }
}

export async function setSchoolYearActive(schoolYearId: string) {
  const session = await getServerSession(authOptions)
  assertRole(session, ["ADMIN"])

  try {
    await db.schoolYear.updateMany({ data: { isActive: false } })
    await db.schoolYear.update({ where: { id: schoolYearId }, data: { isActive: true } })
    revalidatePath("/dashboard/admin/calendar/terms")
    return { success: true as const, error: undefined }
  } catch (e: any) {
    return { success: false as const, error: e.message || "Failed to set active year" }
  }
}

