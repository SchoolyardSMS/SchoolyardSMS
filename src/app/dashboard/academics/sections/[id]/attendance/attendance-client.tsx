"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { submitAttendance, submitBulkAttendance, archiveAttendanceDay } from "@/app/actions/attendance"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { 
  Calendar, User, CheckCircle, XCircle, Clock, AlertCircle, 
  CheckCircle2, Info, Bell, BellOff, Archive, MapPin 
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

const STATUS_CONFIG: Record<string, { icon: any; color: string; activeClass: string }> = {
  PRESENT: { icon: CheckCircle,  color: "text-emerald-500", activeClass: "bg-emerald-600 text-white border-transparent" },
  ABSENT:  { icon: XCircle,      color: "text-rose-500",    activeClass: "bg-rose-600 text-white border-transparent" },
  TARDY:   { icon: Clock,        color: "text-amber-500",   activeClass: "bg-amber-600 text-white border-transparent" },
  EXCUSED: { icon: AlertCircle,  color: "text-blue-500",    activeClass: "bg-blue-600 text-white border-transparent" },
}

export function AttendanceTracker({ sectionId, enrollments, initialData }: any) {
  const router = useRouter()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState<string | null>(null)
  const [isBulkSaving, setIsBulkSaving] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)

  const getRecord = (studentId: string) => {
    return initialData.find((a: any) => {
      const recDate = new Date(a.date).toISOString().split('T')[0]
      return a.studentId === studentId && recDate === date
    })
  }

  const handleMark = async (studentId: string, status: string, details?: any) => {
    setSaving(studentId)
    try {
      const trackingDate = new Date(`${date}T12:00:00Z`)
      await submitAttendance(sectionId, studentId, trackingDate, status as any, details)
      toast.success(`Marked as ${status}`)
      router.refresh()
    } catch {
      toast.error("Failed to update attendance")
    } finally {
      setSaving(null)
    }
  }

  const handleMarkAllPresent = async () => {
    setIsBulkSaving(true)
    try {
      const trackingDate = new Date(`${date}T12:00:00Z`)
      const studentIds = enrollments.map((enr: any) => enr.studentId)
      await submitBulkAttendance(sectionId, studentIds, trackingDate, "PRESENT")
      toast.success("Marked entire class PRESENT")
      router.refresh()
    } catch {
      toast.error("Failed to bulk update attendance")
    } finally {
      setIsBulkSaving(false)
    }
  }

  const handleArchiveDay = async () => {
    if (!confirm("Archive attendance for this day? It will be moved to historical records.")) return
    setIsArchiving(true)
    try {
      const trackingDate = new Date(`${date}T12:00:00Z`)
      await archiveAttendanceDay(sectionId, trackingDate)
      toast.success("Attendance day archived")
      router.refresh()
    } catch {
      toast.error("Failed to archive day")
    } finally {
      setIsArchiving(false)
    }
  }



  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm w-full">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
             <Calendar className="h-4 w-4 text-indigo-500" />
             <label className="font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-widest">Attendance Date:</label>
          </div>
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-slate-100 dark:border-slate-800 p-2 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
        <div className="flex gap-2">
          {enrollments.length > 0 && (
            <>
              <Button 
                onClick={handleMarkAllPresent} 
                disabled={isBulkSaving || isArchiving}
                variant="outline"
                className="rounded-xl font-bold border-emerald-100 text-emerald-600 hover:bg-emerald-50"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {isBulkSaving ? "Saving..." : "Mark All Present"}
              </Button>
              <Button 
                onClick={handleArchiveDay} 
                disabled={isArchiving || isBulkSaving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm"
              >
                <Archive className="mr-2 h-4 w-4" />
                {isArchiving ? "Archiving..." : "Complete & Archive"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {enrollments.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed p-12 text-center text-slate-400">
             <User className="h-10 w-10 mx-auto mb-2 opacity-20" />
             <p className="font-bold uppercase tracking-widest text-xs">No students enrolled</p>
          </div>
        ) : (
          enrollments.map((enr: any) => {
            const record = getRecord(enr.student.id)
            const currentStatus = record?.status || null
            return (
              <div key={enr.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-lg font-black text-indigo-600 dark:text-indigo-400">
                    {enr.student.user.name.charAt(0)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{enr.student.user.name}</span>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500 uppercase font-black tracking-widest">Grade {enr.student.gradeLevel}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Last: {enr.lastLocation}</span>
                      {record?.notifiedParent && <span className="flex items-center gap-1 text-indigo-500"><Bell className="h-3 w-3" /> Parent Notified</span>}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="grid grid-cols-2 sm:flex gap-1.5 flex-1 sm:flex-none">
                    {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                      const isActive = currentStatus === status
                      const Icon = config.icon
                      return (
                        <Button 
                          key={status}
                          size="sm"
                          variant={isActive ? "default" : "outline"}
                          className={`text-[10px] font-bold rounded-xl transition-all h-10 px-4 flex-1 sm:flex-none ${isActive ? config.activeClass : "border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                          onClick={() => handleMark(enr.student.id, status)}
                          disabled={saving === enr.student.id || isBulkSaving || isArchiving}
                        >
                          <Icon className={`h-3.5 w-3.5 mr-1.5 ${isActive ? "text-white" : config.color}`} />
                          {status}
                        </Button>
                      )
                    })}
                  </div>

                  <Dialog>
                    <DialogTrigger render={
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700">
                        <Info className="h-4 w-4 text-slate-400" />
                      </Button>
                    } />
                    <DialogContent className="sm:max-w-[425px] rounded-3xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <User className="h-5 w-5 text-indigo-500" />
                          Attendance Details: {enr.student.user.name}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="checkIn" className="text-xs font-black uppercase tracking-widest text-slate-400">Check In</Label>
                            <Input id="checkIn" placeholder="08:00 AM" defaultValue={record?.checkInTime} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="checkOut" className="text-xs font-black uppercase tracking-widest text-slate-400">Check Out</Label>
                            <Input id="checkOut" placeholder="03:00 PM" defaultValue={record?.checkOutTime} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reason" className="text-xs font-black uppercase tracking-widest text-slate-400">Excused Reason / Notes</Label>
                          <Input id="reason" placeholder="e.g. Doctor appointment" defaultValue={record?.excusedReason || record?.notes} />
                        </div>
                        <div className="flex items-center space-x-2 p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
                          <Checkbox id="notify" defaultChecked={record?.notifiedParent} />
                          <Label htmlFor="notify" className="text-sm font-bold text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                            <Bell className="h-4 w-4" /> Notify Parent of Status Change
                          </Label>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button 
                          className="bg-indigo-600 hover:bg-indigo-700 rounded-xl px-8"
                          onClick={() => {
                            const checkIn = (document.getElementById("checkIn") as HTMLInputElement).value
                            const checkOut = (document.getElementById("checkOut") as HTMLInputElement).value
                            const reason = (document.getElementById("reason") as HTMLInputElement).value
                            const notify = (document.getElementById("notify") as HTMLInputElement).checked
                            handleMark(enr.student.id, currentStatus || "PRESENT", {
                              checkInTime: checkIn,
                              checkOutTime: checkOut,
                              excusedReason: reason,
                              notifiedParent: notify,
                              notes: reason
                            })
                          }}
                        >
                          Update Details
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

