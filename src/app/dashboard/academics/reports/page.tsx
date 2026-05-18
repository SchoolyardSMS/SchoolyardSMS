import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { PublishReportCardsClient } from "./publish-client"
import { ReportCardDownloader } from "@/app/dashboard/directory/[id]/report-card-downloader"

export const metadata = {
  title: "Reports | Schoolyard",
}

export default async function ReportsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")

  const role = session.user.role
  let studentProfile: any = null

  if (role === "STUDENT") {
    studentProfile = await db.student.findUnique({
      where: { userId: session.user.id },
      include: {
        reportCards: {
          where: { isPublished: true },
          include: { term: true },
          orderBy: { publishedAt: "desc" }
        }
      }
    })
  }

  const terms = await db.term.findMany({
    orderBy: { startDate: "desc" }
  })

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 bg-transparent">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Documents & Reports</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {role === "STUDENT" ? "Access your official school records" : "Generate school-wide compliance reports"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        {/* Academic Records Card */}
        <div className="rounded-xl border bg-card dark:bg-slate-900 p-6 shadow-sm flex flex-col gap-4 border-slate-200 dark:border-slate-800">
          <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-indigo-600 dark:text-indigo-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">Report Cards</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Official summary of grades, attendance, and GPA for the current and past terms.
            </p>
          </div>
          <div className="mt-auto pt-4 border-t dark:border-slate-800 flex flex-col gap-2">
            {role === "STUDENT" ? (
              studentProfile ? (
                <ReportCardDownloader
                  studentId={studentProfile.id}
                  reportCards={(studentProfile as any).reportCards ?? []}
                />
              ) : (
                <p className="text-sm text-center text-muted-foreground italic">No student profile found. Contact administration.</p>
              )
            ) : (role === "ADMIN" || role === "TEACHER") ? (
              <>
                <Button asChild variant="outline" className="w-full">
                  <a href="/api/reports/export/full-report-cards" download>
                    Batch Export All (PDF)
                  </a>
                </Button>
                
                {role === "ADMIN" && <PublishReportCardsClient terms={terms} />}

                <Button asChild variant="secondary" className="w-full border-indigo-200 dark:border-indigo-900 mt-2">
                  <Link href="/dashboard/academics/reports/templates">
                    Manage Templates
                  </Link>
                </Button>
                <p className="text-[10px] text-center text-muted-foreground italic">Individual student reports can be found in their profiles.</p>
              </>
            ) : (
              <p className="text-[10px] text-center text-muted-foreground italic">Report cards are available on student profile pages.</p>
            )}
          </div>
        </div>

        {/* Attendance Records Card */}
        <div className="rounded-xl border bg-card dark:bg-slate-900 p-6 shadow-sm flex flex-col gap-4 border-slate-200 dark:border-slate-800">
          <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-emerald-600 dark:text-emerald-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">Attendance Data</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Detailed logs of daily presence, tardies, and absences.
            </p>
          </div>
          <div className="mt-auto pt-4 border-t dark:border-slate-800">
            {role === "ADMIN" || role === "TEACHER" ? (
              <Button asChild variant="outline" className="w-full">
                <a href="/api/reports/export/attendance" download>
                  Export School-Wide (CSV)
                </a>
              </Button>
            ) : (
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/attendance">
                  Student Attendance View
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Discipline Records Card */}
        {(role === "ADMIN" || role === "TEACHER") && (
          <div className="rounded-xl border bg-card dark:bg-slate-900 p-6 shadow-sm flex flex-col gap-4 border-slate-200 dark:border-slate-800">
            <div className="h-10 w-10 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-red-600 dark:text-red-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">Discipline Compliance</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Incident logs categorized for state reporting and internal analysis.
              </p>
            </div>
            <div className="mt-auto pt-4 border-t dark:border-slate-800">
              <Button asChild variant="outline" className="w-full">
                <a href="/api/reports/export/discipline" download>
                  Export Log (CSV)
                </a>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
