"use server"

import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { randomUUID } from "crypto"
import { sendInviteEmail } from "@/lib/mail"
import { Role } from "@prisma/client"
import bcrypt from "bcryptjs"
import { headers } from "next/headers"
import { assertRole } from "@/lib/rbac"

export async function updateUserProfile(formData: { name: string; email: string }) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    const user = await db.user.findUnique({ where: { id: session.user.id } })
    if (!user) return { error: "User not found" }

    const updateData: { name?: string; email?: string } = {
      name: formData.name,
    }

    // Only allow email change if the user is an ADMIN, or if it matches their current email
    if (user.role === 'ADMIN') {
      updateData.email = formData.email.trim().toLowerCase()
    } else if (formData.email.trim().toLowerCase() !== user.email.toLowerCase()) {
      return { error: "Email addresses can only be modified by a school administrator." }
    }

    await db.user.update({
      where: { id: session.user.id },
      data: updateData
    })
    
    revalidatePath("/profile")
    revalidatePath("/dashboard")
    return { success: true }
  } catch (error) {
    return { error: "Failed to update profile. Email might be in use." }
  }
}

export async function inviteUser(formData: FormData) {
  const session = await getServerSession(authOptions)
  assertRole(session, ['ADMIN'])

  const email = (formData.get("email") as string)?.trim().toLowerCase()
  const name  = (formData.get("name") as string)?.trim()
  const role  = formData.get("role") as Role
  const gradeLevelStr = formData.get("gradeLevel") as string
  const gradeLevel = gradeLevelStr ? parseInt(gradeLevelStr, 10) : 0
  const studentId = formData.get("studentId") as string

  if (!email || !name || !role) {
    throw new Error("Email, Name and Role are required.")
  }

  // 1. Create/Update user record (reserve email)
  const user = await db.user.upsert({
    where: { email },
    update: { name, role },
    create: { email, name, role }
  })

  // 1b. Auto-create full sub-profile based on role
  if (role === 'STUDENT') {
    const existingStudent = await db.student.findFirst({ where: { userId: user.id } })
    if (!existingStudent) {
      await db.student.create({
        data: { userId: user.id, gradeLevel, dateOfBirth: new Date("2000-01-01") }
      })
    } else if (gradeLevel > 0) {
      // Update grade level if provided and different
      await db.student.update({
        where: { id: existingStudent.id },
        data: { gradeLevel }
      })
    }
  } else if (role === 'TEACHER') {
    const existingTeacher = await db.teacher.findFirst({ where: { userId: user.id } })
    if (!existingTeacher) {
      await db.teacher.create({
        data: { userId: user.id }
      })
    }
  } else if (role === 'PARENT') {
    const existingParent = await db.parent.findFirst({ where: { userId: user.id } })
    if (!existingParent) {
      await db.parent.create({
        data: { userId: user.id }
      })
    }
  }

  // 2. Generate and save token
  const token = randomUUID()
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  await db.userToken.upsert({
    where: { email_token: { email, token } },
    update: { token, expires, studentId: studentId || null },
    create: { email, token, role, expires, studentId: studentId || null }
  })

  // 3. Send Email
  const headersList = await headers()
  const host = headersList.get('host')
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const baseUrl = process.env.NEXTAUTH_URL ? process.env.NEXTAUTH_URL.replace(/\/$/, '') : `${protocol}://${host}`
  
  const inviteLink = `${baseUrl}/register?token=${token}&email=${encodeURIComponent(email)}`
  await sendInviteEmail(email, inviteLink, role)

  revalidatePath("/dashboard/admin/users")
}

export async function bulkUploadUsers(csvContent: string) {
  const session = await getServerSession(authOptions)
  assertRole(session, ['ADMIN'])

  try {
    const { enqueueBulkUpload } = await import("@/lib/queue")
    await enqueueBulkUpload(csvContent)
    return { success: true, message: "Bulk upload scheduled in the background." }
  } catch (err: any) {
    return { error: err.message || "Failed to start bulk upload." }
  }
}

