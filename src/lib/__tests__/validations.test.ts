import { describe, it, expect } from "vitest"
import {
  DemographicUpdateSchema,
  HealthUpdateSchema,
  TermGradeUpdateSchema,
} from "../validations/sis"

describe("DemographicUpdateSchema", () => {
  it("accepts valid data with date string", () => {
    const result = DemographicUpdateSchema.parse({
      dateOfBirth: "2010-05-15",
      gradeLevel: 9,
    })
    expect(result.dateOfBirth).toBeInstanceOf(Date)
    expect(result.gradeLevel).toBe(9)
  })

  it("accepts a Date object for dateOfBirth", () => {
    const result = DemographicUpdateSchema.parse({
      dateOfBirth: new Date("2010-05-15"),
      gradeLevel: 5,
    })
    expect(result.dateOfBirth).toBeInstanceOf(Date)
  })

  it("accepts Pre-K grade level (-2)", () => {
    const result = DemographicUpdateSchema.parse({
      dateOfBirth: "2018-01-01",
      gradeLevel: -2,
    })
    expect(result.gradeLevel).toBe(-2)
  })

  it("rejects grade level below -2", () => {
    expect(() =>
      DemographicUpdateSchema.parse({
        dateOfBirth: "2018-01-01",
        gradeLevel: -3,
      })
    ).toThrow()
  })

  it("rejects grade level above 12", () => {
    expect(() =>
      DemographicUpdateSchema.parse({
        dateOfBirth: "2018-01-01",
        gradeLevel: 13,
      })
    ).toThrow()
  })
})

describe("HealthUpdateSchema", () => {
  it("accepts all null fields", () => {
    const result = HealthUpdateSchema.parse({
      medicalAlerts: null,
      accommodations: null,
    })
    expect(result.medicalAlerts).toBeNull()
  })

  it("accepts valid strings", () => {
    const result = HealthUpdateSchema.parse({
      medicalAlerts: "Peanut allergy",
      accommodations: "Extended time on tests",
    })
    expect(result.medicalAlerts).toBe("Peanut allergy")
  })

  it("accepts empty object (all optional)", () => {
    const result = HealthUpdateSchema.parse({})
    expect(result).toBeDefined()
  })
})

describe("TermGradeUpdateSchema", () => {
  it("accepts valid override score", () => {
    const result = TermGradeUpdateSchema.parse({
      overrideScore: 95,
      letterGrade: "A",
      comments: "Excellent work",
    })
    expect(result.overrideScore).toBe(95)
  })

  it("rejects override score below 0", () => {
    expect(() =>
      TermGradeUpdateSchema.parse({ overrideScore: -1 })
    ).toThrow()
  })

  it("rejects override score above 120", () => {
    expect(() =>
      TermGradeUpdateSchema.parse({ overrideScore: 121 })
    ).toThrow()
  })

  it("rejects comments longer than 2000 chars", () => {
    expect(() =>
      TermGradeUpdateSchema.parse({ comments: "x".repeat(2001) })
    ).toThrow()
  })

  it("accepts null fields", () => {
    const result = TermGradeUpdateSchema.parse({
      overrideScore: null,
      letterGrade: null,
      comments: null,
    })
    expect(result.overrideScore).toBeNull()
  })
})
