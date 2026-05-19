"use server"

import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { DocumentType } from "@prisma/client"
import { randomBytes } from "crypto"
import { assertRole } from "@/lib/rbac"

export async function uploadAssignmentSubmission(formData: FormData) {
  const session = await getServerSession(authOptions)
  assertRole(session, ["STUDENT"])
  

  const file = formData.get("file") as File
  const assignmentId = formData.get("assignmentId") as string

  if (!file || !assignmentId) throw new Error("Missing file or assignment ID")

  // Ensure uploads directory exists inside the Next.js public folder
  const uploadsDir = join(process.cwd(), "public/uploads")
  await mkdir(uploadsDir, { recursive: true })
  
  // Sanitize filename and create unique path
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  
  const ext = file.name.split('.').pop() || "bin"
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50)
  const uniqueFilename = `${Date.now()}-${randomBytes(4).toString("hex")}-${safeName}`
  
  const relativeUrl = `/api/uploads/${uniqueFilename}`
  const absolutePath = join(uploadsDir, uniqueFilename)

  await writeFile(absolutePath, buffer)

  // Record in Database mapped to the Assignment
  const student = await db.student.findUnique({
    where: { userId: session.user.id }
  })

  await db.document.create({
    data: {
      title: file.name,
      fileUrl: relativeUrl,
      type: DocumentType.ASSIGNMENT_SUBMISSION,
      uploaderId: session.user.id,
      studentId: student?.id,
      assignmentId: assignmentId,
    }
  })

  // Revalidate the assignment page
  const assignment = await db.assignment.findUnique({ where: { id: assignmentId } })
  if (assignment) {
    revalidatePath(`/dashboard/academics/sections/${assignment.sectionId}/assignments/${assignmentId}`)
  }

  return { success: true, url: relativeUrl }
}

export async function uploadBrandingFile(formData: FormData) {
  const session = await getServerSession(authOptions)
  assertRole(session, ["ADMIN"])

  const file = formData.get("file") as File
  if (!file) throw new Error("No file provided")

  const uploadsDir = join(process.cwd(), "public/uploads")
  await mkdir(uploadsDir, { recursive: true })
  
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50)
  const uniqueFilename = `branding-${Date.now()}-${safeName}`
  
  const relativeUrl = `/api/uploads/${uniqueFilename}`
  const absolutePath = join(uploadsDir, uniqueFilename)

  await writeFile(absolutePath, buffer)

  return { success: true, url: relativeUrl }
}

export async function uploadMaterialFile(formData: FormData) {
  const session = await getServerSession(authOptions)
  assertRole(session, ["ADMIN", "TEACHER"])

  const file = formData.get("file") as File
  if (!file) throw new Error("No file provided")

  const uploadsDir = join(process.cwd(), "public/uploads")
  await mkdir(uploadsDir, { recursive: true })
  
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50)
  const uniqueFilename = `material-${Date.now()}-${safeName}`
  
  const relativeUrl = `/api/uploads/${uniqueFilename}`
  const absolutePath = join(uploadsDir, uniqueFilename)

  await writeFile(absolutePath, buffer)

  return { success: true, url: relativeUrl }
}

