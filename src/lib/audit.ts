import { db } from "@/lib/db"

interface LogAuditOptions {
  actorId: string
  action: string
  targetModel: string
  targetId: string
  previous?: any
  current?: any
  ipAddress?: string
  userAgent?: string
}

/**
  * Logs a compliance or system audit event securely in the database.
  * Captures target resource modifications and optional state diffs.
  */
export async function logAuditEvent({
  actorId,
  action,
  targetModel,
  targetId,
  previous,
  current,
  ipAddress,
  userAgent
}: LogAuditOptions) {
  try {
    const log = await db.auditLog.create({
      data: {
        actorId,
        action,
        targetModel,
        targetId,
        previous: previous ? JSON.parse(JSON.stringify(previous)) : null,
        current: current ? JSON.parse(JSON.stringify(current)) : null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null
      }
    })
    return log
  } catch (error) {
    console.error("Failed to log audit event:", error)
  }
}
