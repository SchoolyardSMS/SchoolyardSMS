import { describe, it, expect, beforeEach, vi } from "vitest"
import { mockDb, resetDbMocks } from "@/test/mocks/db"
import {
  adminSession,
  teacherSession,
  studentSession,
  mockSession,
} from "@/test/mocks/session"
import { CommunityAttendanceStatus } from "@prisma/client"

// Mock messaging
vi.mock("../messaging", () => ({
  sendSystemMessage: vi.fn(),
  sendSystemBatchMessages: vi.fn().mockResolvedValue(5),
}))

// Mock dates
vi.mock("@/lib/dates", () => ({
  formatInET: vi.fn(() => "May 1, 2026"),
}))

import {
  createCommunitySession,
  enrollInSession,
  forceEnrollStudent,
  dropSession,
  updateCommunityAttendance,
  deleteCommunitySession,
} from "../community"

describe("createCommunitySession", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("allows admin to create with explicit teacherId", async () => {
    mockSession(adminSession())
    mockDb.communitySession.create.mockResolvedValue({ id: "cs1" })

    const result = await createCommunitySession({
      calendarDayId: "cd1",
      teacherId: "t1",
      title: "Art Club",
      description: "Paint things",
      room: "101",
      capacity: 30,
      isRestricted: false,
    })

    expect(mockDb.communitySession.create).toHaveBeenCalled()
    expect(result).toEqual({ success: true })
  })

  it("teacher auto-resolves own teacher ID", async () => {
    mockSession(teacherSession())
    mockDb.teacher.findUnique.mockResolvedValue({ id: "resolved-teacher-id" })
    mockDb.communitySession.create.mockResolvedValue({ id: "cs1" })

    const result = await createCommunitySession({
      calendarDayId: "cd1",
      title: "Study Hall",
      description: "Quiet study",
      room: "Library",
      capacity: 20,
      isRestricted: false,
    })

    expect(mockDb.communitySession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ teacherId: "resolved-teacher-id" }),
      })
    )
    expect(result).toEqual({ success: true })
  })

  it("rejects student role", async () => {
    mockSession(studentSession())

    await expect(
      createCommunitySession({
        calendarDayId: "cd1",
        title: "X",
        description: "Y",
        room: "Z",
        capacity: 10,
        isRestricted: false,
      })
    ).rejects.toThrow("Unauthorized")
  })
})

describe("enrollInSession", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("rejects when session is restricted", async () => {
    mockSession(studentSession())
    mockDb.student.findUnique.mockResolvedValue({ id: "stud1" })
    mockDb.communitySession.findUnique.mockResolvedValue({
      id: "cs1",
      isRestricted: true,
      capacity: 30,
      calendarDayId: "cd1",
      _count: { enrollments: 0 },
    })

    await expect(enrollInSession("cs1")).rejects.toThrow("restricted")
  })

  it("rejects when session is full", async () => {
    mockSession(studentSession())
    mockDb.student.findUnique.mockResolvedValue({ id: "stud1" })
    mockDb.communitySession.findUnique.mockResolvedValue({
      id: "cs1",
      isRestricted: false,
      capacity: 2,
      calendarDayId: "cd1",
      _count: { enrollments: 2 },
    })

    await expect(enrollInSession("cs1")).rejects.toThrow("full")
  })

  it("rejects double-booking on the same day", async () => {
    mockSession(studentSession())
    mockDb.student.findUnique.mockResolvedValue({ id: "stud1" })
    mockDb.communitySession.findUnique.mockResolvedValue({
      id: "cs1",
      isRestricted: false,
      capacity: 30,
      calendarDayId: "cd1",
      _count: { enrollments: 5 },
    })
    mockDb.communityEnrollment.findFirst.mockResolvedValue({ id: "existing" })

    await expect(enrollInSession("cs1")).rejects.toThrow("already signed up")
  })

  it("enrolls student when valid", async () => {
    mockSession(studentSession())
    mockDb.student.findUnique.mockResolvedValue({ id: "stud1" })
    mockDb.communitySession.findUnique.mockResolvedValue({
      id: "cs1",
      isRestricted: false,
      capacity: 30,
      calendarDayId: "cd1",
      _count: { enrollments: 5 },
    })
    mockDb.communityEnrollment.findFirst.mockResolvedValue(null)
    mockDb.communityEnrollment.create.mockResolvedValue({ id: "ce1" })

    const result = await enrollInSession("cs1")
    expect(result).toEqual({ success: true })
    expect(mockDb.communityEnrollment.create).toHaveBeenCalled()
  })
})

describe("forceEnrollStudent", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("drops conflicting enrollments before force-enrolling", async () => {
    mockSession(adminSession())
    mockDb.communitySession.findUnique.mockResolvedValue({
      id: "cs2",
      calendarDayId: "cd1",
    })
    mockDb.communityEnrollment.findMany.mockResolvedValue([
      { id: "ce-conflict", sessionId: "cs1" }, // different session on same day
    ])
    mockDb.communityEnrollment.delete.mockResolvedValue({ id: "ce-conflict" })
    mockDb.communityEnrollment.upsert.mockResolvedValue({ id: "ce-new" })

    const result = await forceEnrollStudent("cs2", "stud1")

    expect(mockDb.communityEnrollment.delete).toHaveBeenCalled()
    expect(mockDb.communityEnrollment.upsert).toHaveBeenCalled()
    expect(result).toEqual({ success: true })
  })
})

describe("dropSession", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("rejects dropping a required session", async () => {
    mockSession(studentSession())
    mockDb.student.findUnique.mockResolvedValue({ id: "stud1" })
    mockDb.communityEnrollment.findUnique.mockResolvedValue({
      id: "ce1",
      isRequired: true,
    })

    await expect(dropSession("cs1")).rejects.toThrow("Cannot drop a required session")
  })
})

describe("updateCommunityAttendance", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("updates attendance status", async () => {
    mockSession(adminSession())
    mockDb.communityEnrollment.update.mockResolvedValue({ id: "ce1" })

    const result = await updateCommunityAttendance("ce1", CommunityAttendanceStatus.PRESENT)

    expect(mockDb.communityEnrollment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { attendance: "PRESENT" },
      })
    )
    expect(result).toEqual({ success: true })
  })
})

describe("deleteCommunitySession", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("teacher can only delete own session", async () => {
    mockSession(teacherSession())
    mockDb.teacher.findUnique.mockResolvedValue({ id: "t1" })
    mockDb.communitySession.findUnique.mockResolvedValue({
      id: "cs1",
      teacherId: "other-teacher",
    })

    await expect(deleteCommunitySession("cs1")).rejects.toThrow("Unauthorized")
  })
})
