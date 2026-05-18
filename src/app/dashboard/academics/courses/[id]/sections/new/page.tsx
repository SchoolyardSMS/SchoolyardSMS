import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { createSection } from "@/app/actions/academics"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { SectionForm } from "@/components/dashboard/academics/section-form"

export const metadata = { title: "New Section | Schoolyard" }

export default async function NewSectionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "ADMIN") redirect("/dashboard")

  const { id: courseId } = await params
  const course = await db.course.findUnique({ where: { id: courseId } })
  if (!course) return notFound()

  // Need teachers and bell periods for the form
  const teachers = await db.teacher.findMany({
    include: { user: true },
    orderBy: { user: { name: 'asc' } }
  })

  const periods = await (db as any).bellPeriod.findMany({
    orderBy: { periodNumber: 'asc' }
  })

  const terms = await db.term.findMany({
    include: { schoolYear: true },
    orderBy: { startDate: 'desc' }
  })

  return (
    <div className="flex-1 p-8 pt-6 max-w-2xl space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Create New Section</h2>
        <p className="text-muted-foreground mt-1">Add a new offering for {course.name}.</p>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <SectionForm 
          courseId={courseId}
          action={createSection}
          teachers={teachers}
          terms={terms}
          periods={periods}
          cancelHref={`/dashboard/academics/courses/${courseId}`}
          submitLabel="Create Section"
        />
      </div>
    </div>
  )
}
