import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { updateSection, deleteSection } from "@/app/actions/academics"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { getActiveSchoolYearTerms } from "@/lib/terms"

import { SectionForm } from "@/components/dashboard/academics/section-form"

export default async function EditSectionPage({ params }: { params: Promise<{ id: string }> }) {
  const [resolvedParams, session] = await Promise.all([params, getServerSession(authOptions)])
  const { id } = resolvedParams
  if (!session || session.user?.role !== 'ADMIN') redirect("/login")

  const section = await db.section.findUnique({
    where: { id },
    include: { course: true, teacher: { include: { user: true } } }
  })
  if (!section) notFound()

  const [teachers, bellPeriods, terms] = await Promise.all([
    db.teacher.findMany({ include: { user: true } }),
    db.bellPeriod.findMany(),
    getActiveSchoolYearTerms()
  ])

  async function handleUpdate(formData: FormData) {
    "use server"
    const bellPeriodId = formData.get("bellPeriodId")
    if (bellPeriodId === "NONE") {
      formData.set("bellPeriodId", "")
    }
    await updateSection(id, formData)
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-slate-800 dark:text-white">Edit Section</h1>
          <p className="text-sm text-slate-400 font-medium">{section.course.name} - {section.legacyTerm}</p>
          {section.isArchived && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 mt-2">
              Archived
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <form action={deleteSection.bind(null, id)}>
            <Button type="submit" variant="destructive" size="sm" className="rounded-full shadow-lg">Delete</Button>
          </form>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border shadow-xl">
        <SectionForm 
          courseId={section.courseId}
          action={handleUpdate}
          initialData={section}
          teachers={teachers}
          terms={terms}
          periods={bellPeriods}
          cancelHref={`/dashboard/academics/courses/${section.courseId}`}
          submitLabel="Update Section"
        />
      </div>
    </div>
  )
}
