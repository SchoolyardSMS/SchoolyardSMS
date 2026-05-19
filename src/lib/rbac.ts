import { db } from "./db"
import type { Session } from "next-auth"

/**
 * Asserts the session is authenticated and the user holds one of the required
 * roles. Throws "Unauthorized" otherwise.
 *
 * Returns the session narrowed to a non-nullable type so callers can safely
 * access session.user.* without additional null checks.
 */
export function assertRole<T extends Session | null>(
  session: T,
  roles: string[] = []
): asserts session is NonNullable<T> {
  if (!session?.user) throw new Error("Unauthorized")
  if (!roles.includes((session as { user: { role: string } }).user.role)) {
    throw new Error("Unauthorized: insufficient role")
  }
}

export async function assertTeacherOrAdminForSection(
  session: { user: { id: string; role: string } } | null,
  sectionId: string
) {
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

const rbac = {
  assertRole,
  assertTeacherOrAdminForSection
}
export default rbac
