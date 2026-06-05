"use client"

import { forceEnrollStudent, removeStudentEnrollment, updateCommunityAttendance } from "@/app/actions/community"
import { toast } from "sonner"
import { UserSearch } from "@/components/ui/user-search"
import { X, UserPlus, ShieldAlert, CheckCircle2, XCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface EnrollmentListProps {
  sessionId: string
  enrollments: any[]
}

export function CommunityEnrollmentList({ sessionId, enrollments }: EnrollmentListProps) {
  const handleForceEnroll = async (student: any) => {
    try {
      await forceEnrollStudent(sessionId, student.studentId)
      toast.success(`${student.name} force-enrolled.`)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleRemove = async (enrollmentId: string) => {
    try {
      await removeStudentEnrollment(enrollmentId)
      toast.success("Enrollment removed.")
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleAttendance = async (enrollmentId: string, status: string) => {
    try {
      await updateCommunityAttendance(enrollmentId, status as any)
      toast.success(`Marked as ${status.toLowerCase()}`)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Enrolled Students ({enrollments.length})</h4>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
        {enrollments.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-4 text-center">No students enrolled yet.</p>
        ) : (
          enrollments.map((enr: any) => (
            <div key={enr.id} className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 group">
              <div className="flex justify-between items-start">
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-sm truncate">{enr.student.user.name}</span>
                  {enr.isRequired && (
                    <span className="flex items-center gap-1 text-[9px] text-amber-600 font-black uppercase tracking-widest mt-0.5">
                      <ShieldAlert className="w-3 h-3" />
                      Required
                    </span>
                  )}
                </div>
                <button 
                  type="button"
                  onClick={() => handleRemove(enr.id)} 
                  className="p-1 text-slate-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove student"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-1 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                <button
                  type="button"
                  onClick={() => handleAttendance(enr.id, "PRESENT")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all",
                    enr.attendance === "PRESENT" 
                      ? "bg-emerald-500 text-white shadow-sm shadow-emerald-100 dark:shadow-none" 
                      : "bg-white dark:bg-slate-900 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 border border-slate-100 dark:border-slate-800"
                  )}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Present
                </button>
                <button
                  type="button"
                  onClick={() => handleAttendance(enr.id, "ABSENT")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all",
                    enr.attendance === "ABSENT" 
                      ? "bg-rose-500 text-white shadow-sm shadow-rose-100 dark:shadow-none" 
                      : "bg-white dark:bg-slate-900 text-slate-400 hover:bg-rose-50 hover:text-rose-600 border border-slate-100 dark:border-slate-800"
                  )}
                >
                  <XCircle className="w-3 h-3" />
                  Absent
                </button>
                <button
                  type="button"
                  onClick={() => handleAttendance(enr.id, "EXCUSED")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all",
                    enr.attendance === "EXCUSED" 
                      ? "bg-amber-500 text-white shadow-sm shadow-amber-100 dark:shadow-none" 
                      : "bg-white dark:bg-slate-900 text-slate-400 hover:bg-amber-50 hover:text-amber-600 border border-slate-100 dark:border-slate-800"
                  )}
                >
                  <Clock className="w-3 h-3" />
                  Excused
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-indigo-600" />
          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400">Force Enroll Student</h4>
        </div>
        <UserSearch 
          role="STUDENT" 
          placeholder="Search for a student..." 
          onSelect={handleForceEnroll}
        />
        <p className="text-[10px] text-slate-400 italic leading-tight">
          Mandating attendance will automatically remove the student from any conflicting sessions on this date.
        </p>
      </div>
    </div>
  )
}
