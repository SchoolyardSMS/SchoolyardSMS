import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Clock, CalendarDays, BookOpen } from "lucide-react"
import { format } from "date-fns"

export const metadata = { title: "My Schedule | Schoolyard" }

const DOW_CODES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
const DAY_LABELS: Record<string, string> = {
  MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu", FRI: "Fri", SAT: "Sat", SUN: "Sun"
}

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view = 'list' } = await searchParams
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const role   = session.user?.role
  const userId = session.user?.id

  // ── Fetch sections based on role ───────────────────────────────────────────
  let sections: any[] = []

  if (role === "TEACHER") {
    const teacher = await db.teacher.findUnique({
      where: { userId },
      include: {
        sections: {
          include: {
            course: true,
            bellPeriod: true,
            _count: { select: { enrollments: true } },
          },
        },
      },
    })
    sections = teacher?.sections ?? []
  } else if (role === "STUDENT") {
    const student = await db.student.findUnique({
      where: { userId },
      include: {
        enrollments: {
          where: { status: "ENROLLED" },
          include: {
            section: {
              include: {
                course: true,
                teacher: { include: { user: true } },
                bellPeriod: true,
              },
            },
          },
        },
      },
    })
    sections = (student?.enrollments ?? []).map((e) => e.section)
  } else {
    sections = await db.section.findMany({
      include: {
        course: true,
        teacher: { include: { user: true } },
        bellPeriod: true,
        _count: { select: { enrollments: true } },
      },
      orderBy: { bellPeriod: { periodNumber: "asc" } },
    })
  }

  // ── Fetch upcoming calendar days ───────────────────────────────────────────
  // We want to find "today" based on the school's date, not UTC clock
  // Using a 0-hour UTC date for the current day ensures it matches the @db.Date format
  const now = new Date()
  const todayStr = format(now, 'yyyy-MM-dd')
  const today = new Date(`${todayStr}T00:00:00Z`)
  
  // We want to show a rolling 7 calendar days
  const upcomingDays = await db.calendarDay.findMany({
    where: { date: { gte: today } },
    orderBy: { date: "asc" },
    take: 7
  })

  // Also collect unscheduled/all
  const unscheduledSections = sections.filter(s => !s.bellPeriod || s.bellPeriod.days.length === 0)

  const randomColors = [
    "var(--school-primary,#4f46e5)",
    "#0891b2", "#059669", "#d97706", "#7c3aed", "#db2777",
  ]

  function SectionCard({ section, colorIdx, blockMatch }: { section: any; colorIdx: number, blockMatch?: string }) {
    const color = randomColors[colorIdx % randomColors.length]
    let badgeLabel = section.course.code
    if (section.bellPeriod) {
      if (blockMatch) {
        badgeLabel = `${section.bellPeriod.periodNumber}${blockMatch}` // e.g. "1A"
      } else {
        badgeLabel = `P${section.bellPeriod.periodNumber}` // e.g. "P1"
      }
    }

    return (
      <Link href={`/dashboard/academics/sections/${section.id}`} className="group flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-all">
        <div className="rounded-lg p-2 shrink-0" style={{ background: `${color}20` }}>
          <BookOpen className="h-5 w-5" style={{ color }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm group-hover:underline truncate">{section.course.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {section.teacher?.user?.name ? `${section.teacher.user.name} · ` : ""}
            {section.room ?? "Room TBA"}
          </p>
          {section.bellPeriod && (
            <div className="flex items-center gap-1 mt-2">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {section.bellPeriod.startTime} – {section.bellPeriod.endTime}
              </span>
            </div>
          )}
          {!section.bellPeriod && section.schedule && (
            <p className="text-xs text-muted-foreground mt-1">{section.schedule}</p>
          )}
          {section._count && (
            <p className="text-xs text-muted-foreground mt-0.5">{section._count.enrollments} students</p>
          )}
        </div>
        <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: color }}>
          {badgeLabel}
        </span>
      </Link>
    )
  }

  return (
    <div className="flex-1 p-8 pt-6 space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">My Schedule</h2>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-muted-foreground">
              {role === "STUDENT" ? "Your enrolled classes and periods." :
               role === "TEACHER" ? "Your teaching schedule." :
               "All sections across the school."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="?view=weekly" className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${view === 'weekly' ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}>
            Weekly Grid
          </Link>
          <Link href="?view=list" className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${view === 'list' ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}>
            Daily List
          </Link>
        </div>
        {role === "ADMIN" && (
          <Button asChild variant="outline">
            <Link href="/dashboard/schedule/manage">
              <CalendarDays className="h-4 w-4 mr-2" />
              Manage Bell Schedule
            </Link>
          </Button>
        )}

      {view === 'weekly' ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {["MON", "TUE", "WED", "THU", "FRI"].map((dayCode) => {
            const daySections = sections.filter(s => s.bellPeriod?.days.includes(dayCode))
            daySections.sort((a, b) => (a.bellPeriod?.periodNumber ?? 99) - (b.bellPeriod?.periodNumber ?? 99))
            
            return (
              <div key={dayCode} className="space-y-4">
                <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                  <h3 className="font-bold text-sm tracking-widest uppercase">{DAY_LABELS[dayCode] || dayCode}</h3>
                </div>
                <div className="space-y-3">
                  {daySections.map((s, i) => (
                    <SectionCard key={s.id} section={s} colorIdx={i} />
                  ))}
                  {daySections.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center italic py-8 border border-dashed rounded-lg">No classes</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <>
          {upcomingDays.length === 0 && sections.length > 0 && (
            <div className="p-4 bg-amber-50 text-amber-800 rounded-lg text-sm border border-amber-200">
              No calendar days are configured for the future. Contact your administrator to generate the academic calendar.
            </div>
          )}

          {upcomingDays.map((day) => {
            const dayOfWeekCode = DOW_CODES[new Date(day.date).getUTCDay()]
            const blockCode = day.blockDay !== "NONE" ? day.blockDay : null

            const daySections = sections.filter(s => {
              const daysArray = s.bellPeriod?.days || []
              return daysArray.includes(dayOfWeekCode) || (blockCode && daysArray.includes(blockCode))
            })

            daySections.sort((a, b) => (a.bellPeriod?.periodNumber ?? 99) - (b.bellPeriod?.periodNumber ?? 99))

            const displayDate = new Date(day.date)
            const isToday = displayDate.getUTCFullYear() === now.getFullYear() &&
                            displayDate.getUTCMonth() === now.getMonth() &&
                            displayDate.getUTCDate() === now.getDate()
            const hasClasses = daySections.length > 0
            const dateStr = format(new Date(displayDate.getUTCFullYear(), displayDate.getUTCMonth(), displayDate.getUTCDate()), 'EEEE, MMM d')

            if (!hasClasses && !isToday && day.type !== "INSTRUCTIONAL") {
              return null
            }

            return (
              <div key={day.id} className={`space-y-3 ${isToday ? 'rounded-xl border-2 p-5' : ''}`} style={isToday ? { borderColor: "var(--school-primary,#4f46e5)" } : {}}>
                <h3 className={`font-semibold text-base flex items-center gap-2 ${isToday ? '' : 'text-muted-foreground'}`} style={isToday ? { color: "var(--school-primary,#4f46e5)" } : {}}>
                  {isToday && <CalendarDays className="h-5 w-5 mr-1" />}
                  <span>{isToday ? "Today — " : ""}{dateStr}</span>
                  {blockCode && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">Block {blockCode}</span>}
                  {!isToday && <span className="h-px flex-1 bg-border ml-2" />}
                </h3>
                
                {day.type === "SNOW_DAY" && (
                  <div className="bg-cyan-50 dark:bg-cyan-900/10 text-cyan-700 dark:text-cyan-400 p-4 rounded-lg text-sm font-medium border border-cyan-200 dark:border-cyan-800">
                    Snow Day — No Classes
                  </div>
                )}
                
                {day.type === "HOLIDAY" && (
                  <div className="bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 p-4 rounded-lg text-sm font-medium border border-red-200 dark:border-red-800">
                    Holiday — No Classes
                  </div>
                )}

                {day.type === "INSTRUCTIONAL" && !hasClasses && (
                  <div className="text-sm text-muted-foreground italic py-2">No classes scheduled.</div>
                )}

                {day.type !== "SNOW_DAY" && day.type !== "HOLIDAY" && hasClasses && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {daySections.map((s, i) => {
                      const matchedBlock = blockCode && s.bellPeriod?.days.includes(blockCode) ? blockCode : undefined
                      return <SectionCard key={s.id} section={s} colorIdx={i} blockMatch={matchedBlock} />
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {unscheduledSections.length > 0 && (
            <div className="space-y-3 mt-8">
              <h3 className="font-semibold text-base text-muted-foreground flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider">Other / Unscheduled</span>
                <span className="h-px flex-1 bg-border" />
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {unscheduledSections.map((s, i) => <SectionCard key={s.id} section={s} colorIdx={i} />)}
              </div>
            </div>
          )}
        </>
      )}

      {sections.length === 0 && (
        <div className="rounded-xl border border-dashed p-16 text-center">
          <CalendarDays className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="font-semibold text-lg">No classes scheduled</p>
          <p className="text-sm text-muted-foreground mt-1">
            {role === "ADMIN" ? "Create sections and assign bell periods to see them here." : "Contact your administrator."}
          </p>
        </div>
      )}
    </div>
  )
}
