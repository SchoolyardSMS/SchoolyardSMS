import { describe, it, expect, beforeEach, vi } from "vitest"
import { mockDb, resetDbMocks } from "@/test/mocks/db"
import {
  adminSession,
  teacherSession,
  studentSession,
  mockSession,
} from "@/test/mocks/session"

// Mock mail module
vi.mock("@/lib/mail", () => ({
  sendInviteEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}))

// Mock queue module
vi.mock("@/lib/queue", () => ({
  enqueueBulkUpload: vi.fn(),
}))

import {
  updateUserProfile,
  inviteUser,
  bulkUploadUsers,
  completeRegistration,
  deleteUser,
  editUser,
  getUsers,
  searchUsers,
} from "../user"

import { processBulkUpload } from "@/lib/bulkUploadWorker"
import { enqueueBulkUpload } from "@/lib/queue"

describe("updateUserProfile", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("updates own profile successfully", async () => {
    mockSession(studentSession())
    mockDb.user.findUnique.mockResolvedValue({ id: "student-1", role: "STUDENT", email: "student@schoolyard.dev" })
    mockDb.user.update.mockResolvedValue({ id: "student-1", name: "New Name", email: "student@schoolyard.dev" })

    const result = await updateUserProfile({ name: "New Name", email: "student@schoolyard.dev" })

    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: "student-1" },
      data: { name: "New Name" }
    })
    expect(result).toEqual({ success: true })
  })

  it("rejects email updates for non-ADMIN users", async () => {
    mockSession(studentSession())
    mockDb.user.findUnique.mockResolvedValue({ id: "student-1", role: "STUDENT", email: "student@schoolyard.dev" })

    const result = await updateUserProfile({ name: "New Name", email: "hacker@schoolyard.dev" })
    expect(result.error).toContain("modified by a school administrator")
  })

  it("returns error on failure (e.g. duplicate email)", async () => {
    mockSession(studentSession())
    mockDb.user.findUnique.mockResolvedValue({ id: "student-1", role: "STUDENT", email: "student@schoolyard.dev" })
    mockDb.user.update.mockRejectedValue(new Error("Unique constraint"))

    const result = await updateUserProfile({ name: "New Name", email: "student@schoolyard.dev" })
    expect(result.error).toBeDefined()
  })
})

describe("inviteUser", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("allows admin to invite student", async () => {
    mockSession(adminSession())
    mockDb.user.upsert.mockResolvedValue({ id: "u1", email: "student@school.edu" })
    mockDb.student.findFirst.mockResolvedValue(null)
    mockDb.student.create.mockResolvedValue({ id: "s1" })
    mockDb.userToken.upsert.mockResolvedValue({ id: "ut1" })

    const form = new FormData()
    form.set("email", "student@school.edu")
    form.set("name", "Student Name")
    form.set("role", "STUDENT")
    form.set("gradeLevel", "9")

    await inviteUser(form)

    expect(mockDb.user.upsert).toHaveBeenCalled()
    expect(mockDb.student.create).toHaveBeenCalled()
    expect(mockDb.userToken.upsert).toHaveBeenCalled()
  })

  it("allows admin to invite parent", async () => {
    mockSession(adminSession())
    mockDb.user.upsert.mockResolvedValue({ id: "u2", email: "parent@school.edu" })
    mockDb.parent.findFirst.mockResolvedValue(null)
    mockDb.parent.create.mockResolvedValue({ id: "p1" })
    mockDb.userToken.upsert.mockResolvedValue({ id: "ut2" })

    const form = new FormData()
    form.set("email", "parent@school.edu")
    form.set("name", "Parent Name")
    form.set("role", "PARENT")

    await inviteUser(form)

    expect(mockDb.user.upsert).toHaveBeenCalled()
    expect(mockDb.parent.create).toHaveBeenCalled()
  })

  it("rejects non-admin roles", async () => {
    mockSession(teacherSession())
    const form = new FormData()
    form.set("email", "student@school.edu")
    form.set("name", "Student Name")
    form.set("role", "STUDENT")

    await expect(inviteUser(form)).rejects.toThrow("Unauthorized")
  })
})

describe("bulkUploadUsers", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("schedules bulk upload successfully in the background", async () => {
    mockSession(adminSession())
    const csv = `name,email,role,gradeLevel,studentId\nJohn Doe,john@school.edu,STUDENT,9,\n`
    const result = await bulkUploadUsers(csv)

    expect(enqueueBulkUpload).toHaveBeenCalledWith(csv)
    expect(result).toEqual({ success: true, message: "Bulk upload scheduled in the background." })
  })

  it("processes valid CSV rows in worker", async () => {
    mockDb.user.upsert.mockResolvedValue({ id: "u1" })
    mockDb.student.findFirst.mockResolvedValue(null)
    mockDb.student.create.mockResolvedValue({ id: "s1" })
    mockDb.userToken.upsert.mockResolvedValue({ id: "ut1" })

    const csv = `name,email,role,gradeLevel,studentId
John Doe,john@school.edu,STUDENT,9,
`
    const result = await processBulkUpload(csv)

    expect(result.success).toBe(1)
    expect(result.errors).toHaveLength(0)
  })

  it("captures row errors and continues in worker", async () => {
    mockDb.user.upsert.mockRejectedValue(new Error("Database error"))

    const csv = `name,email,role,gradeLevel,studentId
Bad User,bad@school.edu,STUDENT,,
`
    const result = await processBulkUpload(csv)

    expect(result.success).toBe(0)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain("Database error")
  })
})

