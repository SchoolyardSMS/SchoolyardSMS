import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AttendanceNotificationsTable } from "@/components/dashboard/attendance/attendance-notifications-table"
import { AttendanceDailyLogTable } from "@/components/dashboard/attendance/attendance-daily-log-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ReportAttendanceDialog } from "@/components/dashboard/attendance/report-attendance-dialog"
import { CheckCircle, AlertCircle, Clock, LogOut, Download, ClipboardCheck, Filter } from "lucide-react"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { cn } from "@/lib/utils"
import { formatDate, formatMediumDate, formatInET } from "@/lib/dates"

export const metadata = {
  title: "Attendance | Schoolyard",
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const { date: dateFilter } = await searchParams

  const isAdmin = session.user?.role === 'ADMIN'
  const isTeacher = session.user?.role === 'TEACHER'
  const isAdminOrTeacher = isAdmin || isTeacher
  const isParent = session.user?.role === 'PARENT'
  const isStudent = session.user?.role === 'STUDENT'

  let attendanceRecords: any[] = []
  let attendanceNotifications: any[] = []
  let parentChildren: any[] = []
  let pageTitle = "Attendance Monitoring"

  let totalAbsencesToday = 0
  let chronicAbsentees = 0

  const settings = await db.schoolSettings.findUnique({ where: { id: "singleton" } })
  const threshold = settings?.attendanceThreshold ?? 5

  if (isAdminOrTeacher) {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    // Archive attendance notifications whose date has passed (after the day is finished)
    await db.attendanceNotification.updateMany({
      where: {
        date: { lt: today },
        isArchived: false
      },
      data: { isArchived: true }
    })

    // Build date filter: if user picks a date, filter to that day; otherwise show last 30 days
    const filterDate = dateFilter ? new Date(`${dateFilter}T12:00:00`) : null
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const dateWhere = filterDate
      ? {
          date: {
            gte: new Date(`${dateFilter}T00:00:00`),
            lte: new Date(`${dateFilter}T23:59:59`),
          },
        }
      : { date: { gte: thirtyDaysAgo } }

    attendanceRecords = await db.attendance.findMany({
      where: { isArchived: false, ...dateWhere },
      orderBy: { date: 'desc' },
      take: 500,
      include: {
        student: { include: { user: true } },
        section: { include: { course: true, term: true } }
      }
    })
    attendanceNotifications = await db.attendanceNotification.findMany({
      where: { isArchived: false },
      orderBy: { createdAt: 'desc' },
      include: {
        student: { include: { user: true } },
        parent: { include: { user: true } }
      },
      take: 100
    })

    totalAbsencesToday = await db.attendance.count({
      where: { date: { gte: today }, status: "ABSENT", isArchived: false }
    })

    const absentCounts = await db.attendance.groupBy({
      by: ['studentId'],
      where: { status: "ABSENT", isArchived: false },
      _count: { studentId: true }
    })

    chronicAbsentees = absentCounts.filter(c => c._count.studentId > threshold).length

  } else if (isStudent) {
    pageTitle = "My Attendance"
    const studentProfile = await db.student.findUnique({ where: { userId: session.user?.id } })
    if (studentProfile) {
      attendanceRecords = await db.attendance.findMany({
        where: { studentId: studentProfile.id, isArchived: false },
        orderBy: { date: 'desc' },
        include: {
          section: { include: { course: true, term: true } }
        }
      })
    }
  } else if (isParent) {
    pageTitle = "Children's Attendance"
    const parentProfile = await db.parent.findUnique({
      where: { userId: session.user?.id },
      include: {
        children: {
          include: {
            student: {
              include: {
                user: true,
                attendance: {
                  where: { isArchived: false },
                  orderBy: { date: 'desc' },
                  include: { section: { include: { course: true, term: true } } }
                }
              }
            }
          }
        }
      }
    })

    if (parentProfile) {
      parentChildren = parentProfile.children.map(c => c.student)
      attendanceRecords = parentProfile.children.flatMap(c => c.student.attendance)
      attendanceNotifications = await db.attendanceNotification.findMany({
        where: { parentId: parentProfile.id },
        orderBy: { date: 'desc' },
        include: { student: { include: { user: true } } }
      })
    }
  }

  const showStudentColumn = isAdminOrTeacher || isParent

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-10">
      <DashboardPageHeader
        title={pageTitle}
        description="Monitor and manage student presence, absences, and parent notifications."
        icon={ClipboardCheck}
      >
        {isParent && <ReportAttendanceDialog studentChildren={parentChildren} />}
        {isAdminOrTeacher && (
          <Button variant="outline" asChild className="border-slate-200 dark:border-slate-800">
            <a href="/api/reports/export/attendance" download>
              <Download className="w-4 h-4 mr-2" />
              Export Records
            </a>
          </Button>
        )}
      </DashboardPageHeader>

      {isAdminOrTeacher && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/50 p-6 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-1">Today's Absences</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white">{totalAbsencesToday}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-600">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-900/50 p-6 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-1">Chronic Absentees</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white">{chronicAbsentees}</p>
              {isAdminOrTeacher && (
                <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-widest">&gt; {settings?.attendanceThreshold ?? 5} Absences Recorded</p>
              )}
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600">
              <LogOut className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* ── DATE FILTER (admin/teacher only) ── */}
      {isAdminOrTeacher && (
        <form className="flex items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <label htmlFor="attendance-date" className="text-sm font-bold text-slate-700 dark:text-slate-300 shrink-0">Filter by Date:</label>
          <input
            id="attendance-date"
            type="date"
            name="date"
            defaultValue={dateFilter || ""}
            className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm bg-transparent"
          />
          <Button type="submit" size="sm" variant="outline" className="h-9">Apply</Button>
          {dateFilter && (
            <a href="/dashboard/attendance" className="text-sm text-indigo-600 hover:underline ml-1">Clear</a>
          )}
          <span className="text-xs text-slate-400 ml-auto">
            Showing {attendanceRecords.length} record{attendanceRecords.length !== 1 ? "s" : ""}
            {dateFilter ? ` for ${formatDate(dateFilter)}` : " (last 30 days)"}
          </span>
        </form>
      )}

      {/* ── NOTIFICATIONS / CALL-OUTS ── */}
      {(isParent || isAdminOrTeacher) && (
        <AttendanceNotificationsTable 
          notifications={attendanceNotifications} 
          isParent={isParent} 
          isAdmin={isAdmin} 
        />
      )}

      {/* ── DAILY LOG ── */}
      <AttendanceDailyLogTable 
        records={attendanceRecords} 
        showStudentColumn={showStudentColumn} 
      />
    </div>
  )
}
