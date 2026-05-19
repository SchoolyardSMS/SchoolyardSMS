# Schoolyard Developer & Hardening Guide

This manual provides developers with step-by-step instructions to configure, run, test, and harden the Schoolyard application locally and in CI pipelines.

---

## 🚀 1. Local Development Setup with Bun

Schoolyard is optimized to run on the high-performance **Bun** runtime.

### Step 1: Clone and Install Dependencies
Install dependencies using Bun to ensure accurate lockfile alignments:
```bash
git clone https://github.com/peterm776/SchoolyardSMS.git
cd SchoolyardSMS
bun install
```

### Step 2: Environment Configurations (`.env`)
Create a `.env` file in the root directory based on `.env.example`:
```bash
cp .env.example .env
```
Ensure the following variables are configured:
```ini
# Database configuration (SQLite for local, PostgreSQL for production)
DATABASE_URL="file:./dev.db"

# Next-Auth configuration
NEXTAUTH_SECRET="your-super-secret-nextauth-hash-key"
NEXTAUTH_URL="http://localhost:3000"

# External Integrations
RESEND_API_KEY="re_..."
RESEND_WEBHOOK_SECRET="whsec_..."

# Web Push VAPID Keys (Generate via: npx web-push generate-vapid-keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY="B..."
VAPID_PRIVATE_KEY="..."
```

### Step 3: Database Initialization
Sync your local database schema with your schema configuration using Prisma:
```bash
bun x prisma db push
```

### Step 4: Run the Development Server
```bash
bun run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗄️ 2. Database Schema Syncs & Migrations

Schoolyard uses **Prisma ORM** to coordinate database states.

* **Development Schema Pushes**: During development, if you add fields or models to `prisma/schema.prisma` (e.g. `Course.isArchived`), synchronize the database directly using `db push` to update your local SQLite database without creating heavy SQL migration histories:
  ```bash
  bun x prisma db push
  ```
* **Production Migrations**: For production PostgreSQL deployments, generate formal SQL migrations to track incremental updates safely:
  ```bash
  bun x prisma migrate dev --name init_change
  ```
* **Prisma Client Generation**: Whenever the schema changes, regenerate the TypeScript client types:
  ```bash
  bun x prisma generate
  ```

---

## 🧪 3. The Vitest Automated Testing Framework

Schoolyard maintains a robust testing suite containing **130 unit and integration tests** verifying core logic, authentication, RBAC safety, and server action transactions.

### Running the Test Suite
Run the test suite using Vitest under Bun for rapid execution:
```bash
# Run all tests once
bun run test

# Run tests in watch mode (interactive)
bun run test -- --watch

# Run tests with HTML coverage reports
bun run test -- --coverage
```

### Decoupled Database & Session Mocking
Our tests run completely isolated from actual databases or server sessions using centralized mocks:
* **Database Mocking (`src/test/mocks/db.ts`)**: We use mock factory interfaces to mock Prisma database queries. Database operations inside test blocks return predefined mock data, preventing write collisions and keeping tests extremely fast:
  ```typescript
  import { vi } from "vitest"
  import { mockDeep, mockReset } from "vitest-mock-pure"
  import { PrismaClient } from "@prisma/client"

  vi.mock("@/lib/db", () => ({
    db: mockDeep<PrismaClient>()
  }))
  ```
* **Authentication Mocking (`src/test/mocks/session.ts`)**: NextAuth sessions are mocked securely. Test blocks verify role-based permissions (RBAC) by swapping mocked sessions seamlessly.

---

## ⚙️ 4. Code Quality, Linting & CI/CD Pipeline

Schoolyard enforces zero-error and zero-warning policies on production branches.

### ESLint Flat Configuration (`eslint.config.mjs`)
We use ESLint's modern Flat Config format to run static analysis checks.
* **Global Ignores**: Compiled minified PWA service workers inside `public/**`, third-party lighthouse files inside `.unlighthouse/**`, and project documentation in `docs/**` are globally ignored to avoid false parsing warnings.
* **Linter Directives**: Unused `@eslint-disable` comment warnings are suppressed globally by setting `reportUnusedDisableDirectives: "off"`.
* **Rules Overrides**: Stylistic and non-critical frontend rule severities are turned `"off"` (e.g. `@typescript-eslint/no-explicit-any`, `react-hooks/set-state-in-effect`, `@typescript-eslint/no-unused-vars`) to prevent linter noise while highlighting critical syntax blocks.

### CI/CD Github Actions Workflow (`.github/workflows/ci.yml`)
On every push and pull request, the CI runner automatically executes the following check steps:
1. **Installs dependencies**: `bun install`.
2. **Typecheck**: `bun run typecheck` runs `tsc --noEmit` to ensure perfect compilation.
3. **Vitest Suite**: `bun run test` runs the 130 automated tests in verbose mode.
4. **Static Linting**: `bun run lint` validates code styling and file configurations.

If any check step fails or exits with a code other than 0, the build pipeline blocks branch merges automatically.
