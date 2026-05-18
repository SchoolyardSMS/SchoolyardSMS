"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { CommunityAttendanceStatus } from "@prisma/client"
import { sendSystemMessage, sendSystemBatchMessages } from "./messaging"
import { formatInET } from "@/lib/dates"

export async function createCommunitySession(data: { calendarDayId: string, teacherId?: string, title: string, description: string, room: string, capacity: number, isRestricted: boolean }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== "TEACHER" && session.user?.role !== "ADMIN")) {
    throw new Error("Unauthorized")
  }

  let finalTeacherId = data.teacherId

  if (session.user.role === "TEACHER") {
    const teacher = await db.teacher.findUnique({ where: { userId: session.user.id } })
    if (!teacher) throw new Error("Teacher profile not found")
    finalTeacherId = teacher.id
  }

  if (!finalTeacherId) throw new Error("Teacher ID is required")

  await db.communitySession.create({
    data: {
      calendarDayId: data.calendarDayId,
      teacherId: finalTeacherId,
      title: data.title,
      description: data.description,
      room: data.room,
      capacity: data.capacity,
      isRestricted: data.isRestricted
    }
  })

  revalidatePath("/dashboard/community")
  return { success: true }
}

export async function updateCommunitySession(id: string, data: { title: string, description: string, room: string, capacity: number, isRestricted: boolean }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== "TEACHER" && session.user?.role !== "ADMIN")) {
    throw new Error("Unauthorized")
  }

  // If teacher, verify ownership
  if (session.user.role === "TEACHER") {
    const teacher = await db.teacher.findUnique({ where: { userId: session.user.id } })
    const communitySession = await db.communitySession.findUnique({ where: { id } })
    if (!communitySession || communitySession.teacherId !== teacher?.id) {
      throw new Error("Unauthorized: You do not own this session.")
    }
  }

  await db.communitySession.update({
    where: { id },
    data
  })

  revalidatePath("/dashboard/community")
  return { success: true }
}

export async function deleteCommunitySession(id: string) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== "TEACHER" && session.user?.role !== "ADMIN")) {
    throw new Error("Unauthorized")
  }

  // If teacher, verify ownership
  if (session.user.role === "TEACHER") {
    const teacher = await db.teacher.findUnique({ where: { userId: session.user.id } })
    const communitySession = await db.communitySession.findUnique({ where: { id } })
    if (!communitySession || communitySession.teacherId !== teacher?.id) {
      throw new Error("Unauthorized: You do not own this session.")
    }
  }

  await db.communitySession.delete({ where: { id } })
  revalidatePath("/dashboard/community")
  return { success: true }
}

export async function forceEnrollStudent(sessionId: string, studentId: string) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== "TEACHER" && session.user?.role !== "ADMIN")) {
    throw new Error("Unauthorized")
  }

  // Find the target session to get its calendarDayId
  const targetSession = await db.communitySession.findUnique({
    where: { id: sessionId }
  })
  if (!targetSession) throw new Error("Session not found")

  // Drop student from any other session on the same day
  const conflictingEnrollments = await db.communityEnrollment.findMany({
    where: {
      studentId,
      session: { calendarDayId: targetSession.calendarDayId }
    }
  })

  for (const conflict of conflictingEnrollments) {
    if (conflict.sessionId !== sessionId) {
      await db.communityEnrollment.delete({ where: { id: conflict.id } })
    }
  }

  // Force enroll
  await db.communityEnrollment.upsert({
    where: { sessionId_studentId: { sessionId, studentId } },
    update: { isRequired: true },
    create: { sessionId, studentId, isRequired: true }
  })

  revalidatePath("/dashboard/community")
  return { success: true }
}

export async function removeStudentEnrollment(enrollmentId: string) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== "TEACHER" && session.user?.role !== "ADMIN")) {
    throw new Error("Unauthorized")
  }

  await db.communityEnrollment.delete({ where: { id: enrollmentId } })
  revalidatePath("/dashboard/community")
  return { success: true }
}

export async function updateCommunityAttendance(enrollmentId: string, status: CommunityAttendanceStatus) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== "TEACHER" && session.user?.role !== "ADMIN")) {
    throw new Error("Unauthorized")
  }

  await db.communityEnrollment.update({
    where: { id: enrollmentId },
    data: { attendance: status }
  })

  revalidatePath("/dashboard/community")
  return { success: true }
}

