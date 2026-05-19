/**
 * Session factory helpers for tests.
 *
 * Usage:
 *   import { adminSession, teacherSession, mockSession } from "@/test/mocks/session"
 *   mockSession(adminSession())
 */
import { vi } from "vitest"
import { getServerSession } from "next-auth/next"

const mockedGetServerSession = vi.mocked(getServerSession)

export function adminSession(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: "admin-1",
      name: "Admin User",
      email: "admin@school.edu",
      role: "ADMIN",
      ...overrides,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  }
}

export function teacherSession(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: "teacher-1",
      name: "Teacher User",
      email: "teacher@school.edu",
      role: "TEACHER",
      ...overrides,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  }
}

export function studentSession(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: "student-1",
      name: "Student User",
      email: "student@school.edu",
      role: "STUDENT",
      ...overrides,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  }
}

export function parentSession(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: "parent-1",
      name: "Parent User",
      email: "parent@school.edu",
      role: "PARENT",
      ...overrides,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  }
}

/**
 * Set the session that `getServerSession` will return for the current test.
 * Pass `null` to simulate an unauthenticated request.
 */
export function mockSession(session: ReturnType<typeof adminSession> | null) {
  mockedGetServerSession.mockResolvedValue(session as any)
}
