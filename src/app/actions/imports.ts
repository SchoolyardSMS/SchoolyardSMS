"use server"

import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import Papa from "papaparse"
import bcrypt from "bcryptjs"

export async function importUsersCsv(csvText: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "ADMIN") throw new Error("Unauthorized")

  const { data, errors } = Papa.parse(csvText, { header: true, skipEmptyLines: true })
  if (errors.length > 0) throw new Error("CSV Parsing Error: " + errors[0].message)

  let successCount = 0
  const defaultPassword = await bcrypt.hash("schoolyard2025", 10)

  for (const row of data as any[]) {
    const email = row.Email?.trim().toLowerCase()
    const name = row.Name?.trim()
    const role = row.Role?.trim().toUpperCase()

    if (!email || !name || !role) continue

    // Upsert User
    const user = await db.user.upsert({
      where: { email },
      update: { name, role },
      create: { email, name, role, hashedPassword: defaultPassword }
    })

    // Upsert Profiles based on role
    if (role === "STUDENT") {
      await db.student.upsert({
        where: { userId: user.id },
        update: {},
        create: { 
          userId: user.id,
          dateOfBirth: new Date("2000-01-01"),
          gradeLevel: 9
        }
      })
    } else if (role === "TEACHER") {
      await db.teacher.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id, department: row.Department || "General" }
      })
    }
    successCount++
  }

  return { success: true, count: successCount }
}

export async function importCoursesCsv(csvText: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "ADMIN") throw new Error("Unauthorized")

  const { data, errors } = Papa.parse(csvText, { header: true, skipEmptyLines: true })
  if (errors.length > 0) throw new Error("CSV Parsing Error: " + errors[0].message)

  let successCount = 0

  for (const row of data as any[]) {
    const code = row.Code?.trim()
    const name = row.Name?.trim()
    const credits = parseFloat(row.Credits) || 1.0
    const description = row.Description?.trim()

    if (!code || !name) continue

    await db.course.upsert({
      where: { code },
      update: { name, credits, description },
      create: { code, name, credits, description }
    })
    successCount++
  }

  return { success: true, count: successCount }
}

export async function importSectionsCsv(csvText: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "ADMIN") throw new Error("Unauthorized")

  const { data, errors } = Papa.parse(csvText, { header: true, skipEmptyLines: true })
  if (errors.length > 0) throw new Error("CSV Parsing Error: " + errors[0].message)

  let successCount = 0

  for (const row of data as any[]) {
    const courseCode = row.CourseCode?.trim()
    const teacherEmail = row.TeacherEmail?.trim().toLowerCase()
    const termId = row.TermID?.trim()
    const schedule = row.Schedule?.trim()
    const room = row.Room?.trim()

    if (!courseCode || !teacherEmail || !termId) continue

    const course = await db.course.findUnique({ where: { code: courseCode } })
    const teacherUser = await db.user.findUnique({ where: { email: teacherEmail }, include: { teacherProfile: true } })
    
    if (!course || !teacherUser || !teacherUser.teacherProfile) continue

    await (db.section as any).create({
      data: {
        courseId: course.id,
        teacherId: teacherUser.teacherProfile.id,
        termId: termId,
        legacyTerm: "Imported",
        schedule: schedule || "TBA",
        room: room || "TBA"
      }
    })
    successCount++
  }

  return { success: true, count: successCount }
}

export async function importEnrollmentsCsv(csvText: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "ADMIN") throw new Error("Unauthorized")

  const { data, errors } = Papa.parse(csvText, { header: true, skipEmptyLines: true })
  if (errors.length > 0) throw new Error("CSV Parsing Error: " + errors[0].message)

  let successCount = 0

  for (const row of data as any[]) {
    const studentEmail = row.StudentEmail?.trim().toLowerCase()
    const sectionId = row.SectionID?.trim()

    if (!studentEmail || !sectionId) continue

    const studentUser = await db.user.findUnique({ where: { email: studentEmail }, include: { studentProfile: true } })
    
    if (!studentUser || !studentUser.studentProfile) continue

    // Enforce unique enrollment
    await db.enrollment.upsert({
      where: {
        studentId_sectionId: {
          studentId: studentUser.studentProfile.id,
          sectionId: sectionId
        }
      },
      update: {},
      create: {
        studentId: studentUser.studentProfile.id,
        sectionId: sectionId
      }
    })
    successCount++
  }

  return { success: true, count: successCount }
}
