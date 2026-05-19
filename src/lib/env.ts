import { z } from 'zod'

/**
 * Environment variable validation schema.
 * This ensures critical configuration is present at build/runtime.
 * If any required variable is missing, the application will fail fast
 * rather than silently falling back to unsafe defaults.
 */
const envSchema = z.object({
  // Authentication
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required'),
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required'),

  // Email service (Resend)
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
  RESEND_DOMAIN: z.string().min(1, 'RESEND_DOMAIN is required'),
  RESEND_WEBHOOK_SECRET: z.string().min(1, 'RESEND_WEBHOOK_SECRET is required'),

  // Push notifications (Web Push)
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1, 'NEXT_PUBLIC_VAPID_PUBLIC_KEY is required'),
  VAPID_PRIVATE_KEY: z.string().min(1, 'VAPID_PRIVATE_KEY is required'),

  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

export type Environment = z.infer<typeof envSchema>

const isBuildOrTest = 
  process.env.NEXT_PHASE === "phase-production-build" || 
  process.env.NODE_ENV === "test" || 
  process.env.SKIP_ENV_VALIDATION === "true"

const getEnvValue = (key: string) => {
  const val = process.env[key]
  if (!val && isBuildOrTest) {
    return "dummy_build_value"
  }
  return val
}

/**
 * Validated environment variables.
 * Throws at module load time if validation fails.
 */
export const env = envSchema.parse({
  NEXTAUTH_SECRET: getEnvValue("NEXTAUTH_SECRET"),
  GOOGLE_CLIENT_ID: getEnvValue("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: getEnvValue("GOOGLE_CLIENT_SECRET"),
  RESEND_API_KEY: getEnvValue("RESEND_API_KEY"),
  RESEND_DOMAIN: getEnvValue("RESEND_DOMAIN"),
  RESEND_WEBHOOK_SECRET: getEnvValue("RESEND_WEBHOOK_SECRET"),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: getEnvValue("NEXT_PUBLIC_VAPID_PUBLIC_KEY"),
  VAPID_PRIVATE_KEY: getEnvValue("VAPID_PRIVATE_KEY"),
  NODE_ENV: process.env.NODE_ENV,
})
