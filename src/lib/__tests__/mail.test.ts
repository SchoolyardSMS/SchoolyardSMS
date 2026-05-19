import { describe, it, expect, beforeEach, vi } from "vitest"

vi.mock("resend", () => {
  const mockSend = vi.fn()
  return {
    Resend: class {
      emails = {
        send: mockSend,
      }
    },
    mockSend,
  }
})

import { sendInviteEmail, sendPasswordResetEmail } from "../mail"
import { mockSend } from "resend"

describe("mail notifications service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.DISABLE_EMAILS = "false"
  })

  describe("sendInviteEmail", () => {
    it("bypasses actual email sending if DISABLE_EMAILS is true", async () => {
      process.env.DISABLE_EMAILS = "true"
      
      const result = await sendInviteEmail("student@school.edu", "http://setup-link", "STUDENT")
      
      expect(result.success).toBe(true)
      expect(result.data?.id).toBe("mocked_id")
      expect(mockSend).not.toHaveBeenCalled()
    })

    it("sends email with correct templates and security headers", async () => {
      mockSend.mockResolvedValue({ data: { id: "msg-123" }, error: null })

      const result = await sendInviteEmail("teacher@school.edu", "http://setup-link", "TEACHER")

      expect(result.success).toBe(true)
      expect(result.data?.id).toBe("msg-123")
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ["teacher@school.edu"],
          subject: "You are invited to Schoolyard",
          headers: expect.objectContaining({
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            "Precedence": "bulk"
          })
        })
      )
    })

    it("handles resend API errors gracefully", async () => {
      mockSend.mockResolvedValue({ data: null, error: { message: "Invalid API Key" } })

      const result = await sendInviteEmail("teacher@school.edu", "http://setup-link", "TEACHER")

      expect(result.success).toBe(false)
      expect(result.error).toEqual({ message: "Invalid API Key" })
    })

    it("handles exceptions gracefully", async () => {
      mockSend.mockRejectedValue(new Error("Network failed"))

      const result = await sendInviteEmail("teacher@school.edu", "http://setup-link", "TEACHER")

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe("sendPasswordResetEmail", () => {
    it("bypasses actual email sending if DISABLE_EMAILS is true", async () => {
      process.env.DISABLE_EMAILS = "true"

      const result = await sendPasswordResetEmail("user@school.edu", "http://reset-link")

      expect(result.success).toBe(true)
      expect(result.data?.id).toBe("mocked_id")
      expect(mockSend).not.toHaveBeenCalled()
    })

    it("sends reset password email successfully on API success", async () => {
      mockSend.mockResolvedValue({ data: { id: "msg-456" }, error: null })

      const result = await sendPasswordResetEmail("admin@school.edu", "http://reset-link")

      expect(result.success).toBe(true)
      expect(result.data?.id).toBe("msg-456")
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ["admin@school.edu"],
          subject: "Reset your Schoolyard password",
        })
      )
    })
  })
})
