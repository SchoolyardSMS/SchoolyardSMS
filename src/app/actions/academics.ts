"use server"

import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { parseLocalDate, parseDateAsET, formatInET } from "@/lib/dates"
import { sendSystemMessage, sendSystemBatchMessages } from "./messaging"
import { z } from "zod"
import type { Prisma } from "@prisma/client"
import { assertRole } from "@/lib/rbac"
import { logAuditEvent } from "@/lib/audit"

const gradeUpdateSchema = z.object({
  assignmentId: z.string().min(1),
  studentId: z.string().min(1),
  score: z.coerce.number().min(0),
  feedback: z.string().trim().optional().nullable()
})

const assignmentFormSchema = z.object({
  sectionId: z.string().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
  maxScore: z.preprocess((value) => {
    if (value === null || value === undefined || String(value).trim() === "") return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : NaN
  }, z.number().nonnegative().nullable()),
  dueDate: z.string().trim().min(1),
  allowUpload: z.preprocess((value) => value === "on", z.boolean()),
  type: z.enum(["HOMEWORK", "QUIZ", "TEST", "PROJECT", "LAB", "OTHER"]),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]),
  publishDate: z.string().optional().nullable(),
  publishTime: z.string().optional().nullable(),
})

const assignmentUpdateSchema = assignmentFormSchema.extend({
  assignmentId: z.string().min(1),
  sectionId: z.string().min(1),
})

const courseFormSchema = z.object({
  name: z.string().trim().min(1),
  code: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
  credits: z.preprocess((value) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : NaN
  }, z.number().int().positive().optional()).nullable(),
})

const sectionFormSchema = z.object({
  courseId: z.string().min(1),
  teacherId: z.string().min(1),
  termId: z.string().min(1),
  room: z.string().trim().default("TBA"),
  schedule: z.string().trim().default("TBA"),
  bellPeriodId: z.string().trim().optional().nullable(),
})

async function assertTeacherSectionOwnership(userId: string, sectionId: string) {
  const section = await db.section.findUnique({
    where: { id: sectionId },
    select: { id: true, courseId: true, teacher: { select: { userId: true } } }
  })

  if (!section) {
    throw new Error("Section not found")
  }

  if (section.teacher.userId !== userId) {
    throw new Error("Forbidden")
  }

  return section
}

async function assertTeacherAssignmentOwnership(userId: string, assignmentId: string) {
  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      sectionId: true,
      section: { select: { courseId: true, teacher: { select: { userId: true } } } }
    }
  })

  if (!assignment) {
    throw new Error("Assignment not found")
  }

  if (assignment.section.teacher.userId !== userId) {
    throw new Error("Forbidden")
  }

  return assignment
}

function createStudentWhereFilter(query?: string, gradeLevel?: number): Prisma.StudentWhereInput {
  const and: Prisma.StudentWhereInput[] = []

  if (query) {
    and.push({
      OR: [
        { user: { name: { contains: query, mode: "insensitive" } } },
        { user: { email: { contains: query, mode: "insensitive" } } }
      ]
    })
  }

  if (gradeLevel) {
    and.push({ gradeLevel })
  }

  return and.length ? { AND: and } : {}
}

export async function mutateGrade(assignmentId: string, studentId: string, score: number) {
  const session = await getServerSession(authOptions)
  assertRole(session, ['ADMIN', 'TEACHER'])

  const previousGrade = await db.grade.findUnique({
    where: { assignmentId_studentId: { assignmentId, studentId } }
  })

  const grade = await db.grade.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId } },
    update: { score },
    create: { assignmentId, studentId, score, feedback: "Updated via Quick Gradebook" }
  })

  await logAuditEvent({
    actorId: session.user.id,
    action: previousGrade ? "GRADE_UPDATE" : "GRADE_CREATE",
    targetModel: "Grade",
    targetId: grade.id,
    previous: previousGrade ? { score: previousGrade.score, feedback: previousGrade.feedback } : null,
    current: { score: grade.score, feedback: grade.feedback }
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
  assertRole(session, ['STUDENT'])

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
  assertRole(session, ['ADMIN', 'TEACHER'])

  const parsed = gradeUpdateSchema.safeParse({
    assignmentId: formData.get("assignmentId"),
    studentId: formData.get("studentId"),
    score: formData.get("score"),
    feedback: formData.get("feedback")
  })

  if (!parsed.success) {
    throw new Error("Invalid grade data")
  }

  const { assignmentId, studentId, score, feedback } = parsed.data

  if (session.user.role === 'TEACHER') {
    await assertTeacherAssignmentOwnership(session.user.id, assignmentId)
  }

  const previousGrade = await db.grade.findUnique({
    where: { assignmentId_studentId: { assignmentId, studentId } }
  })

  const grade = await db.grade.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId } },
    update: { score, feedback, gradedAt: new Date() },
    create: { assignmentId, studentId, score, feedback }
  })

  await logAuditEvent({
    actorId: session.user.id,
    action: previousGrade ? "GRADE_UPDATE" : "GRADE_CREATE",
    targetModel: "Grade",
    targetId: grade.id,
    previous: previousGrade ? { score: previousGrade.score, feedback: previousGrade.feedback } : null,
    current: { score: grade.score, feedback: grade.feedback }
  })

  const assignment = await db.assignment.findUnique({ where: { id: assignmentId }, select: { sectionId: true } })
  if (assignment) {
    revalidatePath(`/dashboard/academics/sections/${assignment.sectionId}/assignments/${assignmentId}`)
    revalidatePath(`/dashboard/academics/sections/${assignment.sectionId}/gradebook`)
  }
}

