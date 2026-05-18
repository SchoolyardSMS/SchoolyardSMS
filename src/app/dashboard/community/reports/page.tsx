import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { format } from "date-fns"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  Calendar, 
  ChevronLeft, 
  AlertTriangle,
  Send,
  XCircle
} from "lucide-react"
import { NudgeAllButton, NudgeStudentButton } from "@/components/community/nudge-buttons"
import { ForceAssignDialog } from "@/components/community/force-assign-dialog"

export const metadata = { title: "Community Reports | Schoolyard" }

export default async function CommunityReportsPage({ searchParams }: { searchParams: Promise<{ dayId?: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== "TEACHER" && session.user?.role !== "ADMIN")) {
    redirect("/dashboard/community")
  }

  const { dayId } = await searchParams

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const communityDays = await db.calendarDay.findMany({
    where: { hasCommunityPeriod: true, date: { gte: today } },
    orderBy: { date: "asc" },
    take: 10
  })

  const selectedDayId = dayId || (communityDays.length > 0 ? communityDays[0].id : null)
  const selectedDay = communityDays.find(d => d.id === selectedDayId)

  let missingStudents: any[] = []
  let absentStudents: any[] = []
  let sessions: any[] = []

  if (selectedDayId) {
    // 1. Missing Enrollment (Not signed up at all)
    const allStudents = await db.student.findMany({
      include: { user: true },
      orderBy: { user: { name: "asc" } }
    })

    const enrollments = await db.communityEnrollment.findMany({
      where: { session: { calendarDayId: selectedDayId } },
      select: { studentId: true, attendance: true, id: true, student: { include: { user: true } } }
    })

    const enrolledIds = new Set(enrollments.map(e => e.studentId))
    missingStudents = allStudents.filter(s => !enrolledIds.has(s.id))

    // 2. Reported Absences (Enrolled but marked ABSENT)
    absentStudents = enrollments.filter(e => e.attendance === "ABSENT")

    // 3. Available Sessions (For Force Assign)
    sessions = await db.communitySession.findMany({
      where: { calendarDayId: selectedDayId },
      include: { _count: { select: { enrollments: true } } },
      orderBy: { title: "asc" }
    })
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/dashboard/community" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 mb-2 transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Community
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-indigo-600" />
            Community Period Reports
          </h1>
          <p className="text-slate-500 mt-1">Audit attendance and enrollment for instructional days.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar: Date Selection */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                Instructional Dates
              </h3>
            </div>
            <div className="p-2 space-y-1">
              {communityDays.length === 0 && (
                <p className="text-sm text-slate-500 p-4 text-center italic">No upcoming dates found.</p>
              )}
              {communityDays.map(day => (
                <Link 
                   key={day.id} 
                   href={`/dashboard/community/reports?dayId=${day.id}`}
                   className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                     day.id === selectedDayId 
                       ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none" 
                       : "hover:bg-slate-100 text-slate-700 dark:hover:bg-slate-800 dark:text-slate-300"
                   }`}
                >
                  {format(new Date(day.date), 'MMM d, yyyy')}
                  {day.id === selectedDayId && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-9 space-y-8">
          {selectedDay ? (
            <>
              {/* ── MISSING ENROLLMENT ── */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="font-bold text-lg">Not Enrolled</h3>
                    <p className="text-xs text-slate-500">{format(new Date(selectedDay.date), 'EEEE, MMMM d, yyyy')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="destructive" className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border-none">
                      {missingStudents.length} Students Pending
                    </Badge>
                    {missingStudents.length > 0 && selectedDayId && (
                      <NudgeAllButton dayId={selectedDayId} count={missingStudents.length} />
                    )}
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {missingStudents.length === 0 ? (
                    <div className="p-12 text-center space-y-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto text-emerald-600">
                        <Users className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">Full Enrollment</h4>
                      <p className="text-xs text-slate-500">Every student is signed up for a session.</p>
                    </div>
                  ) : (
                    missingStudents.map(student => (
                      <div key={student.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-100 dark:border-indigo-800">
                            {student.user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white leading-tight text-sm">{student.user.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-medium">Grade {student.gradeLevel}</Badge>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          {selectedDayId && (
                            <NudgeStudentButton 
                              studentId={student.id} 
                              dayId={selectedDayId} 
                              studentName={student.user.name} 
                            />
                          )}
                          <ForceAssignDialog 
                            studentId={student.id} 
                            studentName={student.user.name} 
                            sessions={sessions} 
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ── REPORTED ABSENCES ── */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="font-bold text-lg">Reported Absences</h3>
                    <p className="text-xs text-slate-500">Students marked absent from their community session.</p>
                  </div>
                  <Badge variant="outline" className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-none">
                    {absentStudents.length} Absences Reported
                  </Badge>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {absentStudents.length === 0 ? (
                    <div className="p-12 text-center space-y-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                        <XCircle className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">No Absences</h4>
                      <p className="text-xs text-slate-500">No students have been marked absent for this date yet.</p>
                    </div>
                  ) : (
                    absentStudents.map(enr => (
                      <div key={enr.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold border border-rose-100 dark:border-rose-800">
                            {enr.student.user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white leading-tight text-sm">{enr.student.user.name}</p>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-medium mt-1">Grade {enr.student.gradeLevel}</Badge>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                           <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-none text-[10px] uppercase font-black tracking-widest px-2 py-1">
                             Absent
                           </Badge>
                           {selectedDayId && (
                            <NudgeStudentButton 
                              studentId={enr.student.id} 
                              dayId={selectedDayId} 
                              studentName={enr.student.user.name} 
                            />
                           )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 dark:bg-slate-900/20 border-2 border-dashed rounded-3xl p-8 border-slate-200 dark:border-slate-800">
              <AlertTriangle className="w-10 h-10 mb-4 opacity-20" />
              <p className="font-medium text-sm">Select a date from the sidebar to view enrollment and attendance reports.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
