import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { unstable_noStore as noStore } from "next/cache"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { EditSectionDialog } from "@/components/dashboard/academics/edit-section-dialog"
import { deleteSection } from "@/app/actions/academics"
import { Trash2 } from "lucide-react"
import { MarkdownContent } from "@/components/ui/markdown-content"

import { getActiveSchoolYearTerms } from "@/lib/terms"

export const metadata = {
  title: "Course Details | Schoolyard",
}

export default async function CourseDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  noStore()

  const { id } = await params

  const course = await db.course.findUnique({
    where: { id },
    include: {
      sections: {
        where: session.user.role === 'TEACHER' ? { teacher: { userId: session.user.id } } : {},
        include: {
          term: { include: { schoolYear: true } },
          teacher: {
            include: { user: true }
          },
          _count: {
            select: { enrollments: true }
          }
        }
      }
    }
  }) as any

  if (!course) return notFound()

  // Fetch data for editing sections (Admin only)
  let teachers: any[] = []
  let periods: any[] = []
  let terms: any[] = []
  
  if (session.user?.role === 'ADMIN') {
    teachers = await db.teacher.findMany({
      include: { user: true },
      orderBy: { user: { name: 'asc' } }
    })
    periods = await db.bellPeriod.findMany({
      orderBy: { periodNumber: 'asc' }
    })
    terms = await getActiveSchoolYearTerms()
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/academics/courses">← Back to Catalog</Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{course.name} ({course.code})</h2>
          <MarkdownContent content={course.description} className="mt-2 max-w-2xl text-muted-foreground prose-sm" />
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-lg py-1 px-3 h-fit">{course.credits} Credits</Badge>
          {session.user?.role === 'ADMIN' && (
            <Button asChild style={{ background: "var(--school-primary, #4f46e5)" }}>
              <Link href={`/dashboard/academics/courses/${course.id}/sections/new`}>+ Add Section</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <h3 className="text-xl font-semibold border-b pb-2">Active Sections</h3>
        
        <div className="rounded-md border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Term</TableHead>
                <TableHead>Instructor</TableHead>
                <TableHead>Schedule / Room</TableHead>
                <TableHead>Enrollment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {course.sections.filter((s: any) => !s.isArchived && s.term?.schoolYear?.isActive).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    No active sections found.
                  </TableCell>
                </TableRow>
              ) : (
                course.sections.filter((s: any) => !s.isArchived && s.term?.schoolYear?.isActive).map((section: any) => (
                  <TableRow key={section.id}>
                    <TableCell className="font-medium">
                      {section.term ? `${section.term.name} (${section.term.schoolYear.name})` : section.legacyTerm}
                    </TableCell>
                    <TableCell>{section.teacher.user.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{section.schedule}</span>
                        <span className="text-xs text-muted-foreground">{section.room}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{section._count.enrollments} Students</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {session.user?.role === 'ADMIN' && (
                          <>
                            <EditSectionDialog 
                              section={{
                                ...section,
                                courseId: course.id
                              }} 
                              teachers={teachers} 
                              periods={periods} 
                              terms={terms} 
                            />
                            <form action={async () => {
                              "use server"
                              await deleteSection(section.id)
                            }}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </form>
                          </>
                        )}
                        <Button variant="secondary" size="sm" asChild className="h-8">
                          <Link href={`/dashboard/academics/sections/${section.id}`}>View Section</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Archived Sections */}
      {course.sections.some((s: any) => s.isArchived || !s.term?.schoolYear?.isActive) && (
        <div className="mt-12 space-y-4 opacity-60 grayscale hover:grayscale-0 transition-all">
          <h3 className="text-xl font-semibold border-b pb-2 text-slate-500">Archived Sections</h3>
          <div className="rounded-md border bg-slate-50/50 dark:bg-slate-900/50">
            <Table>
              <TableBody>
                {course.sections.filter((s: any) => s.isArchived || !s.term?.schoolYear?.isActive).map((section: any) => (
                  <TableRow key={section.id}>
                    <TableCell className="font-medium">
                      {section.term ? `${section.term.name} (${section.term.schoolYear.name})` : section.legacyTerm}
                    </TableCell>
                    <TableCell>{section.teacher.user.name}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/academics/sections/${section.id}`}>View Archive</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
