"use server"

import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { parseLocalDate, parseDateAsET, formatInET } from "@/lib/dates"
import { sendSystemMessage, sendSystemBatchMessages } from "./messaging"

export async function mutateGrade(assignmentId: string, studentId: string, score: number) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== 'TEACHER' && session.user?.role !== 'ADMIN')) {
    throw new Error("Unauthorized access to gradebook modifications.")
  }

  await db.grade.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId } },
    update: { score },
    create: { assignmentId, studentId, score, feedback: "Updated via Quick Gradebook" }
  })

  const assignment = await db.assignment.findUnique({ where: { id: assignmentId } })
  if (assignment) {
    revalidatePath(`/dashboard/academics/sections/${assignment.sectionId}/gradebook`)
    revalidatePath(`/dashboard/academics/sections/${assignment.sectionId}`)
  }
  return { success: true }
}

export async function submitAssignment(assignmentId: string, studentId: string, status: string = "COMPLETED") {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== 'STUDENT') {
    throw new Error("Unauthorized. Only students can submit assignments.")
  }

  // Ensure the student matches the logged in user
  const student = await db.student.findUnique({ where: { userId: session.user.id } })
  if (!student || student.id !== studentId) {
    throw new Error("Student ID mismatch.")
  }

  await db.submissionRecord.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId } },
    update: { submittedAt: new Date(), status },
    create: { assignmentId, studentId, submittedAt: new Date(), status }
  })

  const assignment = await db.assignment.findUnique({ where: { id: assignmentId } })
  if (assignment) {
    revalidatePath(`/dashboard/academics/sections/${assignment.sectionId}/assignments/${assignmentId}`)
  }
  return { success: true }
}


// ── Grade + feedback from inline assignment detail table ──────────────────────
export async function updateAssignmentGrade(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== 'TEACHER' && session.user?.role !== 'ADMIN')) {
    throw new Error("Unauthorized")
  }

  const assignmentId = formData.get("assignmentId") as string
  const studentId    = formData.get("studentId") as string
  const scoreStr     = formData.get("score") as string
  const feedback     = (formData.get("feedback") as string)?.trim() || null

  if (!scoreStr) return // Skip if no score entered yet

  const score = parseFloat(scoreStr)

  await db.grade.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId } },
    update: { score, feedback, gradedAt: new Date() },
    create: { assignmentId, studentId, score, feedback }
  })

  const assignment = await db.assignment.findUnique({ where: { id: assignmentId } })
  if (assignment) {
    revalidatePath(`/dashboard/academics/sections/${assignment.sectionId}/assignments/${assignmentId}`)
    revalidatePath(`/dashboard/academics/sections/${assignment.sectionId}/gradebook`)
  }
}

// ── Create Course ─────────────────────────────────────────────────────────────
export async function createCourse(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== 'ADMIN') throw new Error("Unauthorized")

  const name        = (formData.get("name") as string)?.trim()
  const code        = (formData.get("code") as string)?.trim().toUpperCase()
  const description = (formData.get("description") as string)?.trim()
  const credits     = parseInt(formData.get("credits") as string, 10)

  if (!name || !code) throw new Error("Name and code are required")

  const course = await db.course.create({
    data: { name, code, description, credits: isNaN(credits) ? 1 : credits }
  })

  revalidatePath("/dashboard/academics/courses")
  redirect(`/dashboard/academics/courses/${course.id}`)
}

// ── Create Assignment ─────────────────────────────────────────────────────────
export async function createAssignment(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== 'TEACHER' && session.user?.role !== 'ADMIN')) {
    throw new Error("Unauthorized")
  }

  const sectionId   = formData.get("sectionId") as string
  const title       = (formData.get("title") as string)?.trim()
  const description = (formData.get("description") as string)?.trim()
  const maxScoreStr = formData.get("maxScore") as string
  const maxScore    = maxScoreStr ? parseFloat(maxScoreStr) : null
  const dueDate     = parseLocalDate(formData.get("dueDate") as string)
  const allowUpload = formData.get("allowUpload") === "on"
  const type        = (formData.get("type") as string) || "HOMEWORK"
  const status      = (formData.get("status") as string) || "PUBLISHED"
  
  const pubDateStr = formData.get("publishDate") as string
  const pubTimeStr = formData.get("publishTime") as string
  const publishDate = pubDateStr ? parseDateAsET(pubDateStr, pubTimeStr || "00:00") : null

  if (!title || !sectionId) throw new Error("Title and section are required")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db.assignment as any).create({
    data: { title, description, maxScore, dueDate, sectionId, allowUpload, type, status, publishDate }
  })

  revalidatePath(`/dashboard/academics/sections/${sectionId}`)
  redirect(`/dashboard/academics/sections/${sectionId}?tab=assignments`)
}

