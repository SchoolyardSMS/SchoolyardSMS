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
import { GradebookWorksheet } from "./gradebook-worksheet"
import { GradebookTable } from "./gradebook-table"

export const metadata = {
  title: "Gradebook | Schoolyard",
}

export default async function GradebookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ termId?: string; blank?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const [resolvedParams, resolvedSearchParams] = await Promise.all([params, searchParams])
  const { id } = resolvedParams
  const { termId: selectedTermId, blank } = resolvedSearchParams

  const section = await db.section.findUnique({
    where: { id },
    include: {
      course: true,
      teacher: { include: { user: true } },
      term: { include: { children: true, schoolYear: true } },
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

  const isBlankMode = blank === "true"

  if (isBlankMode) {
    return <GradebookWorksheet section={section} />
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
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
      <div className="no-print">
        <GradebookClientControls
          sectionId={id}
          possibleTerms={possibleTerms}
          currentTermId={selectedTermId || null}
          sectionActiveTermId={section.termId}
        />
      </div>

      {selectedTermId && (
        <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 p-4 rounded-2xl flex items-center gap-3 no-print">
          <Award className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="text-xs text-amber-800 dark:text-amber-300 font-medium">
            You are viewing the archived snapshot for <span className="font-black">{activeTermName}</span>. Grades are locked. To resume standard grading, select <span className="font-semibold">Current Quarter</span> above.
          </div>
        </div>
      )}

      <div className="rounded-3xl border bg-white dark:bg-slate-900 shadow-xl overflow-hidden border-slate-200 dark:border-slate-800">
        <GradebookTable 
          section={section}
          assignments={assignments}
          gradeMap={gradeMap}
          snapshots={snapshots}
          selectedTermId={selectedTermId}
        />
      </div>
      
      {!selectedTermId && (
        <div className="flex items-center justify-center gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 dark:text-slate-600 no-print">
           <span>Auto-Saving Active</span>
           <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      )}

      {/* Populated Gradebook Print Media Styles */}
      <style>{`
        @media print {
          .no-print, header, nav, aside {
            display: none !important;
          }
          body, html, main, .flex-1 {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
          body::-webkit-scrollbar, html::-webkit-scrollbar, main::-webkit-scrollbar {
            display: none !important;
          }
          div.pb-20 {
            padding-bottom: 0 !important;
          }
          .rounded-3xl {
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #cbd5e1 !important;
            padding: 6px 8px !important;
            color: black !important;
            background: white !important;
            font-size: 10px !important;
          }
          th {
            font-weight: bold !important;
            text-transform: uppercase !important;
          }
          /* Remove sticky overrides during print */
          .sticky {
            position: static !important;
          }
          @page {
            size: landscape;
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  )
}
