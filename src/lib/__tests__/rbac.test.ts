import { assertRole, assertTeacherOrAdminForSection } from "../rbac"

describe('RBAC helpers', () => {
  test('assertRole throws when missing', () => {
    expect(() => assertRole(null as any, ['ADMIN'])).toThrow()
  })

  test('assertRole throws when role not allowed', () => {
    const session = { user: { id: 'u1', role: 'STUDENT' } }
    expect(() => assertRole(session as any, ['ADMIN', 'TEACHER'])).toThrow()
  })
})
