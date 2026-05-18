"use server"

import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { IncidentCategory, IncidentSeverity, IncidentStatus } from "@prisma/client"

// ── Create a new incident ─────────────────────────────────────────────────────
export async function createIncident(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== "ADMIN" && session.user?.role !== "TEACHER")) {
    throw new Error("Unauthorized")
  }

  const studentId   = formData.get("studentId") as string
  const title       = (formData.get("title") as string)?.trim()
  const description = (formData.get("description") as string)?.trim()
  const category    = formData.get("category") as IncidentCategory
  const severity    = formData.get("severity") as IncidentSeverity
  const actionTaken = (formData.get("actionTaken") as string)?.trim() || null
  const followUpStr = formData.get("followUpDate") as string
  const followUpDate = followUpStr ? new Date(followUpStr) : null
  const dateStr     = formData.get("date") as string
  const date        = dateStr ? new Date(dateStr) : new Date()

  if (!studentId || !title || !description) throw new Error("Student, title, and description are required")

  const incident = await db.incident.create({
    data: {
      studentId,
      reporterId: session.user.id,
      title,
      description,
      category,
      severity,
      actionTaken,
      followUpDate,
      date,
    }
  })

  revalidatePath("/dashboard/discipline")
  redirect(`/dashboard/discipline/${incident.id}`)
}

// ── Update status / action ────────────────────────────────────────────────────
export async function updateIncidentStatus(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== "ADMIN" && session.user?.role !== "TEACHER")) {
    throw new Error("Unauthorized")
  }

  const id          = formData.get("id") as string
  const status      = formData.get("status") as IncidentStatus
  const actionTaken = (formData.get("actionTaken") as string)?.trim() || null
  const followUpStr = formData.get("followUpDate") as string
  const followUpDate = followUpStr ? new Date(followUpStr) : null

  await db.incident.update({
    where: { id },
    data: { status, actionTaken, followUpDate }
  })

  revalidatePath(`/dashboard/discipline/${id}`)
  revalidatePath("/dashboard/discipline")
}

// ── Add a timeline comment ────────────────────────────────────────────────────
export async function addIncidentComment(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== "ADMIN" && session.user?.role !== "TEACHER")) {
    throw new Error("Unauthorized")
  }

  const incidentId = formData.get("incidentId") as string
  const body       = (formData.get("body") as string)?.trim()

  if (!body) throw new Error("Comment body is required")

  await db.incidentComment.create({
    data: { incidentId, authorId: session.user.id, body }
  })

  revalidatePath(`/dashboard/discipline/${incidentId}`)
}
