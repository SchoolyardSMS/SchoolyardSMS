import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

const pick = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)]
const getLetterGrade = (score: number) => {
  if (score >= 93) return 'A'
  if (score >= 90) return 'A-'
  if (score >= 87) return 'B+'
  if (score >= 83) return 'B'
  if (score >= 80) return 'B-'
  if (score >= 77) return 'C+'
  if (score >= 73) return 'C'
  if (score >= 70) return 'C-'
  if (score >= 67) return 'D+'
  if (score >= 63) return 'D'
  if (score >= 60) return 'D-'
  return 'F'
}
const randomRange = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const randomDateInRange = (start: Date, end: Date) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))

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

  // ===== 4. Create School Year and Terms =====
  console.log('📅 Creating school year and terms...')

  const currentYear = new Date().getFullYear()
  const schoolYearName = `${currentYear}-${currentYear + 1}`
  const schoolYear = await prisma.schoolYear.upsert({
    where: { name: schoolYearName },
    update: {
      startDate: new Date(`${currentYear}-08-01`),
      endDate: new Date(`${currentYear + 1}-06-30`),
      isActive: true,
    },
    create: {
      name: schoolYearName,
      startDate: new Date(`${currentYear}-08-01`),
      endDate: new Date(`${currentYear + 1}-06-30`),
      isActive: true,
    },
  })

  const termDefinitions = [
    {
      name: 'Fall Semester',
      type: 'SEMESTER' as const,
      startDate: new Date(`${currentYear}-08-15`),
      endDate: new Date(`${currentYear}-12-20`),
    },
    {
      name: 'Spring Semester',
      type: 'SEMESTER' as const,
      startDate: new Date(`${currentYear + 1}-01-10`),
      endDate: new Date(`${currentYear + 1}-05-25`),
    },
  ]

  const terms = []
  for (const termDef of termDefinitions) {
    const term = await prisma.term.upsert({
      where: {
        schoolYearId_name: {
          schoolYearId: schoolYear.id,
          name: termDef.name,
        },
      },
      update: {
        startDate: termDef.startDate,
        endDate: termDef.endDate,
        type: termDef.type,
      },
      create: {
        schoolYearId: schoolYear.id,
        name: termDef.name,
        type: termDef.type,
        startDate: termDef.startDate,
        endDate: termDef.endDate,
      },
    })
    terms.push(term)
  }

  console.log(`✅ Created school year ${schoolYearName} and ${terms.length} terms`)

  // ===== 5. Generate 30+ Courses =====
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
    const course = await prisma.course.upsert({
      where: { code: `${template.code}${i}` },
      update: {},
      create: {
        code: `${template.code}${i}`,
        name: `${template.name} ${i > 0 ? `(Section ${i})` : ''}`,
        description: faker.lorem.sentence(),
        credits: template.credits,
      },
    })

    courses.push(course)
  }

  console.log(`✅ Created ${courses.length} courses`)

  // ===== 6. Create Sections and Enrollments =====
  console.log('📋 Creating sections and enrolling students...')

  const teachers = await prisma.teacher.findMany()
  const students = await prisma.student.findMany()

  let enrollmentCount = 0
  const sectionPromises = []
  const sections: Array<Awaited<ReturnType<typeof prisma.section.create>>> = []

  for (const course of courses) {
    const sectionCount = randomRange(2, 3)

    for (let s = 0; s < sectionCount; s++) {
      const teacher = pick(teachers)
      const section = await prisma.section.create({
        data: {
          courseId: course.id,
          teacherId: teacher.id,
          termId: pick(terms).id,
          legacyTerm: `Term ${currentYear}`,
          schedule: `${pick(['Mon', 'Tue', 'Wed'])}/${pick(['Wed', 'Thu', 'Fri'])} ${8 + randomRange(0, 7)}:00 AM`,
          room: `Room ${100 + randomRange(0, 49)}`,
          weightingConfig: {
            HOMEWORK: 30,
            QUIZ: 30,
            TEST: 40,
          },
        },
      })

      sections.push(section)

      const shuffledStudents = [...students].sort(() => Math.random() - 0.5)
      const enrollmentBatch = randomRange(30, 60)

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

  console.log(`✅ Created ${sections.length} sections and ${enrollmentCount}+ enrollments`)

  // ===== 7. Create Assignments, Grades, Term Grades and Report Cards =====
  console.log('📝 Creating assignments, grades, term grades, and report cards...')

  const allSections = await prisma.section.findMany()
  let assignmentCount = 0
  let gradeCount = 0

  for (const section of allSections) {
    const enrollments = await prisma.enrollment.findMany({
      where: { sectionId: section.id },
      include: { student: true },
    })

    if (!enrollments.length) continue

    const assignmentCount_ = randomRange(4, 7)
    for (let a = 0; a < assignmentCount_; a++) {
      const assignment = await prisma.assignment.create({
        data: {
          sectionId: section.id,
          title: `Assignment ${a + 1}: ${faker.helpers.unique(faker.lorem.words, [3])}`,
          description: faker.lorem.sentence(),
          dueDate: randomDateInRange(new Date(), new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)),
          maxScore: 100,
          type: pick(['HOMEWORK', 'QUIZ', 'TEST', 'PROJECT', 'LAB', 'OTHER']) as any,
          status: 'PUBLISHED',
          publishDate: new Date(),
        },
      })

      assignmentCount++

      const gradeRows = enrollments.map((enrollment) => ({
        assignmentId: assignment.id,
        studentId: enrollment.student.id,
        score: faker.number.float({ min: 60, max: 100, fractionDigits: 1 }),
        feedback: faker.lorem.sentence(),
      }))

      await prisma.grade.createMany({
        data: gradeRows,
        skipDuplicates: true,
      })

      gradeCount += gradeRows.length
    }
  }

  const enrollmentGrades = await prisma.enrollment.findMany({
    include: {
      section: { include: { term: true, course: true } },
      grades: true,
      student: true,
    },
  })

  let termGradeCount = 0
  const reportCardGroups = new Map<string, { studentId: string; termId: string; termName: string; sections: Array<{ courseName: string; sectionId: string; average: number; letter: string }> }>()

  for (const enrollment of enrollmentGrades) {
    const termId = enrollment.section.termId
    if (!termId || !enrollment.grades.length) continue

    const average = enrollment.grades.reduce((sum, grade) => sum + grade.score, 0) / enrollment.grades.length
    const letter = getLetterGrade(average)

    await prisma.termGrade.upsert({
      where: {
        enrollmentId_termId: {
          enrollmentId: enrollment.id,
          termId,
        },
      },
      update: {
        calculatedScore: average,
        letterGrade: letter,
        comments: faker.lorem.sentence(),
        isPosted: true,
        postedAt: new Date(),
      },
      create: {
        enrollmentId: enrollment.id,
        termId,
        calculatedScore: average,
        letterGrade: letter,
        comments: faker.lorem.sentence(),
        isPosted: true,
        postedAt: new Date(),
      },
    })

    termGradeCount++

    const key = `${enrollment.studentId}-${termId}`
    const existing = reportCardGroups.get(key)
    const sectionSummary = {
      courseName: enrollment.section.course.name,
      sectionId: enrollment.section.id,
      average,
      letter,
    }

    if (existing) {
      existing.sections.push(sectionSummary)
    } else {
      reportCardGroups.set(key, {
        studentId: enrollment.studentId,
        termId,
        termName: enrollment.section.term?.name ?? 'Unknown Term',
        sections: [sectionSummary],
      })
    }
  }

  let reportCardCount = 0
  for (const { studentId, termId, termName, sections: reportSections } of reportCardGroups.values()) {
    await prisma.reportCard.upsert({
      where: {
        studentId_termId: {
          studentId,
          termId,
        },
      },
      update: {
        snapshot: {
          term: termName,
          sections: reportSections,
          generatedAt: new Date().toISOString(),
        },
        isPublished: true,
        publishedAt: new Date(),
      },
      create: {
        studentId,
        termId,
        snapshot: {
          term: termName,
          sections: reportSections,
          generatedAt: new Date().toISOString(),
        },
        isPublished: true,
        publishedAt: new Date(),
      },
    })

    reportCardCount++
  }

  console.log(`✅ Created ${assignmentCount} assignments with ${gradeCount} grades, ${termGradeCount} term grades, and ${reportCardCount} report cards`)

  // ===== 8. Create Incidents =====
  console.log('🚨 Creating incident reports and comments...')

  const incidentCategories = ['BEHAVIOR', 'ACADEMIC_DISHONESTY', 'ATTENDANCE', 'BULLYING', 'PROPERTY_DAMAGE', 'SAFETY', 'OTHER'] as const
  const incidentSeverities = ['MINOR', 'MODERATE', 'SEVERE'] as const
  const incidentStatuses = ['OPEN', 'UNDER_INVESTIGATION', 'RESOLVED', 'CLOSED'] as const
  const reporters = [admin, teacherUser]
  const incidentStudentsCount = 120
  const incidentStudents = students.sort(() => Math.random() - 0.5).slice(0, Math.min(incidentStudentsCount, students.length))

  let incidentCount = 0
  let incidentCommentCount = 0

  for (let i = 0; i < 120; i++) {
    const student = pick(incidentStudents)
    const reporter = pick(reporters)
    const category = pick(incidentCategories)
    const severity = pick(incidentSeverities)
    const status = pick(incidentStatuses)
    const createdDate = randomDateInRange(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), new Date())

    const incident = await prisma.incident.create({
      data: {
        studentId: student.id,
        reporterId: reporter.id,
        date: createdDate,
        title: `${category.replace('_', ' ')} incident for ${student.userId}`,
        description: faker.lorem.paragraph(),
        category: category as any,
        severity: severity as any,
        status: status as any,
        actionTaken: status === 'RESOLVED' || status === 'CLOSED' ? faker.lorem.sentence() : null,
        followUpDate: status === 'OPEN' || status === 'UNDER_INVESTIGATION' ? randomDateInRange(new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) : null,
      },
    })

    incidentCount++

    const commentCount = randomRange(0, 2)
    for (let c = 0; c < commentCount; c++) {
      await prisma.incidentComment.create({
        data: {
          incidentId: incident.id,
          authorId: pick(reporters).id,
          body: faker.lorem.sentences(2),
        },
      })
      incidentCommentCount++
    }
  }

  console.log(`✅ Created ${incidentCount} incidents and ${incidentCommentCount} incident comments`)

  // ===== 9. Create Messages =====
  console.log('✉️ Creating direct messages between users...')

  const allUsers = await prisma.user.findMany({
    where: { role: { in: ['TEACHER', 'STUDENT', 'PARENT'] } },
  })

  let messageCount = 0
  for (let i = 0; i < 220; i++) {
    const sender = pick(allUsers)
    let receiver = pick(allUsers)
    while (receiver.id === sender.id) {
      receiver = pick(allUsers)
    }

    await prisma.message.create({
      data: {
        senderId: sender.id,
        receiverId: receiver.id,
        subject: faker.lorem.sentence({ min: 3, max: 6 }),
        body: faker.lorem.paragraphs(1),
        read: faker.datatype.boolean(),
      },
    })

    messageCount++
  }

  console.log(`✅ Created ${messageCount} messages`)

  // ===== 10. Link Parent and Student =====
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
