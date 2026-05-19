import { describe, it, expect, beforeEach, vi } from "vitest"
import { mockDb, resetDbMocks } from "@/test/mocks/db"
import {
  adminSession,
  teacherSession,
  studentSession,
  mockSession,
} from "@/test/mocks/session"

import { createIncident, updateIncidentStatus, addIncidentComment } from "../discipline"

describe("createIncident", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("creates an incident for admin", async () => {
    mockSession(adminSession())
    mockDb.incident.create.mockResolvedValue({ id: "inc1" })

    const form = new FormData()
    form.set("studentId", "stud1")
    form.set("title", "Late to class")
    form.set("description", "Arrived 15 minutes late")
    form.set("category", "ATTENDANCE")
    form.set("severity", "MINOR")

    // createIncident calls redirect, which our mock throws
    await expect(createIncident(form)).rejects.toThrow("NEXT_REDIRECT")

    expect(mockDb.incident.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          studentId: "stud1",
          reporterId: "admin-1",
          title: "Late to class",
        }),
      })
    )
  })

  it("rejects student role", async () => {
    mockSession(studentSession())

    const form = new FormData()
    form.set("studentId", "stud1")
    form.set("title", "Test")
    form.set("description", "Test")
    form.set("category", "OTHER")
    form.set("severity", "LOW")

    await expect(createIncident(form)).rejects.toThrow("Unauthorized")
  })

  it("rejects missing required fields", async () => {
    mockSession(adminSession())

    const form = new FormData()
    form.set("studentId", "stud1")
    // missing title and description

    await expect(createIncident(form)).rejects.toThrow("required")
  })
})

describe("updateIncidentStatus", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("updates status for admin", async () => {
    mockSession(adminSession())
    mockDb.incident.update.mockResolvedValue({ id: "inc1" })

    const form = new FormData()
    form.set("id", "inc1")
    form.set("status", "RESOLVED")

    await updateIncidentStatus(form)

    expect(mockDb.incident.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "inc1" },
        data: expect.objectContaining({ status: "RESOLVED" }),
      })
    )
  })
})

describe("addIncidentComment", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("creates a comment for teacher", async () => {
    mockSession(teacherSession())
    mockDb.incidentComment.create.mockResolvedValue({ id: "ic1" })

    const form = new FormData()
    form.set("incidentId", "inc1")
    form.set("body", "Follow-up meeting scheduled.")

    await addIncidentComment(form)

    expect(mockDb.incidentComment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          incidentId: "inc1",
          authorId: "teacher-1",
          body: "Follow-up meeting scheduled.",
        }),
      })
    )
  })

  it("rejects empty comment body", async () => {
    mockSession(teacherSession())

    const form = new FormData()
    form.set("incidentId", "inc1")
    form.set("body", "   ") // whitespace-only

    await expect(addIncidentComment(form)).rejects.toThrow("required")
  })
})
