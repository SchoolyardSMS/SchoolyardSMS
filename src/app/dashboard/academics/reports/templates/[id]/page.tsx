import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { ReportCardEditor } from "@/components/dashboard/reports/report-card-editor"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function TemplateBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== "ADMIN") redirect("/dashboard")

  const { id } = await params

  const template = await (db as any).reportCardTemplate.findUnique({
    where: { id }
  })

  if (!template) return notFound()

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="rounded-full">
          <Link href="/dashboard/academics/reports/templates">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Templates
          </Link>
        </Button>
      </div>

      <ReportCardEditor template={template} />
    </div>
  )
}
