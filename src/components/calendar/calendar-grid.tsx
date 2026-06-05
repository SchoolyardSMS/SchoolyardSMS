"use client"

import { useState } from "react"
import { CalendarDay, DayType } from "@prisma/client"
import { generateCalendar, updateCalendarDay, declareSnowDay } from "@/app/actions/calendar"
import { toast } from "sonner"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from "date-fns"

export function CalendarGrid({ initialDays, readOnly = false }: { initialDays: CalendarDay[], readOnly?: boolean }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [days, setDays] = useState(initialDays)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = monthStart // You might want to get the actual Sunday of the first week
  const endDate = monthEnd

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate
  }).map(d => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0)))

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      await generateCalendar(currentDate.getFullYear(), currentDate.getMonth())
      toast.success("Month generated successfully. Please refresh if days don't appear.")
      // Ideally we would refetch or return the days from the action
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleUpdateDay = async (date: Date, updates: { type?: DayType, hasCommunityPeriod?: boolean, name?: string | null, blockDay?: any, isMidterm?: boolean, isFinal?: boolean }) => {
    try {
      await updateCalendarDay(date.toISOString(), updates)
      toast.success("Day updated")
      
      // Optimistic UI update
      setDays(prev => {
        const existing = prev.find(d => isSameDay(new Date(d.date), date))
        if (existing) {
          return prev.map(d => isSameDay(new Date(d.date), date) ? { ...d, ...updates } as CalendarDay : d)
        }
        return [...prev, {
          id: "temp",
          date,
          type: updates.type || "INSTRUCTIONAL",
          hasCommunityPeriod: updates.hasCommunityPeriod || false,
          name: updates.name || null,
          blockDay: updates.blockDay || "NONE",
          isMidterm: updates.isMidterm || false,
          isFinal: updates.isFinal || false,
          termId: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }]
      })
      setSelectedDay(null)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleDeclareSnowDay = async (date: Date) => {
    try {
      await declareSnowDay(date.toISOString())
      toast.success("Snow day declared. Block schedule shifted.")
      // Need full refresh to see shifted block days correctly
      window.location.reload()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button type="button" onClick={prevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            &larr;
          </button>
          <h2 className="text-xl font-bold">{format(currentDate, 'MMMM yyyy')}</h2>
          <button type="button" onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            &rarr;
          </button>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-4 py-2 bg-[var(--school-primary,#4f46e5)] text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {isGenerating ? "Generating..." : "Initialize Month"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-800 rounded-lg overflow-hidden">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-slate-50 dark:bg-slate-900/50 p-2 text-center text-xs font-semibold text-slate-500 uppercase">
            {day}
          </div>
        ))}

        {/* Adjusting start day to align to Sunday */}
        {Array.from({ length: startDate.getDay() }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-white dark:bg-slate-900 min-h-[100px]" />
        ))}

        {calendarDays.map(date => {
          const dayData = days.find(d => {
            const d1 = new Date(d.date)
            const d2 = date
            return d1.getUTCFullYear() === d2.getUTCFullYear() &&
                   d1.getUTCMonth() === d2.getUTCMonth() &&
                   d1.getUTCDate() === d2.getUTCDate()
          })
          
          return (
            <div
              key={date.toString()}
              onClick={() => !readOnly && setSelectedDay(dayData || { id: "", date, type: "INSTRUCTIONAL", hasCommunityPeriod: false, name: null, blockDay: "NONE", isMidterm: false, isFinal: false, termId: null, createdAt: new Date(), updatedAt: new Date() })}
              className={`bg-white dark:bg-slate-900 min-h-[100px] p-2 border-t border-transparent relative transition-colors
                ${!readOnly ? "hover:border-[var(--school-primary,#4f46e5)] cursor-pointer" : "cursor-default"}
                ${dayData?.type === "HOLIDAY" ? "bg-red-50 dark:bg-red-900/10" : ""}
                ${dayData?.type === "STAFF_DEVELOPMENT" ? "bg-amber-50 dark:bg-amber-900/10" : ""}
                ${dayData?.type === "SNOW_DAY" ? "bg-cyan-50 dark:bg-cyan-900/10" : ""}
                ${dayData?.type === "OTHER" ? "bg-slate-50 dark:bg-slate-800/50 text-slate-400" : ""}
              `}
            >
              {dayData?.blockDay && dayData.blockDay !== "NONE" && (
                <div className="absolute top-2 right-2 text-[10px] font-bold text-slate-400">
                  {dayData.blockDay} Day
                </div>
              )}

              <div className="flex justify-between items-start">
                <span className={`text-sm font-medium ${
                  date.getUTCFullYear() === new Date().getFullYear() &&
                  date.getUTCMonth() === new Date().getMonth() &&
                  date.getUTCDate() === new Date().getDate()
                    ? "bg-[var(--school-primary,#4f46e5)] text-white w-6 h-6 rounded-full flex items-center justify-center" 
                    : ""
                }`}>
                  {date.getUTCDate()}
                </span>
                {dayData?.hasCommunityPeriod && (
                  <span className="w-2 h-2 rounded-full bg-[var(--school-primary,#4f46e5)]" title="Community Period" />
                )}
              </div>
              {dayData?.name && (
                <div className="text-xs mt-1 font-medium truncate text-slate-600 dark:text-slate-400">
                  {dayData.name}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selectedDay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold mb-4">Edit {format(new Date(selectedDay.date), 'MMM d, yyyy')}</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="dayType" className="block text-sm font-medium mb-1">Day Type</label>
                <select
                  id="dayType"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 p-2 bg-transparent"
                  defaultValue={selectedDay.type}
                >
                  <option value="INSTRUCTIONAL">Instructional Day</option>
                  <option value="HOLIDAY">Holiday</option>
                  <option value="STAFF_DEVELOPMENT">Staff Development</option>
                  <option value="SNOW_DAY">Snow Day</option>
                  <option value="OTHER">Other / Weekend</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="blockDay" className="block text-sm font-medium mb-1">Block Day</label>
                  <select
                    id="blockDay"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 p-2 bg-transparent text-sm"
                    defaultValue={selectedDay.blockDay || "NONE"}
                  >
                    <option value="NONE">None</option>
                    <option value="A">A Day</option>
                    <option value="B">B Day</option>
                    <option value="C">C Day</option>
                    <option value="D">D Day</option>
                    <option value="E">E Day</option>
                    <option value="F">F Day</option>
                    <option value="G">G Day</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="dayName" className="block text-sm font-medium mb-1">Label (Optional)</label>
                <input
                  id="dayName"
                  type="text"
                  placeholder="e.g. Thanksgiving"
                  defaultValue={selectedDay.name || ""}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 p-2 bg-transparent"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="hasCommunity"
                  type="checkbox"
                  defaultChecked={selectedDay.hasCommunityPeriod}
                  className="rounded text-[var(--school-primary,#4f46e5)] focus:ring-[var(--school-primary,#4f46e5)]"
                />
                <label htmlFor="hasCommunity" className="text-sm font-medium">
                  Has Community Period
                </label>
              </div>

              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <input id="isMidterm" type="checkbox" defaultChecked={selectedDay.isMidterm} className="rounded text-indigo-600 focus:ring-indigo-600" />
                  <label htmlFor="isMidterm" className="text-sm font-medium">Midterm</label>
                </div>
                <div className="flex items-center gap-2">
                  <input id="isFinal" type="checkbox" defaultChecked={selectedDay.isFinal} className="rounded text-indigo-600 focus:ring-indigo-600" />
                  <label htmlFor="isFinal" className="text-sm font-medium">Final</label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between gap-3">
              {selectedDay.type === "INSTRUCTIONAL" && (
                <button
                  type="button"
                  onClick={() => {
                    if(confirm("Are you sure? This will shift all future block days forward.")) {
                      handleDeclareSnowDay(new Date(selectedDay.date))
                    }
                  }}
                  className="px-3 py-2 bg-cyan-100 text-cyan-800 rounded-lg text-xs font-bold hover:bg-cyan-200"
                >
                  Declare Snow Day
                </button>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const type = (document.getElementById('dayType') as HTMLSelectElement).value as DayType
                    const name = (document.getElementById('dayName') as HTMLInputElement).value
                    const blockDay = (document.getElementById('blockDay') as HTMLSelectElement).value
                    const hasCommunityPeriod = (document.getElementById('hasCommunity') as HTMLInputElement).checked
                    const isMidterm = (document.getElementById('isMidterm') as HTMLInputElement).checked
                    const isFinal = (document.getElementById('isFinal') as HTMLInputElement).checked
                    handleUpdateDay(new Date(selectedDay.date), { type, name, hasCommunityPeriod, blockDay, isMidterm, isFinal })
                  }}
                  className="px-4 py-2 bg-[var(--school-primary,#4f46e5)] text-white rounded-lg text-sm font-medium"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
