import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // 1. Create Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@schoolyard.dev' },
    update: {},
    create: {
      email: 'admin@schoolyard.dev',
      name: 'System Administrator',
      role: 'ADMIN',
      hashedPassword: 'hashed_password_placeholder', // Usually hashed via bcrypt
    },
  })

  // 2. Create Teacher
  const teacherUser = await prisma.user.upsert({
    where: { email: 'teacher@schoolyard.dev' },
    update: {},
    create: {
      email: 'teacher@schoolyard.dev',
      name: 'Jane Smith',
      role: 'TEACHER',
      hashedPassword: 'hashed_password_placeholder',
      teacherProfile: {
        create: {
          department: 'Mathematics',
        },
      },
    },
  })

  // 3. Create Student
  const studentUser = await prisma.user.upsert({
    where: { email: 'student@schoolyard.dev' },
    update: {},
    create: {
      email: 'student@schoolyard.dev',
      name: 'John Doe',
      role: 'STUDENT',
      hashedPassword: 'hashed_password_placeholder',
      studentProfile: {
        create: {
          dateOfBirth: new Date('2010-05-15'),
          gradeLevel: 10,
        },
      },
    },
  })

  // 4. Create Parent
  const parentUser = await prisma.user.upsert({
    where: { email: 'parent@schoolyard.dev' },
    update: {},
    create: {
      email: 'parent@schoolyard.dev',
      name: 'Mr. Doe',
      role: 'PARENT',
      hashedPassword: 'hashed_password_placeholder',
      parentProfile: {
        create: {
          phone: '+1-555-0199',
        },
      },
    },
  })

  // Link Parent and Student
  const parentProfile = await prisma.parent.findUnique({ where: { userId: parentUser.id } })
  const studentProfile = await prisma.student.findUnique({ where: { userId: studentUser.id } })
  
  if (parentProfile && studentProfile) {
    await prisma.parentStudent.upsert({
      where: {
        parentId_studentId: {
          parentId: parentProfile.id,
          studentId: studentProfile.id
        }
      },
      update: {},
      create: {
        parentId: parentProfile.id,
        studentId: studentProfile.id
      }
    })
  }

  console.log('Database seeded successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
