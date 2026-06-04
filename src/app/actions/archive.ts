"use server"

import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { assertRole } from "@/lib/rbac"
import zlib from "zlib"

/**
 * Archive and compress a single Section's records into CompressedArchive
 * and prune the detailed relational tables to prevent DB bulge.
 */
export async function archiveAndCompressSection(sectionId: string) {
  const session = await getServerSession(authOptions)
  assertRole(session, ["ADMIN"])

  // Fetch section with its entire relational tree
  const section = await db.section.findUnique({
    where: { id: sectionId },
    include: {
      course: true,
      assignments: {
        include: {
          grades: true,
          submissions: true
        }
      },
      attendance: true,
      enrollments: {
        include: {
          termGrades: true
        }
      },
      topics: true,
      announcements: true
    }
  })

  if (!section) {
    return { error: "Section not found" }
  }

  // Construct payload with snapshotted Course data
  const archivePayload = {
    sectionId: section.id,
    course: {
      id: section.course.id,
      name: section.course.name,
      code: section.course.code,
      credits: section.course.credits,
      description: section.course.description,
    },
    teacherId: section.teacherId,
    schedule: section.schedule,
    room: section.room,
    isArchived: true,
    assignments: section.assignments.map(a => ({
      id: a.id,
      title: a.title,
      description: a.description,
      maxScore: a.maxScore,
      type: a.type,
      allowUpload: a.allowUpload,
      dueDate: a.dueDate,
      status: a.status,
      grades: a.grades.map(g => ({
        studentId: g.studentId,
        score: g.score,
        feedback: g.feedback,
      })),
      submissions: a.submissions.map(s => ({
        studentId: s.studentId,
        status: s.status,
        submittedAt: s.submittedAt,
      }))
    })),
    attendance: section.attendance.map(att => ({
      studentId: att.studentId,
      date: att.date,
      status: att.status,
      notes: att.notes,
    })),
    enrollments: section.enrollments.map(enr => ({
      id: enr.id,
      studentId: enr.studentId,
      status: enr.status,
      termGrades: enr.termGrades.map(tg => ({
        termId: tg.termId,
        calculatedScore: tg.calculatedScore,
        overrideScore: tg.overrideScore,
        letterGrade: tg.letterGrade,
        isPosted: tg.isPosted,
        postedAt: tg.postedAt,
      }))
    })),
    topics: section.topics.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
    })),
    announcements: section.announcements.map(ann => ({
      id: ann.id,
      authorId: ann.authorId,
      content: ann.content,
      createdAt: ann.createdAt,
    }))
  }

  // Compress the payload
  const compressed = zlib.gzipSync(Buffer.from(JSON.stringify(archivePayload))).toString("base64")

  const assignmentIds = section.assignments.map(a => a.id)
  const enrollmentIds = section.enrollments.map(e => e.id)

  try {
    // Save to CompressedArchive and prune relational records in a transaction
    await db.$transaction([
      db.compressedArchive.upsert({
        where: { id: `section-archive-${sectionId}` }, // Use unique ID to prevent double archive inserts
        create: {
          id: `section-archive-${sectionId}`,
          entityType: "SECTION",
          entityId: sectionId,
          data: compressed
        },
        update: {
          data: compressed
        }
      }),
      // Delete granular child items
      db.grade.deleteMany({ where: { assignmentId: { in: assignmentIds } } }),
      db.submissionRecord.deleteMany({ where: { assignmentId: { in: assignmentIds } } }),
      db.assignment.deleteMany({ where: { sectionId } }),
      db.attendance.deleteMany({ where: { sectionId } }),
      db.termGrade.deleteMany({ where: { enrollmentId: { in: enrollmentIds } } }),
      db.enrollment.deleteMany({ where: { sectionId } }),
      db.topic.deleteMany({ where: { sectionId } }),
      db.announcement.deleteMany({ where: { sectionId } }),
      // Update section status
      db.section.update({
        where: { id: sectionId },
        data: { isArchived: true }
      })
    ])

    revalidatePath(`/dashboard/academics/sections/${sectionId}`)
    if (section.courseId) {
      revalidatePath(`/dashboard/academics/courses/${section.courseId}`)
    }
    return { success: true }
  } catch (e: any) {
    console.error("archiveAndCompressSection error:", e)
    return { error: e.message || "Failed to compress and archive section" }
  }
}

