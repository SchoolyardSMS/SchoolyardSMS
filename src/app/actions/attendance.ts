"use server"

import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { sendSystemBatchMessages } from "./messaging"
import { AttendanceStatus } from "@prisma/client"
import { assertRole } from "@/lib/rbac"
import { formatInET } from "@/lib/dates"

export async function submitAttendance(
  sectionId: string, 
  studentId: string, 
  date: Date, 
  status: AttendanceStatus,
  details?: {
    checkInTime?: string
    checkOutTime?: string
    excusedReason?: string
    notifiedParent?: boolean
    notes?: string
  }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error("Unauthorized")

  // Validate runtime inputs with Zod to avoid depending on TS-only types
  const payloadSchema = z.object({
    sectionId: z.string().min(1),
    studentId: z.string().min(1),
    date: z.date(),
    status: z.nativeEnum(AttendanceStatus),
    details: z.object({
      checkInTime: z.string().optional(),
      checkOutTime: z.string().optional(),
      excusedReason: z.string().optional(),
      notifiedParent: z.boolean().optional(),
      notes: z.string().optional()
    }).partial().optional()
  })

  payloadSchema.parse({ sectionId, studentId, date, status, details })

  // Authorization: only ADMIN or the teacher assigned to the section may modify attendance
  if (session.user.role !== 'ADMIN') {
    if (session.user.role !== 'TEACHER') {
      throw new Error("Unauthorized: insufficient role to modify attendance")
    }

    // Confirm the teacher owns this section
    const section = await db.section.findUnique({
      where: { id: sectionId },
      include: { teacher: { include: { user: true } } }
    })

    if (!section) throw new Error("Section not found")
    if (section.teacher.userId !== session.user.id) {
      throw new Error("Unauthorized: not the assigned teacher for this section")
    }
  }

  const attendance = await db.attendance.upsert({
    where: {
      studentId_sectionId_date: {
        studentId,
        sectionId,
        date
      }
    },
    update: { 
      status,
      checkInTime: details?.checkInTime,
      checkOutTime: details?.checkOutTime,
      excusedReason: details?.excusedReason,
      notifiedParent: details?.notifiedParent,
      notes: details?.notes
    },
    create: {
      studentId,
      sectionId,
      date,
      status,
      checkInTime: details?.checkInTime,
      checkOutTime: details?.checkOutTime,
      excusedReason: details?.excusedReason,
      notifiedParent: details?.notifiedParent,
      notes: details?.notes
    }
  })

  // If notifiedParent is true, send a message to all parents of this student
  if (details?.notifiedParent) {
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: { 
        user: true,
        parents: { include: { parent: { include: { user: true } } } } 
      }
    })
    
    if (student && student.parents.length > 0) {
      const recipients = student.parents.map(p => ({
        userId: p.parent.userId,
        email: p.parent.user.email,
        name: p.parent.user.name
      }))

      const section = await db.section.findUnique({
        where: { id: sectionId },
        include: { course: true }
      })

      await sendSystemBatchMessages(
        session.user.id,
        recipients,
        `Attendance Alert: ${student.user.name}`,
        (name) => `Dear ${name},\n\nThis is an automated notification regarding ${student.user.name}'s attendance for ${section?.course.name}.\n\nStatus: ${status}\nDate: ${formatInET(date, { month: 'long', day: 'numeric', year: 'numeric' })}\nNote: ${details?.excusedReason || details?.notes || "No additional notes."}\n\nBest,\n${session.user.name}`
      )
    }
  }

  revalidatePath(`/dashboard/academics/sections/${sectionId}/attendance`)
  revalidatePath(`/dashboard/attendance`)
  return { success: true }
}

export async function archiveAttendanceDay(sectionId: string, date: Date) {
  const session = await getServerSession(authOptions)
  assertRole(session, ['ADMIN', 'TEACHER'])

  await db.attendance.updateMany({
    where: {
      sectionId,
      date: {
        equals: date
      }
    },
    data: {
      isArchived: true
    }
  })

  revalidatePath(`/dashboard/academics/sections/${sectionId}/attendance`)
  return { success: true }
}

