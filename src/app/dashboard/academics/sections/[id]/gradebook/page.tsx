import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { GradeCell } from "./grade-cell"
import { Calculator, User, FileText, TrendingUp, ChevronLeft, Archive, Award } from "lucide-react"
import { calculateGrade, getLetterGrade } from "@/lib/grading"
import { GradebookClientControls } from "./gradebook-client-controls"

export const metadata = {
  title: "Gradebook | Schoolyard",
}

export default async function GradebookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ termId?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const { id } = await params
  const { termId: selectedTermId } = await searchParams

  const section = await db.section.findUnique({
    where: { id },
    include: {
      course: true,
      teacher: { include: { user: true } },
      term: { include: { children: true } },
      enrollments: {
        where: { status: "ENROLLED" },
        include: {
          student: { include: { user: true } }
        },
        orderBy: { student: { user: { name: 'asc' } } }
      }
    }
  })

  if (!section) return notFound()

  const isStaff = session.user?.role === 'ADMIN' || section.teacher.user.id === session.user?.id
  if (!isStaff) {
    redirect(`/dashboard/academics/sections/${section.id}`) 
  }

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

  // 2. Query assignments depending on active vs archived snapshot mode
  const assignments = await db.assignment.findMany({
    where: {
      sectionId: id,
      status: { in: ["PUBLISHED", "CLOSED"] },
      isArchived: selectedTermId ? true : false,
      archivedInTermId: selectedTermId || null,
    },
    orderBy: { dueDate: 'asc' }
  })

  const assignmentIds = assignments.map(a => a.id)
  const grades = await db.grade.findMany({
    where: { assignmentId: { in: assignmentIds } }
  })

  const gradeMap: Record<string, Record<string, number>> = {}
  grades.forEach(g => {
    if (!gradeMap[g.studentId]) gradeMap[g.studentId] = {}
    gradeMap[g.studentId][g.assignmentId] = g.score
  })

  // Load archived term grade snapshots if viewing a past term
  const snapshots = selectedTermId ? await db.termGrade.findMany({
    where: { termId: selectedTermId, enrollment: { sectionId: id } }
  }) : []

  const activeTermName = possibleTerms.find(t => t.id === selectedTermId)?.name || ""

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild className="rounded-full">
            <Link href={`/dashboard/academics/sections/${section.id}`}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Link>
          </Button>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-800 dark:text-white uppercase flex items-center gap-2">
              Gradebook
              {selectedTermId && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 font-black uppercase text-[10px] tracking-widest px-2.5 py-1">
                  <Archive className="w-3.5 h-3.5 mr-1" /> Snapshot
                </Badge>
              )}
            </h2>
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">{section.course.name}</p>
          </div>
        </div>
      </div>

      {/* Modern view filters and actions */}
      <GradebookClientControls
        sectionId={id}
        possibleTerms={possibleTerms}
        currentTermId={selectedTermId || null}
        sectionActiveTermId={section.termId}
      />

      {selectedTermId && (
        <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 p-4 rounded-2xl flex items-center gap-3">
          <Award className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="text-xs text-amber-800 dark:text-amber-300 font-medium">
            You are viewing the archived snapshot for <span className="font-black">{activeTermName}</span>. Grades are locked. To resume standard grading, select <span className="font-semibold">Current Quarter</span> above.
          </div>
        </div>
      )}

      <div className="rounded-3xl border bg-white dark:bg-slate-900 shadow-xl overflow-hidden border-slate-200 dark:border-slate-800">
        <div className="overflow-x-auto">
          <Table className="min-w-[800px] border-collapse text-xs">
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                <TableHead className="w-[180px] sticky left-0 bg-slate-50 dark:bg-slate-800 z-30 border-r dark:border-slate-700 py-6">
                  <div className="flex items-center gap-2 font-black uppercase tracking-widest text-[10px] text-slate-400">
                    <User className="h-3 w-3" />
                    Student
                  </div>
                </TableHead>
                {assignments.map(assignment => (
                  <TableHead key={assignment.id} className="text-center min-w-[120px] px-2 border-r dark:border-slate-800 last:border-0">
                    <div className="flex flex-col items-center">
                      <span className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[100px]">
                        {assignment.title}
                      </span>
                      <div className="flex flex-col items-center gap-0.5 mt-1">
                        <span className="text-[9px] uppercase tracking-tighter text-muted-foreground">
                          {new Date(assignment.dueDate).toLocaleDateString(undefined, { timeZone: "UTC", month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                          / {assignment.maxScore}
                        </span>
                      </div>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="text-right w-[120px] sticky right-0 bg-slate-50 dark:bg-slate-800 z-30 border-l dark:border-slate-700 px-6">
                  <div className="flex items-center justify-end gap-2 text-indigo-600 font-black uppercase tracking-widest text-[10px]">
                    <TrendingUp className="h-3 w-3" />
                    Average
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {section.enrollments.map(enrollment => {
                const sId = enrollment.student.id
                const studentGradesList = assignments.map(a => {
                  const score = gradeMap[sId]?.[a.id]
                  return score !== undefined ? { assignmentId: a.id, score } : null
                }).filter(Boolean) as { assignmentId: string, score: number }[]

                // Determine final GPA either from recalculated average (active) or the saved TermGrade snapshot
                const snapshotGrade = snapshots.find(s => s.enrollmentId === enrollment.id)
                
                const pct = selectedTermId 
                  ? (snapshotGrade?.overrideScore ?? snapshotGrade?.calculatedScore ?? null)
                  : (studentGradesList.length > 0 
                      ? calculateGrade(section, assignments as any, studentGradesList) 
                      : null)

                return (
                  <TableRow key={sId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                    <TableCell className="font-bold sticky left-0 bg-white dark:bg-slate-900 z-20 border-r dark:border-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50 py-4 text-slate-900 dark:text-slate-100">
                      {enrollment.student.user.name}
                    </TableCell>
                    {assignments.map(assignment => {
                      const score = gradeMap[sId]?.[assignment.id] ?? null
                      return (
                        <TableCell key={assignment.id} className="text-center p-2 border-r dark:border-slate-800 last:border-0">
                          <div className="flex flex-col items-center">
                            {selectedTermId ? (
                              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                {score !== null ? `${score} / ${assignment.maxScore}` : "—"}
                              </span>
                            ) : (
                              <GradeCell 
                                assignmentId={assignment.id} 
                                studentId={sId}
                                initialScore={score}
                                maxScore={assignment.maxScore ?? 100}
                              />
                            )}
                          </div>
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-right sticky right-0 bg-white dark:bg-slate-900 z-20 border-l dark:border-slate-800 px-6 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50">
                      <div className="flex flex-col items-end">
                        {pct !== null ? (
                          <>
                            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{pct.toFixed(1)}%</span>
                            <span className="text-[10px] font-black text-slate-400">
                              {selectedTermId ? (snapshotGrade?.letterGrade || getLetterGrade(pct)) : getLetterGrade(pct)}
                            </span>
                          </>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic uppercase tracking-widest">N/A</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
      
      {!selectedTermId && (
        <div className="flex items-center justify-center gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 dark:text-slate-600">
           <span>Auto-Saving Active</span>
           <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      )}
    </div>
  )
}
