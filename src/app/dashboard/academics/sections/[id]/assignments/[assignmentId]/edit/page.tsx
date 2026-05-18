import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { updateAssignmentDetails } from "@/app/actions/academics"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { MarkdownEditor } from "@/components/ui/markdown-editor"
import { toETDateValue, toETTimeValue, toDateInputValue } from "@/lib/dates"

export const metadata = { title: "Edit Assignment | Schoolyard" }

export default async function EditAssignmentPage({ params }: { params: Promise<{ id: string; assignmentId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== "ADMIN" && session.user?.role !== "TEACHER")) {
    redirect("/dashboard/academics/courses")
  }

  const { id, assignmentId } = await params
  
  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    include: { section: { include: { course: true } } }
  }) as any

  if (!assignment || assignment.sectionId !== id) return notFound()

  // Use toDateInputValue for due date as it is stored as a Date-only field
  const formattedDueDate = toDateInputValue(assignment.dueDate)

  // Use ET helpers for publish date/time as they are stored as full timestamps
  const formattedPubDate = toETDateValue(assignment.publishDate)
  const formattedPubTime = assignment.publishDate ? toETTimeValue(assignment.publishDate) : "08:00"

  return (
    <div className="flex-1 p-8 pt-6 max-w-2xl space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Edit Assignment</h2>
        <p className="text-muted-foreground mt-1">Update details for {assignment.section.course.name} ({assignment.section.term}).</p>
      </div>

      <form action={updateAssignmentDetails} className="space-y-6">
        <input type="hidden" name="sectionId" value={assignment.sectionId} />
        <input type="hidden" name="assignmentId" value={assignment.id} />
        
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Assignment Title <span className="text-red-500">*</span></label>
            <input name="title" type="text" required defaultValue={assignment.title}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Assignment Type</label>
              <select name="type" defaultValue={assignment.type}
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
              <label className="text-sm font-medium">Status</label>
              <select name="status" defaultValue={assignment.status}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="DRAFT">Draft (Always hidden until manual publish)</option>
                <option value="PUBLISHED">Published (Visible if Go Live date passed)</option>
                <option value="CLOSED">Closed (Visible but no submissions allowed)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Go Live Date (ET)</label>
              <input name="publishDate" type="date" defaultValue={formattedPubDate}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-[10px] text-muted-foreground italic">Optional: Leave blank to publish immediately.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Go Live Time (ET)</label>
              <input name="publishTime" type="time" defaultValue={formattedPubTime}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Score <span className="text-red-500">*</span></label>
              <input name="maxScore" type="number" required defaultValue={assignment.maxScore}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Due Date <span className="text-red-500">*</span></label>
              <input name="dueDate" type="date" required defaultValue={formattedDueDate}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Instructions / Description</label>
              <span className="text-[10px] text-muted-foreground font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">Markdown Editor</span>
            </div>
            <MarkdownEditor name="description" defaultValue={assignment.description || ""} placeholder="Provide clear instructions for the students..." />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" name="allowUpload" id="allowUpload" defaultChecked={assignment.allowUpload}
              className="h-4 w-4 rounded border-input accent-indigo-600"
            />
            <label htmlFor="allowUpload" className="text-sm font-medium cursor-pointer">
              Enable student file uploads
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" style={{ background: "var(--school-primary, #4f46e5)" }} className="text-white">
            Save Changes
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/academics/sections/${assignment.sectionId}/assignments/${assignment.id}`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
