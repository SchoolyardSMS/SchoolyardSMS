/**
 * seed.ts — Schoolyard Academy Demo Seed
 *
 * Run:  npx prisma db seed
 * Deps: @faker-js/faker  bcryptjs  @types/bcryptjs
 *
 * All users share the password: password
 */

import "dotenv/config";
import {
  AttendanceStatus,
  AssignmentStatus,
  AssignmentType,
  BlockDay,
  CommunityAttendanceStatus,
  AttendanceNotificationType,
  AttendanceNotificationStatus,
  DayType,
  DocumentType,
  EnrollmentStatus,
  IncidentCategory,
  IncidentSeverity,
  IncidentStatus,
  Role,
  TermType,
} from "@prisma/client";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";
import zlib from "zlib";
import { encrypt } from "../src/lib/encryption";
import { db as prisma } from "../src/lib/db";

// ─── Config ──────────────────────────────────────────────────────────────────

faker.seed(8675309);
const HASHED_PW = bcrypt.hashSync("password", 10);

// Friendly fixed identities so the demo always has recognisable people
const ADMIN_EMAIL = "admin@schoolyard.demo";
const TEACHER_SEEDS = [
  { name: "Margaret Chen",     email: "m.chen@schoolyard.demo",     department: "Mathematics" },
  { name: "David Okafor",      email: "d.okafor@schoolyard.demo",   department: "Science" },
  { name: "Sarah Patel",       email: "s.patel@schoolyard.demo",    department: "English" },
  { name: "James Rivera",      email: "j.rivera@schoolyard.demo",   department: "Social Studies" },
  { name: "Emily Kowalski",    email: "e.kowalski@schoolyard.demo", department: "World Languages" },
  { name: "Marcus Thompson",   email: "m.thompson@schoolyard.demo", department: "Arts & Electives" },
];

const COURSE_SEEDS = [
  { code: "ENG101",  name: "English I",          description: "Foundations of reading, writing, and literary analysis.",         credits: 1.0 },
  { code: "ENG201",  name: "English II",         description: "American literature and advanced composition.",                   credits: 1.0 },
  { code: "ALG101",  name: "Algebra I",          description: "Linear equations, inequalities, functions, and graphing.",        credits: 1.0 },
  { code: "ALG201",  name: "Algebra II",         description: "Polynomials, logarithms, and conic sections.",                    credits: 1.0 },
  { code: "BIO101",  name: "Biology",            description: "Cellular biology, genetics, evolution, and ecology.",             credits: 1.0 },
  { code: "CHEM101", name: "Chemistry",          description: "Matter, chemical reactions, and thermodynamics.",                 credits: 1.0 },
  { code: "HIST101", name: "U.S. History",       description: "American history from colonisation through the modern era.",      credits: 1.0 },
  { code: "SPAN101", name: "Spanish I",          description: "Introduction to Spanish language and culture.",                   credits: 0.5 },
  { code: "CS101",   name: "Computer Science I", description: "Fundamentals of programming with Python.",                        credits: 0.5 },
  { code: "ART101",  name: "Visual Arts",        description: "Drawing, painting, and design fundamentals.",                     credits: 0.5 },
];

// Map course codes to teacher indices (0-based) and section count
const SECTION_MAP: Record<string, { teacherIdx: number; sections: number }> = {
  ENG101:  { teacherIdx: 2, sections: 2 },
  ENG201:  { teacherIdx: 2, sections: 2 },
  ALG101:  { teacherIdx: 0, sections: 2 },
  ALG201:  { teacherIdx: 0, sections: 1 },
  BIO101:  { teacherIdx: 1, sections: 2 },
  CHEM101: { teacherIdx: 1, sections: 1 },
  HIST101: { teacherIdx: 3, sections: 2 },
  SPAN101: { teacherIdx: 4, sections: 1 },
  CS101:   { teacherIdx: 5, sections: 1 },
  ART101:  { teacherIdx: 5, sections: 1 },
};

const ROOMS = ["101", "102", "103", "201", "202", "203", "Lab A", "Lab B", "Art Studio", "Computer Lab"];
const NOW = new Date("2025-03-15");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysAgo(n: number) {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number) {
  const d = new Date(NOW);
  d.setDate(d.getDate() + n);
  return d;
}

