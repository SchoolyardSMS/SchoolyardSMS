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
import { OverviewTab } from "./overview-tab"
import { AssignmentsTab } from "./assignments-tab"
import { RosterTab } from "./roster-tab"
import { AttendanceTab } from "./attendance-tab"
import { TermGradesTab } from "./term-grades-tab"

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

  const [resolvedParams, resolvedSearchParams] = await Promise.all([params, searchParams])
  const { id } = resolvedParams
  const { tab = "overview", termId: selectedTermId } = resolvedSearchParams

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

  const enrolledUserIds = section.enrollments.flatMap((e: any) => e.student?.user?.id ? [e.student.user.id] : [])
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
      const gradesList = activeAssignments.flatMap((a: any) => {
        const matchingGrade = studentGrades.find(g => g.assignmentId === a.id)
        return matchingGrade !== undefined ? [{ assignmentId: a.id, score: matchingGrade.score }] : []
      }) as { assignmentId: string; score: number }[]
      
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
      const gradesList = activeAssignments.flatMap((a: any) => {
        const matchingGrade = studentGrades.find(g => g.assignmentId === a.id)
        return matchingGrade !== undefined ? [{ assignmentId: a.id, score: matchingGrade.score }] : []
      }) as { assignmentId: string; score: number }[]
      
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
          <OverviewTab section={section} id={id} isStaff={isStaff} userId={userId} visibleAssignments={visibleAssignments} stats={stats} />
        )}

        {/* ── ASSIGNMENTS ── */}
        {tab === "assignments" && (
          <AssignmentsTab id={id} visibleAssignments={visibleAssignments} isStaff={isStaff} assignmentTypeConfig={assignmentTypeConfig} now={now} />
        )}

        {/* ── TOPICS ── */}
        {tab === "topics" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TopicsClient sectionId={id} isStaff={isStaff} initialTopics={section.topics} />
          </div>
        )}

        {/* ── ROSTER ── */}
        {tab === "roster" && (
          <RosterTab id={id} section={section} isStaff={isStaff} allStudentUsers={allStudentUsers} enrolledUserIds={enrolledUserIds} />
        )}

        {/* ── ATTENDANCE ── */}
        {tab === "attendance" && isStaff && (
          <AttendanceTab id={id} section={section} />
        )}

        {/* ── TERM GRADES ── */}
        {tab === "term-grades" && isStaff && (
          <TermGradesTab id={id} />
        )}
      </div>
    </div>
  )
}
