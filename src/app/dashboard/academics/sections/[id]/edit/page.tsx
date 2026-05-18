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

export default async function EditSectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== 'ADMIN') redirect("/login")

  const section = await db.section.findUnique({
    where: { id },
    include: { course: true, teacher: { include: { user: true } } }
  })
  if (!section) notFound()

  const teachers = await db.teacher.findMany({ include: { user: true } })
  const bellPeriods = await (db as any).bellPeriod.findMany()
  const terms = await db.term.findMany({ include: { schoolYear: true }, orderBy: { startDate: 'desc' } })

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-slate-800">Edit Section</h1>
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

      <form action={updateSection.bind(null, id)} className="bg-white dark:bg-slate-900 p-8 rounded-3xl border shadow-xl space-y-6">
        <div className="grid gap-2">
          <Label htmlFor="teacherId" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Teacher</Label>
          <select name="teacherId" defaultValue={section.teacherId} className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="" disabled>Select teacher</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>{t.user.name} ({t.department})</option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="termId" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Term</Label>
          <select name="termId" defaultValue={section.termId || ""} className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="" disabled>Select term</option>
            {terms.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.schoolYear.name})</option>
            ))}
          </select>
          <p className="text-[10px] text-slate-500">Legacy: {section.legacyTerm}</p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="room" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Room Number</Label>
          <Input id="room" name="room" defaultValue={section.room || ""} className="rounded-xl border-slate-200" />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="schedule" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Legacy Schedule String</Label>
          <Input id="schedule" name="schedule" defaultValue={section.schedule} className="rounded-xl border-slate-200" />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="bellPeriodId" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bell Period (Standardized)</Label>
          <select name="bellPeriodId" defaultValue={(section as any).bellPeriodId || "none"} className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="none">None / Flexible</option>
            {bellPeriods.map((bp: any) => (
              <option key={bp.id} value={bp.id}>{bp.name} ({bp.startTime} - {bp.endTime})</option>
            ))}
          </select>
        </div>

        <div className="pt-4 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 rounded-full px-8 shadow-lg shadow-indigo-200">Update Section</Button>
             <Button variant="ghost" asChild className="rounded-full">
                <a href={`/dashboard/academics/courses/${section.courseId}`}>Cancel</a>
             </Button>
           </div>
        </div>
      </form>
    </div>
  )
}
