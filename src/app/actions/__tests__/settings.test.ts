import { describe, it, expect, beforeEach, vi } from "vitest"
import { mockDb, resetDbMocks } from "@/test/mocks/db"
import { adminSession, teacherSession, mockSession } from "@/test/mocks/session"

import { updateSchoolSettings } from "../settings"

describe("updateSchoolSettings", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("updates branding settings correctly", async () => {
    mockSession(adminSession())
    mockDb.schoolSettings.upsert.mockResolvedValue({ id: "singleton" })

    const form = new FormData()
    form.set("activeSettingsTab", "branding")
    form.set("name", "Schoolyard Academy")
    form.set("tagline", "Empowering Students")
    form.set("initials", "SYA")
    form.set("primaryColor", "#111111")
    form.set("secondaryColor", "#222222")

    await updateSchoolSettings(form)

    expect(mockDb.schoolSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "singleton" },
        update: expect.objectContaining({
          name: "Schoolyard Academy",
          initials: "SYA",
        }),
      })
    )
  })

  it("updates academic settings and rejects invalid JSON in grading scale", async () => {
    mockSession(adminSession())

    const form = new FormData()
    form.set("activeSettingsTab", "academics")
    form.set("gradingScale", "{invalid-json}")

    await expect(updateSchoolSettings(form)).rejects.toThrow("Invalid JSON format")
  })

  it("updates feature flags correctly", async () => {
    mockSession(adminSession())
    mockDb.schoolSettings.upsert.mockResolvedValue({ id: "singleton" })

    const form = new FormData()
    form.set("activeSettingsTab", "features")
    form.set("feature_lms", "on")
    form.set("feature_community", "on")
    // feature_discipline left out

    await updateSchoolSettings(form)

    expect(mockDb.schoolSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          featuresEnabled: {
            lms: true,
            community: true,
            discipline: false,
          },
        }),
      })
    )
  })

  it("rejects non-admin roles", async () => {
    mockSession(teacherSession())
    const form = new FormData()
    form.set("activeSettingsTab", "branding")
    form.set("name", "New Name")

    await expect(updateSchoolSettings(form)).rejects.toThrow("Unauthorized")
  })
})