/**
 * Archive and compress a single Student's transactional records
 * and mark them as archived to keep directory listings working with clean state.
 */
export async function archiveAndCompressStudent(studentId: string) {
  const session = await getServerSession(authOptions)
  assertRole(session, ["ADMIN"])

  const student = await db.student.findUnique({
    where: { id: studentId },
    include: {
      user: true,
      attendance: true,
      grades: true,
      reportCards: true,
      submissions: true,
      enrollments: {
        include: {
          termGrades: true,
          section: {
            include: {
              course: true,
              term: true
            }
          }
        }
      }
    }
  })

  if (!student) {
    return { error: "Student not found" }
  }

  const archivePayload = {
    studentId: student.id,
    gradeLevel: student.gradeLevel,
    dateOfBirth: student.dateOfBirth,
    medicalAlerts: student.medicalAlerts,
    accommodations: student.accommodations,
    user: {
      id: student.user.id,
      name: student.user.name,
      email: student.user.email,
      role: student.user.role,
    },
    attendance: student.attendance.map(a => ({
      sectionId: a.sectionId,
      date: a.date,
      status: a.status,
      notes: a.notes,
    })),
    grades: student.grades.map(g => ({
      assignmentId: g.assignmentId,
      score: g.score,
      feedback: g.feedback,
    })),
    reportCards: student.reportCards.map(rc => ({
      id: rc.id,
      termId: rc.termId,
      publishedAt: rc.publishedAt,
      isPublished: rc.isPublished,
      snapshot: rc.snapshot,
    })),
    submissions: student.submissions.map(s => ({
      assignmentId: s.assignmentId,
      status: s.status,
      submittedAt: s.submittedAt,
    })),
    enrollments: student.enrollments.map(e => ({
      sectionId: e.sectionId,
      courseName: e.section.course.name,
      courseCode: e.section.course.code,
      status: e.status,
      termGrades: e.termGrades.map(tg => ({
        termId: tg.termId,
        calculatedScore: tg.calculatedScore,
        overrideScore: tg.overrideScore,
        letterGrade: tg.letterGrade,
        isPosted: tg.isPosted,
        postedAt: tg.postedAt,
      }))
    }))
  }

  // Compress
  const compressed = zlib.gzipSync(Buffer.from(JSON.stringify(archivePayload))).toString("base64")
  const enrollmentIds = student.enrollments.map(e => e.id)

  try {
    await db.$transaction([
      db.compressedArchive.upsert({
        where: { id: `student-archive-${studentId}` },
        create: {
          id: `student-archive-${studentId}`,
          entityType: "STUDENT",
          entityId: studentId,
          data: compressed
        },
        update: {
          data: compressed
        }
      }),
      // Delete granular transactional rows
      db.grade.deleteMany({ where: { studentId } }),
      db.attendance.deleteMany({ where: { studentId } }),
      db.reportCard.deleteMany({ where: { studentId } }),
      db.submissionRecord.deleteMany({ where: { studentId } }),
      db.termGrade.deleteMany({ where: { enrollmentId: { in: enrollmentIds } } }),
      db.enrollment.deleteMany({ where: { studentId } }),
      // Update student representation to archived
      db.student.update({
        where: { id: studentId },
        data: { isArchived: true }
      }),
      db.user.update({
        where: { id: student.userId },
        data: { deletedAt: new Date() }
      })
    ])

    revalidatePath(`/dashboard/directory/${studentId}`)
    revalidatePath("/dashboard/directory")
    return { success: true }
  } catch (e: any) {
    console.error("archiveAndCompressStudent error:", e)
    return { error: e.message || "Failed to compress and archive student records" }
  }
}

