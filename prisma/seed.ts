import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding large database...')

  const defaultPassword = bcrypt.hashSync('password', 10)

  // ===== 1. Create Admin and Demo Users =====
  console.log('📝 Creating admin and demo users...')

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

  // ===== 2. Generate 500 Mock Students =====
  console.log('👥 Generating 500 mock students...')

  const studentUsers = Array.from({ length: 500 }).map(() => ({
    email: faker.internet.email().toLowerCase(),
    name: faker.person.fullName(),
    role: 'STUDENT' as const,
    hashedPassword: defaultPassword,
  }))

  await prisma.user.createMany({
    data: studentUsers,
    skipDuplicates: true,
  })

  const createdStudentUsers = await prisma.user.findMany({
    where: { role: 'STUDENT' },
  })

  // Create Student Profiles
  const studentProfiles = createdStudentUsers.map((user) => ({
    userId: user.id,
    dateOfBirth: faker.date.birthdate({ min: 14, max: 18, mode: 'age' }),
    gradeLevel: faker.number.int({ min: 9, max: 12 }),
  }))

  await prisma.student.createMany({
    data: studentProfiles,
    skipDuplicates: true,
  })

  console.log(`✅ Created 500+ students`)

  // ===== 3. Generate 20+ Mock Teachers =====
  console.log('👨‍🏫 Generating 20+ mock teachers...')

  const departments = [
    'Mathematics',
    'English',
    'Science',
    'Social Studies',
    'Physical Education',
    'Art',
    'Music',
    'Technology',
  ]

  const teacherUsers = Array.from({ length: 25 }).map(() => ({
    email: faker.internet.email().toLowerCase(),
    name: faker.person.fullName(),
    role: 'TEACHER' as const,
    hashedPassword: defaultPassword,
    teacherProfile: {
      create: {
        department: departments[Math.floor(Math.random() * departments.length)],
      },
    },
  }))

  for (const teacher of teacherUsers) {
    await prisma.user.create({
      data: teacher,
    }).catch(() => {
      // Skip duplicates
    })
  }

  console.log('✅ Created 25+ teachers')

  // ===== 4. Generate 30+ Courses =====
  console.log('📚 Generating 30+ courses...')

  const courseTemplates = [
    { code: 'MATH101', name: 'Algebra I', credits: 3.0 },
    { code: 'MATH201', name: 'Geometry', credits: 3.0 },
    { code: 'MATH301', name: 'Algebra II', credits: 3.0 },
    { code: 'MATH401', name: 'Pre-Calculus', credits: 3.0 },
    { code: 'ENG101', name: 'English I', credits: 3.0 },
    { code: 'ENG201', name: 'World Literature', credits: 3.0 },
    { code: 'ENG301', name: 'American Literature', credits: 3.0 },
    { code: 'SCI101', name: 'Biology', credits: 4.0 },
    { code: 'SCI201', name: 'Chemistry', credits: 4.0 },
    { code: 'SCI301', name: 'Physics', credits: 4.0 },
    { code: 'HIST101', name: 'World History', credits: 3.0 },
    { code: 'HIST201', name: 'US History', credits: 3.0 },
    { code: 'ART101', name: 'Art Fundamentals', credits: 2.0 },
    { code: 'MUS101', name: 'Music Theory', credits: 2.0 },
    { code: 'PE101', name: 'Physical Education', credits: 1.0 },
  ]

  const courses = []
  for (let i = 0; i < 30; i++) {
    const template = courseTemplates[i % courseTemplates.length]
    const course = await prisma.course
      .upsert({
        where: { code: `${template.code}${i}` },
        update: {},
        create: {
          code: `${template.code}${i}`,
          name: `${template.name} ${i > 0 ? `(Section ${i})` : ''}`,
          description: faker.lorem.sentence(),
          credits: template.credits,
        },
      })
      .catch(() => null)

    if (course) courses.push(course)
  }

  console.log(`✅ Created ${courses.length} courses`)

  // ===== 5. Create Sections and Enrollments =====
  console.log('📋 Creating sections and enrolling students...')

  const teachers = await prisma.teacher.findMany({ take: 25 })
  const students = await prisma.student.findMany({ take: 500 })

  let enrollmentCount = 0

  for (const course of courses) {
    // Create 2-3 sections per course
    const sectionCount = faker.number.int({ min: 2, max: 3 })

    for (let s = 0; s < sectionCount; s++) {
      const teacher = teachers[Math.floor(Math.random() * teachers.length)]

      const section = await prisma.section.create({
        data: {
          courseId: course.id,
          teacherId: teacher.id,
          legacyTerm: `Term ${new Date().getFullYear()}`,
          schedule: `${['Mon', 'Tue', 'Wed'][Math.floor(Math.random() * 3)]}/${['Wed', 'Thu', 'Fri'][Math.floor(Math.random() * 3)]} ${8 + Math.floor(Math.random() * 8)}:00 AM`,
          room: `Room ${100 + Math.floor(Math.random() * 50)}`,
        },
      })

      // Enroll 30-60 random students in this section
      const enrollmentBatch = faker.number.int({ min: 30, max: 60 })
      const shuffledStudents = students.sort(() => Math.random() - 0.5)

      for (let e = 0; e < Math.min(enrollmentBatch, shuffledStudents.length); e++) {
        await prisma.enrollment
          .create({
            data: {
              studentId: shuffledStudents[e].id,
              sectionId: section.id,
              status: 'ENROLLED',
            },
          })
          .catch(() => {
            // Skip duplicate enrollments
          })

        enrollmentCount++
      }
    }
  }

  console.log(`✅ Created ${enrollmentCount}+ enrollments`)

  // ===== 6. Create Assignments and Grades =====
  console.log('📝 Creating assignments and grades...')

  const sections = await prisma.section.findMany()
  let assignmentCount = 0
  let gradeCount = 0

  for (const section of sections.slice(0, 50)) {
    // Create 10-15 assignments per section (sample)
    const assignmentCount_ = faker.number.int({ min: 5, max: 10 })

    for (let a = 0; a < assignmentCount_; a++) {
      const assignment = await prisma.assignment.create({
        data: {
          sectionId: section.id,
          title: `Assignment ${a + 1}: ${faker.lorem.words(3)}`,
          description: faker.lorem.sentence(),
          dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
          maxScore: 100,
        },
      })

      assignmentCount++

      // Add grades for all students in this section
      const enrollments = await prisma.enrollment.findMany({
        where: { sectionId: section.id },
        include: { student: true },
      })

      for (const enrollment of enrollments) {
        await prisma.grade
          .create({
            data: {
              assignmentId: assignment.id,
              studentId: enrollment.student.id,
              score: faker.number.float({ min: 60, max: 100, precision: 0.1 }),
              feedback: faker.lorem.sentence(),
            },
          })
          .catch(() => {
            // Skip duplicate grades
          })

        gradeCount++
      }
    }
  }

  console.log(`✅ Created ${assignmentCount} assignments with ${gradeCount}+ grades`)

  // ===== 7. Link Parent and Student =====
  console.log('👨‍👩‍👧 Linking parents to students...')

  const parentProfile = await prisma.parent.findUnique({
    where: { userId: parentUser.id },
  })
  const studentProfile = await prisma.student.findUnique({
    where: { userId: studentUser.id },
  })

  if (parentProfile && studentProfile) {
    await prisma.parentStudent.upsert({
      where: {
        parentId_studentId: {
          parentId: parentProfile.id,
          studentId: studentProfile.id,
        },
      },
      update: {},
      create: {
        parentId: parentProfile.id,
        studentId: studentProfile.id,
      },
    })
  }

  console.log('✅ Parent-student relationships created')

  console.log(
    '🎉 Database seeded successfully with ~500 students, ~25 teachers, ~30 courses, and thousands of grades!'
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
