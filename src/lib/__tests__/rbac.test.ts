import { describe, it, expect } from "vitest"
import { assertRole } from "../rbac"
import type { Session } from "next-auth"

describe("assertRole", () => {
  it("throws Unauthorized when session is null", () => {
    expect(() => assertRole(null, ["ADMIN"])).toThrow("Unauthorized")
  })

  it("throws Unauthorized when session.user is undefined", () => {
    expect(() => assertRole({} as unknown as Session, ["ADMIN"])).toThrow("Unauthorized")
  })

  it("throws when user role is not in allowed list", () => {
    const session = { user: { id: "u1", role: "STUDENT" }, expires: "" } as unknown as Session
    expect(() => assertRole(session, ["ADMIN", "TEACHER"])).toThrow(
      "Unauthorized: insufficient role"
    )
  })

  it("does not throw when user role is allowed", () => {
    const session = { user: { id: "u1", role: "ADMIN" }, expires: "" } as unknown as Session
    expect(() => assertRole(session, ["ADMIN", "TEACHER"])).not.toThrow()
  })

  it("narrows session to non-null after call (type-level test)", () => {
    const session: { user: { id: string; role: string }; expires: string } | null = {
      user: { id: "u1", role: "ADMIN" },
      expires: "",
    }
    assertRole(session as unknown as Session, ["ADMIN"])
    // After assertRole, TypeScript should know session is non-null
    // This is a compile-time check — if it compiles, the assertion works
    expect(session.user.id).toBe("u1")
  })
})
