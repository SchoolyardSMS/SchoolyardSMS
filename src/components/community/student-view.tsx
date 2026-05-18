"use client"

import { CommunitySession, CommunityEnrollment, CalendarDay } from "@prisma/client"
import { enrollInSession, dropSession } from "@/app/actions/community"
import { toast } from "sonner"
import { format } from "date-fns"

export function StudentCommunityView({ studentId, upcomingDays, allSessions, myEnrollments }: any) {
  
  const handleEnroll = async (sessionId: string) => {
    try {
      await enrollInSession(sessionId)
      toast.success("Successfully enrolled!")
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleDrop = async (sessionId: string) => {
    try {
      await dropSession(sessionId)
      toast.success("Successfully dropped!")
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Community Periods</h1>
        <p className="text-slate-500 mt-1">Sign up for available sessions. Forced enrollments cannot be dropped.</p>
      </div>

      {upcomingDays.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 text-center text-slate-500">
          No upcoming community periods scheduled.
        </div>
      ) : (
        <div className="space-y-8">
          {upcomingDays.map((day: any) => {
            const daySessions = allSessions.filter((s: any) => s.calendarDayId === day.id)
            const myEnrollmentForDay = myEnrollments.find((e: any) => daySessions.some((s: any) => s.id === e.sessionId))

            return (
              <div key={day.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <h2 className="font-bold text-lg">{format(new Date(day.date), 'EEEE, MMMM d, yyyy')}</h2>
                  {myEnrollmentForDay ? (
                    <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-1 rounded">Signed Up</span>
                  ) : (
                    <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-1 rounded">Action Required</span>
                  )}
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {daySessions.map((session: any) => {
                    const isMySession = myEnrollmentForDay?.sessionId === session.id
                    const isForced = isMySession && myEnrollmentForDay.isRequired
                    const isFull = session.enrollments.length >= session.capacity

                    return (
                      <div key={session.id} className={`border rounded-lg p-4 flex flex-col justify-between ${isMySession ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/30' : 'border-slate-200 dark:border-slate-700'}`}>
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold">{session.title}</h3>
                            <span className="text-xs text-slate-500 font-mono">{session.enrollments.length}/{session.capacity}</span>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Teacher: {session.teacher.user.name}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Room: {session.room}</p>
                        </div>
                        
                        {isMySession ? (
                          isForced ? (
                            <button disabled className="w-full py-1.5 text-sm font-medium rounded-md bg-slate-100 text-slate-400 cursor-not-allowed">Required (Cannot Drop)</button>
                          ) : (
                            <button onClick={() => handleDrop(session.id)} className="w-full py-1.5 text-sm font-medium rounded-md bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors">Drop</button>
                          )
                        ) : (
                          <button 
                            onClick={() => handleEnroll(session.id)} 
                            disabled={isFull || !!myEnrollmentForDay || session.isRestricted}
                            className="w-full py-1.5 text-sm font-medium rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {session.isRestricted ? "Invite Only" : isFull ? "Full" : "Sign Up"}
                          </button>
                        )}
                      </div>
                    )
                  })}
                  {daySessions.length === 0 && (
                    <p className="text-sm text-slate-500 italic col-span-full">No sessions posted yet for this date.</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
