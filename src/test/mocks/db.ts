/**
 * Centralized Prisma mock factory.
 *
 * Every model and method used in server actions is pre-stubbed with vi.fn().
 * Import `mockDb` in tests, then set return values with .mockResolvedValue().
 *
 * Usage:
 *   import { mockDb, resetDbMocks } from "@/test/mocks/db"
 *   beforeEach(() => resetDbMocks())
 *   mockDb.user.findUnique.mockResolvedValue({ id: "u1", ... })
 */
import { vi } from "vitest"

function createModelMock() {
  return {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  }
}

export const mockDb = {
  user: createModelMock(),
  student: createModelMock(),
  teacher: createModelMock(),
  parent: createModelMock(),
  parentStudent: createModelMock(),
  course: createModelMock(),
  section: createModelMock(),
  assignment: createModelMock(),
  grade: createModelMock(),
  enrollment: createModelMock(),
  attendance: createModelMock(),
  attendanceNotification: createModelMock(),
  reportCard: createModelMock(),
  announcement: createModelMock(),
  incident: createModelMock(),
  incidentComment: createModelMock(),
  message: createModelMock(),
  broadcast: createModelMock(),
  broadcastDelivery: createModelMock(),
  schoolSettings: createModelMock(),
  schoolYear: createModelMock(),
  term: createModelMock(),
  termGrade: createModelMock(),
  topic: createModelMock(),
  calendarDay: createModelMock(),
  communitySession: createModelMock(),
  communityEnrollment: createModelMock(),
  bellPeriod: createModelMock(),
  submissionRecord: createModelMock(),
  document: createModelMock(),
  auditLog: createModelMock(),
  userToken: createModelMock(),
  compressedArchive: createModelMock(),
  $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
}

/** Reset all mocks on the db object. Call in beforeEach(). */
export function resetDbMocks() {
  for (const model of Object.values(mockDb)) {
    if (typeof model === "object" && model !== null) {
      for (const method of Object.values(model)) {
        if (typeof method === "function" && "mockReset" in method) {
          ;(method as ReturnType<typeof vi.fn>).mockReset()
        }
      }
    }
  }
  // Restore $transaction default
  mockDb.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
    Promise.all(ops)
  )
}

// Register the mock so any `import { db } from "@/lib/db"` gets this
vi.mock("@/lib/db", () => ({
  db: mockDb,
}))
