"use server"

import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { IncidentCategory, IncidentSeverity, IncidentStatus } from "@prisma/client"
import { assertRole } from "@/lib/rbac"
import { z } from "zod"

const createIncidentSchema = z.object({
  studentId: z.string({ message: "Student ID is required" }).min(1, "Student ID is required"),
  title: z.string({ message: "Title is required" }).min(1, "Title is required"),
  description: z.string({ message: "Description is required" }).min(1, "Description is required"),
  category: z.enum([IncidentCategory.BEHAVIOR, IncidentCategory.ACADEMIC_DISHONESTY, IncidentCategory.ATTENDANCE, IncidentCategory.BULLYING, IncidentCategory.PROPERTY_DAMAGE, IncidentCategory.SAFETY, IncidentCategory.OTHER], { message: "Category is required" }),
  severity: z.enum([IncidentSeverity.MINOR, IncidentSeverity.MODERATE, IncidentSeverity.SEVERE], { message: "Severity is required" }),
  actionTaken: z.string().trim().nullable().optional(),
  followUpDate: z.string().or(z.date()).nullable().optional().transform(val => val ? new Date(val) : null),
  date: z.string().or(z.date()).nullable().optional().transform(val => val ? new Date(val) : new Date()),
})

// ── Create a new incident ─────────────────────────────────────────────────────
export async function createIncident(formData: FormData) {
  const session = await getServerSession(authOptions)
  assertRole(session, ["ADMIN", "TEACHER"])

  const rawData = {
    studentId: formData.get("studentId"),
    title: (formData.get("title") as string)?.trim(),
    description: (formData.get("description") as string)?.trim(),
    category: formData.get("category"),
    severity: formData.get("severity"),
    actionTaken: formData.get("actionTaken"),
    followUpDate: formData.get("followUpDate") || null,
    date: formData.get("date") || null,
  }

  const result = createIncidentSchema.safeParse(rawData)
  if (!result.success) {
    throw new Error(result.error.issues.map(e => e.message).join(", "))
  }

  const { studentId, title, description, category, severity, actionTaken, followUpDate, date } = result.data

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
  assertRole(session, ["ADMIN", "TEACHER"])

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
  assertRole(session, ["ADMIN", "TEACHER"])

  const incidentId = formData.get("incidentId") as string
  const body       = (formData.get("body") as string)?.trim()

  if (!body) throw new Error("Comment body is required")

  await db.incidentComment.create({
    data: { incidentId, authorId: session.user.id, body }
  })

  revalidatePath(`/dashboard/discipline/${incidentId}`)
}
