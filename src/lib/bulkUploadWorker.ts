import { db } from './db'
import { Role } from '@prisma/client'
import { randomUUID } from 'crypto'
import { sendInviteEmail } from './mail'

export async function processBulkUpload(csvContent: string) {
  const lines = csvContent.split('\n').filter(line => line.trim())
  if (lines.length <= 1) return { success: 0, errors: [] }

  const results = {
    success: 0,
    errors: [] as string[]
  }

  const batchSize = 10 // Safe concurrency limit to avoid DB connection issues

  // Skip header
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(s => s.trim())
    if (parts.length >= 3) {
      const [name, email, role, gradeLevelStr, studentId] = parts
      const emailLower = email.toLowerCase()
      const roleEnum = role as Role
      const gradeLevel = gradeLevelStr ? parseInt(gradeLevelStr, 10) : 0
      rows.push({ name, email: emailLower, role: roleEnum, gradeLevel, studentId, lineNum: i + 1 })
    } else {
      results.errors.push(`Row ${i + 1}: Missing name, email, or role`)
    }
  }

  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize)

    await Promise.all(chunk.map(async (row) => {
      try {
        if (!row.name || !row.email || !row.role) {
          throw new Error("Email, Name and Role are required.")
        }

        // 1. Create/Update user record
        const user = await db.user.upsert({
          where: { email: row.email },
          update: { name: row.name, role: row.role },
          create: { email: row.email, name: row.name, role: row.role }
        })

        // 1b. Auto-create full sub-profile based on role
        if (row.role === 'STUDENT') {
          const existingStudent = await db.student.findFirst({ where: { userId: user.id } })
          if (!existingStudent) {
            await db.student.create({
              data: { userId: user.id, gradeLevel: row.gradeLevel, dateOfBirth: new Date("2000-01-01") }
            })
          } else if (row.gradeLevel > 0) {
            await db.student.update({
              where: { id: existingStudent.id },
              data: { gradeLevel: row.gradeLevel }
            })
          }
        } else if (row.role === 'TEACHER') {
          const existingTeacher = await db.teacher.findFirst({ where: { userId: user.id } })
          if (!existingTeacher) {
            await db.teacher.create({
              data: { userId: user.id }
            })
          }
        } else if (row.role === 'PARENT') {
          const existingParent = await db.parent.findFirst({ where: { userId: user.id } })
          if (!existingParent) {
            await db.parent.create({
              data: { userId: user.id }
            })
          }
        }

        // 2. Generate and save token
        const token = randomUUID()
        const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

        await db.userToken.upsert({
          where: { email_token: { email: row.email, token } },
          update: { token, expires, studentId: row.studentId || null },
          create: { email: row.email, token, role: row.role, expires, studentId: row.studentId || null }
        })

        // 3. Send Email
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const inviteLink = `${baseUrl.replace(/\/$/, '')}/register?token=${token}&email=${encodeURIComponent(row.email)}`
        await sendInviteEmail(row.email, inviteLink, row.role)

        results.success++
      } catch (err: any) {
        results.errors.push(`Row ${row.lineNum} (${row.email}): ${err.message}`)
      }
    }))
  }

  return results
}

const bulkWorker = { processBulkUpload }
export default bulkWorker
