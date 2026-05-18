import { db } from "@/lib/db"

export async function resolveAudienceRecipients(audience: string) {
  let recipients: { id: string, email: string }[] = []

  if (audience === "PARENTS") {
    const parents = await db.user.findMany({ where: { role: "PARENT" }, select: { id: true, email: true } })
    recipients = parents.map(p => ({ id: p.id, email: p.email! })).filter(r => r.email)
  } else if (audience === "STUDENTS") {
    const students = await db.user.findMany({ where: { role: "STUDENT" }, select: { id: true, email: true } })
    recipients = students.map(s => ({ id: s.id, email: s.email! })).filter(r => r.email)
  } else if (audience === "STAFF") {
    const staff = await db.user.findMany({ where: { role: { in: ["TEACHER", "ADMIN"] } }, select: { id: true, email: true } })
    recipients = staff.map(s => ({ id: s.id, email: s.email! })).filter(r => r.email)
  } else if (audience.startsWith("SECTION_STUDENTS_")) {
    const sectionId = audience.replace("SECTION_STUDENTS_", "")
    const enrollments = await db.enrollment.findMany({
      where: { sectionId, status: "ENROLLED" },
      include: { student: { include: { user: true } } }
    })
    recipients = enrollments.map(e => ({ id: e.student.user.id, email: e.student.user.email! })).filter(r => r.email)
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
    recipients = parentStudents.map(ps => ({ id: ps.parent.user.id, email: ps.parent.user.email! })).filter(r => r.email)
  }

  return recipients
}