// ── Create Course ─────────────────────────────────────────────────────────────
export async function createCourse(formData: FormData) {
  const session = await getServerSession(authOptions)
  assertRole(session, ['ADMIN'])

  const parsed = courseFormSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    description: formData.get("description"),
    credits: formData.get("credits")
  })

  if (!parsed.success) {
    throw new Error("Invalid course data")
  }

  const { name, code, description, credits } = parsed.data
  const course = await db.course.create({
    data: { name, code: code.toUpperCase(), description, credits: credits ?? 1 }
  })

  revalidatePath("/dashboard/academics/courses")
  redirect(`/dashboard/academics/courses/${course.id}`)
}

// ── Create Assignment ─────────────────────────────────────────────────────────
export async function createAssignment(formData: FormData) {
  const session = await getServerSession(authOptions)
  assertRole(session, ['ADMIN', 'TEACHER'])

  const parsed = assignmentFormSchema.safeParse({
    sectionId: formData.get("sectionId"),
    title: formData.get("title"),
    description: formData.get("description"),
    maxScore: formData.get("maxScore"),
    dueDate: formData.get("dueDate"),
    allowUpload: formData.get("allowUpload"),
    type: formData.get("type"),
    status: formData.get("status"),
    publishDate: formData.get("publishDate"),
    publishTime: formData.get("publishTime")
  })

  if (!parsed.success) {
    throw new Error("Invalid assignment data")
  }

  const { sectionId, title, description, maxScore, dueDate, allowUpload, type, status, publishDate, publishTime } = parsed.data
  const publishDateValue = publishDate ? parseDateAsET(publishDate, publishTime || "00:00") : null
  const dueDateValue = parseLocalDate(dueDate)

  if (session.user.role === 'TEACHER') {
    await assertTeacherSectionOwnership(session.user.id, sectionId)
  }

  const assignmentData: Prisma.AssignmentUncheckedCreateInput = {
    title,
    description,
    maxScore,
    dueDate: dueDateValue,
    sectionId,
    allowUpload,
    type,
    status,
    publishDate: publishDateValue
  }

  if (dueDateValue !== undefined) {
    assignmentData.dueDate = dueDateValue
  }

  await db.assignment.create({
    data: assignmentData
  })

  revalidatePath(`/dashboard/academics/sections/${sectionId}`)
  redirect(`/dashboard/academics/sections/${sectionId}?tab=assignments`)
}

export async function updateAssignmentDetails(formData: FormData) {
  const session = await getServerSession(authOptions)
  assertRole(session, ['ADMIN', 'TEACHER'])

  const parsed = assignmentUpdateSchema.safeParse({
    assignmentId: formData.get("assignmentId"),
    sectionId: formData.get("sectionId"),
    title: formData.get("title"),
    description: formData.get("description"),
    maxScore: formData.get("maxScore"),
    dueDate: formData.get("dueDate"),
    allowUpload: formData.get("allowUpload"),
    type: formData.get("type"),
    status: formData.get("status"),
    publishDate: formData.get("publishDate"),
    publishTime: formData.get("publishTime")
  })

  if (!parsed.success) {
    throw new Error("Invalid assignment data")
  }

  const { assignmentId, sectionId, title, description, maxScore, dueDate, allowUpload, type, status, publishDate, publishTime } = parsed.data
  const publishDateValue = publishDate ? parseDateAsET(publishDate, publishTime || "00:00") : null
  const dueDateValue = dueDate ? parseLocalDate(dueDate) : undefined

  if (session.user.role === 'TEACHER') {
    await assertTeacherAssignmentOwnership(session.user.id, assignmentId)
  }

  const updatedAssignmentData: Prisma.AssignmentUpdateInput = {
    title,
    description,
    maxScore,
    allowUpload,
    type,
    status,
    publishDate: publishDateValue,
  }

  if (dueDateValue !== undefined) {
    updatedAssignmentData.dueDate = dueDateValue
  }

  await db.assignment.update({
    where: { id: assignmentId },
    data: updatedAssignmentData
  })

  revalidatePath(`/dashboard/academics/sections/${sectionId}`)
  redirect(`/dashboard/academics/sections/${sectionId}/assignments/${assignmentId}`)
}


