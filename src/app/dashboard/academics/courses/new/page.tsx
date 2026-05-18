import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { createCourse } from "@/app/actions/academics"
import { db } from "@/lib/db"
import Link from "next/link"
import { MarkdownEditor } from "@/components/ui/markdown-editor"

export const metadata = { title: "New Course | Schoolyard" }

export default async function NewCoursePage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard/academics/courses")

  // Fetch all teachers to optionally assign a default teacher to the first section
  const teachers = await db.teacher.findMany({
    include: { user: true },
    orderBy: { user: { name: "asc" } }
  })

  return (
    <div className="flex-1 p-8 pt-6 max-w-2xl space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Create New Course</h2>
        <p className="text-muted-foreground mt-1">Add a new course to the school catalog.</p>
      </div>

      <form action={createCourse} className="space-y-6">
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Course Code <span className="text-red-500">*</span></label>
              <input name="code" type="text" required placeholder="ENG101"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono uppercase outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground">e.g. MATH201, ENG101</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Credits <span className="text-red-500">*</span></label>
              <input name="credits" type="number" min={1} max={6} defaultValue={3}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Course Name <span className="text-red-500">*</span></label>
            <input name="name" type="text" required placeholder="Introduction to English Literature"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Description</label>
              <span className="text-[10px] text-muted-foreground font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">Markdown Editor</span>
            </div>
            <MarkdownEditor name="description" placeholder="Course overview, prerequisites, learning objectives..." />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit"
            className="inline-flex h-10 items-center justify-center rounded-md px-6 text-sm font-semibold text-white transition-colors"
            style={{ background: "var(--school-primary, #4f46e5)" }}
          >
            Create Course
          </button>
          <Link href="/dashboard/academics/courses"
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-6 text-sm font-medium hover:bg-accent transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
