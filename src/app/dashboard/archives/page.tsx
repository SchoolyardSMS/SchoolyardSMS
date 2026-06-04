import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getDecompressedArchive } from "@/app/actions/archive"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Archive, Calendar, Users, FileText, CheckCircle2, ChevronRight, BookOpen, Clock } from "lucide-react"

export const metadata = { title: "Archives Portal | Schoolyard" }

export default async function ArchivesPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ yearId?: string; sectionId?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session || !["ADMIN", "TEACHER"].includes(session.user.role)) {
    redirect("/dashboard")
  }

  const { yearId, sectionId } = await searchParams

  // Fetch all school years
  const schoolYears = await db.schoolYear.findMany({
    orderBy: { startDate: "desc" }
  })

  let archivedSections: any[] = []
  let selectedArchive: any = null

  if (yearId) {
    const terms = await db.term.findMany({
      where: { schoolYearId: yearId }
    })
    const termIds = terms.map(t => t.id)

    archivedSections = await db.section.findMany({
      where: { termId: { in: termIds }, isArchived: true },
      include: {
        course: true,
        teacher: { include: { user: true } },
        term: true
      }
    })
  }

  if (sectionId) {
    selectedArchive = await getDecompressedArchive("SECTION", sectionId)
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
          <Archive className="w-8 h-8 text-teal-600" />
          Archives Portal
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Browse historical course gradebooks, student rosters, and records from completed school years.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Selector & Section List */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              Select Archive Year
            </h3>
            
            <div className="space-y-2">
              {schoolYears.map(year => (
                <Link
                  key={year.id}
                  href={`/dashboard/archives?yearId=${year.id}`}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold transition-all ${
                    yearId === year.id
                      ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-400 shadow-sm"
                      : "border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/10 hover:border-slate-300 hover:bg-slate-100/50"
                  }`}
                >
                  <span>{year.name} {year.isActive && "(Active)"}</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              ))}
              {schoolYears.length === 0 && (
                <p className="text-xs text-slate-400 italic">No school years defined yet.</p>
              )}
            </div>
          </div>

          {yearId && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                Archived Sections ({archivedSections.length})
              </h3>
              
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {archivedSections.map(sec => (
                  <Link
                    key={sec.id}
                    href={`/dashboard/archives?yearId=${yearId}&sectionId=${sec.id}`}
                    className={`block p-3.5 rounded-xl border transition-all text-left ${
                      sectionId === sec.id
                        ? "border-teal-500 bg-teal-50/30 dark:bg-teal-950/10"
                        : "border-slate-100 dark:border-slate-800 hover:bg-slate-50/50"
                    }`}
                  >
                    <p className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                      {sec.course.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">
                      {sec.course.code} · {sec.teacher.user.name}
                    </p>
                    <div className="flex gap-1.5 mt-2">
                      <Badge variant="outline" className="text-[9px] py-0 px-1 border-teal-200 text-teal-700 bg-teal-50/30 dark:border-teal-850">
                        {sec.term?.name || "Term"}
                      </Badge>
                    </div>
                  </Link>
                ))}
                {archivedSections.length === 0 && (
                  <p className="text-xs text-slate-400 italic py-4 text-center">No archived sections in this year.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Decompressed Section Details Viewer */}
        <div className="lg:col-span-8">
          {selectedArchive ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in duration-300 space-y-6">
              {/* Header block */}
              <div className="p-6 bg-slate-50/50 dark:bg-slate-800/10 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-[10px] uppercase font-black tracking-widest text-slate-400">Archived Record</span>
                    <Badge variant="secondary" className="bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400 text-[10px] uppercase font-bold tracking-wider">
                      GZIP COMPRESSED
                    </Badge>
                  </div>
                  <h2 className="text-2xl font-black text-slate-950 dark:text-white uppercase tracking-tight">
                    {selectedArchive.course.name} ({selectedArchive.course.code})
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Instructor ID: {selectedArchive.teacherId} · Room: {selectedArchive.room || "N/A"} · Schedule: {selectedArchive.schedule}
                  </p>
                </div>
              </div>

              {/* Assignments snapshot */}
              <div className="px-6 space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b pb-1.5">
                  <FileText className="w-4 h-4 text-teal-600" />
                  Archived Gradebook & Assignments ({selectedArchive.assignments?.length || 0})
                </h3>
                <div className="border border-slate-100 dark:border-slate-850 rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-55 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-widest text-[9px] text-slate-400">
                        <th className="py-2.5 px-4">Assignment Title</th>
                        <th className="py-2.5 px-4">Category</th>
                        <th className="py-2.5 px-4 text-center">Weight</th>
                        <th className="py-2.5 px-4 text-right">Max Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-medium">
                      {selectedArchive.assignments?.map((a: any) => (
                        <tr key={a.id} className="hover:bg-slate-50/30">
                          <td className="py-3 px-4 font-bold text-slate-850 dark:text-slate-200">{a.title}</td>
                          <td className="py-3 px-4 text-slate-500">{a.category}</td>
                          <td className="py-3 px-4 text-center font-mono">{a.weight}%</td>
                          <td className="py-3 px-4 text-right font-mono font-bold">{a.maxScore} pts</td>
                        </tr>
                      ))}
                      {(!selectedArchive.assignments || selectedArchive.assignments.length === 0) && (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-400 italic">No assignments logged.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Student Roster & Term Grades */}
              <div className="px-6 space-y-3 pb-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b pb-1.5">
                  <Users className="w-4 h-4 text-teal-600" />
                  Student Enrollment & Grades ({selectedArchive.enrollments?.length || 0})
                </h3>
                <div className="border border-slate-100 dark:border-slate-850 rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-55 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-widest text-[9px] text-slate-400">
                        <th className="py-2.5 px-4">Student ID</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4 text-right">Term Grades Snapshot</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-medium">
                      {selectedArchive.enrollments?.map((enr: any) => (
                        <tr key={enr.id} className="hover:bg-slate-50/30">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-300">{enr.studentId}</td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-650 text-[9px] uppercase font-black tracking-wider">
                              {enr.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-y-1">
                            {enr.termGrades?.map((tg: any, idx: number) => (
                              <div key={idx} className="flex justify-end gap-2 text-[10px]">
                                <span className="text-slate-400 uppercase font-black tracking-wider">Term {tg.termId?.substring(0, 4)}:</span>
                                <span className="font-bold text-slate-900 dark:text-white font-mono">{tg.overrideScore ?? tg.calculatedScore}% ({tg.letterGrade})</span>
                              </div>
                            ))}
                            {(!enr.termGrades || enr.termGrades.length === 0) && (
                              <span className="text-slate-400 italic">No final term grades snapshotted</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-96 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 flex flex-col justify-center items-center text-center p-8">
              <Archive className="w-12 h-12 text-slate-350 dark:text-slate-600 mb-3 animate-pulse" />
              <h4 className="font-bold text-slate-800 dark:text-white uppercase tracking-tight text-sm">No Section Selected</h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                Select a school year in the left pane, then click an archived section to load its decompressed historical gradebook snapshot.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
