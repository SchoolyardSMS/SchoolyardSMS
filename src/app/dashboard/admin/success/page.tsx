import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SuccessClientTable } from "./client-table"
import { ShieldAlert, BookOpen, Clock, Users } from "lucide-react"

export const metadata = {
  title: "Student Success Command Center | Schoolyard",
}

export default async function AdminSuccessPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  // Use _count to be highly performant across potentially thousands of students
  const studentsRaw = await db.student.findMany({
    include: {
      user: true,
      _count: {
        select: {
          attendance: { where: { status: "ABSENT" } },
          incidents: { where: { status: "OPEN" } },
          submissions: { where: { status: "MISSING" } },
          enrollments: { where: { status: "ENROLLED" } }
        }
      }
    },
    orderBy: {
      user: { name: "asc" }
    }
  })

  // Format the data for the client table
  const students = studentsRaw.map(s => {
    const absences = s._count.attendance
    const incidents = s._count.incidents
    const missingWork = s._count.submissions
    const activeClasses = s._count.enrollments

    // Heuristic Risk Score (0-100)
    // - 10 points per absence
    // - 25 points per open incident
    // - 5 points per missing assignment
    let riskScore = (absences * 10) + (incidents * 25) + (missingWork * 5)
    if (riskScore > 100) riskScore = 100

    let riskLevel = "LOW"
    if (riskScore > 40) riskLevel = "MODERATE"
    if (riskScore > 75) riskLevel = "HIGH"

    return {
      id: s.id,
      userId: s.userId,
      name: s.user.name,
      email: s.user.email,
      grade: s.gradeLevel,
      absences,
      incidents,
      missingWork,
      activeClasses,
      riskScore,
      riskLevel
    }
  })

  const highRiskCount = students.filter(s => s.riskLevel === "HIGH").length
  const moderateRiskCount = students.filter(s => s.riskLevel === "MODERATE").length
  const totalMissingWork = students.reduce((sum, s) => sum + s.missingWork, 0)
  const totalAbsences = students.reduce((sum, s) => sum + s.absences, 0)

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-slate-900 dark:text-white">
          <ShieldAlert className="w-8 h-8 text-rose-600" />
          Student Success Command Center
        </h1>
        <p className="text-slate-500 mt-2 max-w-3xl">
          Unified view of Student Management (Attendance, Discipline) and Learning Management (Assignments, Enrollments) metrics to proactively identify students needing intervention.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/50 p-6 shadow-sm">
           <div className="flex items-center gap-3 mb-2 text-rose-600 dark:text-rose-400">
             <ShieldAlert className="w-5 h-5" />
             <p className="text-sm font-bold uppercase tracking-wider">High Risk</p>
           </div>
           <p className="text-4xl font-black text-slate-900 dark:text-white">{highRiskCount}</p>
           <p className="text-xs text-slate-500 mt-1">Students requiring immediate attention</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-900/50 p-6 shadow-sm">
           <div className="flex items-center gap-3 mb-2 text-amber-600 dark:text-amber-400">
             <Users className="w-5 h-5" />
             <p className="text-sm font-bold uppercase tracking-wider">Moderate Risk</p>
           </div>
           <p className="text-4xl font-black text-slate-900 dark:text-white">{moderateRiskCount}</p>
           <p className="text-xs text-slate-500 mt-1">Students to monitor closely</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
           <div className="flex items-center gap-3 mb-2 text-indigo-600 dark:text-indigo-400">
             <BookOpen className="w-5 h-5" />
             <p className="text-sm font-bold uppercase tracking-wider">Schoolwide Missing</p>
           </div>
           <p className="text-4xl font-black text-slate-900 dark:text-white">{totalMissingWork}</p>
           <p className="text-xs text-slate-500 mt-1">Total outstanding assignments</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
           <div className="flex items-center gap-3 mb-2 text-emerald-600 dark:text-emerald-400">
             <Clock className="w-5 h-5" />
             <p className="text-sm font-bold uppercase tracking-wider">Total Absences</p>
           </div>
           <p className="text-4xl font-black text-slate-900 dark:text-white">{totalAbsences}</p>
           <p className="text-xs text-slate-500 mt-1">Recorded across all students</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <SuccessClientTable initialData={students} />
      </div>
    </div>
  )
}
