import { db } from "@/lib/db"

export async function resolveAudienceRecipients(audience: string) {
  const recipients: { id: string, email: string }[] = []

  if (audience === "PARENTS") {
    const parents = await db.user.findMany({ where: { role: "PARENT" }, select: { id: true, email: true } })
    for (const p of parents) {
      if (p.email) recipients.push({ id: p.id, email: p.email })
    }
  } else if (audience === "STUDENTS") {
    const students = await db.user.findMany({ where: { role: "STUDENT" }, select: { id: true, email: true } })
    for (const s of students) {
      if (s.email) recipients.push({ id: s.id, email: s.email })
    }
  } else if (audience === "STAFF") {
    const staff = await db.user.findMany({ where: { role: { in: ["TEACHER", "ADMIN"] } }, select: { id: true, email: true } })
    for (const s of staff) {
      if (s.email) recipients.push({ id: s.id, email: s.email })
    }
  } else if (audience.startsWith("SECTION_STUDENTS_")) {
    const sectionId = audience.replace("SECTION_STUDENTS_", "")
    const enrollments = await db.enrollment.findMany({
      where: { sectionId, status: "ENROLLED" },
      include: { student: { include: { user: true } } }
    })
    for (const e of enrollments) {
      if (e.student.user.email) recipients.push({ id: e.student.user.id, email: e.student.user.email })
    }
  } else if (audience.startsWith("SECTION_PARENTS_")) {
    const sectionId = audience.replace("SECTION_PARENTS_", "")
    const enrollments = await db.enrollment.findMany({
      where: { sectionId, status: "ENROLLED" },
      select: { studentId: true }
    })
    const studentIds = enrollments.map(e => e.studentId)
    const parentStudents = await db.parentStudent.findMany({
      where: { studentId: { in: studentIds } },
      include: { parent: { include: { user: true } } }
    })
    for (const ps of parentStudents) {
      if (ps.parent.user.email) recipients.push({ id: ps.parent.user.id, email: ps.parent.user.email })
    }
  }

  return recipients
}
