import { db } from "@/lib/db"
import type { Session } from "next-auth"
import { cache } from "react"

/**
 * Asserts the session is authenticated and the user holds one of the required
 * roles. Throws "Unauthorized" otherwise.
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

// Memoized teacher profile lookup to prevent N+1 queries during a single request lifecycle
const getTeacherIdByUserId = cache(async (userId: string) => {
  const teacher = await db.teacher.findUnique({ where: { userId }, select: { id: true } })
  return teacher?.id || null
})

// Memoized section lookup to prevent N+1 queries during a single request lifecycle
const getSectionTeacherId = cache(async (sectionId: string) => {
  const section = await db.section.findUnique({ where: { id: sectionId }, select: { teacherId: true } })
  return section?.teacherId || null
})

export async function assertTeacherOrAdminForSection(
  session: { user: { id: string; role: string } } | null,
  sectionId: string
) {
  if (!session?.user) throw new Error("Unauthorized")
  if (session.user.role === 'ADMIN') return
  if (session.user.role !== 'TEACHER') throw new Error("Unauthorized: insufficient role")

  const sectionTeacherId = await getSectionTeacherId(sectionId)
  if (!sectionTeacherId) throw new Error("Section not found")

  const teacherId = await getTeacherIdByUserId(session.user.id)
  if (!teacherId) throw new Error("Unauthorized: teacher profile not found")

  if (sectionTeacherId !== teacherId) {
    throw new Error("Unauthorized: not the assigned teacher for this section")
  }
}

const rbac = {
  assertRole,
  assertTeacherOrAdminForSection
}
export default rbac
