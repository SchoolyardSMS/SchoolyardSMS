"use server"

import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { assertRole } from "@/lib/rbac"

export async function createAnnouncement(formData: FormData) {
  const session = await getServerSession(authOptions)
  assertRole(session, ["ADMIN", "TEACHER"])

  const sectionId = formData.get("sectionId") as string
  const content = formData.get("content") as string

  if (!sectionId || !content) throw new Error("Missing required fields")

  // Check if user has permission (teacher of the section or admin)
  const section = await db.section.findUnique({
    where: { id: sectionId },
    select: { teacherId: true }
  })

  const isTeacher = section?.teacherId && (await db.teacher.findUnique({
    where: { userId: session.user.id },
    select: { id: true }
  }))?.id === section.teacherId

  const isAdmin = session.user.role === "ADMIN"

  if (!isTeacher && !isAdmin) throw new Error("Only teachers or admins can post announcements")

  await db.announcement.create({
    data: {
      sectionId,
      content,
      authorId: session.user.id
    }
  })

  revalidatePath(`/dashboard/academics/sections/${sectionId}`)
}

export async function deleteAnnouncement(id: string, sectionId: string) {
  const session = await getServerSession(authOptions)
  assertRole(session, ["ADMIN", "TEACHER"])

  const announcement = await db.announcement.findUnique({
    where: { id },
    select: { authorId: true }
  })

  if (!announcement) throw new Error("Announcement not found")

  const isAdmin = session.user.role === "ADMIN"
  const isAuthor = announcement.authorId === session.user.id

  if (!isAdmin && !isAuthor) throw new Error("Permission denied")

  await db.announcement.delete({ where: { id } })

  revalidatePath(`/dashboard/academics/sections/${sectionId}`)
}
