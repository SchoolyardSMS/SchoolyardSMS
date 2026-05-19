import { describe, it, expect, beforeEach, vi } from "vitest"
import { mockDb, resetDbMocks } from "@/test/mocks/db"
import {
  adminSession,
  teacherSession,
  studentSession,
  mockSession,
} from "@/test/mocks/session"

// Mock messaging used by nudge actions
vi.mock("../messaging", () => ({
  sendSystemMessage: vi.fn(),
  sendSystemBatchMessages: vi.fn().mockResolvedValue(5),
}))

// Mock dates
vi.mock("@/lib/dates", () => ({
  parseLocalDate: vi.fn((s: string) => new Date(s + "T12:00:00")),
  parseDateAsET: vi.fn((d: string, t: string) => new Date(`${d}T${t || "00:00"}:00`)),
  formatInET: vi.fn(() => "May 1, 2026"),
}))

import {
  mutateGrade,
  createCourse,
  deleteAssignment,
  enrollStudents,
  updateGradingSettings,
  submitAssignment,
} from "../academics"

describe("mutateGrade", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("allows admin to update a grade", async () => {
    mockSession(adminSession())
    mockDb.grade.upsert.mockResolvedValue({ id: "g1" })
    mockDb.assignment.findUnique.mockResolvedValue({ sectionId: "s1" })

    const result = await mutateGrade("a1", "stud1", 95)

    expect(mockDb.grade.upsert).toHaveBeenCalled()
    expect(result).toEqual({ success: true })
  })

  it("rejects student role", async () => {
    mockSession(studentSession())

    await expect(mutateGrade("a1", "stud1", 95)).rejects.toThrow("Unauthorized")
  })
})

describe("submitAssignment", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("rejects if student ID does not match session user", async () => {
    mockSession(studentSession())
    mockDb.student.findUnique.mockResolvedValue({
      id: "different-student",
      userId: "student-1",
    })

    await expect(submitAssignment("a1", "stud1")).rejects.toThrow("mismatch")
  })

  it("allows student to submit their own assignment", async () => {
    mockSession(studentSession())
    mockDb.student.findUnique.mockResolvedValue({
      id: "stud1",
      userId: "student-1",
    })
    mockDb.submissionRecord.upsert.mockResolvedValue({ id: "sr1" })
    mockDb.assignment.findUnique.mockResolvedValue({ sectionId: "s1" })

    const result = await submitAssignment("a1", "stud1")
    expect(result).toEqual({ success: true })
  })
})

describe("createCourse", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("validates and creates a course for admin", async () => {
    mockSession(adminSession())
    mockDb.course.create.mockResolvedValue({ id: "c1" })

    const form = new FormData()
    form.set("name", "Biology")
    form.set("code", "bio101")
    form.set("description", "Intro to Biology")
    form.set("credits", "3")

    await expect(createCourse(form)).rejects.toThrow("NEXT_REDIRECT")

    expect(mockDb.course.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Biology",
          code: "BIO101", // uppercased
        }),
      })
    )
  })

  it("rejects invalid form data", async () => {
    mockSession(adminSession())

    const form = new FormData()
    form.set("name", "") // empty name
    form.set("code", "bio101")

    await expect(createCourse(form)).rejects.toThrow("Invalid course data")
  })

  it("rejects non-admin", async () => {
    mockSession(teacherSession())

    const form = new FormData()
    form.set("name", "Biology")
    form.set("code", "bio101")

    await expect(createCourse(form)).rejects.toThrow("Unauthorized")
  })
})

describe("deleteAssignment", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("allows admin to delete any assignment", async () => {
    mockSession(adminSession())
    mockDb.assignment.findUnique.mockResolvedValue({
      sectionId: "s1",
      section: { teacher: { userId: "other-teacher" } },
    })
    mockDb.assignment.update.mockResolvedValue({ id: "a1" })

    const result = await deleteAssignment("a1")
    expect(result).toEqual({ success: true })
  })

  it("rejects teacher who does not own the assignment", async () => {
    mockSession(teacherSession())
    mockDb.assignment.findUnique.mockResolvedValue({
      sectionId: "s1",
      section: { teacher: { userId: "other-teacher" } },
    })

    await expect(deleteAssignment("a1")).rejects.toThrow("Forbidden")
  })

  it("throws when assignment not found", async () => {
    mockSession(adminSession())
    mockDb.assignment.findUnique.mockResolvedValue(null)

    await expect(deleteAssignment("a1")).rejects.toThrow("Assignment not found")
  })
})

describe("enrollStudents", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("creates student profile if missing and enrolls", async () => {
    mockSession(adminSession())
    mockDb.student.findFirst.mockResolvedValue(null) // no existing profile
    mockDb.student.create.mockResolvedValue({
      id: "new-student",
      userId: "u1",
    })
    mockDb.enrollment.upsert.mockResolvedValue({ id: "e1" })

    const result = await enrollStudents("sec1", ["u1"])

    expect(mockDb.student.create).toHaveBeenCalled()
    expect(mockDb.enrollment.upsert).toHaveBeenCalled()
    expect(result).toEqual({ success: true })
  })
})

describe("updateGradingSettings", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("rejects weights that don't total 100 or 0", async () => {
    mockSession(adminSession())

    await expect(
      updateGradingSettings("s1", { HOMEWORK: 30, TEST: 50 })
    ).rejects.toThrow("Total weight must equal 100%")
  })

  it("accepts weights totaling 100", async () => {
    mockSession(adminSession())
    mockDb.section.update.mockResolvedValue({ id: "s1" })

    const result = await updateGradingSettings("s1", {
      HOMEWORK: 30,
      TEST: 70,
    })
    expect(result).toEqual({ success: true })
  })
})
