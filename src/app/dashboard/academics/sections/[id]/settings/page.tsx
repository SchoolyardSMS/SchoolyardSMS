import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { SettingsClient } from "./settings-client"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Settings, ChevronLeft, AlertCircle } from "lucide-react"
import { archiveSection } from "@/app/actions/academics"

export const metadata = {
  title: "Section Settings | Schoolyard",
}

export default async function SectionSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const { id } = await params

  const section = await db.section.findUnique({
    where: { id },
    include: {
      course: true,
      teacher: { include: { user: true } }
    }
  })

  if (!section) return notFound()

  if (session.user?.role !== 'ADMIN' && section.teacher.user.id !== session.user?.id) {
    redirect(`/dashboard/academics/sections/${section.id}`) 
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const weightingConfig = (section as any).weightingConfig || {}

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-8 pt-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-4 pb-4">
        <Button variant="ghost" size="sm" asChild className="rounded-full">
          <Link href={`/dashboard/academics/sections/${section.id}`}><ChevronLeft className="h-4 w-4 mr-1" /> Back to Section</Link>
        </Button>
      </div>

      <div className="flex items-center gap-3 text-slate-900 dark:text-white">
        <div className="h-12 w-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <Settings className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Grading Settings</h1>
          <p className="text-muted-foreground">{section.course.name} • {section.legacyTerm}</p>
        </div>
      </div>

      <SettingsClient sectionId={section.id} initialConfig={weightingConfig} />

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-100 dark:border-rose-900/30 p-8 shadow-sm mt-8 overflow-hidden">
        <div className="flex items-center gap-3 text-rose-600 mb-6">
          <AlertCircle className="h-6 w-6" />
          <h2 className="text-xl font-bold">Danger Zone</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
          <div>
            <h3 className="font-bold text-rose-900 dark:text-rose-100">Archive this Section</h3>
            <p className="text-sm text-rose-600 dark:text-rose-400 mt-1">
              Archived sections are hidden from active dashboards but historical grades and attendance are preserved.
            </p>
          </div>
          <form action={async () => {
            "use server"
            await archiveSection(section.id)
            redirect(`/dashboard/academics/courses/${section.courseId}`)
          }}>
            <Button type="submit" variant="destructive" className="rounded-full px-8 shadow-md">
              Archive Section
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