export async function submitBulkAttendance(sectionId: string, studentIds: string[], date: Date, status: AttendanceStatus) {
  const session = await getServerSession(authOptions)
  assertRole(session, ['ADMIN', 'TEACHER'])

  // Validate inputs
  const bulkSchema = z.object({
    sectionId: z.string().min(1),
    studentIds: z.array(z.string().min(1)).min(1),
    date: z.date(),
    status: z.nativeEnum(AttendanceStatus)
  })
  bulkSchema.parse({ sectionId, studentIds, date, status })

  // Authorization: only ADMIN or the assigned TEACHER can perform bulk attendance
  if (session.user.role !== 'ADMIN') {
    if (session.user.role !== 'TEACHER') throw new Error("Unauthorized: insufficient role")

    const section = await db.section.findUnique({
      where: { id: sectionId },
      include: { teacher: { include: { user: true } } }
    })
    if (!section) throw new Error("Section not found")
    if (section.teacher.userId !== session.user.id) throw new Error("Unauthorized: not the assigned teacher for this section")
  }

  // Using a transaction to upsert all (note: consider bulk SQL for large operations)
  // Optimize: fetch existing attendance rows for this section/date
  const existing = await db.attendance.findMany({
    where: {
      sectionId,
      date,
      studentId: { in: studentIds }
    },
    select: { studentId: true }
  })

  const existingIds = new Set(existing.map(e => e.studentId))
  const toUpdate = Array.from(existingIds)
  const toCreate = studentIds.filter(id => !existingIds.has(id))

  // Single update for all existing records
  if (toUpdate.length > 0) {
    await db.attendance.updateMany({
      where: { sectionId, date, studentId: { in: toUpdate } },
      data: { status }
    })
  }

  // Bulk create missing records
  if (toCreate.length > 0) {
    const createData = toCreate.map(studentId => ({ studentId, sectionId, date, status }))
    await db.attendance.createMany({ data: createData })
  }

  revalidatePath(`/dashboard/academics/sections/${sectionId}/attendance`)
  revalidatePath(`/dashboard/attendance`)
  return { success: true }
}

export async function reportAttendance(studentId: string, type: "SICK" | "LATE" | "EARLY_DISMISSAL", date: string, reason?: string) {
  const session = await getServerSession(authOptions)
  assertRole(session, ['PARENT'])

  // Get parent profile
  const parent = await db.parent.findUnique({
    where: { userId: session.user.id },
    include: { children: true }
  })

  if (!parent || !parent.children.some(c => c.studentId === studentId)) {
    throw new Error("Unauthorized: Student not linked to parent")
  }

  // Use parseLocalDate to handle the string date from the form
  const { parseLocalDate } = await import("@/lib/dates")
  const parsedDate = parseLocalDate(date)

  const notification = await db.attendanceNotification.create({
    data: {
      parentId: parent.id,
      studentId,
      type,
      date: parsedDate,
      reason,
      status: "PENDING"
    }
  })

  revalidatePath("/dashboard/attendance")
  return notification
}

export async function acknowledgeAttendanceNotification(notificationId: string) {
  const session = await getServerSession(authOptions)
  assertRole(session, ['ADMIN'])

  const notification = await db.attendanceNotification.update({
    where: { id: notificationId },
    data: { status: "ACKNOWLEDGED" }
  })

  // AUTOMATION: Apply 'EXCUSED' status to all of the student's enrolled sections for this date
  const enrollments = await db.enrollment.findMany({
    where: { studentId: notification.studentId, status: "ENROLLED" }
  })
  const sectionIds = enrollments.map(e => e.sectionId)

  // Find existing attendance records for this student/date across these sections
  const existingAttendances = await db.attendance.findMany({
    where: { studentId: notification.studentId, date: notification.date, sectionId: { in: sectionIds } },
    select: { sectionId: true }
  })

  const existingSectionIds = new Set(existingAttendances.map(a => a.sectionId))

  const toUpdateSections = sectionIds.filter(id => existingSectionIds.has(id))
  const toCreateSections = sectionIds.filter(id => !existingSectionIds.has(id))

  if (toUpdateSections.length > 0) {
    await db.attendance.updateMany({
      where: { studentId: notification.studentId, date: notification.date, sectionId: { in: toUpdateSections } },
      data: { status: "EXCUSED", notes: `Automated excuse via Parent Notification (${notification.type})` }
    })
  }

  if (toCreateSections.length > 0) {
    const createRecords = toCreateSections.map(sectionId => ({
      studentId: notification.studentId,
      sectionId,
      date: notification.date,
      status: AttendanceStatus.EXCUSED,
      notes: `Automated excuse via Parent Notification (${notification.type})`
    }))
    await db.attendance.createMany({ data: createRecords })
  }

  revalidatePath("/dashboard/attendance")
  return { success: true }
}