/** Returns school weekdays between two dates (no weekends). */
function schoolDaysBetween(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Main ────────────────────────────────────────────────────────────────────

function weightedAttendanceStatus(): AttendanceStatus {
  const r = Math.random();
  if (r < 0.87) return AttendanceStatus.PRESENT;
  if (r < 0.92) return AttendanceStatus.TARDY;
  if (r < 0.96) return AttendanceStatus.EXCUSED;
  return AttendanceStatus.ABSENT;
}

function realisticScore(max: number): number {
  // Bell-ish curve skewed high — demo should look healthy
  const base = faker.number.float({ min: 0.58, max: 1.0 });
  const curved = Math.pow(base, 0.6); // skew towards higher end
  return Math.round(curved * max * 10) / 10;
}

async function main() {
  console.log("🌱 Seeding Schoolyard Academy demo…\n");

  // ── 0. Wipe ──────────────────────────────────────────────────────────────
  await prisma.$transaction([
    prisma.verificationToken.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.communityEnrollment.deleteMany(),
    prisma.communitySession.deleteMany(),
    prisma.calendarDay.deleteMany(),
    prisma.attendanceNotification.deleteMany(),
    prisma.topicMaterial.deleteMany(),
    prisma.topic.deleteMany(),
    prisma.broadcastDelivery.deleteMany(),
    prisma.broadcast.deleteMany(),
    prisma.document.deleteMany(),
    prisma.message.deleteMany(),
    prisma.incidentComment.deleteMany(),
    prisma.incident.deleteMany(),
    prisma.attendance.deleteMany(),
    prisma.grade.deleteMany(),
    prisma.termGrade.deleteMany(),
    prisma.reportCard.deleteMany(),
    prisma.submissionRecord.deleteMany(),
    prisma.announcement.deleteMany(),
    prisma.enrollment.deleteMany(),
    prisma.assignment.deleteMany(),
    prisma.section.deleteMany(),
    prisma.bellPeriod.deleteMany(),
    prisma.course.deleteMany(),
    prisma.term.deleteMany(),
    prisma.schoolYear.deleteMany(),
    prisma.parentStudent.deleteMany(),
    prisma.parent.deleteMany(),
    prisma.teacher.deleteMany(),
    prisma.student.deleteMany(),
    prisma.pushSubscription.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.user.deleteMany(),
    prisma.schoolSettings.deleteMany(),
    prisma.reportCardTemplate.deleteMany(),
    prisma.userToken.deleteMany(),
    prisma.compressedArchive.deleteMany(),
  ]);
  console.log("✓ Database cleared");

  // ── 1. School Settings ───────────────────────────────────────────────────
  await prisma.schoolSettings.create({
    data: {
      id: "singleton",
      name: "Schoolyard Academy",
      tagline: "Inspiring Minds, Building Futures",
      initials: "SA",
      primaryColor: "#4f46e5",
      secondaryColor: "#6b7280",
      activeTerm: "Spring 2025",
      attendanceThreshold: 5,
      passingGrade: 65,
      gpaScale: 4.0,
      featuresEnabled: { lms: true, discipline: true, community: true, messaging: true, parents: true },
      gradingScale: { A: 90, B: 80, C: 70, D: 60 },
      themeConfig: { borderRadius: "0.5rem", fontFamily: "Inter" },
      rolePermissions: {
        STUDENT: ["view_grades", "view_attendance", "view_assignments"],
        TEACHER: ["edit_grades", "take_attendance", "create_assignments", "view_incidents"],
        PARENT:  ["view_grades", "view_attendance"],
        ADMIN:   ["*"],
      },
      incidentTypes: [
        { id: "BEHAVIOR",            label: "Behavioral Issue",    severity: "MINOR"    },
        { id: "ACADEMIC_DISHONESTY", label: "Academic Dishonesty", severity: "MODERATE" },
        { id: "BULLYING",            label: "Bullying",            severity: "SEVERE"   },
        { id: "SAFETY",              label: "Safety Concern",      severity: "SEVERE"   },
      ],
    },
  });
  console.log("✓ School settings");

  // ── 2. Report Card Template ──────────────────────────────────────────────
  const reportCardTemplate = await prisma.reportCardTemplate.create({
    data: {
      name: "Standard Report Card",
      isDefault: true,
      layout: {
        showLogo: true,
        showGPA: true,
        showAttendance: true,
        showTeacherComments: true,
        sections: ["grades", "attendance", "conduct"],
      },
    },
  });

  // ── 3. School Year & Terms ───────────────────────────────────────────────
  const schoolYear = await prisma.schoolYear.create({
    data: {
      name: "2024-2025",
      startDate: new Date("2024-08-26"),
      endDate:   new Date("2025-06-13"),
      isActive: true,
    },
  });

  const termFall = await prisma.term.create({
    data: {
      schoolYearId: schoolYear.id,
      name: "Fall 2024",
      type: TermType.SEMESTER,
      startDate: new Date("2024-08-26"),
      endDate:   new Date("2025-01-17"),
    },
  });

  const termSpring = await prisma.term.create({
    data: {
      schoolYearId: schoolYear.id,
      name: "Spring 2025",
      type: TermType.SEMESTER,
      startDate: new Date("2025-01-21"),
      endDate:   new Date("2025-06-13"),
    },
  });

  // Q1/Q2 as children of Fall, Q3/Q4 as children of Spring
  const [q1, q2, q3, q4] = await Promise.all([
    prisma.term.create({ data: { schoolYearId: schoolYear.id, name: "Q1", type: TermType.QUARTER, parentId: termFall.id,   startDate: new Date("2024-08-26"), endDate: new Date("2024-10-25") } }),
    prisma.term.create({ data: { schoolYearId: schoolYear.id, name: "Q2", type: TermType.QUARTER, parentId: termFall.id,   startDate: new Date("2024-10-28"), endDate: new Date("2025-01-17") } }),
    prisma.term.create({ data: { schoolYearId: schoolYear.id, name: "Q3", type: TermType.QUARTER, parentId: termSpring.id, startDate: new Date("2025-01-21"), endDate: new Date("2025-03-21") } }),
    prisma.term.create({ data: { schoolYearId: schoolYear.id, name: "Q4", type: TermType.QUARTER, parentId: termSpring.id, startDate: new Date("2025-03-24"), endDate: new Date("2025-06-13") } }),
  ]);
  console.log("✓ School year + 6 terms");

  // ── 4. Bell Schedule ─────────────────────────────────────────────────────
  const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI"];
  const bellData = [
    { name: "Advisory",  startTime: "07:45", endTime: "08:05", periodNumber: 0 },
    { name: "Period 1",  startTime: "08:10", endTime: "09:00", periodNumber: 1 },
    { name: "Period 2",  startTime: "09:05", endTime: "09:55", periodNumber: 2 },
    { name: "Period 3",  startTime: "10:00", endTime: "10:50", periodNumber: 3 },
    { name: "Period 4",  startTime: "10:55", endTime: "11:45", periodNumber: 4 },
    { name: "Lunch",     startTime: "11:45", endTime: "12:15", periodNumber: 5 },
    { name: "Period 5",  startTime: "12:20", endTime: "13:10", periodNumber: 5 },
    { name: "Period 6",  startTime: "13:15", endTime: "14:05", periodNumber: 6 },
    { name: "Period 7",  startTime: "14:10", endTime: "15:00", periodNumber: 7 },
    { name: "Community", startTime: "15:05", endTime: "15:45", periodNumber: 8 },
  ];

  const bellPeriods = await Promise.all(
    bellData.map((b) =>
      prisma.bellPeriod.create({
        data: { ...b, days: WEEKDAYS, schoolYear: "2024-2025" },
      })
    )
  );
  console.log("✓ Bell schedule (10 periods)");

  // ── 5. Admin User ────────────────────────────────────────────────────────
  const adminUser = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      name: "Alexandra Rivera",
      role: Role.ADMIN,
      hashedPassword: HASHED_PW,
    },
  });
  console.log("✓ Admin user");

  // ── 6. Teachers ──────────────────────────────────────────────────────────
  const teacherUsers: Awaited<ReturnType<typeof prisma.user.create>>[] = [];
  const teacherProfiles: Awaited<ReturnType<typeof prisma.teacher.create>>[] = [];

  for (const t of TEACHER_SEEDS) {
    const user = await prisma.user.create({
      data: { email: t.email, name: t.name, role: Role.TEACHER, hashedPassword: HASHED_PW },
    });
    const profile = await prisma.teacher.create({
      data: { userId: user.id, department: t.department },
    });
    teacherUsers.push(user);
    teacherProfiles.push(profile);
  }
  console.log(`✓ ${TEACHER_SEEDS.length} teachers`);

  // ── 7. Students (20) ─────────────────────────────────────────────────────
  const GRADE_LEVELS = [9, 9, 9, 9, 10, 10, 10, 10, 10, 11, 11, 11, 11, 11, 12, 12, 12, 12, 12, 12];
  const studentUsers: Awaited<ReturnType<typeof prisma.user.create>>[] = [];
  const studentProfiles: Awaited<ReturnType<typeof prisma.student.create>>[] = [];

  const fixedStudents = [
    { name: "Aiden Brooks",    email: "a.brooks@students.schoolyard.demo"   },
    { name: "Brianna Collins", email: "b.collins@students.schoolyard.demo"  },
    { name: "Carlos Mendez",   email: "c.mendez@students.schoolyard.demo"   },
    { name: "Diana Park",      email: "d.park@students.schoolyard.demo"     },
    { name: "Ethan Williams",  email: "e.williams@students.schoolyard.demo" },
    { name: "Fiona Grant",     email: "f.grant@students.schoolyard.demo"    },
    { name: "George Hassan",   email: "g.hassan@students.schoolyard.demo"   },
    { name: "Hannah Nguyen",   email: "h.nguyen@students.schoolyard.demo"   },
    { name: "Isaac Ortega",    email: "i.ortega@students.schoolyard.demo"   },
    { name: "Jasmine Wade",    email: "j.wade@students.schoolyard.demo"     },
    { name: "Kevin Zhao",      email: "k.zhao@students.schoolyard.demo"     },
    { name: "Lily Turner",     email: "l.turner@students.schoolyard.demo"   },
    { name: "Marcus Bell",     email: "m.bell@students.schoolyard.demo"     },
    { name: "Nadia Petrov",    email: "n.petrov@students.schoolyard.demo"   },
    { name: "Oscar Fleming",   email: "o.fleming@students.schoolyard.demo"  },
    { name: "Priya Singh",     email: "p.singh@students.schoolyard.demo"    },
    { name: "Quinn Lawson",    email: "q.lawson@students.schoolyard.demo"   },
    { name: "Rosa Moreno",     email: "r.moreno@students.schoolyard.demo"   },
    { name: "Samuel Hayes",    email: "s.hayes@students.schoolyard.demo"    },
    { name: "Tara Kim",        email: "t.kim@students.schoolyard.demo"      },
  ];

  for (let i = 0; i < fixedStudents.length; i++) {
    const s = fixedStudents[i];
    const gradeLevel = GRADE_LEVELS[i];
    const dob = new Date(
      2025 - gradeLevel - 14,
      faker.number.int({ min: 0, max: 11 }),
      faker.number.int({ min: 1, max: 28 })
    );
    const user = await prisma.user.create({
      data: { email: s.email, name: s.name, role: Role.STUDENT, hashedPassword: HASHED_PW },
    });
    const profile = await prisma.student.create({
      data: {
        userId: user.id,
        dateOfBirth: dob,
        gradeLevel,
        medicalAlerts:  faker.datatype.boolean(0.2) ? faker.helpers.arrayElement(["EpiPen required — nut allergy", "Asthma — inhaler on file", "Diabetic — nurse notified"]) : null,
        accommodations: faker.datatype.boolean(0.25) ? faker.helpers.arrayElement(["Extended time on tests (50%)", "Preferential seating", "Copies of teacher notes", "Reduced-distraction testing environment"]) : null,
      },
    });
    studentUsers.push(user);
    studentProfiles.push(profile);
  }
  console.log(`✓ ${fixedStudents.length} students`);

  // ── 8. Parents ───────────────────────────────────────────────────────────
  const parentUsers: Awaited<ReturnType<typeof prisma.user.create>>[] = [];
  const parentProfiles: Awaited<ReturnType<typeof prisma.parent.create>>[] = [];

  const parentSeeds = [
    { name: "Robert Brooks",    email: "r.brooks@parents.schoolyard.demo",    phone: "555-0101", children: [0] },
    { name: "Linda Collins",    email: "l.collins@parents.schoolyard.demo",   phone: "555-0102", children: [1] },
    { name: "Maria Mendez",     email: "ma.mendez@parents.schoolyard.demo",   phone: "555-0103", children: [2] },
    { name: "James Park",       email: "j.park@parents.schoolyard.demo",      phone: "555-0104", children: [3] },
    { name: "Susan Williams",   email: "s.williams@parents.schoolyard.demo",  phone: "555-0105", children: [4] },
    { name: "Patrick Grant",    email: "p.grant@parents.schoolyard.demo",     phone: "555-0106", children: [5] },
    { name: "Amira Hassan",     email: "am.hassan@parents.schoolyard.demo",   phone: "555-0107", children: [6] },
    { name: "Thu Nguyen",       email: "t.nguyen@parents.schoolyard.demo",    phone: "555-0108", children: [7] },
    { name: "Elena Ortega",     email: "el.ortega@parents.schoolyard.demo",   phone: "555-0109", children: [8] },
    { name: "Howard Wade",      email: "h.wade@parents.schoolyard.demo",      phone: "555-0110", children: [9] },
    { name: "Mei Zhao",         email: "m.zhao@parents.schoolyard.demo",      phone: "555-0111", children: [10] },
    { name: "Gary Turner",      email: "g.turner@parents.schoolyard.demo",    phone: "555-0112", children: [11] },
    { name: "Denise Bell",      email: "d.bell@parents.schoolyard.demo",      phone: "555-0113", children: [12] },
    // Parent with two children
    { name: "Victor Petrov",    email: "v.petrov@parents.schoolyard.demo",    phone: "555-0114", children: [13, 14] },
    { name: "Ananya Singh",     email: "an.singh@parents.schoolyard.demo",    phone: "555-0115", children: [15, 16] },
    { name: "Tom Moreno",       email: "to.moreno@parents.schoolyard.demo",   phone: "555-0116", children: [17] },
    { name: "Carol Hayes",      email: "c.hayes@parents.schoolyard.demo",     phone: "555-0117", children: [18, 19] },
  ];

  for (const p of parentSeeds) {
    const user = await prisma.user.create({
      data: { email: p.email, name: p.name, role: Role.PARENT, hashedPassword: HASHED_PW },
    });
    const profile = await prisma.parent.create({
      data: { userId: user.id, phone: p.phone },
    });
    parentUsers.push(user);
    parentProfiles.push(profile);

    for (const childIdx of p.children) {
      await prisma.parentStudent.create({
        data: { parentId: profile.id, studentId: studentProfiles[childIdx].id },
      });
    }
  }
  console.log(`✓ ${parentSeeds.length} parents linked to students`);

  // ── 8a. User Security Tokens, Push Subscriptions, and Sessions ───────────
  // Seed push subscriptions to verify configuration endpoints
  for (let i = 0; i < 5; i++) {
    const user = studentUsers[i];
    await prisma.pushSubscription.create({
      data: {
        userId: user.id,
        endpoint: `https://fcm.googleapis.com/fcm/send/${faker.string.alphanumeric(40)}`,
        p256dh: faker.string.alphanumeric(20),
        auth: faker.string.alphanumeric(16),
      },
    });
  }

  // Seed user registration/invite tokens
  for (let i = 0; i < 3; i++) {
    await prisma.userToken.create({
      data: {
        token: faker.string.uuid(),
        email: `candidate-${i}@schoolyard.demo`,
        role: Role.STUDENT,
        expires: daysFromNow(7),
      },
    });
  }

  // Seed NextAuth verification & active accounts
  await prisma.verificationToken.create({
    data: {
      identifier: ADMIN_EMAIL,
      token: faker.string.uuid(),
      expires: daysFromNow(1),
    },
  });

  await prisma.account.create({
    data: {
      userId: adminUser.id,
      type: "oauth",
      provider: "google",
      providerAccountId: "google-oauth2|109384029480",
    },
  });

  await prisma.session.create({
    data: {
      sessionToken: faker.string.alphanumeric(32),
      userId: adminUser.id,
      expires: daysFromNow(30),
    },
  });
  console.log("✓ Security subscriptions, sessions and access tokens created");

  // ── 9. Courses ───────────────────────────────────────────────────────────
  const courses: Awaited<ReturnType<typeof prisma.course.create>>[] = [];
  for (const c of COURSE_SEEDS) {
    courses.push(await prisma.course.create({ data: c }));
  }
  console.log(`✓ ${courses.length} courses`);

  // ── 10. Sections ─────────────────────────────────────────────────────────
  const sections: Awaited<ReturnType<typeof prisma.section.create>>[] = [];
  const SCHEDULES = [
    "Mon/Wed/Fri 08:10 AM",
    "Tue/Thu 09:05 AM",
    "Mon/Wed/Fri 10:00 AM",
    "Tue/Thu 10:55 AM",
    "Mon/Wed/Fri 12:20 PM",
    "Tue/Thu 13:15 PM",
    "Mon/Wed/Fri 14:10 PM",
  ];

  for (const course of courses) {
    const cfg = SECTION_MAP[course.code];
    if (!cfg) continue;
    const teacher = teacherProfiles[cfg.teacherIdx];
    const bellPeriod = bellPeriods[faker.number.int({ min: 1, max: 7 })];

    for (let s = 0; s < cfg.sections; s++) {
      sections.push(
        await prisma.section.create({
          data: {
            courseId:    course.id,
            teacherId:   teacher.id,
            termId:      termSpring.id,
            schedule:    SCHEDULES[(sections.length) % SCHEDULES.length],
            room:        ROOMS[sections.length % ROOMS.length],
            bellPeriodId: bellPeriod.id,
            weightingConfig: { HOMEWORK: 20, QUIZ: 30, TEST: 40, PROJECT: 10 },
          },
        })
      );
    }
  }
  console.log(`✓ ${sections.length} sections`);

  // ── 10a. LMS Course Syllabus Topics & Materials ───────────────────────────
  let totalTopics = 0;
  let totalMaterials = 0;

  for (const section of sections) {
    const topicTitles = [
      "Unit 1: Fundamentals and Key Concepts",
      "Unit 2: Applied Methodologies",
      "Unit 3: Comprehensive Review",
    ];

    for (let tIdx = 0; tIdx < topicTitles.length; tIdx++) {
      const topic = await prisma.topic.create({
        data: {
          sectionId: section.id,
          title: topicTitles[tIdx],
          description: `This unit covers core elements of ${topicTitles[tIdx].toLowerCase()} as outlined in the course syllabus.`,
          order: tIdx + 1,
        },
      });
      totalTopics++;

      await prisma.topicMaterial.createMany({
        data: [
          {
            topicId: topic.id,
            type: "LINK",
            title: "Study Guide Outline",
            url: "https://schoolyard.academy/resource/study-guide",
          },
          {
            topicId: topic.id,
            type: "FILE",
            title: "Lecture Slides PDF",
            url: "https://schoolyard.academy/resource/lecture-slides.pdf",
          },
        ],
      });
      totalMaterials += 2;
    }
  }
  console.log(`✓ ${totalTopics} LMS curriculum topics containing ${totalMaterials} materials`);

  // ── 11. Enrollments ──────────────────────────────────────────────────────
  const enrollments: Awaited<ReturnType<typeof prisma.enrollment.create>>[] = [];
  const enrollmentMap: Map<string, string> = new Map(); // `${studentId}:${sectionId}` → enrollmentId

  const studentSectionPicks: number[][] = [
    [0, 2, 4, 6, 8, 10],   // Aiden  — 9th grader
    [1, 3, 5, 7, 9, 11],   // Brianna
    [0, 3, 4, 7, 8, 12],   // Carlos
    [1, 2, 5, 6, 9, 13],   // Diana
    [0, 3, 5, 7, 10, 14],  // Ethan
    [1, 2, 4, 6, 11, 12],  // Fiona
    [0, 3, 5, 8, 10, 13],  // George
    [1, 2, 4, 7, 9, 14],   // Hannah
    [0, 3, 5, 6, 11, 12],  // Isaac
    [1, 2, 4, 8, 10, 13],  // Jasmine
    [0, 3, 5, 7, 9, 14],   // Kevin  — 11th grader
    [1, 2, 4, 6, 11, 13],  // Lily
    [0, 3, 5, 8, 10, 12],  // Marcus
    [1, 2, 4, 7, 9, 14],   // Nadia
    [0, 3, 5, 6, 11, 12],  // Oscar
    [1, 2, 4, 8, 10, 13],  // Priya  — 12th grader
    [0, 3, 5, 7, 9, 14],   // Quinn
    [1, 2, 4, 6, 11, 12],  // Rosa
    [0, 3, 5, 8, 10, 13],  // Samuel
    [1, 2, 4, 7, 9, 14],   // Tara
  ];

  for (let si = 0; si < studentProfiles.length; si++) {
    const student = studentProfiles[si];
    const picks = studentSectionPicks[si] || [0, 1, 2, 3, 4];

    for (const pickIdx of picks) {
      const section = sections[pickIdx];
      if (!section) continue;

      const enrollment = await prisma.enrollment.create({
        data: {
          studentId: student.id,
          sectionId: section.id,
          status: EnrollmentStatus.ENROLLED,
        },
      });
      enrollments.push(enrollment);
      enrollmentMap.set(`${student.id}:${section.id}`, enrollment.id);
    }
  }
  console.log(`✓ ${enrollments.length} student enrollments`);

  // ── 11a. Parent-reported Attendance Notifications ───────────────────────
  const mockNotifications: any[] = [];
  const parentProfilesWithChildren = await prisma.parent.findMany({ include: { children: true } });

  for (const parent of parentProfilesWithChildren) {
    if (parent.children.length === 0) continue;
    const child = parent.children[0];

    mockNotifications.push({
      parentId: parent.id,
      studentId: child.studentId,
      type: pickRandom([AttendanceNotificationType.SICK, AttendanceNotificationType.LATE, AttendanceNotificationType.EARLY_DISMISSAL]),
      date: daysAgo(faker.number.int({ min: 1, max: 10 })),
      expectedTime: "09:30 AM",
      reason: faker.helpers.arrayElement(["Dental check-up appointment", "Mild cold symptoms — resting at home", "Family morning event"]),
      status: AttendanceNotificationStatus.ACKNOWLEDGED,
      acknowledgedBy: adminUser.name,
      acknowledgedAt: daysAgo(1),
    });
  }

  await prisma.attendanceNotification.createMany({ data: mockNotifications });
  console.log(`✓ ${mockNotifications.length} parent-reported attendance notifications`);

  // ── 12. Assignments & Grades ─────────────────────────────────────────────
  let totalAssignments = 0;
  let totalGrades = 0;

  // Track scores for TermGrade and ReportCard generation later
  const studentCumulativeScores: Record<string, { totalEarned: number; totalMax: number }> = {};

  for (const section of sections) {
    const sectionEnrollments = enrollments.filter((e) => e.sectionId === section.id);
    if (sectionEnrollments.length === 0) continue;

    const numAssignments = faker.number.int({ min: 3, max: 6 });
    for (let a = 0; a < numAssignments; a++) {
      const type = pickRandom([AssignmentType.HOMEWORK, AssignmentType.QUIZ, AssignmentType.TEST, AssignmentType.PROJECT]);
      const maxScore = type === AssignmentType.TEST ? 100 : type === AssignmentType.QUIZ ? 50 : 20;
      const dueDate = daysAgo(faker.number.int({ min: 1, max: 40 }));

      const assignment = await prisma.assignment.create({
        data: {
          sectionId: section.id,
          title: `${type} ${a + 1}: ${faker.lorem.words(3)}`,
          description: faker.lorem.sentence(),
          type,
          status: AssignmentStatus.PUBLISHED,
          maxScore,
          dueDate,
          publishDate: daysAgo(faker.number.int({ min: 41, max: 60 })),
        },
      });
      totalAssignments++;

      const gradesToCreate = [];
      const submissionsToCreate = [];

      for (const enr of sectionEnrollments) {
        const isMissing = Math.random() < 0.05; // 5% chance missing
        const score = isMissing ? 0 : realisticScore(maxScore);

        // Keep track of total earned points to compute mock GPA averages
        if (!studentCumulativeScores[enr.studentId]) {
          studentCumulativeScores[enr.studentId] = { totalEarned: 0, totalMax: 0 };
        }
        studentCumulativeScores[enr.studentId].totalEarned += score;
        studentCumulativeScores[enr.studentId].totalMax += maxScore;

        gradesToCreate.push({
          assignmentId: assignment.id,
          studentId: enr.studentId,
          score,
        });

        if (!isMissing) {
          submissionsToCreate.push({
            assignmentId: assignment.id,
            studentId: enr.studentId,
            status: "GRADED",
            submittedAt: daysAgo(faker.number.int({ min: 1, max: 40 })),
          });
        }
      }

      await prisma.grade.createMany({ data: gradesToCreate });
      await prisma.submissionRecord.createMany({ data: submissionsToCreate });
      totalGrades += gradesToCreate.length;
    }
  }
  console.log(`✓ ${totalAssignments} assignments with ${totalGrades} grades`);

  // ── 12a. Term Grades & Report Cards ───────────────────────────────────────
  let termGradeCount = 0;
  let reportCardCount = 0;

  for (const enr of enrollments) {
    const studentScoreInfo = studentCumulativeScores[enr.studentId];
    const scorePct = studentScoreInfo ? (studentScoreInfo.totalEarned / studentScoreInfo.totalMax) * 100 : 85.0;
    
    let letterGrade = "B";
    if (scorePct >= 90) letterGrade = "A";
    else if (scorePct >= 80) letterGrade = "B";
    else if (scorePct >= 70) letterGrade = "C";
    else if (scorePct >= 60) letterGrade = "D";
    else letterGrade = "F";

    await prisma.termGrade.create({
      data: {
        enrollmentId: enr.id,
        termId: termSpring.id,
        calculatedScore: Math.round(scorePct * 10) / 10,
        overrideScore: Math.round(scorePct * 10) / 10,
        letterGrade,
        comments: faker.helpers.arrayElement([
          "Shows consistent work ethic and great focus during discussions.",
          "Demonstrates strong mastery of mathematical fundamentals.",
          "Contributes productively to group projects. Excellent peer supporter.",
          "Consistent analytical skills shown in writing assessments.",
        ]),
        isPosted: true,
        postedAt: NOW,
      },
    });
    termGradeCount++;
  }

  // Generate Spring ReportCards
  for (const student of studentProfiles) {
    const studentScoreInfo = studentCumulativeScores[student.id];
    const scorePct = studentScoreInfo ? (studentScoreInfo.totalEarned / studentScoreInfo.totalMax) * 100 : 85.0;
    const gpa = scorePct >= 90 ? 4.0 : scorePct >= 80 ? 3.0 : scorePct >= 70 ? 2.0 : 1.0;

    await prisma.reportCard.create({
      data: {
        studentId: student.id,
        termId: termSpring.id,
        snapshot: {
          calculatedGPA: gpa,
          attendanceRate: "96.4%",
          conduct: "Satisfactory",
          academicYear: "2024-2025",
        },
        isPublished: true,
        publishedAt: NOW,
      },
    });
    reportCardCount++;
  }
  console.log(`✓ ${termGradeCount} term grades and ${reportCardCount} student report cards finalized`);

  // ── 13. Attendance ───────────────────────────────────────────────────────
  const attendanceRecords = [];
  const pastDays = schoolDaysBetween(daysAgo(14), new Date(NOW));

  for (const day of pastDays) {
    for (const enr of enrollments) {
      const status = weightedAttendanceStatus();
      let checkInTime = null;
      let checkOutTime = null;
      let excusedReason = null;

      if (status === AttendanceStatus.PRESENT) {
        checkInTime = "08:05 AM";
        checkOutTime = "02:55 PM";
      } else if (status === AttendanceStatus.TARDY) {
        checkInTime = "08:22 AM";
        checkOutTime = "02:55 PM";
      } else if (status === AttendanceStatus.EXCUSED) {
        excusedReason = "Parent-reported sick day";
      }

      attendanceRecords.push({
        studentId: enr.studentId,
        sectionId: enr.sectionId,
        date: day,
        status,
        checkInTime,
        checkOutTime,
        excusedReason,
        notifiedParent: status === AttendanceStatus.ABSENT,
      });
    }
  }

  // Create in chunks to avoid overwhelming the db if the array gets too large
  const chunkSize = 1000;
  for (let i = 0; i < attendanceRecords.length; i += chunkSize) {
    await prisma.attendance.createMany({
      data: attendanceRecords.slice(i, i + chunkSize),
    });
  }
  console.log(`✓ ${attendanceRecords.length} attendance records over 14 days`);

  // ── 13a. Course Syllabus Documents ───────────────────────────────────────
  let totalDocs = 0;
  for (const section of sections) {
    await prisma.document.create({
      data: {
        title: "Course Syllabus Spring.pdf",
        fileUrl: "https://schoolyard.academy/resource/syllabus-spring.pdf",
        type: DocumentType.GENERAL,
        uploaderId: teacherUsers[0].id,
        sectionId: section.id,
      },
    });
    totalDocs++;
  }

  // Student specific transcripts & medical releases
  for (const student of studentProfiles) {
    await prisma.document.create({
      data: {
        title: "Medical Clearance Authorization Form.pdf",
        fileUrl: "https://schoolyard.academy/resource/medical-auth.pdf",
        type: DocumentType.MEDICAL,
        uploaderId: adminUser.id,
        studentId: student.id,
      },
    });
    await prisma.document.create({
      data: {
        title: "Cumulative Academic Transcript.pdf",
        fileUrl: "https://schoolyard.academy/resource/academic-transcript.pdf",
        type: DocumentType.TRANSCRIPT,
        uploaderId: adminUser.id,
        studentId: student.id,
      },
    });
    totalDocs += 2;
  }
  console.log(`✓ ${totalDocs} general, medical, and academic transcript documents`);

  // ── 14. Incidents & Incident Comments (Discipline) ───────────────────────
  const severities = Object.values(IncidentSeverity);
  const categories = Object.values(IncidentCategory);

  for (let i = 0; i < 8; i++) {
    const student = pickRandom(studentProfiles);
    const reporter = pickRandom(teacherUsers);

    const incident = await prisma.incident.create({
      data: {
        studentId: student.id,
        reporterId: reporter.id,
        title: faker.helpers.arrayElement(["Class Disruption", "Academic Dishonesty", "Tardiness Concern"]),
        description: faker.lorem.paragraph(),
        date: daysAgo(faker.number.int({ min: 1, max: 30 })),
        status: IncidentStatus.OPEN,
        severity: pickRandom(severities as IncidentSeverity[]),
        category: pickRandom(categories as IncidentCategory[]),
        actionTaken: "Scheduled parent conference to outline corrective focus points.",
        followUpDate: daysFromNow(5),
      },
    });

    // Seed conversation comments on the logged incident report
    await prisma.incidentComment.createMany({
      data: [
        {
          incidentId: incident.id,
          authorId: adminUser.id,
          body: "Reviewed the report. Let me know if we need parent-teacher conference coordination support.",
        },
        {
          incidentId: incident.id,
          authorId: reporter.id,
          body: "Spoke with the student regarding the expectations during tests. They promised to maintain focus.",
        }
      ],
    });
  }
  console.log(`✓ 8 discipline incidents annotated with 16 administrative comments`);

  // ── 14a. Communications (Messages, Broadcasts, & Deliveries) ──────────────
  // Direct Parent-Teacher correspondence
  const parentProfileToMessage = parentProfiles[0];
  const teacherUserToMessage = teacherUsers[0];
  
  const welcomeMessage = await prisma.message.create({
    data: {
      senderId: teacherUserToMessage.id,
      receiverId: parentProfileToMessage.userId,
      subject: "Welcome to the school semester!",
      body: "Hello! I am excited to have your child in class this semester. Let me know if you ever have any questions.",
      read: true,
      status: "DELIVERED",
    },
  });

  // Thread reply
  await prisma.message.create({
    data: {
      senderId: parentProfileToMessage.userId,
      receiverId: teacherUserToMessage.id,
      subject: "Re: Welcome to the school semester!",
      body: "Thank you, teacher! Looking forward to a great school semester as well.",
      read: false,
      status: "SENT",
      parentId: welcomeMessage.id,
    },
  });

  // Outbound notification broadcasts
  const broadcast = await prisma.broadcast.create({
    data: {
      subject: "Emergency Weather Closure Notification",
      body: "Please take notice that school campus facilities will remain closed tomorrow due to incoming snow weather conditions.",
      audience: "ALL_PARENTS",
      senderId: adminUser.id,
    },
  });

  const broadcastDeliveries = [];
  for (const parent of parentProfiles) {
    broadcastDeliveries.push({
      broadcastId: broadcast.id,
      recipientId: parent.userId,
      channel: "email",
      status: "DELIVERED",
    });
  }
  await prisma.broadcastDelivery.createMany({ data: broadcastDeliveries });
  console.log(`✓ Direct messaging threads & ${broadcastDeliveries.length} broadcast system deliveries`);

  function allDaysBetween(start: Date, end: Date): Date[] {
    const days: Date[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      days.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }

  // ── 15. Calendar Days (Schedules) ────────────────────────────────────────
  console.log("🌱 Generating calendar days for the entire school year...");
  const schoolYearDays = allDaysBetween(new Date("2024-08-26"), new Date("2025-06-13"));
  let toggleBlock = true;

  const calendarDaysData = [];
  for (const date of schoolYearDays) {
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const dayType = isWeekend ? DayType.OTHER : DayType.INSTRUCTIONAL;
    const blockDay = isWeekend ? BlockDay.NONE : (toggleBlock ? BlockDay.A : BlockDay.B);
    if (!isWeekend) toggleBlock = !toggleBlock;

    // Find termId
    let termId = null;
    if (date >= new Date("2024-08-26") && date <= new Date("2025-01-17")) {
      termId = termFall.id;
    } else if (date >= new Date("2025-01-21") && date <= new Date("2025-06-13")) {
      termId = termSpring.id;
    }

    calendarDaysData.push({
      date,
      type: dayType,
      blockDay,
      hasCommunityPeriod: !isWeekend, // Community periods on school days
      termId,
    });
  }

  await prisma.calendarDay.createMany({ data: calendarDaysData });
  console.log(`✓ ${calendarDaysData.length} calendar days created`);

  // Retrieve the generated calendar days to get their IDs
  const allDbDays = await prisma.calendarDay.findMany({
    orderBy: { date: "asc" }
  });

  // ── 16. Community Periods (Sessions & Enrollments) ───────────────────────
  let totalCommunitySessions = 0;
  let totalCommunityEnrollments = 0;

  // Seed community sessions for a 60-day window around NOW (from 30 days ago to 30 days from now)
  const windowStart = daysAgo(30);
  const windowEnd = daysFromNow(30);
  const communityDays = allDbDays.filter(d => d.type === DayType.INSTRUCTIONAL && d.date >= windowStart && d.date <= windowEnd);

  for (const cDay of communityDays) {
    const sessionsToCreate = faker.number.int({ min: 1, max: 2 });
    
    for (let i = 0; i < sessionsToCreate; i++) {
      const teacher = pickRandom(teacherProfiles);
      
      const session = await prisma.communitySession.create({
        data: {
          calendarDayId: cDay.id,
          teacherId: teacher.id,
          title: pickRandom(["Study Hall", "Math Tutoring", "Open Gym", "Science Lab Prep"]),
          capacity: 15,
          room: ROOMS[faker.number.int({ min: 0, max: ROOMS.length - 1 })],
        },
      });
      totalCommunitySessions++;

      const enrolledStudents = faker.helpers.arrayElements(studentProfiles, faker.number.int({ min: 3, max: 8 }));
      
      for (const student of enrolledStudents) {
        await prisma.communityEnrollment.create({
          data: {
            sessionId: session.id,
            studentId: student.id,
            isRequired: Math.random() < 0.2, // 20% forced registration
            attendance: pickRandom([
              CommunityAttendanceStatus.PRESENT,
              CommunityAttendanceStatus.PRESENT,
              CommunityAttendanceStatus.ABSENT,
              CommunityAttendanceStatus.EXCUSED
            ]),
          },
        });
        totalCommunityEnrollments++;
      }
    }
  }
  console.log(`✓ ${totalCommunitySessions} community sessions with ${totalCommunityEnrollments} enrollments`);

  // ── 17. Announcements ────────────────────────────────────────────────────
  const generalSectionId = sections[0].id;
  const scienceSectionId = sections.find((s) => s.teacherId === teacherProfiles[1].id)?.id || sections[0].id;

  await prisma.announcement.createMany({
    data: [
      {
        sectionId: generalSectionId,
        content: "**Welcome to the Spring Semester!**\n\nWe are incredibly excited to welcome everyone back to campus for the new semester. Please review your schedules in the portal.",
        authorId: adminUser.id,
        createdAt: daysAgo(45),
      },
      {
        sectionId: generalSectionId,
        content: "**Upcoming Parent-Teacher Conferences**\n\nPlease make sure to schedule your slots for next week's conferences via the community portal. Spaces are filling up quickly.",
        authorId: adminUser.id,
        createdAt: daysAgo(5),
      },
      {
        sectionId: scienceSectionId,
        content: "**Science Fair Registration Extended**\n\nGood news! The deadline to submit your project proposals for the Spring Science Fair has been extended by one week.",
        authorId: teacherUsers[1].id, // David Okafor (Science)
        createdAt: daysAgo(2),
      }
    ],
  });
  console.log("✓ Announcements posted");

  // ── 18. Audit Logs (Compliance & Tracking) ────────────────────────────────
  const auditLogsToCreate = [
    {
      actorId: adminUser.id,
      action: "UPDATE_SCHOOL_SETTINGS",
      targetModel: "SchoolSettings",
      targetId: "singleton",
      current: { activeTerm: "Spring 2025" },
    },
    {
      actorId: teacherUsers[0].id,
      action: "UPDATE_GRADES",
      targetModel: "Grade",
      targetId: "cuid-example-grade",
      current: { score: 95.0 },
    },
    {
      actorId: adminUser.id,
      action: "RESOLVED_INCIDENT",
      targetModel: "Incident",
      targetId: "cuid-example-incident",
      current: { status: "RESOLVED" },
    }
  ];
  await prisma.auditLog.createMany({ data: auditLogsToCreate });
  console.log(`✓ ${auditLogsToCreate.length} active administrative audit logs recorded`);

  // ── 19. Seed Archive Logic Data (Archived Year, Course, Section, Student & CompressedArchives) ──
  console.log("🌱 Seeding archived history data for verification...");
  
  // 19.1 Archived School Year
  const archivedSchoolYear = await prisma.schoolYear.create({
    data: {
      name: "2023-2024",
      startDate: new Date("2023-08-28"),
      endDate:   new Date("2024-06-14"),
      isActive: false,
    },
  });

  const archivedTermSpring = await prisma.term.create({
    data: {
      schoolYearId: archivedSchoolYear.id,
      name: "Spring 2024",
      type: TermType.SEMESTER,
      startDate: new Date("2024-01-22"),
      endDate:   new Date("2024-06-14"),
    },
  });

  // 19.2 Archived Course
  const archivedCourse = await prisma.course.create({
    data: {
      code: "AP-ART-2023",
      name: "AP Art History (2023)",
      description: "A historical survey of art and architecture from ancient times to the modern era.",
      credits: 1.0,
      isArchived: true,
    },
  });

  // 19.3 Archived Section
  const archivedSection = await prisma.section.create({
    data: {
      id: "archived-sec-id-1",
      courseId:    archivedCourse.id,
      teacherId:   teacherProfiles[0].id, // Margaret Chen
      termId:      archivedTermSpring.id,
      schedule:    "Mon/Wed/Fri 09:05 AM",
      room:        "103",
      isArchived:  true,
    },
  });

  // 19.4 Graduated/Archived Student
  const archivedStudentUser = await prisma.user.create({
    data: {
      email: "graduated.student@students.schoolyard.demo",
      name: "Jane Smith (Graduated)",
      role: Role.STUDENT,
      hashedPassword: HASHED_PW,
      deletedAt: new Date("2024-06-15"),
    },
  });

  const archivedStudentProfile = await prisma.student.create({
    data: {
      id: "archived-student-id-1",
      userId: archivedStudentUser.id,
      dateOfBirth: new Date("2006-05-15"),
      gradeLevel: 12,
      medicalAlerts: encrypt("Nut allergy — EpiPen in main office"),
      accommodations: encrypt("Extended testing time (50%)"),
      isArchived: true,
    },
  });

  // 19.5 Compress & Save Section Archive
  const sectionPayload = {
    sectionId: archivedSection.id,
    course: {
      id: archivedCourse.id,
      name: archivedCourse.name,
      code: archivedCourse.code,
      credits: archivedCourse.credits,
      description: archivedCourse.description,
    },
    teacherId: archivedSection.teacherId,
    schedule: archivedSection.schedule,
    room: archivedSection.room,
    isArchived: true,
    assignments: [
      {
        id: "archived-assign-id-1",
        title: "AP Art History Essay 1",
        description: "Comparative analysis of Renaissance and Baroque masters",
        maxScore: 100,
        type: AssignmentType.PROJECT,
        allowUpload: true,
        dueDate: new Date("2024-03-15"),
        status: AssignmentStatus.PUBLISHED,
        grades: [
          { studentId: archivedStudentProfile.id, score: 95.0, feedback: "Superb depth of insight!" }
        ],
        submissions: [
          { studentId: archivedStudentProfile.id, status: "GRADED", submittedAt: new Date("2024-03-14") }
        ]
      },
      {
        id: "archived-assign-id-2",
        title: "Unit 3 Midterm Examination",
        description: "Visual analysis of classical Greek structures",
        maxScore: 100,
        type: AssignmentType.TEST,
        allowUpload: false,
        dueDate: new Date("2024-03-22"),
        status: AssignmentStatus.PUBLISHED,
        grades: [
          { studentId: archivedStudentProfile.id, score: 88.0, feedback: "Strong analysis of proportions." }
        ],
        submissions: []
      }
    ],
    attendance: [
      { studentId: archivedStudentProfile.id, date: new Date("2024-03-10"), status: AttendanceStatus.PRESENT, notes: "On time" },
      { studentId: archivedStudentProfile.id, date: new Date("2024-03-12"), status: AttendanceStatus.PRESENT, notes: "" }
    ],
    enrollments: [
      {
        id: "archived-enr-id-1",
        studentId: archivedStudentProfile.id,
        status: EnrollmentStatus.COMPLETED,
        termGrades: [
          {
            termId: archivedTermSpring.id,
            calculatedScore: 91.5,
            overrideScore: 91.5,
            letterGrade: "A",
            isPosted: true,
            postedAt: new Date("2024-06-10")
          }
        ]
      }
    ],
    topics: [
      { id: "topic-archived-1", title: "Renaissance Art", description: "Study of Italian and Northern Renaissance masters" }
    ],
    announcements: [
      { id: "ann-archived-1", authorId: teacherUsers[0].id, content: "Don't forget to submit your term essay", createdAt: new Date("2024-03-01") }
    ]
  };

  const sectionCompressed = zlib.gzipSync(Buffer.from(JSON.stringify(sectionPayload))).toString("base64");

  await prisma.compressedArchive.create({
    data: {
      id: `section-archive-${archivedSection.id}`,
      entityType: "SECTION",
      entityId: archivedSection.id,
      data: sectionCompressed,
    },
  });

  // 19.6 Compress & Save Student Archive
  const studentPayload = {
    studentId: archivedStudentProfile.id,
    gradeLevel: archivedStudentProfile.gradeLevel,
    dateOfBirth: archivedStudentProfile.dateOfBirth,
    medicalAlerts: archivedStudentProfile.medicalAlerts,
    accommodations: archivedStudentProfile.accommodations,
    user: {
      id: archivedStudentUser.id,
      name: archivedStudentUser.name,
      email: archivedStudentUser.email,
      role: Role.STUDENT,
    },
    attendance: [
      { sectionId: archivedSection.id, date: new Date("2024-03-10"), status: AttendanceStatus.PRESENT, notes: "On time" }
    ],
    grades: [
      { assignmentId: "archived-assign-id-1", score: 95.0, feedback: "Superb depth of insight!" }
    ],
    reportCards: [
      {
        id: "archived-rc-id-1",
        termId: archivedTermSpring.id,
        publishedAt: new Date("2024-06-10"),
        isPublished: true,
        snapshot: {
          calculatedGPA: 3.8,
          attendanceRate: "98.5%",
          conduct: "Excellent",
          academicYear: "2023-2024"
        }
      }
    ],
    enrollments: [
      {
        sectionId: archivedSection.id,
        courseName: archivedCourse.name,
        courseCode: archivedCourse.code,
        status: EnrollmentStatus.COMPLETED,
        termGrades: [
          {
            termId: archivedTermSpring.id,
            calculatedScore: 91.5,
            overrideScore: 91.5,
            letterGrade: "A",
            isPosted: true,
            postedAt: new Date("2024-06-10")
          }
        ]
      }
    ]
  };

  const studentCompressed = zlib.gzipSync(Buffer.from(JSON.stringify(studentPayload))).toString("base64");

  await prisma.compressedArchive.create({
    data: {
      id: `student-archive-${archivedStudentProfile.id}`,
      entityType: "STUDENT",
      entityId: archivedStudentProfile.id,
      data: studentCompressed,
    },
  });

  console.log("✓ Archived history records seeded successfully");

  console.log("\n✅ Seeding complete! Database is ready for demo.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
