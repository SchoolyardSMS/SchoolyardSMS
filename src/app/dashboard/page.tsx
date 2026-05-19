import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import Link from "next/link"

export const metadata = {
  title: "Dashboard | Schoolyard",
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")

  const role = session.user.role

  // Ensure Parent record exists if role is PARENT
  let parentRecord: any = null
  if (role === "PARENT") {
    parentRecord = await db.parent.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id },
      update: {},
      include: {
        children: {
          include: {
            student: {
              include: {
                user: true,
                enrollments: { include: { section: { include: { course: true } } } },
                grades: true,
                attendance: true
              }
            }
          }
        }
      }
    })
  }

  // Fetch role-specific stats
  let stats: { label: string; value: string | number; href?: string; color: string }[] = []

  if (role === "ADMIN") {
    const [students, teachers, courses, incidents] = await Promise.all([
      db.student.count(),
      db.teacher.count(),
      db.course.count(),
      db.incident.count({ where: { status: "OPEN" } }),
    ])
    stats = [
      { label: "Total Students", value: students, href: undefined, color: "indigo" },
      { label: "Total Teachers", value: teachers, href: undefined, color: "blue" },
      { label: "Active Courses", value: courses, href: "/dashboard/academics/courses", color: "emerald" },
      { label: "Open Incidents", value: incidents, href: "/dashboard/discipline", color: incidents > 0 ? "red" : "slate" },
    ]
  } else if (role === "TEACHER") {
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id },
      include: {
        sections: {
          include: {
            _count: { select: { enrollments: true, assignments: true } }
          }
        }
      }
    })
    const sectionCount = teacher?.sections.length ?? 0
    const studentCount = teacher?.sections.reduce((s, sec) => s + sec._count.enrollments, 0) ?? 0
    const assignmentCount = teacher?.sections.reduce((s, sec) => s + sec._count.assignments, 0) ?? 0
    stats = [
      { label: "My Sections", value: sectionCount, href: "/dashboard/academics/courses", color: "indigo" },
      { label: "My Students", value: studentCount, href: undefined, color: "blue" },
      { label: "Assignments Posted", value: assignmentCount, href: undefined, color: "emerald" },
    ]
  } else if (role === "STUDENT") {
    const student = await db.student.findUnique({
      where: { userId: session.user.id },
      include: {
        enrollments: {
          include: { section: { include: { course: true } } }
        },
        attendance: true,
        grades: true,
      }
    })
    const enrolledCount = student?.enrollments.length ?? 0
    const totalGrades = student?.grades ?? []
    const gpa = totalGrades.length > 0
      ? (totalGrades.reduce((s, g) => s + g.score, 0) / totalGrades.length).toFixed(1)
      : "N/A"
    const presentCount = student?.attendance.filter(a => a.status === "PRESENT").length ?? 0
    const totalAttendance = student?.attendance.length ?? 0
    const attendancePct = totalAttendance > 0
      ? `${Math.round((presentCount / totalAttendance) * 100)}%`
      : "N/A"
    stats = [
      { label: "Enrolled Courses", value: enrolledCount, href: "/dashboard/academics/courses", color: "indigo" },
      { label: "Grade Average", value: gpa, href: undefined, color: "blue" },
      { label: "Attendance Rate", value: attendancePct, href: "/dashboard/attendance", color: "emerald" },
    ]
  } else if (role === "PARENT" && parentRecord) {
    const childCount = parentRecord.children?.length || 0
    const totalEnrollments = parentRecord.children?.reduce((s: number, st: any) => s + st.student.enrollments.length, 0) || 0
    stats = [
      { label: "My Students", value: childCount, href: undefined, color: "indigo" },
      { label: "Tracked Courses", value: totalEnrollments, href: undefined, color: "blue" },
    ]
  }

  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800",
    blue:   "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
    emerald:"bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800",
    red:    "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
    slate:  "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-700",
  }

  return (
    <div className="p-4 sm:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {role === "STUDENT" ? "My Dashboard" : role === "PARENT" ? "Parent Portal" : role === "TEACHER" ? "Teacher Portal" : "Admin Overview"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, <span className="font-semibold text-foreground">{session.user.name}</span>
          </p>
        </div>
        {role === "ADMIN" && (
          <Link href="/dashboard/settings" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent transition-colors shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            School Settings
          </Link>
        )}
      </div>

      {/* Stat Cards */}
      {stats.length > 0 && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(stats.length, 4)} gap-4`}>
          {stats.map(stat => {
            const cardClass = `rounded-xl border p-6 ${colorMap[stat.color]} transition-shadow hover:shadow-md`
            return stat.href ? (
              <Link key={stat.label} href={stat.href} className={cardClass}>
                <p className="text-sm font-medium opacity-80">{stat.label}</p>
                <p className="text-4xl font-bold mt-2">{stat.value}</p>
              </Link>
            ) : (
              <div key={stat.label} className={cardClass}>
                <p className="text-sm font-medium opacity-80">{stat.label}</p>
                <p className="text-4xl font-bold mt-2">{stat.value}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Parent Portal Children Overview */}
      {role === "PARENT" && parentRecord && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">My Children</h2>
          {parentRecord.children.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center text-muted-foreground bg-slate-50/50 dark:bg-slate-900/50">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mx-auto w-12 h-12 mb-3 opacity-20">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
              <p className="font-semibold text-lg text-slate-700 dark:text-slate-300">No students linked yet</p>
              <p className="text-sm mt-1 max-w-sm mx-auto">Please contact the school administration office to securely link your child's profile to this account.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {parentRecord.children.map((child: any) => {
                const student = child.student
                const totalGrades = student.grades ?? []
                const gpa = totalGrades.length > 0 ? (totalGrades.reduce((s: number, g: any) => s + g.score, 0) / totalGrades.length).toFixed(1) : "N/A"
                const presentCount = student.attendance?.filter((a: any) => a.status === "PRESENT").length ?? 0
                const totalAtt = student.attendance?.length ?? 0
                const attPct = totalAtt > 0 ? Math.round((presentCount / totalAtt) * 100) + "%" : "N/A"

                return (
                  <div key={student.id} className="relative rounded-xl border bg-card p-6 shadow-sm overflow-hidden flex flex-col">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-lg shrink-0">
                        {student.user.name.charAt(0)}
                      </div>
                      <div>
                        <Link href={`/dashboard/directory/${student.id}`} className="hover:text-indigo-600 transition-colors">
                          <h3 className="font-bold text-lg leading-tight">{student.user.name}</h3>
                        </Link>
                        <p className="text-sm text-muted-foreground">Grade {student.gradeLevel}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mb-4 bg-muted/50 rounded-lg p-3">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-semibold">Average</p>
                        <p className="font-bold">{gpa}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-semibold">Attendance</p>
                        <p className="font-bold">{attPct}</p>
                      </div>
                    </div>

                    <div className="mt-auto pt-2 border-t">
                      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Current Classes</p>
                      <div className="space-y-1">
                        {student.enrollments.slice(0, 3).map((enr: any) => (
                           <div key={enr.id} className="flex items-center justify-between text-sm">
                             <span className="truncate pr-2">{enr.section.course.name}</span>
                             <span className="font-medium">{enr.status === "ENROLLED" ? "Active" : enr.status}</span>
                           </div>
                        ))}
                        {student.enrollments.length > 3 && (
                          <p className="text-xs text-muted-foreground pt-1 italic">+ {student.enrollments.length - 3} more</p>
                        )}
                        {student.enrollments.length === 0 && (
                          <p className="text-xs text-muted-foreground italic">No classes scheduled.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {role === "ADMIN" && (
            <Link href="/dashboard/admin/success" className="flex flex-col items-center gap-2 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/10 p-4 text-sm font-bold text-rose-700 dark:text-rose-400 text-center hover:bg-rose-100 dark:hover:bg-rose-900/30 hover:shadow-sm transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Command Center
            </Link>
          )}
          <Link href="/dashboard/academics/assignments" className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 text-sm font-medium text-center hover:bg-accent hover:shadow-sm transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-indigo-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 3h.008v.008H12V18Zm-3-6h.008v.008H9v-.008ZM9 15h.008v.008H9V15Zm0 3h.008v.008H9V18Zm6-6h.008v.008H15v-.008ZM15 15h.008v.008H15V15Zm0 3h.008v.008H15V18Z" />
            </svg>
            Assignments
          </Link>
          {role !== "PARENT" && (
            <Link href="/dashboard/academics/courses" className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 text-sm font-medium text-center hover:bg-accent hover:shadow-sm transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-blue-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
              {role === "STUDENT" ? "My Courses" : "Academics"}
            </Link>
          )}
          <Link href="/dashboard/attendance" className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 text-sm font-medium text-center hover:bg-accent hover:shadow-sm transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-emerald-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            Attendance
          </Link>
          <Link href="/dashboard/messages" className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 text-sm font-medium text-center hover:bg-accent hover:shadow-sm transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-orange-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
            Messages
          </Link>
          <Link href="/dashboard/discipline" className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 text-sm font-medium text-center hover:bg-accent hover:shadow-sm transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-red-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            Discipline
          </Link>
          <Link href="/dashboard/academics/reports" className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 text-sm font-medium text-center hover:bg-accent hover:shadow-sm transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-slate-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            Reports
          </Link>
        </div>
      </div>
    </div>
  )
}