describe("completeRegistration", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("verifies token and updates user password", async () => {
    const future = new Date(Date.now() + 600000)
    mockDb.userToken.findUnique.mockResolvedValue({
      id: "ut1",
      email: "student@school.edu",
      expires: future,
      role: "STUDENT",
    })
    mockDb.user.update.mockResolvedValue({ id: "u1", parentProfile: null })
    mockDb.userToken.delete.mockResolvedValue({ id: "ut1" })

    const form = new FormData()
    form.set("token", "token123")
    form.set("email", "student@school.edu")
    form.set("password", "strongpassword")
    form.set("name", "Student Name")

    await expect(completeRegistration(form)).rejects.toThrow("NEXT_REDIRECT")

    expect(mockDb.user.update).toHaveBeenCalled()
    expect(mockDb.userToken.delete).toHaveBeenCalled()
  })

  it("throws for invalid or expired token", async () => {
    const past = new Date(Date.now() - 600000)
    mockDb.userToken.findUnique.mockResolvedValue({
      id: "ut1",
      email: "student@school.edu",
      expires: past,
      role: "STUDENT",
    })

    const form = new FormData()
    form.set("token", "token123")
    form.set("email", "student@school.edu")
    form.set("password", "strongpassword")
    form.set("name", "Student Name")

    await expect(completeRegistration(form)).rejects.toThrow("Invalid or expired")
  })
})

describe("deleteUser", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("allows admin to delete another user", async () => {
    mockSession(adminSession())
    mockDb.user.update.mockResolvedValue({ id: "other-user" })

    const result = await deleteUser("other-user")

    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: "other-user" },
      data: { deletedAt: expect.any(Date) }
    })
    expect(result).toEqual({ success: true })
  })

  it("prevents admin from deleting themselves", async () => {
    mockSession(adminSession())

    await expect(deleteUser("admin-1")).rejects.toThrow("Cannot delete your own")
  })
})

describe("editUser", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("updates user metadata and handles role updates", async () => {
    mockSession(adminSession())
    mockDb.user.findUnique.mockResolvedValue(null) // no email conflict
    mockDb.user.update.mockResolvedValue({ id: "u1" })
    mockDb.student.findFirst.mockResolvedValue({ id: "s1" })
    mockDb.student.update.mockResolvedValue({ id: "s1" })

    const form = new FormData()
    form.set("name", "Updated Name")
    form.set("email", "updated@school.edu")
    form.set("role", "STUDENT")
    form.set("gradeLevel", "10")

    const result = await editUser("u1", form)

    expect(mockDb.user.update).toHaveBeenCalled()
    expect(mockDb.student.update).toHaveBeenCalled()
    expect(result).toEqual({ success: true })
  })

  it("throws on email conflicts", async () => {
    mockSession(adminSession())
    mockDb.user.findUnique.mockResolvedValue({ id: "other-user", email: "conflict@school.edu" })

    const form = new FormData()
    form.set("name", "Name")
    form.set("email", "conflict@school.edu")
    form.set("role", "STUDENT")

    await expect(editUser("u1", form)).rejects.toThrow("already in use")
  })
})

describe("getUsers", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("returns paginated list of users", async () => {
    mockSession(adminSession())
    mockDb.user.findMany.mockResolvedValue([{ id: "u1" }, { id: "u2" }])
    mockDb.user.count.mockResolvedValue(2)

    const result = await getUsers(1, 2)

    expect(result.users).toHaveLength(2)
    expect(result.totalPages).toBe(1)
  })
})

describe("searchUsers", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("searches users with constraints", async () => {
    mockSession(teacherSession())
    mockDb.user.findMany.mockResolvedValue([
      {
        id: "u1",
        name: "Test User",
        email: "test@school.edu",
        role: "STUDENT",
        studentProfile: { id: "s1", gradeLevel: 9 },
        teacherProfile: null,
        parentProfile: null,
      }
    ])

    const result = await searchUsers("Test")

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("u1")
    expect(result[0].studentId).toBe("s1")
  })

  it("returns empty array when query is too short", async () => {
    mockSession(teacherSession())
    const result = await searchUsers("T")
    expect(result).toEqual([])
  })
})
