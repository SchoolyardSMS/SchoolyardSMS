import { describe, it, expect, beforeEach, vi } from "vitest"
import { mockDb, resetDbMocks } from "@/test/mocks/db"
import { adminSession, mockSession } from "@/test/mocks/session"
import { 
  archiveAndCompressSection, 
  archiveAndCompressStudent, 
  runSchoolYearRollover, 
  getDecompressedArchive,
  bulkArchiveStudents
} from "../archive"
import zlib from "zlib"

describe("Archive and Compression Actions", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()

    // Global mock resolves for transactional operations
    mockDb.grade.deleteMany.mockResolvedValue({ count: 0 })
    mockDb.submissionRecord.deleteMany.mockResolvedValue({ count: 0 })
    mockDb.assignment.deleteMany.mockResolvedValue({ count: 0 })
    mockDb.attendance.deleteMany.mockResolvedValue({ count: 0 })
    mockDb.termGrade.deleteMany.mockResolvedValue({ count: 0 })
    mockDb.enrollment.deleteMany.mockResolvedValue({ count: 0 })
    mockDb.topic.deleteMany.mockResolvedValue({ count: 0 })
    mockDb.announcement.deleteMany.mockResolvedValue({ count: 0 })
    mockDb.reportCard.deleteMany.mockResolvedValue({ count: 0 })

    mockDb.compressedArchive.upsert.mockResolvedValue({ id: "archive1" })
    mockDb.student.update.mockResolvedValue({ id: "stud1", isArchived: true })
    mockDb.user.update.mockResolvedValue({ id: "u1", deletedAt: new Date() })
  })

  describe("archiveAndCompressSection", () => {
    it("archives and compresses a section successfully", async () => {
      mockSession(adminSession())
      
      const mockSection = {
        id: "sec1",
        courseId: "c1",
        course: { id: "c1", name: "Algebra I", code: "ALG1", credits: 1.0, description: "Intro to Algebra" },
        teacherId: "t1",
        schedule: "Period 1",
        room: "101",
        assignments: [],
        attendance: [],
        enrollments: [],
        topics: [],
        announcements: []
      }

      mockDb.section.findUnique.mockResolvedValue(mockSection)
      mockDb.compressedArchive.upsert.mockResolvedValue({ id: "archive1" })
      mockDb.section.update.mockResolvedValue({ id: "sec1", isArchived: true })
      
      mockDb.grade.deleteMany.mockResolvedValue({ count: 0 })
      mockDb.submissionRecord.deleteMany.mockResolvedValue({ count: 0 })
      mockDb.assignment.deleteMany.mockResolvedValue({ count: 0 })
      mockDb.attendance.deleteMany.mockResolvedValue({ count: 0 })
      mockDb.termGrade.deleteMany.mockResolvedValue({ count: 0 })
      mockDb.enrollment.deleteMany.mockResolvedValue({ count: 0 })
      mockDb.topic.deleteMany.mockResolvedValue({ count: 0 })
      mockDb.announcement.deleteMany.mockResolvedValue({ count: 0 })

      const res = await archiveAndCompressSection("sec1")

      expect(res.success).toBe(true)
      expect(mockDb.section.findUnique).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "sec1" }
      }))
      expect(mockDb.compressedArchive.upsert).toHaveBeenCalled()
      expect(mockDb.section.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "sec1" },
        data: { isArchived: true }
      }))
    })

    it("returns error if section not found", async () => {
      mockSession(adminSession())
      mockDb.section.findUnique.mockResolvedValue(null)

      const res = await archiveAndCompressSection("nonexistent")
      expect(res.error).toBe("Section not found")
    })
  })

  describe("archiveAndCompressStudent", () => {
    it("archives and compresses student records successfully", async () => {
      mockSession(adminSession())

      const mockStudent = {
        id: "stud1",
        userId: "u1",
        gradeLevel: 12,
        dateOfBirth: new Date("2008-01-01"),
        medicalAlerts: null,
        accommodations: null,
        user: { id: "u1", name: "Alice Smith", email: "alice@schoolyard.org", role: "STUDENT" },
        attendance: [],
        grades: [],
        reportCards: [],
        submissions: [],
        enrollments: []
      }

      mockDb.student.findUnique.mockResolvedValue(mockStudent)
      mockDb.compressedArchive.upsert.mockResolvedValue({ id: "archive1" })
      mockDb.student.update.mockResolvedValue({ id: "stud1", isArchived: true })
      mockDb.user.update.mockResolvedValue({ id: "u1", deletedAt: new Date() })

      mockDb.grade.deleteMany.mockResolvedValue({ count: 0 })
      mockDb.attendance.deleteMany.mockResolvedValue({ count: 0 })
      mockDb.reportCard.deleteMany.mockResolvedValue({ count: 0 })
      mockDb.submissionRecord.deleteMany.mockResolvedValue({ count: 0 })
      mockDb.termGrade.deleteMany.mockResolvedValue({ count: 0 })
      mockDb.enrollment.deleteMany.mockResolvedValue({ count: 0 })

      const res = await archiveAndCompressStudent("stud1")

      expect(res.success).toBe(true)
      expect(mockDb.student.findUnique).toHaveBeenCalled()
      expect(mockDb.compressedArchive.upsert).toHaveBeenCalled()
      expect(mockDb.student.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "stud1" },
        data: { isArchived: true }
      }))
    })
  })

  describe("bulkArchiveStudents", () => {
    it("archives multiple students in bulk", async () => {
      mockSession(adminSession())

      const mockStudent1 = {
        id: "stud1",
        userId: "u1",
        gradeLevel: 12,
        user: { id: "u1", name: "Alice", email: "alice@test.com", role: "STUDENT" },
        attendance: [], grades: [], reportCards: [], submissions: [], enrollments: []
      }

      const mockStudent2 = {
        id: "stud2",
        userId: "u2",
        gradeLevel: 12,
        user: { id: "u2", name: "Bob", email: "bob@test.com", role: "STUDENT" },
        attendance: [], grades: [], reportCards: [], submissions: [], enrollments: []
      }

      mockDb.student.findUnique
        .mockResolvedValueOnce(mockStudent1)
        .mockResolvedValueOnce(mockStudent2)

      const res = await bulkArchiveStudents(["stud1", "stud2"])

      expect(res.success).toBe(true)
      expect(res.successCount).toBe(2)
      expect(res.failedCount).toBe(0)
    })
  })

  describe("runSchoolYearRollover", () => {
    it("coordinates school-year rollover correctly", async () => {
      mockSession(adminSession())

      mockDb.term.findMany.mockResolvedValue([
        { id: "t1", schoolYearId: "sy1" }
      ])
      mockDb.section.findMany.mockResolvedValue([
        { id: "sec1", courseId: "c1", course: { id: "c1", name: "Math", code: "M", credits: 1 }, teacherId: "teach1", assignments: [], attendance: [], enrollments: [], topics: [], announcements: [] }
      ])
      mockDb.student.findMany
        .mockResolvedValueOnce([
          { id: "studGrad", userId: "uG", gradeLevel: 12, user: { id: "uG", name: "Graduate", email: "grad@test.com", role: "STUDENT" }, attendance: [], grades: [], reportCards: [], submissions: [], enrollments: [] }
        ])
        .mockResolvedValueOnce([]) // for legacy section check, if any

      mockDb.schoolYear.update.mockResolvedValue({ id: "sy1", isActive: false })

      const res = await runSchoolYearRollover("sy1", 12)

      expect(res.success).toBe(true)
      expect(mockDb.term.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { schoolYearId: "sy1" }
      }))
      expect(mockDb.student.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { gradeLevel: { lt: 12 }, isArchived: false },
        data: { gradeLevel: { increment: 1 } }
      }))
      expect(mockDb.schoolYear.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "sy1" },
        data: { isActive: false }
      }))
    })
  })

  describe("getDecompressedArchive", () => {
    it("retrieves and decompresses archived JSON data", async () => {
      const originalObj = { key: "value", nested: [1, 2, 3] }
      const compressedStr = zlib.gzipSync(Buffer.from(JSON.stringify(originalObj))).toString("base64")

      mockDb.compressedArchive.findFirst.mockResolvedValue({
        id: "arc1",
        entityType: "STUDENT",
        entityId: "stud1",
        data: compressedStr
      })

      const res = await getDecompressedArchive("STUDENT", "stud1")

      expect(res).toEqual(originalObj)
      expect(mockDb.compressedArchive.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: { entityType: "STUDENT", entityId: "stud1" }
      }))
    })

    it("returns null if no archive is found", async () => {
      mockDb.compressedArchive.findFirst.mockResolvedValue(null)

      const res = await getDecompressedArchive("STUDENT", "nonexistent")
      expect(res).toBeNull()
    })
  })
})
