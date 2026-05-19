import { describe, it, expect, beforeEach, vi } from "vitest"
import { mockDb, resetDbMocks } from "@/test/mocks/db"
import {
  adminSession,
  teacherSession,
  studentSession,
  mockSession,
} from "@/test/mocks/session"
import {
  uploadAssignmentSubmission,
  uploadBrandingFile,
  uploadMaterialFile,
} from "../upload"
import { mkdir, writeFile } from "fs/promises"
import { revalidatePath } from "next/cache"
import { DocumentType } from "@prisma/client"

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

// Mock fs/promises
vi.mock("fs/promises", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}))

const createMockFile = (name: string) => {
  return new File([Buffer.from("mock content")], name, { type: "application/pdf" })
}

describe("upload server actions", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
    process.env.DISABLE_UPLOADS = "false"
  })

  describe("uploadAssignmentSubmission", () => {
    it("rejects non-student users", async () => {
      mockSession(teacherSession())
      const form = new FormData()
      await expect(uploadAssignmentSubmission(form)).rejects.toThrow("Unauthorized")
    })

    it("returns mock URL if uploads are disabled in environment", async () => {
      mockSession(studentSession())
      process.env.DISABLE_UPLOADS = "true"

      const form = new FormData()
      form.set("file", createMockFile("test.pdf") as any)
      form.set("assignmentId", "asg-1")

      const result = await uploadAssignmentSubmission(form)
      expect(result.success).toBe(true)
      expect(result.url).toBe("/placeholder-file.svg")
      expect(writeFile).not.toHaveBeenCalled()
    })

    it("saves file, creates database entry, and revalidates on success", async () => {
      mockSession(studentSession())
      mockDb.student.findUnique.mockResolvedValue({ id: "std-1" })
      mockDb.assignment.findUnique.mockResolvedValue({ id: "asg-1", sectionId: "sec-1" })
      mockDb.document.create.mockResolvedValue({ id: "doc-1" })

      const form = new FormData()
      form.set("file", createMockFile("homework.pdf") as any)
      form.set("assignmentId", "asg-1")

      const result = await uploadAssignmentSubmission(form)

      expect(result.success).toBe(true)
      expect(result.url).toContain("/api/uploads/")
      expect(mkdir).toHaveBeenCalled()
      expect(writeFile).toHaveBeenCalled()

      // Verify db.document.create call
      expect(mockDb.document.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: "homework.pdf",
          type: DocumentType.ASSIGNMENT_SUBMISSION,
          uploaderId: "student-1",
          studentId: "std-1",
          assignmentId: "asg-1"
        })
      })

      // Verify page revalidation
      expect(revalidatePath).toHaveBeenCalledWith(
        "/dashboard/academics/sections/sec-1/assignments/asg-1"
      )
    })

    it("throws error for missing file or assignment ID", async () => {
      mockSession(studentSession())
      const form = new FormData()
      await expect(uploadAssignmentSubmission(form)).rejects.toThrow("Missing file or assignment ID")
    })
  })

  describe("uploadBrandingFile", () => {
    it("rejects non-admin users", async () => {
      mockSession(teacherSession())
      const form = new FormData()
      await expect(uploadBrandingFile(form)).rejects.toThrow("Unauthorized")
    })

    it("returns mock URL if disabled", async () => {
      mockSession(adminSession())
      process.env.DISABLE_UPLOADS = "true"

      const form = new FormData()
      form.set("file", createMockFile("logo.png") as any)

      const result = await uploadBrandingFile(form)
      expect(result.success).toBe(true)
      expect(result.url).toBe("/placeholder-branding.svg")
    })

    it("successfully saves branding image", async () => {
      mockSession(adminSession())
      const form = new FormData()
      form.set("file", createMockFile("logo.png") as any)

      const result = await uploadBrandingFile(form)

      expect(result.success).toBe(true)
      expect(result.url).toContain("branding-")
      expect(writeFile).toHaveBeenCalled()
    })
  })

  describe("uploadMaterialFile", () => {
    it("rejects non-teachers/non-admins", async () => {
      mockSession(studentSession())
      const form = new FormData()
      await expect(uploadMaterialFile(form)).rejects.toThrow("Unauthorized")
    })

    it("allows teacher to upload course materials successfully", async () => {
      mockSession(teacherSession())
      const form = new FormData()
      form.set("file", createMockFile("syllabus.pdf") as any)

      const result = await uploadMaterialFile(form)

      expect(result.success).toBe(true)
      expect(result.url).toContain("material-")
      expect(writeFile).toHaveBeenCalled()
    })
  })
})