export async function updateAssignmentDetails(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== 'TEACHER' && session.user?.role !== 'ADMIN')) {
    throw new Error("Unauthorized")
  }

  const assignmentId = formData.get("assignmentId") as string
  const sectionId    = formData.get("sectionId") as string
  const title        = (formData.get("title") as string)?.trim()
  const description  = (formData.get("description") as string)?.trim()
  const maxScoreStr = formData.get("maxScore") as string
  const maxScore    = maxScoreStr ? parseFloat(maxScoreStr) : null
  const dueDate      = parseLocalDate(formData.get("dueDate") as string)
  const allowUpload  = formData.get("allowUpload") === "on"
  const type         = (formData.get("type") as string) || "HOMEWORK"
  const status       = (formData.get("status") as string) || "PUBLISHED"

  const pubDateStr = formData.get("publishDate") as string
  const pubTimeStr = formData.get("publishTime") as string
  const publishDate = pubDateStr ? parseDateAsET(pubDateStr, pubTimeStr || "00:00") : null

  if (!title || !assignmentId) throw new Error("Title and assignment ID are required")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db.assignment as any).update({
    where: { id: assignmentId },
    data: { title, description, maxScore, dueDate, allowUpload, type, status, publishDate }
  })

  revalidatePath(`/dashboard/academics/sections/${sectionId}`)
  redirect(`/dashboard/academics/sections/${sectionId}/assignments/${assignmentId}`)
}


// ── Create Section ────────────────────────────────────────────────────────────
export async function createSection(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== 'ADMIN') throw new Error("Unauthorized")

  const courseId    = formData.get("courseId") as string
  const teacherId   = formData.get("teacherId") as string
  const termId      = formData.get("termId") as string
  const room        = (formData.get("room") as string) || "TBA"
  const schedule    = (formData.get("schedule") as string) || "TBA"
  const bellPeriodId = formData.get("bellPeriodId") as string

  if (!courseId || !teacherId || !termId) throw new Error("Course, Teacher, and Term are required")

  const section = await (db.section as any).create({
    data: {
      courseId,
      teacherId,
      termId,
      room,
      schedule,
      bellPeriodId: bellPeriodId === "NONE" ? null : (bellPeriodId || null),
    }
  })

  revalidatePath(`/dashboard/academics/courses/${courseId}`)
  redirect(`/dashboard/academics/courses/${courseId}`)
}

export async function archiveSection(sectionId: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== 'ADMIN') throw new Error("Unauthorized")

  await db.section.update({
    where: { id: sectionId },
    data: { isArchived: true }
  })

  const section = await db.section.findUnique({ where: { id: sectionId }, select: { courseId: true } })
  if (section) {
    revalidatePath(`/dashboard/academics/courses/${section.courseId}`)
  }
  revalidatePath(`/dashboard/academics/sections/${sectionId}`)
  return { success: true }
}

// ── Update Course ─────────────────────────────────────────────────────────────
export async function updateCourse(id: string, formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== 'ADMIN') throw new Error("Unauthorized")

  const name        = (formData.get("name") as string)?.trim()
  const code        = (formData.get("code") as string)?.trim().toUpperCase()
  const description = (formData.get("description") as string)?.trim()
  const credits     = parseInt(formData.get("credits") as string, 10)

  if (!name || !code) throw new Error("Name and code are required")

  await db.course.update({
    where: { id },
    data: { name, code, description, credits: isNaN(credits) ? 1 : credits }
  })

  revalidatePath("/dashboard/academics/courses")
  revalidatePath(`/dashboard/academics/courses/${id}`)
}

// ── Delete Course ─────────────────────────────────────────────────────────────
export async function deleteCourse(id: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== 'ADMIN') throw new Error("Unauthorized")

  await db.course.delete({ where: { id } })

  revalidatePath("/dashboard/academics/courses")
  redirect("/dashboard/academics/courses")
}

