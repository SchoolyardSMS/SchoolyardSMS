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
    await db.term.update({ where: { id }, data: { name, type, parentId, startDate, endDate } })
    revalidatePath("/dashboard/admin/calendar/terms")
    return { success: true }
  } catch (e: any) {
    return { error: e.message || "Failed to update term" }
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

