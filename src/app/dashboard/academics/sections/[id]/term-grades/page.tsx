import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { TermGradesClient } from "./term-grades-client"

export const metadata = { title: "Term Grades | Schoolyard" }

export default async function TermGradesPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ termId?: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) redirect("/dashboard")

  const { id } = await params
  const { termId } = await searchParams

  const [section, schoolSettings] = await Promise.all([
    db.section.findUnique({
      where: { id },
      include: {
        course: true,
        teacher: true,
        term: { include: { children: true } }
      }
    }),
    db.schoolSettings.findUnique({ where: { id: "singleton" }, select: { activeTerm: true, gradingScale: true } })
  ])

  if (!section) return notFound()

  // Teachers can only edit their own sections
  if (session.user.role === "TEACHER" && section.teacher.userId !== session.user.id) {
    redirect("/dashboard")
  }

  let possibleTerms: any[] = []
  if (section.term) {
    const allYearTerms = await db.term.findMany({
      where: { schoolYearId: section.term.schoolYearId }
    })

    const collectDescendants = (parentId: string, depth: number): any[] => {
      const children = allYearTerms.filter(t => t.parentId === parentId)
      return children.reduce((acc, child) => {
        const indent = "— ".repeat(depth)
        const childWithLabel = {
          ...child,
          displayName: `${indent}${child.name} (${child.type})`
        }
        return [...acc, childWithLabel, ...collectDescendants(child.id, depth + 1)]
      }, [] as any[])
    }

    possibleTerms = [
      { ...section.term, displayName: `${section.term.name} (${section.term.type})` },
      ...collectDescendants(section.term.id, 1)
    ]
  }

  const activeTermFromSettings = schoolSettings?.activeTerm
  const matchingActiveTerm = activeTermFromSettings
    ? possibleTerms.find(t => t.name.toLowerCase() === activeTermFromSettings.toLowerCase())
    : null

  const selectedTermId = termId || matchingActiveTerm?.id || section.termId
  const selectedTerm = possibleTerms.find(t => t.id === selectedTermId)

  const enrollments = await db.enrollment.findMany({
    where: { sectionId: id, status: "ENROLLED" },
    include: {
      student: { include: { user: true } },
      termGrades: selectedTermId ? {
        where: { termId: selectedTermId }
      } : false
    },
    orderBy: { student: { user: { name: "asc" } } }
  })

  const [assignments, grades] = await Promise.all([
    db.assignment.findMany({
      where: { sectionId: id, status: { in: ["PUBLISHED", "CLOSED"] } },
      orderBy: { dueDate: "asc" }
    }),
    db.grade.findMany({
      where: { assignment: { sectionId: id } }
    })
  ])

  const gradingScale = Array.isArray(schoolSettings?.gradingScale) ? schoolSettings.gradingScale : []

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <Link href={`/dashboard/academics/sections/${id}?tab=term-grades`} className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-widest">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Section Hub
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Manage Term Grades</h1>
        <p className="text-slate-500">
          Section: <span className="font-bold">{section.course.name}</span>
          {" · "}
          <span className="text-slate-400">{enrollments.length} student{enrollments.length !== 1 ? "s" : ""} enrolled</span>
        </p>
      </div>

      {possibleTerms.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <label className="text-sm font-bold text-slate-900 dark:text-white">Select Term to Grade:</label>
          <form className="flex gap-2">
            <select name="termId" defaultValue={selectedTermId || ""} className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm min-w-[200px]">
              {possibleTerms.map((t: any) => (
                <option key={t.id} value={t.id}>{t.displayName}</option>
              ))}
            </select>
            <button type="submit" className="h-10 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-lg text-sm transition-colors">
              Change Term
            </button>
          </form>
        </div>
      )}

      {selectedTermId ? (
        <TermGradesClient
          key={selectedTermId}
          sectionId={id}
          enrollments={enrollments}
          termId={selectedTermId}
          termName={selectedTerm?.name || "Selected Term"}
          gradingScale={gradingScale}
          assignments={assignments}
          grades={grades}
          weightingConfig={section.weightingConfig}
        />
      ) : (
        <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500">
          No term is associated with this section. Please configure the term in the section settings.
        </div>
      )}
    </div>
  )
}

