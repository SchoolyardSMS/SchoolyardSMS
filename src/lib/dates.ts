/**
 * Date utility helpers.
 *
 * Root cause of the "off-by-one day" bug:
 *   new Date("2026-05-01")          → UTC midnight → shows Apr 30 in UTC-4/5
 *   new Date("2026-05-01T12:00:00") → local noon   → shows May 1 everywhere
 *
 * Two categories of fixes:
 *
 *  1. PARSING  — use `parseLocalDate` when turning a date-only string into a Date
 *                (e.g. from an HTML date input or a yyyy-mm-dd form field)
 *
 *  2. DISPLAY  — use `formatDate` / `formatShortDate` instead of .toLocaleDateString()
 *                for fields stored as @db.Date (attendance, grades, dateOfBirth, etc.)
 *                These must be rendered with timeZone:'UTC' so they don't shift.
 *
 *  For DateTime fields that include a real time component (createdAt, updatedAt,
 *  incident.date when full timestamp) the normal .toLocaleDateString() is fine.
 */

/**
 * Parse a yyyy-mm-dd string (e.g. from <input type="date">) as LOCAL noon,
 * preventing the UTC-midnight-to-local-previous-day shift.
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date()
  // "2026-05-01" → local time at noon → timezone-safe
  return new Date(`${dateStr}T12:00:00`)
}

/**
 * Format a Date (or ISO string) that originated from a @db.Date field,
 * using UTC timezone so the stored date is shown exactly as-is.
 */
export function formatDate(
  date: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" }
): string {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-US", { timeZone: "UTC", ...options })
}

/** Short format: "May 1" */
export function formatShortDate(date: Date | string | null | undefined): string {
  return formatDate(date, { month: "short", day: "numeric", timeZone: "UTC" })
}

/** Short format with year: "May 1, 2026" */
export function formatMediumDate(date: Date | string | null | undefined): string {
  return formatDate(date, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
}

/** Full month: "May 2026" */
export function formatMonthYear(date: Date | string | null | undefined): string {
  return formatDate(date, { month: "long", year: "numeric", timeZone: "UTC" })
}

/**
 * Returns today's date as a yyyy-mm-dd string in LOCAL timezone
 * (safe to use as the default value of <input type="date">).
 */
export function todayString(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/**
 * Convert a Date to a yyyy-mm-dd string in LOCAL timezone.
 * Use this to set defaultValue on <input type="date"> from a DB date.
 */
export function toDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return ""
  const d = new Date(date)
  // Use UTC getters because @db.Date is stored as UTC midnight
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/**
 * Format a date/time string in Eastern Time (America/New_York).
 */
export function formatInET(
  date: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = { 
    month: "short", 
    day: "numeric", 
    year: "numeric", 
    hour: "numeric", 
    minute: "2-digit" 
  }
): string {
  if (!date) return "—"
  return new Date(date).toLocaleString("en-US", { 
    timeZone: "America/New_York", 
    ...options 
  })
}

/**
 * Returns the current time in Eastern Time as a Date object.
 */
export function getNowET(): Date {
  const now = new Date()
  return new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }))
}

/**
 * Parse a yyyy-mm-dd and hh:mm as America/New_York and return a UTC Date.
 */
export function parseDateAsET(dateStr: string, timeStr: string = "00:00"): Date {
  // Parse input parts
  const [year, month, day] = dateStr.split("-").map(Number)
  const [hour, minute] = timeStr.split(":").map(Number)

  // Create a date object in the system's local time representing these ET parts
  // (This is just a starting point for calculation)
  const date = new Date(year, month - 1, day, hour, minute)

  // Use Intl.DateTimeFormat to find the offset between UTC and ET for this specific time
  const etString = date.toLocaleString("en-US", { 
    timeZone: "America/New_York",
    year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false
  })
  
  // This string tells us what time it is in ET when the UTC clock shows the same as our 'date'
  // But we want to go the other way: We have the ET, we want the UTC.
  // We can construct a UTC date using the ET numbers, then calculate the error.
  
  const targetUTC = Date.UTC(year, month - 1, day, hour, minute)
  
  // Find what the ET would be if the UTC time was exactly our target numbers
  const dummy = new Date(targetUTC)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false
  }).formatToParts(dummy)
  
  const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || "0")
  const dummyET = Date.UTC(getPart('year'), getPart('month') - 1, getPart('day'), getPart('hour') === 24 ? 0 : getPart('hour'), getPart('minute'))

  const diff = targetUTC - dummyET
  return new Date(targetUTC + diff)
}

/**
 * Returns a YYYY-MM-DD string in America/New_York for a given UTC Date.
 */
export function toETDateValue(date: Date | string | null | undefined): string {
  if (!date) return ""
  const d = new Date(date)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: 'numeric', day: 'numeric', hour12: false
  }).formatToParts(d)
  
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || ""
  const y = getPart('year')
  const m = getPart('month').padStart(2, '0')
  const day = getPart('day').padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Returns an HH:MM (24h) string in America/New_York for a given UTC Date.
 */
export function toETTimeValue(date: Date | string | null | undefined): string {
  if (!date) return ""
  const d = new Date(date)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric', minute: 'numeric', hour12: false
  }).formatToParts(d)
  
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || ""
  let h = getPart('hour')
  if (h === "24") h = "00"
  const hh = h.padStart(2, '0')
  const mm = getPart('minute').padStart(2, '0')
  return `${hh}:${mm}`
}