// ── Create Section ────────────────────────────────────────────────────────────
export async function createSection(formData: FormData) {
  const session = await getServerSession(authOptions)
  assertRole(session, ['ADMIN'])

  const parsed = sectionFormSchema.safeParse({
    courseId: formData.get("courseId"),
    teacherId: formData.get("teacherId"),
    termId: formData.get("termId"),
    room: formData.get("room"),
    schedule: formData.get("schedule"),
    bellPeriodId: formData.get("bellPeriodId")
  })

  if (!parsed.success) {
    throw new Error("Invalid section data")
  }

  const { courseId, teacherId, termId, room, schedule, bellPeriodId } = parsed.data
  const section = await db.section.create({
    data: {
      courseId,
      teacherId,
      termId,
      room,
      schedule,
      bellPeriodId: bellPeriodId === "NONE" ? null : bellPeriodId
    }
  })

  revalidatePath(`/dashboard/academics/courses/${courseId}`)
  redirect(`/dashboard/academics/courses/${courseId}`)
}

export async function archiveSection(sectionId: string) {
  const session = await getServerSession(authOptions)
  assertRole(session, ['ADMIN'])

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
  assertRole(session, ['ADMIN'])

  const parsed = courseFormSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    description: formData.get("description"),
    credits: formData.get("credits")
  })

  if (!parsed.success) {
    throw new Error("Invalid course data")
  }

  const { name, code, description, credits } = parsed.data
  await db.course.update({
    where: { id },
    data: { name, code: code.toUpperCase(), description, credits: credits ?? 1 }
  })

  revalidatePath("/dashboard/academics/courses")
  revalidatePath(`/dashboard/academics/courses/${id}`)
}

// ── Delete Course ─────────────────────────────────────────────────────────────
export async function deleteCourse(id: string) {
  const session = await getServerSession(authOptions)
  assertRole(session, ['ADMIN'])

  await db.course.update({
    where: { id },
    data: { isArchived: true }
  })

  revalidatePath("/dashboard/academics/courses")
  redirect("/dashboard/academics/courses")
}

// ── Delete Assignment ─────────────────────────────────────────────────────────
export async function deleteAssignment(assignmentId: string) {
  const session = await getServerSession(authOptions)
  assertRole(session, ["ADMIN", "TEACHER"])

  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    select: {
      sectionId: true,
      section: { select: { teacher: { select: { userId: true } } } }
    }
  })

  if (!assignment) {
    throw new Error("Assignment not found")
  }

  if (session.user.role === "TEACHER" && assignment.section.teacher.userId !== session.user.id) {
    throw new Error("Forbidden")
  }

  await db.assignment.update({
    where: { id: assignmentId },
    data: { isArchived: true }
  })

  revalidatePath(`/dashboard/academics/sections/${assignment.sectionId}`)
  return { success: true }
}

export async function duplicateAssignment(assignmentId: string) {
  const session = await getServerSession(authOptions)
  assertRole(session, ['ADMIN', 'TEACHER'])

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
  assertRole(session, ['ADMIN'])

  const parsed = sectionFormSchema.safeParse({
    courseId: formData.get("courseId") ?? "", // courseId is not updated here, but schema can still validate the form shape
    teacherId: formData.get("teacherId"),
    termId: formData.get("termId"),
    room: formData.get("room"),
    schedule: formData.get("schedule"),
    bellPeriodId: formData.get("bellPeriodId")
  })

  if (!parsed.success) {
    throw new Error("Invalid section data")
  }

  const { teacherId, termId, room, schedule, bellPeriodId } = parsed.data

  await db.section.update({
    where: { id },
    data: {
      teacherId,
      termId,
      room,
      schedule,
      bellPeriodId: bellPeriodId === "NONE" || bellPeriodId === "none" ? null : bellPeriodId,
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
  assertRole(session, ['ADMIN'])

  const section = await db.section.findUnique({ where: { id }, select: { courseId: true } })
  await db.section.update({ where: { id }, data: { isArchived: true } })

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
  assertRole(session, ['ADMIN', 'TEACHER'])

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
  assertRole(session, ['ADMIN', 'TEACHER'])

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
  assertRole(session, ['ADMIN', 'TEACHER'])

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
  assertRole(session, ['ADMIN', 'TEACHER'])

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
  assertRole(session, ['ADMIN', 'TEACHER'])

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
