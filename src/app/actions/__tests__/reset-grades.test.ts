import { describe, it, expect, beforeEach, vi } from "vitest"
import { mockDb, resetDbMocks } from "@/test/mocks/db"
import { adminSession, teacherSession, mockSession } from "@/test/mocks/session"
import { checkSchoolWideGradesSubmission, runSchoolWideReset } from "../reset-grades"
import { revalidatePath } from "next/cache"

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

describe("reset-grades server actions", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  describe("checkSchoolWideGradesSubmission", () => {
    it("rejects non-admin users", async () => {
      mockSession(teacherSession())
      const result = await checkSchoolWideGradesSubmission("term-1")
      expect(result.success).toBe(false)
      expect(result.error).toContain("Unauthorized")
    })

    it("returns error if term is not found", async () => {
      mockSession(adminSession())
      mockDb.term.findUnique.mockResolvedValue(null)

      const result = await checkSchoolWideGradesSubmission("non-existent-term")
      expect(result.success).toBe(false)
      expect(result.error).toBe("Term not found")
    })

    it("correctly identifies all-finished and missing submissions including parent term hierarchy", async () => {
      mockSession(adminSession())

      // Mock term hierarchy (term-1 -> term-parent -> null)
      mockDb.term.findUnique.mockImplementation(async ({ where }) => {
        if (where.id === "term-1") {
          return { id: "term-1", parentId: "term-parent" }
        }
        if (where.id === "term-parent") {
          return { id: "term-parent", parentId: null }
        }
        return null
      })

      // Mock sections for relevant terms
      mockDb.section.findMany.mockResolvedValue([
        {
          id: "sec-1",
          course: { code: "ENG101", name: "English" },
          teacher: { user: { name: "Alice Teacher" } },
          enrollments: [{ id: "enr-1" }, { id: "enr-2" }]
        },
        {
          id: "sec-2",
          course: { code: "SCI101", name: "Science" },
          teacher: { user: { name: "Bob Teacher" } },
          enrollments: [{ id: "enr-3" }]
        }
      ])

      // Mock posted grades count: sec-1 has 2/2 posted, sec-2 has 0/1 posted
      mockDb.termGrade.count.mockImplementation(async ({ where }) => {
        const enrollmentIds = where.enrollmentId.in as string[]
        if (enrollmentIds.includes("enr-1") && enrollmentIds.includes("enr-2")) {
          return 2 // 2 posted
        }
        if (enrollmentIds.includes("enr-3")) {
          return 0 // 0 posted
        }
        return 0
      })

      const result = await checkSchoolWideGradesSubmission("term-1")

      expect(result.success).toBe(true)
      expect(result.allFinished).toBe(false)
      expect(result.statusList).toHaveLength(2)

      const sec1Status = result.statusList?.find(s => s.sectionId === "sec-1")
      expect(sec1Status).toBeDefined()
      expect(sec1Status?.enrolledCount).toBe(2)
      expect(sec1Status?.postedCount).toBe(2)
      expect(sec1Status?.missingCount).toBe(0)
      expect(sec1Status?.isFinished).toBe(true)

      const sec2Status = result.statusList?.find(s => s.sectionId === "sec-2")
      expect(sec2Status).toBeDefined()
      expect(sec2Status?.enrolledCount).toBe(1)
      expect(sec2Status?.postedCount).toBe(0)
      expect(sec2Status?.missingCount).toBe(1)
      expect(sec2Status?.isFinished).toBe(false)
    })

    it("returns error on unexpected exceptions", async () => {
      mockSession(adminSession())
      mockDb.term.findUnique.mockRejectedValue(new Error("Database disconnected"))

      const result = await checkSchoolWideGradesSubmission("term-1")
      expect(result.success).toBe(false)
      expect(result.error).toBe("Database disconnected")
    })
  })

  describe("runSchoolWideReset", () => {
    it("rejects non-admin users", async () => {
      mockSession(teacherSession())
      const result = await runSchoolWideReset("term-1")
      expect(result.success).toBe(false)
      expect(result.error).toContain("Unauthorized")
    })

    it("returns error if term is not found", async () => {
      mockSession(adminSession())
      mockDb.term.findUnique.mockResolvedValue(null)

      const result = await runSchoolWideReset("non-existent")
      expect(result.success).toBe(false)
      expect(result.error).toBe("Term not found")
    })

    it("performs reset, snapshots grades, saves term grades, and archives assignments", async () => {
      mockSession(adminSession())

      // Mock term
      mockDb.term.findUnique.mockResolvedValue({ id: "term-1", parentId: null })

      // Mock school settings with grading scale
      mockDb.schoolSettings.findUnique.mockResolvedValue({
        id: "singleton",
        gradingScale: [
          { letter: "A", min: 90 },
          { letter: "B", min: 80 },
          { letter: "F", min: 0 }
        ]
      })

      // Mock sections, assignments, and enrollments
      mockDb.section.findMany.mockResolvedValue([
        {
          id: "sec-1",
          course: { code: "HIS101", name: "History" },
          gradingMethod: "TOTAL_POINTS",
          enrollments: [
            {
              id: "enr-1",
              student: { id: "std-1", user: { name: "John Student" } }
            }
          ],
          assignments: [
            { id: "asg-1", maxScore: 100, isArchived: false, status: "PUBLISHED" },
            { id: "asg-2", maxScore: 100, isArchived: false, status: "PUBLISHED" }
          ]
        }
      ])

      // Mock active grades for assignments
      mockDb.grade.findMany.mockResolvedValue([
        { id: "g1", assignmentId: "asg-1", studentId: "std-1", score: 95 },
        { id: "g2", assignmentId: "asg-2", studentId: "std-1", score: 85 }
      ])

      // Mock termGrade upsert
      mockDb.termGrade.upsert.mockResolvedValue({ id: "tg-1" })

      // Mock assignment updateMany
      mockDb.assignment.updateMany.mockResolvedValue({ count: 2 })

      const result = await runSchoolWideReset("term-1")

      expect(result.success).toBe(true)

      // Verify term grade upserted with correct score and letter
      // Student has 95 out of 100 and 85 out of 100 -> Average = 90% (Score: 90, Letter: "A")
      expect(mockDb.termGrade.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            enrollmentId_termId: {
              enrollmentId: "enr-1",
              termId: "term-1"
            }
          },
          update: expect.objectContaining({
            calculatedScore: 90,
            overrideScore: 90,
            letterGrade: "A",
            isPosted: true
          })
        })
      )

      // Verify assignments are archived
      expect(mockDb.assignment.updateMany).toHaveBeenCalledWith({
        where: { sectionId: "sec-1", isArchived: false },
        data: { isArchived: true, archivedInTermId: "term-1" }
      })

      // Verify path revalidations
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/academics/sections")
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/admin/calendar/terms")
    })

    it("handles exceptions gracefully during reset", async () => {
      mockSession(adminSession())
      mockDb.term.findUnique.mockRejectedValue(new Error("Transaction failed"))

      const result = await runSchoolWideReset("term-1")
      expect(result.success).toBe(false)
      expect(result.error).toBe("Transaction failed")
    })
  })
})
