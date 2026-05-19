import { describe, it, expect, beforeEach, vi } from "vitest"
import { mockDb, resetDbMocks } from "@/test/mocks/db"
import { adminSession, teacherSession, mockSession } from "@/test/mocks/session"

import {
  createSchoolYear,
  updateSchoolYear,
  deleteSchoolYear,
  createTerm,
  updateTerm,
  deleteTerm,
  setSchoolYearActive,
} from "../terms"

describe("createSchoolYear", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("creates a school year for admin", async () => {
    mockSession(adminSession())
    mockDb.schoolYear.create.mockResolvedValue({ id: "sy1" })

    const form = new FormData()
    form.set("name", "2026-2027")
    form.set("startDate", "2026-09-01")
    form.set("endDate", "2027-06-15")

    const result = await createSchoolYear(form)

    expect(mockDb.schoolYear.create).toHaveBeenCalled()
    expect(result).toEqual({ success: true })
  })

  it("returns error on invalid input", async () => {
    mockSession(adminSession())
    const form = new FormData()
    form.set("name", "") // empty name

    const result = await createSchoolYear(form)
    expect(result.error).toBeDefined()
  })
})

describe("updateSchoolYear", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("updates school year details", async () => {
    mockSession(adminSession())
    mockDb.schoolYear.update.mockResolvedValue({ id: "sy1" })

    const form = new FormData()
    form.set("name", "2026-2027 Updated")
    form.set("startDate", "2026-09-01")
    form.set("endDate", "2027-06-15")

    const result = await updateSchoolYear("sy1", form)
    expect(result).toEqual({ success: true })
  })
})

describe("deleteSchoolYear", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("deletes school year successfully", async () => {
    mockSession(adminSession())
    mockDb.schoolYear.delete.mockResolvedValue({ id: "sy1" })

    const result = await deleteSchoolYear("sy1")
    expect(result).toEqual({ success: true })
  })

  it("returns custom error on database delete failure", async () => {
    mockSession(adminSession())
    mockDb.schoolYear.delete.mockRejectedValue(new Error("active sections constraint failed"))

    const result = await deleteSchoolYear("sy1")
    expect(result.error).toContain("active sections")
  })
})

describe("createTerm", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("creates a term for school year", async () => {
    mockSession(adminSession())
    mockDb.term.create.mockResolvedValue({ id: "t1" })

    const form = new FormData()
    form.set("name", "Semester 1")
    form.set("schoolYearId", "sy1")
    form.set("startDate", "2026-09-01")
    form.set("endDate", "2027-01-31")

    const result = await createTerm(form)
    expect(result).toEqual({ success: true })
    expect(mockDb.term.create).toHaveBeenCalled()
  })
})

describe("setSchoolYearActive", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("deactivates other years and activates target year", async () => {
    mockSession(adminSession())
    mockDb.schoolYear.updateMany.mockResolvedValue({ count: 1 })
    mockDb.schoolYear.update.mockResolvedValue({ id: "sy1", isActive: true })

    const result = await setSchoolYearActive("sy1")

    expect(mockDb.schoolYear.updateMany).toHaveBeenCalledWith({ data: { isActive: false } })
    expect(mockDb.schoolYear.update).toHaveBeenCalledWith({ where: { id: "sy1" }, data: { isActive: true } })
    expect(result.success).toBe(true)
  })
})
