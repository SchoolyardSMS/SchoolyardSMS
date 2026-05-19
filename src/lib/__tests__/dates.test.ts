import { describe, it, expect } from "vitest"
import {
  parseLocalDate,
  formatDate,
  formatShortDate,
  formatMediumDate,
  formatMonthYear,
  todayString,
  toDateInputValue,
  formatInET,
  toETDateValue,
  toETTimeValue,
} from "../dates"

describe("parseLocalDate", () => {
  it("parses yyyy-mm-dd as local noon to avoid timezone shift", () => {
    const d = parseLocalDate("2026-05-01")
    expect(d.getHours()).toBe(12)
    expect(d.getDate()).toBe(1)
    expect(d.getMonth()).toBe(4) // May = 4
  })

  it("returns current date for empty string", () => {
    const before = Date.now()
    const d = parseLocalDate("")
    const after = Date.now()
    expect(d.getTime()).toBeGreaterThanOrEqual(before)
    expect(d.getTime()).toBeLessThanOrEqual(after)
  })
})

describe("formatDate", () => {
  it("formats a UTC date with default options", () => {
    const result = formatDate(new Date("2026-05-01T00:00:00Z"))
    expect(result).toContain("May")
    expect(result).toContain("1")
    expect(result).toContain("2026")
  })

  it("returns em dash for null", () => {
    expect(formatDate(null)).toBe("—")
  })

  it("returns em dash for undefined", () => {
    expect(formatDate(undefined)).toBe("—")
  })

  it("accepts a string date", () => {
    const result = formatDate("2026-12-25T00:00:00Z")
    expect(result).toContain("December")
    expect(result).toContain("25")
  })
})

describe("formatShortDate", () => {
  it("returns month and day only", () => {
    const result = formatShortDate("2026-05-15T00:00:00Z")
    expect(result).toContain("May")
    expect(result).toContain("15")
    expect(result).not.toContain("2026")
  })
})

describe("formatMediumDate", () => {
  it("returns month, day, and year", () => {
    const result = formatMediumDate("2026-05-15T00:00:00Z")
    expect(result).toContain("May")
    expect(result).toContain("15")
    expect(result).toContain("2026")
  })
})

describe("formatMonthYear", () => {
  it("returns month and year", () => {
    const result = formatMonthYear("2026-05-15T00:00:00Z")
    expect(result).toContain("May")
    expect(result).toContain("2026")
  })
})

describe("todayString", () => {
  it("returns yyyy-mm-dd format", () => {
    const result = todayString()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("matches today's date", () => {
    const now = new Date()
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
    expect(todayString()).toBe(expected)
  })
})

describe("toDateInputValue", () => {
  it("extracts yyyy-mm-dd from a UTC Date", () => {
    expect(toDateInputValue(new Date("2026-05-01T00:00:00Z"))).toBe("2026-05-01")
  })

  it("returns empty string for null", () => {
    expect(toDateInputValue(null)).toBe("")
  })

  it("returns empty string for undefined", () => {
    expect(toDateInputValue(undefined)).toBe("")
  })

  it("handles end-of-month correctly", () => {
    expect(toDateInputValue(new Date("2026-12-31T00:00:00Z"))).toBe("2026-12-31")
  })
})

describe("formatInET", () => {
  it("formats in Eastern Time", () => {
    const result = formatInET(new Date("2026-05-01T17:30:00Z"))
    // 17:30 UTC = 1:30 PM ET
    expect(result).toContain("May")
    expect(result).toContain("1")
  })

  it("returns em dash for null", () => {
    expect(formatInET(null)).toBe("—")
  })
})

describe("toETDateValue", () => {
  it("returns yyyy-mm-dd in ET timezone", () => {
    const result = toETDateValue(new Date("2026-05-01T03:00:00Z"))
    // 3am UTC = 11pm Apr 30 ET (during EDT)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("returns empty string for null", () => {
    expect(toETDateValue(null)).toBe("")
  })
})

describe("toETTimeValue", () => {
  it("returns HH:MM in ET timezone", () => {
    const result = toETTimeValue(new Date("2026-05-01T17:30:00Z"))
    expect(result).toMatch(/^\d{2}:\d{2}$/)
  })

  it("returns empty string for null", () => {
    expect(toETTimeValue(null)).toBe("")
  })
})