// Student actions
export async function enrollInSession(sessionId: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "STUDENT") throw new Error("Unauthorized")

  const student = await db.student.findUnique({ where: { userId: session.user.id } })
  if (!student) throw new Error("Student profile not found")

  // Check if session exists and is not restricted
  const targetSession = await db.communitySession.findUnique({
    where: { id: sessionId },
    include: { _count: { select: { enrollments: true } } }
  })

  if (!targetSession) throw new Error("Session not found")
  if (targetSession.isRestricted) throw new Error("Session is restricted")
  if (targetSession._count.enrollments >= targetSession.capacity) throw new Error("Session is full")

  // Prevent double booking on the same day
  const existingEnrollment = await db.communityEnrollment.findFirst({
    where: {
      studentId: student.id,
      session: { calendarDayId: targetSession.calendarDayId }
    }
  })

  if (existingEnrollment) {
    throw new Error("You are already signed up for a community period on this date.")
  }

  await db.communityEnrollment.create({
    data: {
      sessionId,
      studentId: student.id,
      isRequired: false
    }
  })

  revalidatePath("/dashboard/community")
  return { success: true }
}

export async function dropSession(sessionId: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "STUDENT") throw new Error("Unauthorized")

  const student = await db.student.findUnique({ where: { userId: session.user.id } })
  if (!student) throw new Error("Student profile not found")

  const enrollment = await db.communityEnrollment.findUnique({
    where: { sessionId_studentId: { sessionId, studentId: student.id } }
  })

  if (!enrollment) throw new Error("Not enrolled")
  if (enrollment.isRequired) throw new Error("Cannot drop a required session")

  await db.communityEnrollment.delete({
    where: { id: enrollment.id }
  })

  revalidatePath("/dashboard/community")
  return { success: true }
}

export async function duplicateCommunitySession(sessionId: string, newCalendarDayId: string) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== "TEACHER" && session.user?.role !== "ADMIN")) {
    throw new Error("Unauthorized")
  }

  const originalSession = await db.communitySession.findUnique({
    where: { id: sessionId }
  })

  if (!originalSession) throw new Error("Session not found")
  
  let teacherId = originalSession.teacherId
  if (session.user.role === "TEACHER") {
    const teacher = await db.teacher.findUnique({ where: { userId: session.user.id } })
    if (originalSession.teacherId !== teacher?.id) {
      throw new Error("Unauthorized")
    }
  }

  await db.communitySession.create({
    data: {
      calendarDayId: newCalendarDayId,
      teacherId: teacherId,
      title: `${originalSession.title} (Copy)`,
      description: originalSession.description,
      room: originalSession.room,
      capacity: originalSession.capacity,
      isRestricted: originalSession.isRestricted
    }
  })

  revalidatePath("/dashboard/community")
  return { success: true }
}

export async function nudgeMissingStudent(studentId: string, calendarDayId: string) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== "TEACHER" && session.user?.role !== "ADMIN")) {
    throw new Error("Unauthorized")
  }

  const student = await db.student.findUnique({
    where: { id: studentId },
    include: { user: true }
  })
  if (!student) throw new Error("Student not found")

  const calendarDay = await db.calendarDay.findUnique({ where: { id: calendarDayId } })
  if (!calendarDay) throw new Error("Calendar day not found")

  const dayLabel = formatInET(calendarDay.date, { month: 'long', day: 'numeric', year: 'numeric' })

  await sendSystemMessage(
    session.user.id,
    student.userId,
    `Community Period Reminder: ${dayLabel}`,
    `Hi ${student.user.name},\n\nYou haven't signed up for a community period session on ${dayLabel}. Please log in to Schoolyard and select a session as soon as possible.\n\nBest,\n${session.user.name}`
  )

  return { success: true }
}

export async function nudgeAllMissingStudents(calendarDayId: string) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== "TEACHER" && session.user?.role !== "ADMIN")) {
    throw new Error("Unauthorized")
  }

  const calendarDay = await db.calendarDay.findUnique({ where: { id: calendarDayId } })
  if (!calendarDay) throw new Error("Calendar day not found")

  // Find all students missing for this day
  const allStudents = await db.student.findMany({ include: { user: true } })
  const enrollments = await db.communityEnrollment.findMany({
    where: { session: { calendarDayId } },
    select: { studentId: true }
  })
  const enrolledIds = new Set(enrollments.map(e => e.studentId))
  const missingStudents = allStudents.filter(s => !enrolledIds.has(s.id))

  if (missingStudents.length === 0) return { success: true, count: 0 }

  const recipients = missingStudents.map(s => ({
    userId: s.userId,
    email: s.user.email,
    name: s.user.name
  }))

  const dayLabel = formatInET(calendarDay.date, { month: 'long', day: 'numeric', year: 'numeric' })

  const count = await sendSystemBatchMessages(
    session.user.id,
    recipients,
    `Community Period Reminder: ${dayLabel}`,
    (name) => `Hi ${name},\n\nYou haven't signed up for a community period session on ${dayLabel}. Please log in to Schoolyard and select a session as soon as possible.\n\nBest,\n${session.user.name}`
  )

  return { success: true, count }
}
