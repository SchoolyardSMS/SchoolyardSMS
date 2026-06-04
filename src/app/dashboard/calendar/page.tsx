import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { CalendarGrid } from "@/components/calendar/calendar-grid"

export const metadata = {
  title: "Academic Calendar | Schoolyard",
}

export default async function PublicCalendarPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/login")
  }

  const isAdmin = session.user?.role === "ADMIN"

  // Fetch the current academic year's days. We'll just fetch a wide range for now.
  const today = new Date()
  const startOfYear = new Date(Date.UTC(today.getFullYear(), 0, 1))
  const endOfYear = new Date(Date.UTC(today.getFullYear() + 1, 6, 1))

  const days = await db.calendarDay.findMany({
    where: {
      date: {
        gte: startOfYear,
        lte: endOfYear
      }
    },
    orderBy: {
      date: "asc"
    }
  })

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Academic Calendar</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {isAdmin
              ? "Configure instructional days, holidays, and schedule community periods."
              : "View instructional days, holidays, and scheduled community periods."}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <a
              href="/dashboard/admin/calendar/terms"
              className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Terms & Years Setup
            </a>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <CalendarGrid initialDays={days} readOnly={!isAdmin} />
      </div>
    </div>
  )
}
