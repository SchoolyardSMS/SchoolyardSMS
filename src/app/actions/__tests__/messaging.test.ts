import { describe, it, expect, beforeEach, vi } from "vitest"
import { mockDb, resetDbMocks } from "@/test/mocks/db"
import { adminSession, mockSession } from "@/test/mocks/session"

// Mock RBAC (already in setup for getServerSession, but messaging uses assertRole)
vi.mock("@/lib/rbac", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rbac")>()
  return {
    ...actual,
    assertRole: actual.assertRole,
  }
})

// Mock queue
vi.mock("@/lib/queue", () => ({
  enqueueBroadcast: vi.fn(),
}))

// Mock messaging utils
vi.mock("@/lib/messaging-utils", () => ({
  resolveAudienceRecipients: vi.fn(),
}))

// Mock Resend
vi.mock("resend", () => ({
  Resend: class {
    batch = { send: vi.fn(async () => ({ data: [{ id: "rid1" }] })) }
    emails = { send: vi.fn(async () => ({ data: { id: "eid1" } })) }
  },
}))

import { sendSchoolMessage, markAsRead } from "../messaging"
import { resolveAudienceRecipients } from "@/lib/messaging-utils"

const mockedResolve = vi.mocked(resolveAudienceRecipients)

describe("sendSchoolMessage", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("creates broadcast + delivery records and enqueues", async () => {
    mockSession(adminSession())
    const recipients = [
      { id: "r1", email: "a@example.com" },
      { id: "r2", email: "b@example.com" },
    ]
    mockedResolve.mockResolvedValue(recipients)
    mockDb.broadcast.create.mockResolvedValue({ id: "bc1" })
    mockDb.broadcastDelivery.createMany.mockResolvedValue({ count: 2 })

    const form = new FormData()
    form.set("subject", "Hello")
    form.set("content", "World")
    form.set("audience", "ALL")

    const result = await sendSchoolMessage(form)

    expect(mockDb.broadcast.create).toHaveBeenCalled()
    expect(mockDb.broadcastDelivery.createMany).toHaveBeenCalled()
    expect(result).toEqual({ success: true, queued: true })
  })

  it("rejects when no recipients found", async () => {
    mockSession(adminSession())
    mockedResolve.mockResolvedValue([])

    const form = new FormData()
    form.set("subject", "Hello")
    form.set("content", "World")
    form.set("audience", "PARENTS")

    await expect(sendSchoolMessage(form)).rejects.toThrow("No recipients")
  })

  it("rejects unauthenticated requests", async () => {
    mockSession(null)

    const form = new FormData()
    form.set("subject", "Hello")
    form.set("content", "World")
    form.set("audience", "ALL")

    await expect(sendSchoolMessage(form)).rejects.toThrow("Unauthorized")
  })
})

describe("markAsRead", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
  })

  it("updates message read status for the receiver", async () => {
    mockSession(adminSession())
    mockDb.message.update.mockResolvedValue({ id: "m1", read: true })

    await markAsRead("m1")

    expect(mockDb.message.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "m1", receiverId: "admin-1" },
        data: { read: true },
      })
    )
  })
})
