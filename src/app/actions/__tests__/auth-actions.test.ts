import { describe, it, expect, beforeEach, vi } from "vitest"
import { mockDb, resetDbMocks } from "@/test/mocks/db"

// Mock mail module
vi.mock("@/lib/mail", () => ({
  sendPasswordResetEmail: vi.fn(),
}))

import { forgotPassword, resetPassword } from "../auth-actions"

describe("forgotPassword", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("handles forgot password request for non-existent email without leaking details", async () => {
    mockDb.user.findUnique.mockResolvedValue(null)

    const result = await forgotPassword("doesnotexist@school.edu")

    expect(result).toEqual({ success: true })
    expect(mockDb.userToken.upsert).not.toHaveBeenCalled()
  })

  it("creates a password reset token and sends email for existent user", async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: "u1", email: "user@school.edu", role: "TEACHER" })
    mockDb.userToken.upsert.mockResolvedValue({ id: "ut1" })

    const result = await forgotPassword("user@school.edu")

    expect(mockDb.userToken.upsert).toHaveBeenCalled()
    const { sendPasswordResetEmail } = await import("@/lib/mail")
    expect(sendPasswordResetEmail).toHaveBeenCalled()
    expect(result).toEqual({ success: true })
  })

  it("returns generic error on throw", async () => {
    mockDb.user.findUnique.mockRejectedValue(new Error("Database offline"))

    const result = await forgotPassword("user@school.edu")
    expect(result.error).toContain("Something went wrong")
  })
})

describe("resetPassword", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("rejects expired or invalid reset links", async () => {
    mockDb.userToken.findFirst.mockResolvedValue(null)

    const form = new FormData()
    form.set("token", "bad-token")
    form.set("email", "user@school.edu")
    form.set("password", "newpassword123")

    const result = await resetPassword(form)
    expect(result.error).toContain("Invalid or expired")
  })

  it("hashes password, updates user, and deletes used token", async () => {
    mockDb.userToken.findFirst.mockResolvedValue({ id: "ut-valid", email: "user@school.edu" })
    mockDb.user.update.mockResolvedValue({ id: "u1" })
    mockDb.userToken.delete.mockResolvedValue({ id: "ut-valid" })

    const form = new FormData()
    form.set("token", "valid-token")
    form.set("email", "user@school.edu")
    form.set("password", "newpassword123")

    const result = await resetPassword(form)

    expect(mockDb.user.update).toHaveBeenCalled()
    expect(mockDb.userToken.delete).toHaveBeenCalled()
    expect(result).toEqual({ success: true })
  })
})
