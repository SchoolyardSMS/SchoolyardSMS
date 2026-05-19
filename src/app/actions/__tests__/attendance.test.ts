import { describe, it, expect, beforeEach, vi } from "vitest"
import { mockDb, resetDbMocks } from "@/test/mocks/db"
import { adminSession, teacherSession, studentSession, mockSession } from "@/test/mocks/session"
import { AttendanceStatus } from "@prisma/client"

// Mock messaging module
vi.mock("../messaging", () => ({
  sendSystemBatchMessages: vi.fn(),
  sendSystemMessage: vi.fn(),
}))

// Mock dates (already partially mocked in setup, but we need formatInET for attendance)
vi.mock("@/lib/dates", () => ({
  formatInET: vi.fn(() => "May 1, 2026"),
  parseLocalDate: vi.fn((s: string) => new Date(s + "T12:00:00")),
}))

import {
  submitAttendance,
  submitBulkAttendance,
  archiveAttendanceDay,
} from "../attendance"

describe("submitAttendance", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("rejects unauthenticated requests", async () => {
    mockSession(null)
    await expect(
      submitAttendance("sec1", "stud1", new Date(), AttendanceStatus.PRESENT)
    ).rejects.toThrow("Unauthorized")
  })

  it("rejects student role", async () => {
    mockSession(studentSession())
    await expect(
      submitAttendance("sec1", "stud1", new Date(), AttendanceStatus.PRESENT)
    ).rejects.toThrow()
  })

  it("rejects teacher who is not section owner", async () => {
    mockSession(teacherSession())
    mockDb.section.findUnique.mockResolvedValue({
      teacher: { userId: "other-teacher" },
    })

    await expect(
      submitAttendance("sec1", "stud1", new Date(), AttendanceStatus.PRESENT)
    ).rejects.toThrow("not the assigned teacher")
  })

  it("allows admin to submit for any section", async () => {
    mockSession(adminSession())
    mockDb.attendance.upsert.mockResolvedValue({ id: "att1" })

    await submitAttendance("sec1", "stud1", new Date(), AttendanceStatus.PRESENT)

    expect(mockDb.attendance.upsert).toHaveBeenCalledOnce()
  })

  it("allows teacher who owns section to submit", async () => {
    mockSession(teacherSession())
    mockDb.section.findUnique.mockResolvedValue({
      teacher: { userId: "teacher-1", user: {} },
    })
    mockDb.attendance.upsert.mockResolvedValue({ id: "att1" })

    await submitAttendance("sec1", "stud1", new Date(), AttendanceStatus.PRESENT)

    expect(mockDb.attendance.upsert).toHaveBeenCalledOnce()
  })

  it("sends parent notifications when notifiedParent=true", async () => {
    mockSession(adminSession())
    mockDb.attendance.upsert.mockResolvedValue({ id: "att1" })
    mockDb.student.findUnique.mockResolvedValue({
      id: "stud1",
      user: { name: "Student One" },
      parents: [
        {
          parent: {
            userId: "p1",
            user: { email: "parent@school.edu", name: "Parent One" },
          },
        },
      ],
    })
    mockDb.section.findUnique.mockResolvedValue({ course: { name: "Biology" } })

    const { sendSystemBatchMessages } = await import("../messaging")

    await submitAttendance("sec1", "stud1", new Date(), AttendanceStatus.ABSENT, {
      notifiedParent: true,
    })

    expect(sendSystemBatchMessages).toHaveBeenCalled()
  })
})

describe("submitBulkAttendance", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("creates missing records and updates existing ones", async () => {
    mockSession(adminSession())
    mockDb.attendance.findMany.mockResolvedValue([
      { studentId: "s1" }, // existing
    ])
    mockDb.attendance.updateMany.mockResolvedValue({ count: 1 })
    mockDb.attendance.createMany.mockResolvedValue({ count: 1 })

    await submitBulkAttendance(
      "sec1",
      ["s1", "s2"],
      new Date(),
      AttendanceStatus.PRESENT
    )

    expect(mockDb.attendance.updateMany).toHaveBeenCalled()
    expect(mockDb.attendance.createMany).toHaveBeenCalled()
  })

  it("rejects student role", async () => {
    mockSession(studentSession())
    await expect(
      submitBulkAttendance("sec1", ["s1"], new Date(), AttendanceStatus.PRESENT)
    ).rejects.toThrow()
  })
})

describe("archiveAttendanceDay", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("marks attendance records as archived", async () => {
    mockSession(adminSession())
    mockDb.attendance.updateMany.mockResolvedValue({ count: 5 })

    const result = await archiveAttendanceDay("sec1", new Date())

    expect(mockDb.attendance.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { isArchived: true },
      })
    )
    expect(result).toEqual({ success: true })
  })
})