// ── Delete Assignment ─────────────────────────────────────────────────────────
export async function deleteAssignment(assignmentId: string) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== "ADMIN" && session.user?.role !== "TEACHER")) {
    throw new Error("Unauthorized")
  }

  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId }
  })
  
  if (assignment) {
    await db.assignment.delete({ where: { id: assignmentId } })
    revalidatePath(`/dashboard/academics/sections/${assignment.sectionId}`)
  }

  return { success: true }
}

export async function duplicateAssignment(assignmentId: string) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== "ADMIN" && session.user?.role !== "TEACHER")) {
    throw new Error("Unauthorized")
  }

  const originalAssignment = await db.assignment.findUnique({
    where: { id: assignmentId }
  })

  if (!originalAssignment) {
    throw new Error("Assignment not found")
  }

  await db.assignment.create({
    data: {
      sectionId: originalAssignment.sectionId,
      title: `${originalAssignment.title} (Copy)`,
      description: originalAssignment.description,
      dueDate: originalAssignment.dueDate,
      maxScore: originalAssignment.maxScore,
      allowUpload: originalAssignment.allowUpload,
      type: originalAssignment.type,
      status: "DRAFT", // Automatically set duplicates to DRAFT
      publishDate: null
    }
  })

  revalidatePath(`/dashboard/academics/sections/${originalAssignment.sectionId}`)
  return { success: true }
}

// ── Update Section ────────────────────────────────────────────────────────────

export async function updateSection(id: string, formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== 'ADMIN') throw new Error("Unauthorized")

  const teacherId   = formData.get("teacherId") as string
  const termId      = formData.get("termId") as string
  const room        = (formData.get("room") as string) || "TBA"
  const schedule    = (formData.get("schedule") as string) || "TBA"
  const bellPeriodId = formData.get("bellPeriodId") as string

  await (db.section as any).update({
    where: { id },
    data: {
      teacherId,
      termId,
      room,
      schedule,
      bellPeriodId: bellPeriodId === "NONE" || bellPeriodId === "none" ? null : (bellPeriodId || null),
    }
  })

  const section = await db.section.findUnique({ where: { id }, select: { courseId: true } })
  if (section) {
    revalidatePath(`/dashboard/academics/courses/${section.courseId}`)
  }
  revalidatePath(`/dashboard/academics/sections/${id}`)
}

// ── Delete Section ────────────────────────────────────────────────────────────
export async function deleteSection(id: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== 'ADMIN') throw new Error("Unauthorized")

  const section = await db.section.findUnique({ where: { id }, select: { courseId: true } })
  await db.section.delete({ where: { id } })

  if (section) {
    revalidatePath(`/dashboard/academics/courses/${section.courseId}`)
    redirect(`/dashboard/academics/courses/${section.courseId}`)
  } else {
    redirect("/dashboard/academics/courses")
  }
}
// ── Enrollment Actions ──────────────────────────────────────────────────────
export async function enrollStudents(sectionId: string, userIds: string[]) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== 'TEACHER' && session.user?.role !== 'ADMIN')) {
    throw new Error("Unauthorized")
  }

  // For each userId, get-or-create their Student profile, then enroll
  for (const userId of userIds) {
    let student = await db.student.findFirst({ where: { userId } })
    if (!student) {
      student = await db.student.create({
        data: { userId, gradeLevel: 0, dateOfBirth: new Date("2000-01-01") }
      })
    }

    await db.enrollment.upsert({
      where: { studentId_sectionId: { studentId: student.id, sectionId } },
      update: { status: "ENROLLED" },
      create: { studentId: student.id, sectionId, status: "ENROLLED" }
    })
  }

  revalidatePath(`/dashboard/academics/sections/${sectionId}`)
  revalidatePath(`/dashboard/academics/sections/${sectionId}?tab=roster`)
  revalidatePath(`/dashboard`)
  revalidatePath(`/dashboard/academics/courses`)
  return { success: true }
}

