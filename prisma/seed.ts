import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const defaultPassword = bcrypt.hashSync('password', 10)

  // 1. Create Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@schoolyard.dev' },
    update: { hashedPassword: defaultPassword },
    create: {
      email: 'admin@schoolyard.dev',
      name: 'System Administrator',
      role: 'ADMIN',
      hashedPassword: defaultPassword,
    },
  })

  // 2. Create Teacher
  const teacherUser = await prisma.user.upsert({
    where: { email: 'teacher@schoolyard.dev' },
    update: { hashedPassword: defaultPassword },
    create: {
      email: 'teacher@schoolyard.dev',
      name: 'Jane Smith',
      role: 'TEACHER',
      hashedPassword: defaultPassword,
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
    update: { hashedPassword: defaultPassword },
    create: {
      email: 'student@schoolyard.dev',
      name: 'John Doe',
      role: 'STUDENT',
      hashedPassword: defaultPassword,
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
    update: { hashedPassword: defaultPassword },
    create: {
      email: 'parent@schoolyard.dev',
      name: 'Mr. Doe',
      role: 'PARENT',
      hashedPassword: defaultPassword,
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
  const teacherProfile = await prisma.teacher.findUnique({ where: { userId: teacherUser.id } })
  
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

  // 5. Create Academics Catalog
  if (teacherProfile && studentProfile) {
    const course = await prisma.course.upsert({
      where: { code: 'MATH101' },
      update: {},
      create: {
        code: 'MATH101',
        name: 'Algebra I',
        description: 'Introduction to algebraic expressions and equations.',
        credits: 3.0,
      }
    })

    const course2 = await prisma.course.upsert({
      where: { code: 'ENG201' },
      update: {},
      create: {
        code: 'ENG201',
        name: 'World Literature',
        description: 'Survey of classic world literature.',
        credits: 3.0,
      }
    })

    // Create Section (if not exists)
    let section = await prisma.section.findFirst({ where: { courseId: course.id } })
    if (!section) {
      section = await prisma.section.create({
        data: {
          courseId: course.id,
          teacherId: teacherProfile.id,
          legacyTerm: 'Fall 2026',
          schedule: 'Mon/Wed/Fri 10:00 AM',
          room: 'Room 101',
        }
      })
    }

    // Create Enrollment
    await prisma.enrollment.upsert({
      where: {
        studentId_sectionId: {
          studentId: studentProfile.id,
          sectionId: section.id
        }
      },
      update: { status: 'ENROLLED' },
      create: {
        studentId: studentProfile.id,
        sectionId: section.id,
        status: 'ENROLLED'
      }
    })

    // Create Assignment
    let assignment = await prisma.assignment.findFirst({ where: { sectionId: section.id, title: 'Homework 1' } })
    if (!assignment) {
      assignment = await prisma.assignment.create({
        data: {
          sectionId: section.id,
          title: 'Homework 1',
          description: 'Solve equations 1 through 10 on page 42.',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
          maxScore: 100,
        }
      })
    }

    // Create Grade
    await prisma.grade.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId: assignment.id,
          studentId: studentProfile.id
        }
      },
      update: { score: 95.5 },
      create: {
        assignmentId: assignment.id,
        studentId: studentProfile.id,
        score: 95.5,
        feedback: 'Excellent work, John!'
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
