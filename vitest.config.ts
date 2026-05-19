import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{js,ts,tsx}", "src/**/__tests__/**/*.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/app/actions/**"],
      exclude: ["src/test/**", "**/__tests__/**"],
      reporter: ["text", "text-summary"],
    },
  }
})
