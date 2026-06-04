"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  BookOpen,
  CheckCircle
} from "lucide-react"
import Link from "next/link"

interface AssignmentCalendarProps {
  initialAssignments: any[]
  initialStart: string
}

const DAYS_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

export function AssignmentCalendar({ initialAssignments, initialStart }: AssignmentCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [mobileDayIndex, setMobileDayIndex] = useState(new Date().getDay())

  const baseStart = new Date(initialStart)
  const start = new Date(baseStart)
  start.setDate(baseStart.getDate() + (weekOffset * 7))

  const dates = DAYS_LABELS.map((_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })

  const now = new Date()

  // Helper: get UTC date string "2026-05-01" from any Date
  const utcDateStr = (d: Date) => d.toISOString().split('T')[0]
  const todayUtc = utcDateStr(now)

  // Pre-group assignments by UTC date key for O(1) lookup per day
  // Replaces the double .filter() per day (14 passes → 2 total)
  const assignmentsByDate = new Map<string, typeof initialAssignments>()
  for (const a of initialAssignments) {
    const key = utcDateStr(new Date(a.dueDate))
    const bucket = assignmentsByDate.get(key)
    if (bucket) bucket.push(a)
    else assignmentsByDate.set(key, [a])
  }

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-8 pt-6 min-h-screen">
      <div className="flex items-center justify-between pb-4 border-b dark:border-slate-800">
         <div className="flex items-center gap-4">
            <h2 className="text-xl font-black uppercase text-slate-800 dark:text-slate-100 tracking-widest leading-none">WEEKLY CALENDAR</h2>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-1 border dark:border-slate-700">
               <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-full hover:bg-white dark:hover:bg-slate-700"
                onClick={() => setWeekOffset(v => v - 1)}
               >
                 <ChevronLeft className="h-4 w-4" />
               </Button>
               <Button 
                variant="ghost" 
                size="sm" 
                className="text-[10px] font-black px-3 h-7 rounded-full hover:bg-white dark:hover:bg-slate-700"
                onClick={() => setWeekOffset(0)}
               >
                 TODAY
               </Button>
               <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-full hover:bg-white dark:hover:bg-slate-700"
                onClick={() => setWeekOffset(v => v + 1)}
               >
                 <ChevronRight className="h-4 w-4" />
               </Button>
            </div>
         </div>
         <div className="hidden lg:block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
           {start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
         </div>
      </div>

      {/* Mobile Day Selector */}
      <div className="flex md:hidden justify-between p-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
         {dates.map((date, i) => (
           <button
             key={i}
             onClick={() => setMobileDayIndex(i)}
             className={`flex flex-col items-center p-2 rounded-xl transition-all w-12 ${mobileDayIndex === i ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
           >
             <span className="text-[9px] font-black uppercase">{DAYS_LABELS[i].charAt(0)}</span>
             <span className="text-sm font-black">{date.getDate()}</span>
           </button>
         ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-px bg-slate-200 dark:bg-slate-800 rounded-[2rem] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl shadow-indigo-500/5">
        {dates.map((date, i) => (
          <div 
            key={i} 
            className={`bg-white dark:bg-slate-900/50 min-h-[400px] md:min-h-[600px] flex flex-col ${mobileDayIndex !== i ? 'hidden md:flex' : 'flex'}`}
          >
            <div className={`p-4 text-center border-b border-slate-50 dark:border-slate-800 transition-colors ${date.toDateString() === now.toDateString() ? 'bg-indigo-50/50 dark:bg-indigo-950/10' : 'bg-slate-50/30 dark:bg-slate-800/10'}`}>
               <span className={`text-[10px] font-black uppercase tracking-widest ${date.toDateString() === now.toDateString() ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-500'}`}>
                 {DAYS_LABELS[i]}
               </span>
               <div className={`mt-2 h-10 w-10 mx-auto flex items-center justify-center rounded-2xl text-sm font-black transition-all ${date.toDateString() === now.toDateString() ? 'bg-indigo-600 text-white shadow-xl scale-110' : 'text-slate-400 dark:text-slate-600'}`}>
                 {date.getDate()}
               </div>
            </div>
            <div className="p-3 space-y-3 flex-1 overflow-y-auto bg-transparent">
               {(() => {
                const dayAssignments = assignmentsByDate.get(utcDateStr(date)) ?? []
                return dayAssignments.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-10 py-20 grayscale">
                     <CalendarIcon className="h-12 w-12 text-slate-400 mb-2" />
                     <span className="text-[10px] font-black uppercase tracking-[0.2em]">Rest Day</span>
                  </div>
                ) : (
                  dayAssignments.map(ass => (
                  <Link 
                    key={ass.id} 
                    href={`/dashboard/academics/sections/${ass.sectionId}/assignments/${ass.id}`}
                    className="group block p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm border-l-4 border-l-indigo-600 hover:shadow-2xl transition-all transform hover:-translate-y-1 cursor-pointer"
                  >
                     <div className="text-[9px] font-black text-slate-300 dark:text-slate-600 mb-1.5 flex justify-between uppercase tracking-widest">
                       <span>{new Date(ass.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                       {ass.type && <span className="text-indigo-500/50">{ass.type}</span>}
                     </div>
                     <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-3">{ass.title}</h4>
                     <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[9px] text-indigo-600 font-black uppercase tracking-widest truncate max-w-[90px]">{ass.courseName}</span>
                        {ass.isSubmitted ? (
                          <div className="flex items-center gap-1 text-[9px] text-emerald-600 font-black uppercase">
                            <CheckCircle className="h-3 w-3" /> Submitted
                          </div>
                        ) : (
                          <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                        )}
                     </div>
                  </Link>
                  ))
                );
              })()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
