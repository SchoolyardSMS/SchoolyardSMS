"use server"

import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { AttendanceStatus } from "@prisma/client"
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
      const { sendSystemBatchMessages } = await import("./messaging")
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
  if (!session?.user || (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN')) {
    throw new Error("Unauthorized")
  }

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
  if (!session?.user) throw new Error("Unauthorized")

  // Using a transaction to upsert all
  const operations = studentIds.map(studentId => 
    db.attendance.upsert({
      where: {
        studentId_sectionId_date: {
          studentId,
          sectionId,
          date
        }
      },
      update: { status },
      create: {
        studentId,
        sectionId,
        date,
        status
      }
    })
  )

  await db.$transaction(operations)

  revalidatePath(`/dashboard/academics/sections/${sectionId}/attendance`)
  revalidatePath(`/dashboard/attendance`)
  return { success: true }
}

export async function reportAttendance(studentId: string, type: "SICK" | "LATE" | "EARLY_DISMISSAL", date: string, reason?: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "PARENT") {
    throw new Error("Unauthorized")
  }

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
  if (!session || session.user?.role !== "ADMIN") {
    throw new Error("Unauthorized")
  }

  const notification = await db.attendanceNotification.update({
    where: { id: notificationId },
    data: { status: "ACKNOWLEDGED" }
  })

  // AUTOMATION: Apply 'EXCUSED' status to all of the student's enrolled sections for this date
  const enrollments = await db.enrollment.findMany({
    where: { studentId: notification.studentId, status: "ENROLLED" }
  })
  
  const operations = enrollments.map(enr => 
    db.attendance.upsert({
      where: {
        studentId_sectionId_date: {
          studentId: notification.studentId,
          sectionId: enr.sectionId,
          date: notification.date
        }
      },
      update: { status: "EXCUSED", notes: `Automated excuse via Parent Notification (${notification.type})` },
      create: {
        studentId: notification.studentId,
        sectionId: enr.sectionId,
        date: notification.date,
        status: "EXCUSED",
        notes: `Automated excuse via Parent Notification (${notification.type})`
      }
    })
  )
  
  await db.$transaction(operations)

  revalidatePath("/dashboard/attendance")
  return { success: true }
}
