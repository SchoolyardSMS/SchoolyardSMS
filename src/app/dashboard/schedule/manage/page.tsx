import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { upsertBellPeriod } from "@/app/actions/schedule"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Clock, Plus } from "lucide-react"
import { BellPeriodList } from "@/components/dashboard/schedule/bell-period-list"

export const metadata = { title: "Bell Schedule | Schoolyard" }

const DAYS = ["MON","TUE","WED","THU","FRI","SAT","SUN","A","B","C","D","E","F","G"]
const DAY_LABELS: Record<string,string> = {
  MON:"Mon",TUE:"Tue",WED:"Wed",THU:"Thu",FRI:"Fri",SAT:"Sat",SUN:"Sun",
  A:"A",B:"B",C:"C",D:"D",E:"E",F:"F",G:"G"
}

export default async function BellScheduleManagePage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "ADMIN") redirect("/dashboard")

  const periods = await db.bellPeriod.findMany({
    orderBy: [{ schoolYear: "desc" }, { periodNumber: "asc" }],
    include: { _count: { select: { sections: true } } }
  })

  // Group by school year
  const years = [...new Set(periods.map(p => p.schoolYear))]

  const currentYear = new Date().getFullYear()
  const defaultYear = `${currentYear}-${currentYear + 1}`

  return (
    <div className="flex-1 p-8 pt-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bell Schedule</h2>
          <p className="text-muted-foreground mt-1">
            Manage school periods, times, and days for each school year.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/schedule">← View My Schedule</Link>
        </Button>
      </div>

      <BellPeriodList periods={periods} years={years} />

      {periods.length === 0 && (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No bell periods defined yet</p>
          <p className="text-sm mt-1">Add your first period below.</p>
        </div>
      )}

      {/* Add new period form */}
      <div className="rounded-xl border bg-card shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Plus className="h-5 w-5" style={{ color: "var(--school-primary,#4f46e5)" }} />
          <h3 className="font-semibold">Add New Period</h3>
        </div>

        <form action={upsertBellPeriod} className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label htmlFor="period-num" className="text-sm font-medium">Period #</label>
              <input id="period-num" name="periodNumber" type="number" min={1} max={12} defaultValue={1} required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="col-span-2 space-y-2 sm:col-span-1">
              <label htmlFor="period-name" className="text-sm font-medium">Name <span className="text-red-500">*</span></label>
              <input id="period-name" name="name" type="text" required placeholder="Period 1 / Advisory / Lunch"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="period-start" className="text-sm font-medium">Start</label>
              <input id="period-start" name="startTime" type="time" defaultValue="08:00" required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="period-end" className="text-sm font-medium">End</label>
              <input id="period-end" name="endTime" type="time" defaultValue="08:55" required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="period-year" className="text-sm font-medium">School Year <span className="text-red-500">*</span></label>
            <input id="period-year" name="schoolYear" type="text" required defaultValue={defaultYear} placeholder="2025-2026"
              className="flex h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <span className="block text-sm font-medium">Days</span>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(d => (
                <label key={d} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" name="days" value={d} defaultChecked={["MON","TUE","WED","THU","FRI"].includes(d)}
                    className="h-4 w-4 rounded border-input accent-indigo-600"
                  />
                  <span className="text-sm">{DAY_LABELS[d]}</span>
                </label>
              ))}
            </div>
          </div>

          <Button type="submit" style={{ background: "var(--school-primary,#4f46e5)" }} className="text-white">
            Create Period
          </Button>
        </form>
      </div>
    </div>
  )
}
