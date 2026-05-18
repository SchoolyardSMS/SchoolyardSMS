import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import Link from "next/link"
import { TermsManagerClient } from "./terms-client"
import { SchoolWideReset } from "./school-wide-reset"

export const metadata = { title: "Terms & School Years | Schoolyard" }

export default async function TermsSetupPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "ADMIN") redirect("/dashboard")

  const schoolYears = await db.schoolYear.findMany({
    include: {
      terms: {
        orderBy: [{ parentId: "asc" }, { startDate: "asc" }]
      }
    },
    orderBy: { startDate: "desc" }
  })

  // Extract all terms for the school-wide reset selector
  const allTerms = schoolYears.flatMap(year => year.terms)

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <Link href="/dashboard/admin/calendar" className="text-sm font-bold text-slate-500 hover:text-indigo-600 uppercase tracking-widest transition-colors mb-2 inline-block">
          ← Back to Calendar
        </Link>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Terms & School Years</h1>
        <p className="text-sm text-slate-500 mt-1">
          Define the academic calendar structure. Create school years, then add terms
          (semesters, quarters, trimesters) beneath them.
        </p>
      </div>

      <TermsManagerClient schoolYears={schoolYears as any} />

      <SchoolWideReset terms={allTerms} />
    </div>
  )
}

