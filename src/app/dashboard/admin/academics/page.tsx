import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { calculateGrade } from "@/lib/grading"
import { BarChart3, TrendingUp, TrendingDown, BookOpen, User } from "lucide-react"

export const metadata = {
  title: "Academic Analytics | Schoolyard",
}

export default async function AcademicAnalyticsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  // Fetch sections with all data needed to calculate current grades
  const sections = await db.section.findMany({
    include: {
      course: true,
      teacher: { include: { user: true } },
      assignments: {
        include: { grades: true }
      },
      enrollments: {
        where: { status: "ENROLLED" }
      }
    }
  })

  // Calculate Section Averages
  const sectionStats = sections.map((section: any) => {
    let sectionTotalGPA = 0
    let validStudents = 0
    let aCount = 0, bCount = 0, cCount = 0, dCount = 0, fCount = 0

    section.enrollments.forEach((enr: any) => {
      const studentGradesList = section.assignments.map((a: any) => {
        const grade = a.grades.find((g: any) => g.studentId === enr.studentId)
        return grade ? { assignmentId: a.id, score: grade.score } : null
      }).filter(Boolean) as { assignmentId: string, score: number }[]

      if (studentGradesList.length > 0) {
        const pct = calculateGrade(section, section.assignments, studentGradesList)
        sectionTotalGPA += pct
        validStudents++

        if (pct >= 90) aCount++
        else if (pct >= 80) bCount++
        else if (pct >= 70) cCount++
        else if (pct >= 60) dCount++
        else fCount++
      }
    })

    const avg = validStudents > 0 ? (sectionTotalGPA / validStudents) : null

    return {
      id: section.id,
      courseName: section.course.name,
      teacherName: section.teacher.user.name,
      term: section.term,
      studentCount: section.enrollments.length,
      avg,
      distribution: { A: aCount, B: bCount, C: cCount, D: dCount, F: fCount }
    }
  }).filter(s => s.avg !== null)

  // Sort by average to find highest and lowest performing
  sectionStats.sort((a, b) => (b.avg as number) - (a.avg as number))

  const schoolAverage = sectionStats.length > 0
    ? sectionStats.reduce((sum, s) => sum + (s.avg as number), 0) / sectionStats.length
    : 0

  const totalA = sectionStats.reduce((sum, s) => sum + s.distribution.A, 0)
  const totalB = sectionStats.reduce((sum, s) => sum + s.distribution.B, 0)
  const totalC = sectionStats.reduce((sum, s) => sum + s.distribution.C, 0)
  const totalD = sectionStats.reduce((sum, s) => sum + s.distribution.D, 0)
  const totalF = sectionStats.reduce((sum, s) => sum + s.distribution.F, 0)

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-slate-900 dark:text-white">
          <BarChart3 className="w-8 h-8 text-indigo-600" />
          Academic Analytics
        </h1>
        <p className="text-slate-500 mt-2 max-w-3xl">
          School-wide grade distributions and section performance metrics for department oversight.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-indigo-600">
            <BookOpen className="w-5 h-5" />
            <span className="font-bold uppercase tracking-widest text-xs">Schoolwide GPA</span>
          </div>
          <p className="text-4xl font-black">{schoolAverage.toFixed(1)}%</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-emerald-600">
            <TrendingUp className="w-5 h-5" />
            <span className="font-bold uppercase tracking-widest text-xs">Excellence (A's)</span>
          </div>
          <p className="text-4xl font-black">{totalA}</p>
          <p className="text-xs text-slate-500 mt-1">Students performing at top level</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-sm">
           <div className="flex items-center gap-2 mb-2 text-rose-600">
            <TrendingDown className="w-5 h-5" />
            <span className="font-bold uppercase tracking-widest text-xs">At-Risk (D/F)</span>
          </div>
          <p className="text-4xl font-black">{totalD + totalF}</p>
          <p className="text-xs text-slate-500 mt-1">Students failing or near failing</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <h2 className="text-lg font-bold">Section Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
              <tr>
                <th className="px-6 py-4">Course</th>
                <th className="px-6 py-4">Teacher</th>
                <th className="px-6 py-4 text-center">Class Average</th>
                <th className="px-6 py-4 text-center">Grade Distribution (A/B/C/D/F)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sectionStats.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900 dark:text-white">{s.courseName}</p>
                    <p className="text-xs text-slate-500">{s.term}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-slate-700 dark:text-slate-300">{s.teacherName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-lg font-black ${(s.avg as number) < 70 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {(s.avg as number).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-1.5 font-mono text-xs">
                      <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 px-2 py-1 rounded">{s.distribution.A}</span>
                      <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 px-2 py-1 rounded">{s.distribution.B}</span>
                      <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 px-2 py-1 rounded">{s.distribution.C}</span>
                      <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/50 px-2 py-1 rounded">{s.distribution.D}</span>
                      <span className="bg-rose-100 text-rose-700 dark:bg-rose-900/50 px-2 py-1 rounded">{s.distribution.F}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {sectionStats.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    No active sections with graded assignments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
