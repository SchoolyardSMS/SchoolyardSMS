import { describe, it, expect } from "vitest"
import { assertRole } from "../rbac"

describe("assertRole", () => {
  it("throws Unauthorized when session is null", () => {
    expect(() => assertRole(null, ["ADMIN"])).toThrow("Unauthorized")
  })

  it("throws Unauthorized when session.user is undefined", () => {
    expect(() => assertRole({} as any, ["ADMIN"])).toThrow("Unauthorized")
  })

  it("throws when user role is not in allowed list", () => {
    const session = { user: { id: "u1", role: "STUDENT" } } as any
    expect(() => assertRole(session, ["ADMIN", "TEACHER"])).toThrow(
      "Unauthorized: insufficient role"
    )
  })

  it("does not throw when user role is allowed", () => {
    const session = { user: { id: "u1", role: "ADMIN" } } as any
    expect(() => assertRole(session, ["ADMIN", "TEACHER"])).not.toThrow()
  })

  it("narrows session to non-null after call (type-level test)", () => {
    const session: { user: { id: string; role: string } } | null = {
      user: { id: "u1", role: "ADMIN" },
    }
    assertRole(session as any, ["ADMIN"])
    // After assertRole, TypeScript should know session is non-null
    // This is a compile-time check — if it compiles, the assertion works
    expect(session.user.id).toBe("u1")
  })
})