/**
 * Execute end of year school rollover:
 * 1. Archive & compress all sections belonging to terms in the selected school year.
 * 2. Archive & compress students in the graduating grade level.
 * 3. Increment the grade level of all other active students by 1.
 * 4. Migrate/compress any legacy archived sections in the database.
 */
export async function runSchoolYearRollover(archiveYearId: string, graduateGradeLevel: number) {
  const session = await getServerSession(authOptions)
  assertRole(session, ["ADMIN"])

  try {
    // 1. Get the terms and sections linked to this year
    const terms = await db.term.findMany({
      where: { schoolYearId: archiveYearId }
    })
    const termIds = terms.map(t => t.id)

    const sections = await db.section.findMany({
      where: { termId: { in: termIds } }
    })

    // 2. Compress and archive all sections in the target year
    for (const section of sections) {
      await archiveAndCompressSection(section.id)
    }

    // 3. Compress and archive graduating students
    const graduatingStudents = await db.student.findMany({
      where: { gradeLevel: graduateGradeLevel, isArchived: false }
    })
    for (const student of graduatingStudents) {
      await archiveAndCompressStudent(student.id)
    }

    // 4. Promote other students to next grade level and deactivate this year in parallel
    await Promise.all([
      db.student.updateMany({
        where: { gradeLevel: { lt: graduateGradeLevel }, isArchived: false },
        data: {
          gradeLevel: {
            increment: 1
          }
        }
      }),
      db.schoolYear.update({
        where: { id: archiveYearId },
        data: { isActive: false }
      })
    ])

    // 6. Migrate previously archived legacy sections to new format
    const legacyArchivedSections = await db.section.findMany({
      where: { isArchived: true }
    })

    for (const sec of legacyArchivedSections) {
      const exists = await db.compressedArchive.findFirst({
        where: { entityType: "SECTION", entityId: sec.id }
      })
      if (!exists) {
        // Run migration for legacy section (will compress what is left, and clean up)
        await archiveAndCompressSection(sec.id)
      }
    }

    revalidatePath("/dashboard/admin/calendar/terms")
    revalidatePath("/dashboard/directory")
    return { success: true }
  } catch (e: any) {
    console.error("runSchoolYearRollover error:", e)
    return { error: e.message || "Failed to execute school year rollover" }
  }
}

/**
 * Fetch and decompress a compressed history record by type and ID.
 */
export async function getDecompressedArchive(entityType: "SECTION" | "STUDENT", entityId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  const archive = await db.compressedArchive.findFirst({
    where: { entityType, entityId }
  })
  if (!archive) return null

  try {
    const buffer = Buffer.from(archive.data, "base64")
    const decompressed = zlib.gunzipSync(buffer)
    return JSON.parse(decompressed.toString())
  } catch (e) {
    console.error("getDecompressedArchive error:", e)
    return null
  }
}

/**
 * Archive and compress multiple students in bulk.
 */
export async function bulkArchiveStudents(studentIds: string[]) {
  const session = await getServerSession(authOptions)
  assertRole(session, ["ADMIN"])

  if (!studentIds || studentIds.length === 0) {
    return { error: "No students selected" }
  }

  const errors: string[] = []
  let successCount = 0

  for (const studentId of studentIds) {
    try {
      const res = await archiveAndCompressStudent(studentId)
      if (res.error) {
        errors.push(`Student ${studentId}: ${res.error}`)
      } else {
        successCount++
      }
    } catch (e: any) {
      errors.push(`Student ${studentId}: ${e.message || e}`)
    }
  }

  revalidatePath("/dashboard/directory")
  return {
    success: successCount > 0,
    successCount,
    failedCount: errors.length,
    errors: errors.length > 0 ? errors : undefined
  }
}

