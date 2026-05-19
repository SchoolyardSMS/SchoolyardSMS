import { PrismaClient, Role, EnrollmentStatus, IncidentCategory, IncidentSeverity, IncidentStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

// --- Utilities ---
const pick = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)]
const randomRange = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const randomDateInRange = (start: Date, end: Date) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
const getLetterGrade = (score: number) => {
  if (score >= 93) return 'A'; if (score >= 90) return 'A-';
  if (score >= 87) return 'B+'; if (score >= 83) return 'B'; if (score >= 80) return 'B-';
  if (score >= 77) return 'C+'; if (score >= 73) return 'C'; if (score >= 70) return 'C-';
  if (score >= 67) return 'D+'; if (score >= 63) return 'D'; if (score >= 60) return 'D-';
  return 'F'
}

async function main() {
  console.log('🌱 Starting full database seed...')
  const defaultPassword = bcrypt.hashSync('password', 10)

  // 1. Create Core Users
  console.log('📝 Creating base users...')
  const admin = await prisma.user.upsert({
    where: { email: 'admin@schoolyard.dev' },
    update: { hashedPassword: defaultPassword },
    create: { email: 'admin@schoolyard.dev', name: 'System Administrator', role: Role.ADMIN, hashedPassword: defaultPassword },
  })

  // 2. Generate 500 Mock Students
  console.log('👥 Generating 500 students...')
  const studentData = Array.from({ length: 500 }).map(() => ({
    email: faker.internet.email().toLowerCase(),
    name: faker.person.fullName(),
    role: Role.STUDENT as const,
    hashedPassword: defaultPassword,
  }))
  await prisma.user.createMany({ data: studentData, skipDuplicates: true })
  const createdStudents = await prisma.user.findMany({ where: { role: Role.STUDENT } })
  await prisma.student.createMany({
    data: createdStudents.map((u) => ({
      userId: u.id,
      dateOfBirth: faker.date.birthdate({ min: 14, max: 18, mode: 'age' }),
      gradeLevel: faker.number.int({ min: 9, max: 12 }),
    })),
  })

  // 3. Generate 25 Teachers
  console.log('👨‍🏫 Generating 25 teachers...')
  const departments = ['Mathematics', 'English', 'Science', 'Social Studies', 'Art']
  for (let i = 0; i < 25; i++) {
    await prisma.user.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        name: faker.person.fullName(),
        role: Role.TEACHER,
        hashedPassword: defaultPassword,
        teacherProfile: { create: { department: pick(departments) } }
      }
    })
  }

  // 4. Create School Year & Terms
  console.log('📅 Creating school calendar...')
  const currentYear = new Date().getFullYear()
  const schoolYear = await prisma.schoolYear.upsert({
    where: { name: `${currentYear}-${currentYear + 1}` },
    update: {},
    create: {
      name: `${currentYear}-${currentYear + 1}`,
      startDate: new Date(`${currentYear}-08-01`),
      endDate: new Date(`${currentYear + 1}-06-30`),
      isActive: true,
    }
  })

  const fallTerm = await prisma.term.create({
    data: {
      schoolYearId: schoolYear.id,
      name: 'Fall 2026',
      startDate: new Date(`${currentYear}-08-15`),
      endDate: new Date(`${currentYear}-12-20`)
    }
  })

  // 5. Generate Courses & Sections
  console.log('📚 Generating sections...')
  const teachers = await prisma.teacher.findMany()
  const students = await prisma.student.findMany()

  for (let i = 0; i < 30; i++) {
    const course = await prisma.course.create({
      data: {
        code: `CRS${100 + i}`,
        name: `Course ${i + 1}`,
        credits: 3.0
      }
    })

    const section = await prisma.section.create({
      data: {
        courseId: course.id,
        teacherId: pick(teachers).id,
        termId: fallTerm.id,
        schedule: 'Mon/Wed 10:00 AM',
        room: `Room ${100 + i}`
      }
    })

    // Enroll a subset of students
    const batch = students.slice(i * 10, (i + 1) * 10)
    await prisma.enrollment.createMany({
      data: batch.map(s => ({ studentId: s.id, sectionId: section.id, status: EnrollmentStatus.ENROLLED }))
    })
  }

  // 6. Assignments, Grades, Term Grades & Report Cards
  console.log('📝 Generating academics...')
  const allSections = await prisma.section.findMany()
  for (const section of allSections) {
    const enrollments = await prisma.enrollment.findMany({ where: { sectionId: section.id } })
    
    // Create assignments
    for (let a = 0; a < 3; a++) {
      const assignment = await prisma.assignment.create({
        data: {
          sectionId: section.id,
          title: `Assignment ${a + 1}`,
          dueDate: new Date(),
          maxScore: 100
        }
      })

      // Create grades
      await prisma.grade.createMany({
        data: enrollments.map(e => ({
          assignmentId: assignment.id,
          studentId: e.studentId,
          score: randomRange(70, 100)
        }))
      })
    }

    // Calculate Term Grades
    for (const enrollment of enrollments) {
      const grades = await prisma.grade.findMany({ 
        where: { 
            studentId: enrollment.studentId,
            assignment: { sectionId: section.id }
        } 
      })
      
      if (grades.length > 0) {
        const avg = grades.reduce((sum, g) => sum + g.score, 0) / grades.length
        await prisma.termGrade.create({
          data: {
            enrollmentId: enrollment.id,
            termId: fallTerm.id,
            calculatedScore: avg,
            letterGrade: getLetterGrade(avg),
            isPosted: true
          }
        })
      }
    }
  }

  // 7. Incidents
  console.log('🚨 Generating incidents...')
  const incidentStudents = students.slice(0, 20)
  for (const student of incidentStudents) {
    await prisma.incident.create({
      data: {
        studentId: student.id,
        reporterId: admin.id,
        title: 'Behavioral Report',
        description: 'Mock incident report generated for demo purposes.',
        category: IncidentCategory.BEHAVIOR,
        severity: IncidentSeverity.MINOR,
        status: IncidentStatus.OPEN
      }
    })
  }

  console.log('✅ Seeding successful!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })