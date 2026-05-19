import { 
  PrismaClient, 
  Role, 
  EnrollmentStatus, 
  IncidentCategory, 
  IncidentSeverity, 
  IncidentStatus, 
  AttendanceStatus, 
  DayType, 
  BlockDay, 
  CommunityAttendanceStatus 
} from '@prisma/client'
import bcrypt from 'bcryptjs'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

// --- Utilities ---
const pick = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)]
const randomRange = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

async function main() {
  console.log('🌱 Starting full database seed...')
  const defaultPassword = bcrypt.hashSync('password', 10)

  // 1. Create Core Users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@schoolyard.dev' },
    update: { hashedPassword: defaultPassword },
    create: { email: 'admin@schoolyard.dev', name: 'System Administrator', role: Role.ADMIN, hashedPassword: defaultPassword },
  })

  // 2. Generate Students (500)
  console.log('👥 Generating 500 students...')
  const students = Array.from({ length: 500 }).map(() => ({
    email: faker.internet.email().toLowerCase(),
    name: faker.person.fullName(),
    role: Role.STUDENT,
    hashedPassword: defaultPassword,
  }))
  await prisma.user.createMany({ data: students, skipDuplicates: true })
  const createdStudents = await prisma.user.findMany({ where: { role: Role.STUDENT } })
  await prisma.student.createMany({
    data: createdStudents.map((u) => ({
      userId: u.id,
      dateOfBirth: faker.date.birthdate({ min: 14, max: 18, mode: 'age' }),
      gradeLevel: faker.number.int({ min: 9, max: 12 }),
    })),
  })

  // 3. Generate Teachers (25)
  console.log('👨‍🏫 Generating 25 teachers...')
  for (let i = 0; i < 25; i++) {
    await prisma.user.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        name: faker.person.fullName(),
        role: Role.TEACHER,
        hashedPassword: defaultPassword,
        teacherProfile: { create: { department: 'General Studies' } }
      }
    })
  }

  // 4. Academics: Calendar & Terms
  console.log('📅 Generating School Year & Terms...')
  const year = await prisma.schoolYear.create({
    data: { name: '2026-2027', startDate: new Date('2026-08-01'), endDate: new Date('2027-06-30'), isActive: true }
  })
  const term = await prisma.term.create({
    data: { schoolYearId: year.id, name: 'Fall 2026', startDate: new Date('2026-08-15'), endDate: new Date('2026-12-20') }
  })

  // 5. Academics: Courses, Sections, Enrollments, Attendance
  console.log('📚 Generating Courses, Sections, & Attendance...')
  const teachers = await prisma.teacher.findMany()
  const studentRecords = await prisma.student.findMany()

  for (let i = 0; i < 10; i++) {
    const course = await prisma.course.create({ data: { code: `C${100 + i}`, name: `Course ${i + 1}` } })
    const section = await prisma.section.create({
      data: { courseId: course.id, teacherId: pick(teachers).id, termId: term.id, schedule: 'MWF 9:00', room: `Room ${100 + i}` }
    })
    
    // Enroll & Attend
    const batch = studentRecords.slice(i * 10, (i + 1) * 10)
    for (const s of batch) {
      await prisma.enrollment.create({ data: { studentId: s.id, sectionId: section.id, status: EnrollmentStatus.ENROLLED } })
      await prisma.attendance.create({
        data: { studentId: s.id, sectionId: section.id, date: new Date(), status: AttendanceStatus.PRESENT }
      })
    }
  }

  // 6. Discipline (Incidents)
  console.log('🚨 Generating Incidents...')
  for (let i = 0; i < 20; i++) {
    await prisma.incident.create({
      data: {
        studentId: pick(studentRecords).id,
        reporterId: admin.id,
        title: 'Conduct violation',
        description: 'Mock incident detail.',
        category: IncidentCategory.BEHAVIOR,
        severity: IncidentSeverity.MINOR,
        status: IncidentStatus.OPEN
      }
    })
  }

  // 7. Community & Calendar
  console.log('📅 Generating Community Calendar...')
  const day = await prisma.calendarDay.create({
    data: { date: new Date(), type: DayType.INSTRUCTIONAL, blockDay: BlockDay.A, hasCommunityPeriod: true }
  })
  const session = await prisma.communitySession.create({
    data: { calendarDayId: day.id, teacherId: pick(teachers).id, title: 'Advisor Meetup', room: 'Lib-1' }
  })
  await prisma.communityEnrollment.create({
    data: { sessionId: session.id, studentId: studentRecords[0].id, attendance: CommunityAttendanceStatus.PENDING }
  })

  // 8. Messaging
  console.log('✉️ Generating Messages...')
  await prisma.message.create({
    data: { senderId: admin.id, receiverId: studentRecords[0].userId, subject: 'Welcome', body: 'System check complete.' }
  })

  console.log('✅ Full seeding successful!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => await prisma.$disconnect())