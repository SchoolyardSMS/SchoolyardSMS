import { db } from "./db"

export function assertRole(session: any, roles: string[] = []) {
  if (!session?.user) throw new Error("Unauthorized")
  if (!roles.includes(session.user.role)) {
    throw new Error("Unauthorized: insufficient role")
  }
}

export async function assertTeacherOrAdminForSection(session: any, sectionId: string) {
  if (!session?.user) throw new Error("Unauthorized")
  if (session.user.role === 'ADMIN') return
  if (session.user.role !== 'TEACHER') throw new Error("Unauthorized: insufficient role")

  const section = await db.section.findUnique({ where: { id: sectionId }, select: { teacherId: true } })
  if (!section) throw new Error("Section not found")
  // teacherId refers to Teacher.id, but session.user.id is User.id — need to resolve teacher profile
  const teacher = await db.teacher.findUnique({ where: { userId: session.user.id }, select: { id: true } })
  if (!teacher) throw new Error("Unauthorized: teacher profile not found")
  if (section.teacherId !== teacher.id) throw new Error("Unauthorized: not the assigned teacher for this section")
}

export default {
  assertRole,
  assertTeacherOrAdminForSection
}