export async function completeRegistration(formData: FormData) {
  const token    = formData.get("token") as string
  const email    = formData.get("email") as string
  const password = formData.get("password") as string
  const name     = formData.get("name") as string

  if (!token || !email || !password) {
    throw new Error("Missing required fields.")
  }

  // 1. Verify Token
  const storedToken = await db.userToken.findUnique({
    where: { email_token: { email, token } }
  })

  if (!storedToken || storedToken.expires < new Date()) {
    throw new Error("Invalid or expired invitation link.")
  }

  // 2. Hash Password
  const hashedPassword = await bcrypt.hash(password, 12)

  // 3. Update User
  const user = await db.user.update({
    where: { email },
    data: { name, hashedPassword },
    include: { parentProfile: true }
  })

  // 3b. If PARENT, handle student linking from token
  if (storedToken.role === "PARENT" && storedToken.studentId) {
    let parentProfile = user.parentProfile
    if (!parentProfile) {
      parentProfile = await db.parent.create({
        data: { userId: user.id }
      })
    }

    // Link student
    await db.parentStudent.upsert({
      where: { 
        parentId_studentId: { 
          parentId: parentProfile.id, 
          studentId: storedToken.studentId 
        } 
      },
      update: {},
      create: {
        parentId: parentProfile.id,
        studentId: storedToken.studentId
      }
    })
  }

  // 4. Cleanup Token
  await db.userToken.delete({ where: { id: storedToken.id } })

  redirect("/login?registered=true")
}

export async function deleteUser(id: string) {
  const session = await getServerSession(authOptions)
  assertRole(session, ['ADMIN'])

  // Prevent deleting oneself
  if (session.user.id === id) {
    throw new Error("Cannot delete your own admin account.")
  }

  // Soft delete user to retain historical grades, attendance and audit logs for compliance
  await db.user.update({
    where: { id },
    data: { deletedAt: new Date() }
  })

  revalidatePath("/dashboard/admin/users")
  return { success: true }
}

export async function editUser(id: string, formData: FormData) {
  const session = await getServerSession(authOptions)
  assertRole(session, ['ADMIN'])

  const name = (formData.get("name") as string)?.trim()
  const email = (formData.get("email") as string)?.trim().toLowerCase()
  const role = formData.get("role") as Role
  const gradeLevelStr = formData.get("gradeLevel") as string

  if (!name || !email || !role) {
    throw new Error("Name, email, and role are required.")
  }

  // Check if changing email creates a conflict
  const existing = await db.user.findUnique({ where: { email } })
  if (existing && existing.id !== id) {
    throw new Error("Email is already in use by another user.")
  }

  await db.user.update({
    where: { id },
    data: { name, email, role }
  })

  // If role is STUDENT and gradeLevel is provided, update it
  if (role === 'STUDENT' && gradeLevelStr) {
    const gradeLevel = parseInt(gradeLevelStr, 10)
    const studentProfile = await db.student.findFirst({ where: { userId: id } })
    if (studentProfile) {
      await db.student.update({
        where: { id: studentProfile.id },
        data: { gradeLevel }
      })
    } else {
      await db.student.create({
        data: { userId: id, gradeLevel, dateOfBirth: new Date("2000-01-01") }
      })
    }
  } else if (role === 'TEACHER') {
    // Ensure teacher profile exists if role changed
    const teacherProfile = await db.teacher.findFirst({ where: { userId: id } })
    if (!teacherProfile) {
      await db.teacher.create({
        data: { userId: id }
      })
    }
  }

  revalidatePath("/dashboard/admin/users")
  return { success: true }
}

export async function getUsers(page: number = 1, pageSize: number = 20) {
  const session = await getServerSession(authOptions)
  assertRole(session, ['ADMIN'])

  const skip = (page - 1) * pageSize

  const [users, totalCount] = await Promise.all([
    db.user.findMany({
      where: { deletedAt: null },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        studentProfile: true,
        teacherProfile: true,
      }
    }),
    db.user.count({ where: { deletedAt: null } })
  ])

  return {
    users,
    totalPages: Math.ceil(totalCount / pageSize),
    currentPage: page
  }
}

export async function searchUsers(query: string, options: { role?: Role | "STAFF" } = {}) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("Unauthorized")

  if (!query || query.length < 2) return []

  const where: any = {
    deletedAt: null,
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } },
      { id: { contains: query, mode: "insensitive" } }
    ]
  }

  if (options.role) {
    if (options.role === "STAFF") {
      where.role = { in: ["TEACHER", "ADMIN"] }
    } else {
      where.role = options.role
    }
  }

  const users = await db.user.findMany({
    where,
    include: {
      studentProfile: true,
      teacherProfile: true,
      parentProfile: true,
    },
    take: 10,
    orderBy: { name: "asc" }
  })

  return users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    // Add profile specific IDs for convenience
    studentId: u.studentProfile?.id,
    teacherId: u.teacherProfile?.id,
    parentId: u.parentProfile?.id,
    grade: u.studentProfile?.gradeLevel
  }))
}
