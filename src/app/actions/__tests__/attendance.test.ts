import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mocks must be registered before importing the module under test
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}))

// Mock authOptions import used by getServerSession calls
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

// Mock date helpers
vi.mock('@/lib/dates', () => ({ formatInET: (d: any) => 'DATE', parseLocalDate: (s: string) => new Date(s) }))

// Mock next/cache revalidatePath used in server actions
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

// Mock the messaging sendSystemBatchMessages used by attendance
vi.mock('../messaging', () => ({
  sendSystemBatchMessages: vi.fn()
}))

// Mock the Prisma db module
vi.mock('@/lib/db', () => ({
  db: {
    attendance: {
      upsert: vi.fn()
    },
    student: {
      findUnique: vi.fn()
    },
    section: {
      findUnique: vi.fn()
    }
  }
}))

const { getServerSession } = await import('next-auth/next') as any
const messaging = await import('../messaging') as any
const db = (await import('@/lib/db')) as any
const { submitAttendance } = await import('../attendance')

describe('submitAttendance', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('rejects when teacher is not owner', async () => {
    // Teacher session but not owner
    ;(getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'TEACHER', name: 'Ms T' } })
    ;(db.db.section.findUnique as any).mockResolvedValue({ teacher: { userId: 'other' } })

    await expect(submitAttendance('sec1', 'stud1', new Date(), 'PRESENT' as any)).rejects.toThrow(/not the assigned teacher/)
  })

  it('sends parent notifications when notifiedParent=true and admin user', async () => {
    ;(getServerSession as any).mockResolvedValue({ user: { id: 'admin', role: 'ADMIN', name: 'Admin' } })
    ;(db.db.attendance.upsert as any).mockResolvedValue({ id: 'a1' })
    ;(db.db.student.findUnique as any).mockResolvedValue({
      id: 'stud1',
      user: { name: 'Student One' },
      parents: [ { parent: { userId: 'p1', user: { email: 'p1@example.com', name: 'Parent One' } } } ]
    })
    ;(db.db.section.findUnique as any).mockResolvedValue({ course: { name: 'Biology' } })

    await submitAttendance('sec1', 'stud1', new Date(), 'ABSENT' as any, { notifiedParent: true })

    expect(messaging.sendSystemBatchMessages).toHaveBeenCalled()
    expect(db.db.attendance.upsert).toHaveBeenCalled()
  })
})
