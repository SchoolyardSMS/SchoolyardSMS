import { describe, it, expect, beforeEach, vi } from "vitest"
vi.unmock("@/lib/auth")

import { mockDb, resetDbMocks } from "@/test/mocks/db"
import { authOptions } from "../auth"
import bcrypt from "bcryptjs"

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
  },
}))

// Mock PrismaAdapter
vi.mock("@next-auth/prisma-adapter", () => ({
  PrismaAdapter: vi.fn(() => ({})),
}))

describe("NextAuth authOptions configuration", () => {
  beforeEach(() => {
    resetDbMocks()
    vi.clearAllMocks()
    process.env.DISABLE_GOOGLE_AUTH = "false"
  })

  describe("CredentialsProvider authorize", () => {
    const getCredentialsProvider = () => {
      return authOptions.providers.find((p: any) => p.id === "credentials") as any
    }

    it("throws error for missing email or password", async () => {
      const provider = getCredentialsProvider()
      expect(provider).toBeDefined()

      await expect(provider.options.authorize({ email: "", password: "" } as any)).rejects.toThrow(
        "Missing email or password"
      )
      await expect(provider.options.authorize(null as any)).rejects.toThrow(
        "Missing email or password"
      )
    })

    it("throws error if user does not exist", async () => {
      const provider = getCredentialsProvider()
      mockDb.user.findUnique.mockResolvedValue(null)

      await expect(
        provider.options.authorize({ email: "missing@schoolyard.dev", password: "pwd" } as any)
      ).rejects.toThrow("Invalid academic credentials")
    })

    it("throws error if user is deleted", async () => {
      const provider = getCredentialsProvider()
      mockDb.user.findUnique.mockResolvedValue({
        id: "u1",
        email: "deleted@schoolyard.dev",
        deletedAt: new Date(),
        hashedPassword: "hashed_password",
      })

      await expect(
        provider.options.authorize({ email: "deleted@schoolyard.dev", password: "pwd" } as any)
      ).rejects.toThrow("Invalid academic credentials")
    })

    it("throws error if passwords do not match", async () => {
      const provider = getCredentialsProvider()
      mockDb.user.findUnique.mockResolvedValue({
        id: "u1",
        email: "user@schoolyard.dev",
        deletedAt: null,
        hashedPassword: "hashed_password",
      })
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

      await expect(
        provider.options.authorize({ email: "user@schoolyard.dev", password: "wrong_pwd" } as any)
      ).rejects.toThrow("Invalid academic credentials")
    })

    it("returns user details upon valid email and password", async () => {
      const provider = getCredentialsProvider()
      mockDb.user.findUnique.mockResolvedValue({
        id: "u-valid",
        email: "valid@schoolyard.dev",
        name: "Valid User",
        role: "TEACHER",
        deletedAt: null,
        hashedPassword: "hashed_password",
      })
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

      const result = await provider.options.authorize({
        email: "valid@schoolyard.dev",
        password: "correct_password",
      } as any)

      expect(result).toEqual({
        id: "u-valid",
        email: "valid@schoolyard.dev",
        name: "Valid User",
        role: "TEACHER",
      })
    })
  })

  describe("callbacks", () => {
    describe("signIn callback", () => {
      it("allows normal logins for non-Google providers", async () => {
        const result = await authOptions.callbacks!.signIn!({
          user: { id: "u1", email: "user@school.edu" },
          account: { provider: "credentials" } as any,
          profile: {} as any,
        })
        expect(result).toBe(true)
      })

      it("denies Google sign-in if email is not verified", async () => {
        const result = await authOptions.callbacks!.signIn!({
          user: { id: "u1", email: "user@school.edu" },
          account: { provider: "google" } as any,
          profile: { email_verified: false } as any,
        })
        expect(result).toBe("/login?error=EmailNotVerified")
      })

      it("denies Google sign-in if user does not exist in DB", async () => {
        mockDb.user.findUnique.mockResolvedValue(null)

        const result = await authOptions.callbacks!.signIn!({
          user: { id: "u1", email: "stranger@school.edu" },
          account: { provider: "google" } as any,
          profile: { email_verified: true } as any,
        })
        expect(result).toBe("/login?error=AccessDenied")
      })

      it("denies Google sign-in if user is deleted in DB", async () => {
        mockDb.user.findUnique.mockResolvedValue({
          id: "u1",
          email: "deleted@school.edu",
          deletedAt: new Date(),
        })

        const result = await authOptions.callbacks!.signIn!({
          user: { id: "u1", email: "deleted@school.edu" },
          account: { provider: "google" } as any,
          profile: { email_verified: true } as any,
        })
        expect(result).toBe("/login?error=AccessDenied")
      })

      it("denies Google sign-in if user exists but has no role assigned", async () => {
        mockDb.user.findUnique.mockResolvedValue({
          id: "u1",
          email: "norole@school.edu",
          deletedAt: null,
          role: null,
        })

        const result = await authOptions.callbacks!.signIn!({
          user: { id: "u1", email: "norole@school.edu" },
          account: { provider: "google" } as any,
          profile: { email_verified: true } as any,
        })
        expect(result).toBe("/login?error=AccountPendingVerification")
      })

      it("updates Google session user's role and allows sign-in on success", async () => {
        mockDb.user.findUnique.mockResolvedValue({
          id: "u1",
          email: "student@school.edu",
          deletedAt: null,
          role: "STUDENT",
        })

        const userObj: any = { id: "u1", email: "student@school.edu" }
        const result = await authOptions.callbacks!.signIn!({
          user: userObj,
          account: { provider: "google" } as any,
          profile: { email_verified: true } as any,
        })

        expect(result).toBe(true)
        expect(userObj.role).toBe("STUDENT")
      })
    })

    describe("session callback", () => {
      it("maps token properties into session user properties", async () => {
        const session: any = { user: { name: "User" } }
        const token: any = { id: "user-123", role: "ADMIN" }

        const result = await authOptions.callbacks!.session!({
          session,
          token,
          user: {} as any,
        })

        expect(result.user?.id).toBe("user-123")
        expect(result.user?.role).toBe("ADMIN")
      })
    })

    describe("jwt callback", () => {
      it("maps user properties into token during sign-in", async () => {
        const token: any = {}
        const user: any = { id: "user-456", role: "PARENT" }

        const result = await authOptions.callbacks!.jwt!({
          token,
          user,
        })

        expect(result.id).toBe("user-456")
        expect(result.role).toBe("PARENT")
      })

      it("retains token details if user object is not present (subsequent requests)", async () => {
        const token: any = { id: "user-456", role: "PARENT" }

        const result = await authOptions.callbacks!.jwt!({
          token,
          user: undefined,
        })

        expect(result.id).toBe("user-456")
        expect(result.role).toBe("PARENT")
      })
    })
  })
})
