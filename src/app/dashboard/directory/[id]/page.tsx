import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  ArrowLeft,
  User as UserIcon,
  AlertTriangle,
  MessageSquare,
  Archive
} from "lucide-react"
import {
  StudentIdentityCard,
  StudentContacts,
  StudentMedical,
  StudentStats,
  StudentAcademicPerformance,
  StudentActiveIncidents
} from "@/components/dashboard/directory/student-profile-sections"
import { formatDate } from "@/lib/dates"
import { decrypt } from "@/lib/encryption"
import { getDecompressedArchive } from "@/app/actions/archive"
import { ArchiveStudentButton } from "./archive-button"

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")

  const { id } = await params
  
  const student = await db.student.findUnique({
    where: { id },
    include: {
      user: true,
      parents: { include: { parent: { include: { user: true } } } },
      enrollments: {
        include: {
          section: {
            include: {
              course: true,
              assignments: {
                include: {
                  grades: { where: { studentId: id } }
                }
              }
            }
          }
        }
      },
      attendance: true,
      incidents: {
        where: { status: { not: "CLOSED" } },
        orderBy: { date: "desc" }
      },
      reportCards: {
        where: { isPublished: true },
        include: { term: true },
        orderBy: { publishedAt: "desc" }
      }
    }
  })

  if (!student) return notFound()

  let archiveData: any = null
  let reportCards: any[] = []
  
  if (student.isArchived) {
    archiveData = await getDecompressedArchive("STUDENT", id)
    if (archiveData) {
      // Map properties for rendering
      student.medicalAlerts = decrypt(archiveData.medicalAlerts)
      student.accommodations = decrypt(archiveData.accommodations)
      
      // Fetch corresponding terms for report cards in archive
      const termIds = archiveData.reportCards?.map((rc: any) => rc.termId) || []
      const terms = await db.term.findMany({
        where: { id: { in: termIds } }
      })
      reportCards = (archiveData.reportCards || []).map((rc: any) => {
        const termObj = terms.find((t: any) => t.id === rc.termId)
        return {
          ...rc,
          term: termObj || { id: rc.termId, name: `Term (${rc.termId})`, type: "UNKNOWN" }
        }
      })
    }
  } else {
    // Decrypt sensitive health columns transparently on read (backward compatible)
    student.medicalAlerts = decrypt(student.medicalAlerts)
    student.accommodations = decrypt(student.accommodations)
    reportCards = student.reportCards || []
  }

  const isSelf = session.user.id === student.userId
  const isAdmin = session.user.role === "ADMIN"
  const isTeacher = session.user.role === "TEACHER"
  const isMyChild = student.parents.some(p => p.parent.userId === session.user.id)
  
  const canViewSensitive = isAdmin || isTeacher || isSelf || isMyChild

  // --- LMS Calculations (Academics) ---
  let coursesProgress: Array<{ courseName: string; percentage: number | null; teacherId?: string }> = []
  if (student.isArchived && archiveData) {
    coursesProgress = (archiveData.enrollments || []).map((enr: any) => {
      const termGrades = enr.termGrades || []
      const scores = termGrades
        .map((tg: any) => tg.overrideScore !== null ? tg.overrideScore : tg.calculatedScore)
        .filter((s: any) => s !== null && s !== undefined)
      const avgScore = scores.length > 0 ? (scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : null
      return {
        courseName: enr.courseName,
        percentage: avgScore,
      }
    })
  } else {
    const activeEnrollments = student.enrollments.filter(e => e.status === "ENROLLED")
    coursesProgress = activeEnrollments.map(enr => {
      const assignments = enr.section.assignments
      let earned = 0
      let possible = 0

      assignments.forEach(a => {
        const grade = a.grades[0]
        if (grade && a.maxScore) {
          earned += grade.score
          possible += a.maxScore
        }
      })

      const percentage = possible > 0 ? (earned / possible) * 100 : null

      return {
        courseName: enr.section.course.name,
        percentage,
        teacherId: enr.section.teacherId
      }
    })
  }

  const gradedCourses = coursesProgress.filter(cp => cp.percentage !== null)
  const coursesWithGrades = gradedCourses.length
  const totalGradeSum = gradedCourses.reduce((sum, cp) => sum + (cp.percentage ?? 0), 0)
  const overallGPA = coursesWithGrades > 0 ? (totalGradeSum / coursesWithGrades).toFixed(1) : "N/A"

  // --- SMS Calculations (Attendance & Behavior) ---
  const totalAttendance = student.isArchived && archiveData
    ? archiveData.attendance?.length || 0
    : student.attendance.length
  
  const presentCount = student.isArchived && archiveData
    ? (archiveData.attendance || []).filter((a: any) => a.status === "PRESENT" || a.status === "TARDY").length
    : student.attendance.filter(a => a.status === "PRESENT" || a.status === "TARDY").length

  const absentCount = student.isArchived && archiveData
    ? (archiveData.attendance || []).filter((a: any) => a.status === "ABSENT").length
    : student.attendance.filter(a => a.status === "ABSENT").length

  const tardyCount = student.isArchived && archiveData
    ? (archiveData.attendance || []).filter((a: any) => a.status === "TARDY").length
    : student.attendance.filter(a => a.status === "TARDY").length
  
  const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 100

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild className="rounded-full w-fit">
          <Link href="/dashboard/directory">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Directory
          </Link>
        </Button>

        {canViewSensitive && (
          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:border-indigo-800 dark:text-indigo-300 dark:bg-indigo-900/30">
              <MessageSquare className="w-4 h-4 mr-2" /> Message
            </Button>
            {isAdmin && (
              <>
                {!student.isArchived && (
                  <ArchiveStudentButton studentId={student.id} />
                )}
                <Button size="sm" variant="outline" asChild className="border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:bg-slate-900">
                  <Link href={`/dashboard/admin/students/${student.id}/edit`}>
                    <UserIcon className="w-4 h-4 mr-2" /> Edit Records
                  </Link>
                </Button>
                <Button size="sm" variant="destructive" asChild>
                  <Link href={`/dashboard/discipline/new?studentId=${student.id}`}>
                    <AlertTriangle className="w-4 h-4 mr-2" /> Report Incident
                  </Link>
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {student.isArchived && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 flex items-center gap-3 text-amber-800 dark:text-amber-300">
          <Archive className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-semibold text-sm">Archived Record</p>
            <p className="text-xs opacity-90">This profile contains archived and compressed historical data. It is read-only.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Identity & SMS Profile */}
        <div className="lg:col-span-4 space-y-8">
          {/* Identity Card */}
          <StudentIdentityCard 
            student={student} 
            canViewSensitive={canViewSensitive} 
            reportCards={reportCards} 
          />

          {/* SMS: Parents / Emergency */}
          {canViewSensitive && student.parents.length > 0 && (
            <StudentContacts student={student} />
          )}

          {/* Medical */}
          {canViewSensitive && (student.medicalAlerts || student.accommodations) && (
            <StudentMedical student={student} isAdmin={isAdmin} />
          )}
        </div>

        {/* RIGHT COLUMN: LMS & Behavioral 360 View */}
        <div className="lg:col-span-8 space-y-8">
          {canViewSensitive ? (
            <>
              {/* Top Stats Row (Cross-System) */}
              <StudentStats 
                overallGPA={overallGPA} 
                attendanceRate={attendanceRate} 
                absentCount={absentCount} 
                incidentCount={student.incidents.length} 
              />

              {/* LMS: Academic Performance */}
              <StudentAcademicPerformance coursesProgress={coursesProgress} />

              {/* SMS: Active Incidents */}
              {student.incidents.length > 0 && (
                <StudentActiveIncidents incidents={student.incidents} />
              )}

            </>
          ) : (
             <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm">
                <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Restricted Profile</h3>
                <p className="text-slate-500 max-w-md mx-auto">
                  You do not have permission to view this student's academic and behavioral records. If you believe this is an error, please contact administration.
                </p>
             </div>
          )}
        </div>
      </div>
    </div>
  )
}
