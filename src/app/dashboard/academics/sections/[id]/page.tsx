import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { notFound, redirect } from "next/navigation"
import { unstable_noStore as noStore } from "next/cache"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Calendar, ClipboardList, BookOpen, Clock, UserPlus, Trash2, Users, LayoutGrid, CheckCircle, ChevronLeft, Download, BarChart3, Settings, Plus, MessageSquare } from "lucide-react"
import { EnrollStudentDialog } from "@/components/dashboard/academics/enroll-student-dialog"
import { AssignmentActions } from "@/components/dashboard/academics/assignment-actions"
import { unenrollStudent } from "@/app/actions/academics"
import { TopicsClient } from "@/components/dashboard/academics/topics-client"
import { SectionHeader } from "@/components/dashboard/academics/section-header"
import { cn } from "@/lib/utils"
import { AnnouncementStream } from "@/components/dashboard/academics/announcement-stream"
import { formatDistanceToNow } from "date-fns"

export const dynamic = 'force-dynamic'
export const metadata = { title: "Section Hub | Schoolyard" }

const assignmentTypeConfig: Record<string, { label: string; color: string }> = {
  HOMEWORK: { label: "Homework", color: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800" },
  QUIZ:     { label: "Quiz",     color: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-800" },
  TEST:     { label: "Test",     color: "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800" },
  PROJECT:  { label: "Project",  color: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800" },
  LAB:      { label: "Lab",      color: "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 border-cyan-100 dark:border-cyan-800" },
  OTHER:    { label: "Other",    color: "bg-slate-50 dark:bg-slate-900/20 text-slate-500 border-slate-100 dark:border-slate-800" },
}

import { calculateGrade, getLetterGrade } from "@/lib/grading"

export default async function SectionDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string; termId?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  noStore()
  const role = session.user.role

  const { id } = await params
  const { tab = "overview", termId: selectedTermId } = await searchParams

  const section = (await db.section.findUnique({
    where: { id },
    include: {
      course: true,
      teacher: { include: { user: true } },
      bellPeriod: true,
      announcements: {
        orderBy: { createdAt: "desc" },
        include: { author: true }
      },
      enrollments: {
        include: { student: { include: { user: true } } },
        orderBy: { student: { user: { name: "asc" } } },
      },
      assignments: {
        orderBy: { dueDate: "asc" },
        include: {
          submissions: {
            where: role === "STUDENT" ? { student: { userId: session.user.id } } : {}
          }
        }
      },
      attendance: {
        orderBy: { date: "desc" },
        take: 10,
        include: { student: { include: { user: true } } }
      },
      topics: {
        include: { materials: true },
        orderBy: { order: "asc" }
      },
    } as any,
  })) as any

  if (!section) return notFound()

  const userId = session.user.id
  const isAdmin = role === "ADMIN"
  const isTeacherOfSection = role === "TEACHER" && section.teacher.userId === userId
  const isStaff = isTeacherOfSection || isAdmin

  let parentChildrenIds: string[] = []
  if (role === "PARENT") {
    const parent = await db.parent.findUnique({ where: { userId }, include: { children: true } })
    parentChildrenIds = parent?.children.map(c => c.studentId) || []
  }

  if (!isAdmin && !isTeacherOfSection) {
    if (role === "STUDENT") {
      const isEnrolled = section.enrollments.some((e: any) => e.student.userId === userId)
      if (!isEnrolled) redirect("/dashboard")
    } else if (role === "PARENT") {
      const isMyChildEnrolled = section.enrollments.some((e: any) => parentChildrenIds.includes(e.studentId))
      if (!isMyChildEnrolled) redirect("/dashboard")
    } else {
      redirect("/dashboard/academics/courses")
    }
  }

  // Get student-role users for enrollment
  const allStudentUsers = isStaff ? await db.user.findMany({
    where: { role: 'STUDENT' },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, role: true }
  }) : []

  const enrolledUserIds = section.enrollments.map((e: any) => e.student?.user?.id).filter(Boolean)
  const now = new Date()

  // 1. Calculate possible nested terms for the school year
  let possibleTerms: any[] = []
  if (section.term) {
    const allYearTerms = await db.term.findMany({
      where: { schoolYearId: section.term.schoolYearId }
    })

    const collectDescendants = (parentId: string, depth: number): any[] => {
      const children = allYearTerms.filter(t => t.parentId === parentId)
      return children.reduce((acc, child) => {
        return [...acc, child, ...collectDescendants(child.id, depth + 1)]
      }, [] as any[])
    }

    possibleTerms = [
      section.term,
      ...collectDescendants(section.term.id, 1)
    ]
  }

  // 2. Filter visible assignments depending on snapshot or active mode
  const visibleAssignments = isStaff
    ? (selectedTermId 
        ? section.assignments.filter((a: any) => a.archivedInTermId === selectedTermId)
        : section.assignments.filter((a: any) => !a.isArchived))
    : (section.assignments as any[]).filter((a: any) => 
        a.status === "PUBLISHED" && 
        (!a.publishDate || new Date(a.publishDate) <= now) &&
        (selectedTermId ? (a.isArchived && a.archivedInTermId === selectedTermId) : !a.isArchived)
      )

  // 3. Find enrollment and calculate grades dynamically
  const studentEnrollment = section.enrollments.find((e: any) => 
    role === "STUDENT" 
      ? e.student.userId === userId 
      : parentChildrenIds.includes(e.studentId)
  )

  let calculatedGradeAvgStr = "N/A"
  if (studentEnrollment) {
    if (selectedTermId) {
      const snapshot = await db.termGrade.findUnique({
        where: {
          enrollmentId_termId: {
            enrollmentId: studentEnrollment.id,
            termId: selectedTermId
          }
        }
      })
      if (snapshot) {
        const pct = snapshot.overrideScore ?? snapshot.calculatedScore ?? null
        calculatedGradeAvgStr = pct !== null ? `${pct.toFixed(1)}%` : "N/A"
      }
    } else {
      const activeAssignments = section.assignments.filter((a: any) => !a.isArchived)
      const studentGrades = await db.grade.findMany({
        where: {
          studentId: studentEnrollment.studentId,
          assignmentId: { in: activeAssignments.map((a: any) => a.id) }
        }
      })
      const gradesList = activeAssignments.map((a: any) => {
        const matchingGrade = studentGrades.find(g => g.assignmentId === a.id)
        return matchingGrade !== undefined ? { assignmentId: a.id, score: matchingGrade.score } : null
      }).filter(Boolean) as { assignmentId: string; score: number }[]
      
      if (gradesList.length > 0) {
        const pct = calculateGrade(section, activeAssignments as any, gradesList)
        calculatedGradeAvgStr = pct !== null ? `${pct.toFixed(1)}%` : "N/A"
      }
    }
  } else if (isStaff) {
    // Staff view summary average of all students
    const activeAssignments = section.assignments.filter((a: any) => selectedTermId ? a.archivedInTermId === selectedTermId : !a.isArchived)
    const activeAssignmentIds = activeAssignments.map((a: any) => a.id)
    const activeGrades = await db.grade.findMany({
      where: { assignmentId: { in: activeAssignmentIds } }
    })

    const studentAverages = section.enrollments.map((enr: any) => {
      const studentGrades = activeGrades.filter(g => g.studentId === enr.student.id)
      const gradesList = activeAssignments.map((a: any) => {
        const matchingGrade = studentGrades.find(g => g.assignmentId === a.id)
        return matchingGrade !== undefined ? { assignmentId: a.id, score: matchingGrade.score } : null
      }).filter(Boolean) as { assignmentId: string; score: number }[]
      
      return gradesList.length > 0 ? calculateGrade(section, activeAssignments as any, gradesList) : null
    }).filter((g: any) => g !== null) as number[]

    if (studentAverages.length > 0) {
      calculatedGradeAvgStr = `${(studentAverages.reduce((s, a) => s + a, 0) / studentAverages.length).toFixed(1)}%`
    }
  }

  // Attendance average
  let attendanceAvgStr = "100%"
  const attendanceRecords = section.attendance.filter((att: any) => 
    role === "STUDENT" 
      ? att.student.userId === userId 
      : role === "PARENT"
        ? parentChildrenIds.includes(att.studentId)
        : true
  )
  if (attendanceRecords.length > 0) {
    const present = attendanceRecords.filter((r: any) => r.status === "PRESENT" || r.status === "TARDY").length
    attendanceAvgStr = `${((present / attendanceRecords.length) * 100).toFixed(0)}%`
  }

  const tabs = [
    { key: "overview",     label: "Overview",    icon: LayoutGrid },
    { key: "assignments",  label: "Assignments", icon: ClipboardList },
    { key: "topics",       label: "Course Map",  icon: BookOpen },
    { key: "roster",       label: "Roster",      icon: Users },
    ...(isStaff ? [{ key: "attendance", label: "Attendance", icon: Calendar }] : []),
    ...(isStaff ? [{ key: "term-grades", label: "Term Grades", icon: CheckCircle }] : []),
  ]

  const stats = [
    { label: "Active Roster", value: section.enrollments.length, icon: Users, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20" },
    { label: "Tasks Assigned", value: visibleAssignments.length, icon: ClipboardList, color: "text-sky-600 bg-sky-50 dark:bg-sky-900/20" },
    { label: "Gradebook Avg", value: calculatedGradeAvgStr, icon: BarChart3, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" },
    { label: "Attendance", value: attendanceAvgStr, icon: CheckCircle, color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20" },
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <Link href={`/dashboard/academics/courses/${section.courseId}`} className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-widest">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Course Catalog
        </Link>
        {isStaff && (
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" asChild className="rounded-full border-slate-200 dark:border-slate-800">
                <Link href={`/dashboard/academics/sections/${id}/edit`}>
                  <Settings className="w-3.5 h-3.5 mr-2" />
                  Admin Config
                </Link>
              </Button>
            )}
            <Button variant="outline" size="sm" asChild className="rounded-full border-slate-200 dark:border-slate-800">
              <Link href={`/dashboard/academics/sections/${id}/settings`}>
                <Settings className="w-3.5 h-3.5 mr-2" />
                Grading Setup
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="rounded-full border-slate-200 dark:border-slate-800">
              <Link href={`/dashboard/academics/sections/${id}/gradebook`}>
                <BarChart3 className="w-3.5 h-3.5 mr-2" />
                Gradebook
              </Link>
            </Button>
          </div>
        )}
      </div>

      <SectionHeader section={section} />

      {/* Term view selector for Students and Parents or Staff to choose snapshot view */}
      {possibleTerms.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Grades & Assignments View:</span>
            <form className="flex gap-2 items-center">
              <input type="hidden" name="tab" value={tab} />
              <select
                name="termId"
                defaultValue={selectedTermId || ""}
                onChange={(e) => {
                  const form = e.target.form;
                  if (form) form.submit();
                }}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="">Current Quarter (Active Grades)</option>
                {possibleTerms.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name} (Archived Snapshot)</option>
                ))}
              </select>
            </form>
          </div>
          {selectedTermId && (
            <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-bold text-[10px] tracking-wider uppercase px-2.5 py-1">
              Historical Snapshot View
            </Badge>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-fit overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <Link
            key={key}
            href={`/dashboard/academics/sections/${id}?tab=${key}${selectedTermId ? `&termId=${selectedTermId}` : ""}`}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
              tab === key 
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>

      <div className="min-h-[400px]">
        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                  <div className={cn("p-3 rounded-xl", stat.color)}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white leading-none mb-1">{stat.value}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Stream Column */}
              <div className="lg:col-span-2 space-y-6">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 px-2">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  Class Stream
                </h3>
                <AnnouncementStream 
                  sectionId={id} 
                  announcements={section.announcements} 
                  isStaff={isStaff} 
                  currentUserId={userId}
                />
              </div>

              {/* Sidebar Column */}
              <div className="space-y-8">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-indigo-600" />
                      Upcoming Tasks
                    </h3>
                  </div>
                  <div className="p-6">
                    {visibleAssignments.length === 0 ? (
                      <p className="text-sm text-slate-500 italic py-10 text-center">No assignments found.</p>
                    ) : (
                      <div className="space-y-4">
                        {visibleAssignments.slice(0, 5).map((a: any) => (
                          <div key={a.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{a.title}</p>
                              <p className="text-[10px] text-slate-400 font-medium">Due {new Date(a.dueDate).toLocaleDateString()}</p>
                            </div>
                            <Badge variant="outline" className="text-[9px] uppercase font-black tracking-tighter shrink-0">
                              {a.maxScore} pts
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-emerald-600" />
                      Latest Activity
                    </h3>
                  </div>
                  <div className="p-6 space-y-6">
                    {(() => {
                      const activity = [
                        ...section.announcements.map((a: any) => ({
                          type: 'announcement',
                          text: `Announcement posted`,
                          date: a.createdAt,
                          color: 'bg-indigo-500'
                        })),
                        ...section.assignments.map((a: any) => ({
                          type: 'assignment',
                          text: `New Assignment: "${a.title}"`,
                          date: a.createdAt,
                          color: 'bg-emerald-500'
                        }))
                      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3)

                      if (activity.length === 0) {
                        return <p className="text-sm text-slate-500 italic py-4 text-center">No recent activity.</p>
                      }

                      return activity.map((item, i) => (
                        <div key={i} className="flex gap-3">
                          <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", item.color)} />
                          <div>
                            <p className="text-xs font-medium">{item.text}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">
                              {formatDistanceToNow(new Date(item.date))} ago
                            </p>
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ASSIGNMENTS ── */}
        {tab === "assignments" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {isStaff && (
              <div className="flex justify-end">
                <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full">
                  <Link href={`/dashboard/academics/sections/${id}/assignments/new`}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Assignment
                  </Link>
                </Button>
              </div>
            )}

            {visibleAssignments.length === 0 ? (
              <div className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-20 text-center bg-slate-50/50 dark:bg-slate-900/20">
                <ClipboardList className="h-10 w-10 mx-auto mb-4 text-slate-300" />
                <h4 className="font-bold text-xl text-slate-900 dark:text-white">No Assignments</h4>
                <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">Assignments will appear here once they are created and published.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {visibleAssignments.map((a: any) => {
                  const tc = assignmentTypeConfig[a.type] ?? assignmentTypeConfig.OTHER
                  const isSubmitted = a.submissions?.length > 0
                  const isPast = new Date(a.dueDate) < now

                  return (
                    <div key={a.id} className="relative flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group">
                      <Link href={`/dashboard/academics/sections/${id}/assignments/${a.id}`} className="absolute inset-0 z-0" />
                      
                      <div className={cn("inline-flex items-center rounded-xl border px-3 py-1 text-[10px] font-black uppercase tracking-widest shrink-0 self-start sm:self-center z-10", tc.color)}>
                        {tc.label}
                      </div>

                      <div className="relative z-10 flex-1 min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors truncate">{a.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <p className={cn(
                            "text-[10px] font-bold uppercase tracking-tight",
                            isSubmitted ? "text-emerald-600" : isPast ? "text-rose-500" : "text-slate-400"
                          )}>
                            {isSubmitted ? "Submitted" : isPast ? "Past Due" : "Active"}
                          </p>
                          <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-800" />
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                            Due {new Date(a.dueDate).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" })}
                          </p>
                        </div>
                      </div>

                      <div className="relative z-20 flex items-center justify-between sm:justify-end gap-6 shrink-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-50 dark:border-slate-800">
                        <div className="flex flex-col items-end">
                          <span className="text-lg font-black text-slate-900 dark:text-white leading-none">{a.maxScore}</span>
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Points</span>
                        </div>
                        <AssignmentActions assignment={a} sectionId={id} isStaff={isStaff} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TOPICS ── */}
        {tab === "topics" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TopicsClient sectionId={id} isStaff={isStaff} initialTopics={section.topics} />
          </div>
        )}

        {/* ── ROSTER ── */}
        {tab === "roster" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {isStaff && (
              <div className="flex justify-end">
                <EnrollStudentDialog 
                  sectionId={id} 
                  allStudents={allStudentUsers}
                  enrolledStudentIds={enrolledUserIds}
                />
              </div>
            )}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-500 py-4 pl-6">Student</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-500 py-4">Email</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-500 py-4">Grade</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-500 py-4">Status</TableHead>
                    {isStaff && <TableHead className="text-right font-black uppercase tracking-widest text-[10px] text-slate-500 py-4 pr-6">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {section.enrollments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isStaff ? 5 : 4} className="text-center h-32 text-slate-500 italic">No students enrolled.</TableCell>
                    </TableRow>
                  ) : (
                    (section.enrollments as any[]).map((enr: any) => (
                      <TableRow key={enr.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-100 dark:border-slate-800/50">
                        <TableCell className="py-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-black text-white bg-indigo-600 shadow-sm">
                              {enr.student.user.name.charAt(0)}
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white">{enr.student.user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">{enr.student.user.email}</TableCell>
                        <TableCell className="font-bold text-slate-900 dark:text-white">Grade {enr.student.gradeLevel}</TableCell>
                        <TableCell>
                          <Badge variant={enr.status === "ENROLLED" ? "secondary" : "outline"} className="text-[10px] font-black uppercase">
                            {enr.status}
                          </Badge>
                        </TableCell>
                        {isStaff && (
                          <TableCell className="text-right py-4 pr-6">
                            <form action={async () => {
                              "use server"
                              await unenrollStudent(enr.id, id)
                            }}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600 rounded-full transition-colors">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </form>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* ── ATTENDANCE ── */}
        {tab === "attendance" && isStaff && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm text-indigo-600">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-indigo-900 dark:text-indigo-100">Live Attendance</h3>
                  <p className="text-xs text-indigo-700/70 dark:text-indigo-300/50">Manage daily presence for this section.</p>
                </div>
              </div>
              <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md">
                <Link href={`/dashboard/academics/sections/${id}/attendance`}>
                  Launch Attendance Sheet
                </Link>
              </Button>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-500 py-4 pl-6">Date</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-500 py-4">Student</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-500 py-4">Status</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-500 py-4 pr-6">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {section.attendance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-32 text-slate-500 italic">No attendance records yet.</TableCell>
                    </TableRow>
                  ) : (
                    (section.attendance as any[]).map((att: any) => (
                      <TableRow key={att.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-100 dark:border-slate-800/50">
                        <TableCell className="py-4 pl-6 font-bold text-slate-900 dark:text-white">
                          {new Date(att.date).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" })}
                        </TableCell>
                        <TableCell className="py-4 font-medium text-slate-700 dark:text-slate-300">
                          {att.student?.user?.name ?? "—"}
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge 
                            className={cn(
                              "px-3 py-0.5 text-[9px] font-black uppercase tracking-widest",
                              att.status === "PRESENT" ? "bg-emerald-100 text-emerald-700" :
                              att.status === "ABSENT"  ? "bg-rose-100 text-rose-700" :
                              att.status === "TARDY"   ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                            )}
                          >
                            {att.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 pr-6 text-slate-400 text-[10px] italic">{att.notes ?? "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* ── TERM GRADES ── */}
        {tab === "term-grades" && isStaff && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm text-indigo-600">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-indigo-900 dark:text-indigo-100">Term Grades</h3>
                  <p className="text-xs text-indigo-700/70 dark:text-indigo-300/50">Post final report card grades for this section's students.</p>
                </div>
              </div>
              <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md">
                <Link href={`/dashboard/academics/sections/${id}/term-grades`}>
                  Manage Term Grades
                </Link>
              </Button>
            </div>
            <div className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-20 text-center bg-slate-50/50 dark:bg-slate-900/20">
              <CheckCircle className="h-10 w-10 mx-auto mb-4 text-slate-300" />
              <h4 className="font-bold text-xl text-slate-900 dark:text-white">SIS Grading Engine</h4>
              <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">Use the Term Grades manager to input or override final grades for report cards.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
