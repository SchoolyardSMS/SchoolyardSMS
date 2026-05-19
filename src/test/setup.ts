/**
 * Global test setup for Vitest.
 * Mocks framework-level modules that server actions depend on.
 */
import { vi } from "vitest"

// ── next/cache ────────────────────────────────────────────────────────────────
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

// ── next/navigation ──────────────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND")
  }),
}))

// ── next/headers ─────────────────────────────────────────────────────────────
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({
    get: vi.fn((key: string) => {
      if (key === "host") return "localhost:3000"
      return null
    }),
  })),
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}))

// ── next-auth ────────────────────────────────────────────────────────────────
vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))
