import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { formatInET } from "@/lib/dates"
import { createReportCardTemplate } from "@/app/actions/reports"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Layout, FileEdit, Plus, CheckCircle2 } from "lucide-react"

export default async function TemplatesPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== "ADMIN") redirect("/dashboard")

  const templates = await (db as any).reportCardTemplate.findMany({
    orderBy: { updatedAt: "desc" }
  })

  async function createAction(formData: FormData) {
    "use server"
    const name = formData.get("name") as string
    await createReportCardTemplate(name || "New Template")
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Report Card Templates</h2>
          <p className="text-muted-foreground mt-1">
            Build and customize your school's official report card layouts
          </p>
        </div>
        <form action={createAction}>
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4 mr-2" /> New Template
          </Button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template: any) => (
          <Card key={template.id} className="relative overflow-hidden group hover:shadow-md transition-all">
            {template.isDefault && (
              <div className="absolute top-0 right-0 p-2">
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1 px-2 py-0.5">
                  <CheckCircle2 className="h-3 w-3" /> Active Default
                </Badge>
              </div>
            )}
            <CardHeader className="pb-4">
              <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-2">
                <Layout className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <CardTitle className="text-xl">{template.name}</CardTitle>
              <CardDescription>
                Last updated {formatInET(template.updatedAt, { month: 'short', day: 'numeric', year: 'numeric' })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 border-none">
                <Link href={`/dashboard/academics/reports/templates/${template.id}`}>
                  <FileEdit className="h-4 w-4 mr-2" /> Open Builder
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}

        {templates.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl">
            <Layout className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-semibold text-muted-foreground">No templates found</h3>
            <p className="text-sm text-muted-foreground mb-6">Create your first custom report card layout to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function Badge({ children, variant, className }: any) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
      {children}
    </span>
  )
}
