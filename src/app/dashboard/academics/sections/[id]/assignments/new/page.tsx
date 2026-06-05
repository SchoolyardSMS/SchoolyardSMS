import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { createAssignment } from "@/app/actions/academics"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { MarkdownEditor } from "@/components/ui/markdown-editor"

export const metadata = { title: "New Assignment | Schoolyard" }

export default async function NewAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== "ADMIN" && session.user?.role !== "TEACHER")) {
    redirect("/dashboard/academics/courses")
  }

  const { id } = await params
  const section = await db.section.findUnique({
    where: { id },
    include: { course: true }
  })

  if (!section) return notFound()

  return (
    <div className="flex-1 p-8 pt-6 max-w-2xl space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Create Assignment</h2>
        <p className="text-muted-foreground mt-1">Add a new task for {section.course.name} ({section.legacyTerm}).</p>
      </div>

      <form action={createAssignment} className="space-y-6">
        <input type="hidden" name="sectionId" value={section.id} />
        
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
          <div className="space-y-2">
            <label htmlFor="assignment-title" className="text-sm font-medium">Assignment Title <span className="text-red-500">*</span></label>
            <input id="assignment-title" name="title" type="text" required placeholder="e.g. Chapter 1 Quiz, Lab Report #2"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="assignment-type" className="text-sm font-medium">Assignment Type</label>
              <select id="assignment-type" name="type" defaultValue="HOMEWORK"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="HOMEWORK">Homework</option>
                <option value="QUIZ">Quiz</option>
                <option value="TEST">Test</option>
                <option value="PROJECT">Project</option>
                <option value="LAB">Lab</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="assignment-status" className="text-sm font-medium">Initial Status</label>
              <select id="assignment-status" name="status" defaultValue="PUBLISHED"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="DRAFT">Draft (Always hidden until manual publish)</option>
                <option value="PUBLISHED">Published (Visible if Go Live date passed)</option>
                <option value="CLOSED">Closed (Visible but no submissions)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="assignment-publish-date" className="text-sm font-medium">Go Live Date (ET)</label>
              <input id="assignment-publish-date" name="publishDate" type="date"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-[10px] text-muted-foreground italic">Optional: Leave blank to publish immediately.</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="assignment-publish-time" className="text-sm font-medium">Go Live Time (ET)</label>
              <input id="assignment-publish-time" name="publishTime" type="time" defaultValue="08:00"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="assignment-max-score" className="text-sm font-medium">Max Score <span className="text-red-500">*</span></label>
              <input id="assignment-max-score" name="maxScore" type="number" required defaultValue={100}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="assignment-due-date" className="text-sm font-medium">Due Date <span className="text-red-500">*</span></label>
              <input id="assignment-due-date" name="dueDate" type="date" required 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="assignment-description" className="text-sm font-medium">Instructions / Description</label>
              <span className="text-[10px] text-muted-foreground font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">Markdown Editor</span>
            </div>
            <MarkdownEditor id="assignment-description" name="description" placeholder="Provide clear instructions for the students..." />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" name="allowUpload" id="allowUpload" defaultChecked
              className="h-4 w-4 rounded border-input accent-indigo-600"
            />
            <label htmlFor="allowUpload" className="text-sm font-medium cursor-pointer">
              Enable student file uploads
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" style={{ background: "var(--school-primary, #4f46e5)" }} className="text-white">
            Create Assignment
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/academics/sections/${section.id}?tab=assignments`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
