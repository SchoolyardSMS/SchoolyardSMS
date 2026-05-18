import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { updateCourse, deleteCourse } from "@/app/actions/academics"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MarkdownEditor } from "@/components/ui/markdown-editor"

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== 'ADMIN') redirect("/login")

  const course = await db.course.findUnique({ where: { id } })
  if (!course) notFound()

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-slate-800">Edit Course</h1>
          <p className="text-sm text-slate-400 font-medium">Update coarse catalog entry for {course.code}</p>
        </div>
        <form action={deleteCourse.bind(null, id)}>
           <Button type="submit" variant="destructive" size="sm" className="rounded-full shadow-lg">Delete Course</Button>
        </form>
      </div>

      <form action={updateCourse.bind(null, id)} className="bg-white dark:bg-slate-900 p-8 rounded-3xl border shadow-xl space-y-6">
        <div className="grid gap-2">
          <Label htmlFor="code" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Course Code</Label>
          <Input id="code" name="code" defaultValue={course.code} required className="rounded-xl border-slate-200" />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Course Name</Label>
          <Input id="name" name="name" defaultValue={course.name} required className="rounded-xl border-slate-200" />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="credits" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Credits</Label>
          <Input id="credits" name="credits" type="number" step="0.5" defaultValue={course.credits} className="rounded-xl border-slate-200" />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</Label>
          <MarkdownEditor name="description" defaultValue={course.description || ""} placeholder="Course overview, prerequisites, learning objectives..." />
        </div>

        <div className="pt-4 flex items-center gap-3">
           <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 rounded-full px-8 shadow-lg shadow-indigo-200">Save Changes</Button>
           <Button variant="ghost" asChild className="rounded-full">
              <a href="/dashboard/academics/courses">Cancel</a>
           </Button>
        </div>
      </form>
    </div>
  )
}
