import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { TeacherCommunityView } from "@/components/community/teacher-view"
import { StudentCommunityView } from "@/components/community/student-view"
import Link from "next/link"

export const metadata = {
  title: "Community Period | Schoolyard",
}

export default async function CommunityPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")
  
  // Get upcoming community period dates
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const upcomingCommunityDays = await db.calendarDay.findMany({
    where: {
      hasCommunityPeriod: true,
      date: { gte: today }
    },
    orderBy: { date: "asc" },
    take: 5
  })

  const isAdmin = session.user.role === "ADMIN"

  if (isAdmin) {
    const allSessions = await db.communitySession.findMany({
      include: {
        calendarDay: true,
        teacher: { include: { user: true } },
        enrollments: {
          include: { student: { include: { user: true } } }
        }
      },
      orderBy: { calendarDay: { date: "asc" } }
    })

    return (
      <div className="space-y-4">
        <div className="max-w-7xl mx-auto px-6 pt-6 flex justify-between items-center">
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2 text-amber-800 dark:text-amber-300 text-xs font-medium">
            Admin Mode: Overseeing all sessions
          </div>
          <Link href="/dashboard/community/reports" className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">
            Missing Students Report
          </Link>
        </div>
        <TeacherCommunityView 
          isAdmin={true} 
          upcomingDays={upcomingCommunityDays} 
          sessions={allSessions} 
        />
      </div>
    )
  }

  // If Teacher
  if (session.user.role === "TEACHER") {
    const teacher = await db.teacher.findUnique({ where: { userId: session.user.id } })
    if (!teacher) return <div>Teacher profile missing.</div>

    // Get their sessions
    const sessions = await db.communitySession.findMany({
      where: { teacherId: teacher.id },
      include: {
        calendarDay: true,
        enrollments: {
          include: { student: { include: { user: true } } }
        }
      },
      orderBy: { calendarDay: { date: "asc" } }
    })

    return (
      <div className="space-y-4">
        <div className="max-w-6xl mx-auto px-6 pt-6 flex justify-end">
          <Link href="/dashboard/community/reports" className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-md text-sm font-medium hover:bg-indigo-100">
            Missing Students Report
          </Link>
        </div>
        <TeacherCommunityView teacherId={teacher.id} upcomingDays={upcomingCommunityDays} sessions={sessions} />
      </div>
    )
  }

  // If Student
  if (session.user.role === "STUDENT") {
    const student = await db.student.findUnique({ where: { userId: session.user.id } })
    if (!student) return <div>Student profile missing.</div>

    // Get all sessions for upcoming days
    const allSessions = await db.communitySession.findMany({
      where: {
        calendarDayId: { in: upcomingCommunityDays.map(d => d.id) }
      },
      include: {
        calendarDay: true,
        teacher: { include: { user: true } },
        enrollments: true, 
      }
    })

    const myEnrollments = await db.communityEnrollment.findMany({
      where: { studentId: student.id, sessionId: { in: allSessions.map(s => s.id) } }
    })

    return <StudentCommunityView studentId={student.id} upcomingDays={upcomingCommunityDays} allSessions={allSessions} myEnrollments={myEnrollments} />
  }

  return <div>Access Denied</div>
}
