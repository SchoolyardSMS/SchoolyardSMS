import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock getServerSession
vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }))

// Mock authOptions import used by getServerSession calls
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

// Mock RBAC helper used by messaging
vi.mock('@/lib/rbac', () => ({ assertRole: vi.fn(), assertTeacherOrAdminForSection: vi.fn() }))

// Mock queue to avoid running background processing in tests
vi.mock('@/lib/queue', () => ({ enqueueBroadcast: vi.fn() }))

// Mock messaging utils that resolve audiences
vi.mock('@/lib/messaging-utils', () => ({ resolveAudienceRecipients: vi.fn() }))

// Mock db
vi.mock('@/lib/db', () => ({ db: {
  broadcast: { create: vi.fn() },
  broadcastDelivery: { createMany: vi.fn() }
}}))

// Mock Resend client
vi.mock('resend', () => ({
  Resend: class {
    batch = { send: async () => ({ data: [{ id: 'rid1' }, { id: 'rid2' }] }) }
    emails = { send: async () => ({ data: { id: 'eid1' } }) }
  }
}))

const { getServerSession } = await import('next-auth/next') as any
const messagingUtils = await import('@/lib/messaging-utils') as any
const db = (await import('@/lib/db')) as any
const messaging = await import('../messaging')
// Mock next/cache revalidatePath used in messaging
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('sendSchoolMessage broadcast flow', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('creates broadcast and broadcastDelivery records and sends batch', async () => {
    ;(getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'ADMIN', name: 'Admin' } })
    const recipients = [ { id: 'r1', email: 'a@example.com' }, { id: 'r2', email: 'b@example.com' } ]
    ;(messagingUtils.resolveAudienceRecipients as any).mockResolvedValue(recipients)
    ;(db.db.broadcast.create as any).mockResolvedValue({ id: 'bc1' })

    const form = new FormData()
    form.set('subject', 'Hello')
    form.set('content', 'World')
    form.set('audience', 'ALL')

    const result = await (messaging as any).sendSchoolMessage(form)

    expect(db.db.broadcast.create).toHaveBeenCalled()
    expect(db.db.broadcastDelivery.createMany).toHaveBeenCalled()
    expect(result).toEqual({ success: true, queued: true })
  })
})