export async function getStudents(page: number = 1, pageSize: number = 20, query?: string, gradeLevel?: number) {
  const session = await getServerSession(authOptions)
  if (!session) {
    throw new Error("Unauthorized")
  }

  const skip = (page - 1) * pageSize
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    AND: [
      query ? {
        OR: [
          { user: { name: { contains: query, mode: 'insensitive' } } },
          { user: { email: { contains: query, mode: 'insensitive' } } }
        ]
      } : {},
      gradeLevel ? { gradeLevel } : {}
    ]
  }

  const [students, totalCount] = await Promise.all([
    db.student.findMany({
      where,
      skip,
      take: pageSize,
      include: { user: true },
      orderBy: { user: { name: 'asc' } }
    }),
    db.student.count({ where })
  ])

  return {
    students,
    totalPages: Math.ceil(totalCount / pageSize),
    currentPage: page
  }
}

export async function unenrollStudent(enrollmentId: string, sectionId: string) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== 'TEACHER' && session.user?.role !== 'ADMIN')) {
    throw new Error("Unauthorized")
  }

  await db.enrollment.delete({
    where: { id: enrollmentId }
  })

  revalidatePath(`/dashboard/academics/sections/${sectionId}`)
  revalidatePath(`/dashboard/academics/sections/${sectionId}?tab=roster`)
  revalidatePath(`/dashboard`)
  revalidatePath(`/dashboard/academics/courses`)
  return { success: true }
}

export async function nudgeStudent(assignmentId: string, studentId: string) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== 'TEACHER' && session.user?.role !== 'ADMIN')) {
    throw new Error("Unauthorized")
  }

  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    include: { section: { include: { course: true } } }
  })
  if (!assignment) throw new Error("Assignment not found")

  const student = await db.student.findUnique({
    where: { id: studentId },
    include: { user: true }
  })
  if (!student) throw new Error("Student not found")

  await sendSystemMessage(
    session.user.id,
    student.userId,
    `Reminder: ${assignment.title}`,
    `Hi ${student.user.name},\n\nThis is a reminder that your assignment "${assignment.title}" for ${assignment.section.course.name} is still pending. Please submit it as soon as possible.\n\nDue Date: ${assignment.dueDate ? formatInET(assignment.dueDate, { month: 'long', day: 'numeric', year: 'numeric' }) : 'No due date'}\n\nBest,\n${session.user.name}`
  )

  return { success: true }
}

export async function nudgeAllPending(assignmentId: string) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== 'TEACHER' && session.user?.role !== 'ADMIN')) {
    throw new Error("Unauthorized")
  }

  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    include: { 
      section: { 
        include: { 
          course: true,
          enrollments: {
            include: { student: { include: { user: true } } }
          }
        } 
      },
      submissions: true
    }
  })
  if (!assignment) throw new Error("Assignment not found")

  const submittedStudentIds = new Set(assignment.submissions.map(s => s.studentId))
  const pendingEnrollments = assignment.section.enrollments.filter(e => !submittedStudentIds.has(e.studentId))

  if (pendingEnrollments.length === 0) return { success: true, count: 0 }

  const recipients = pendingEnrollments.map(e => ({
    userId: e.student.userId,
    email: e.student.user.email,
    name: e.student.user.name
  }))

  const count = await sendSystemBatchMessages(
    session.user.id,
    recipients,
    `Reminder: ${assignment.title}`,
    (name) => `Hi ${name},\n\nThis is a reminder that your assignment "${assignment.title}" for ${assignment.section.course.name} is still pending. Please submit it as soon as possible.\n\nDue Date: ${assignment.dueDate ? formatInET(assignment.dueDate, { month: 'long', day: 'numeric', year: 'numeric' }) : 'No due date'}\n\nBest,\n${session.user.name}`
  )

  return { success: true, count }
}

export async function updateGradingSettings(sectionId: string, weightingConfig: Record<string, number>) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== 'TEACHER' && session.user?.role !== 'ADMIN')) {
    throw new Error("Unauthorized")
  }

  // Ensure total weight is exactly 100 or 0
  const total = Object.values(weightingConfig).reduce((sum, val) => sum + val, 0)
  if (total !== 100 && total !== 0) {
    throw new Error("Total weight must equal 100%.")
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db.section as any).update({
    where: { id: sectionId },
    data: { weightingConfig }
  })

  revalidatePath(`/dashboard/academics/sections/${sectionId}`)
  revalidatePath(`/dashboard/academics/sections/${sectionId}/gradebook`)
  revalidatePath(`/dashboard/academics/sections/${sectionId}/settings`)

  return { success: true }
}
