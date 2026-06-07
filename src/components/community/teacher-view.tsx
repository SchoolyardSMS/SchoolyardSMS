"use client"

import { useState } from "react"
import { deleteCommunitySession, duplicateCommunitySession } from "@/app/actions/community"
import { toast } from "sonner"
import { format } from "date-fns"
import { CommunitySessionForm } from "./session-form"
import { CommunityEnrollmentList } from "./enrollment-list"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { 
  Pencil, 
  Trash2, 
  Copy, 
  Calendar, 
  Users, 
  MapPin, 
  ChevronRight,
  PlusCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"

const handleDuplicate = async (sessionId: string) => {
  const newDayId = prompt("Enter the Calendar Day ID to duplicate to:")
  if (!newDayId) return
  try {
    await duplicateCommunitySession(sessionId, newDayId)
    toast.success("Session duplicated!")
  } catch (err: any) {
    toast.error(err.message)
  }
}

const handleDelete = async (id: string) => {
  if (!confirm("Are you sure you want to delete this session?")) return
  try {
    await deleteCommunitySession(id)
    toast.success("Session deleted")
  } catch (err: any) {
    toast.error(err.message)
  }
}

export function TeacherCommunityView({ upcomingDays, sessions, isAdmin, teachers }: any) {
  const [editingSession, setEditingSession] = useState<any>(null)


  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-indigo-600" />
            Community Periods
          </h1>
          <p className="text-slate-500 mt-1">Manage and oversee community sessions and enrollments.</p>
        </div>
        
        <Dialog>
          <DialogTrigger render={
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <PlusCircle className="w-4 h-4 mr-2" />
              Create New Session
            </Button>
          } />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Community Session</DialogTitle>
            </DialogHeader>
            <CommunitySessionForm upcomingDays={upcomingDays} isAdmin={isAdmin} teachers={teachers} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12 space-y-4">
          {sessions.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white">No upcoming sessions</h3>
              <p className="text-slate-500">Create a session to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {sessions.map((s: any) => (
                <div key={s.id} className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden">
                  <div className="p-5 flex-1 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(s.calendarDay.date), 'EEEE, MMM d')}
                        </div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">{s.title}</h3>
                      </div>
                      
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Dialog>
                          <DialogTrigger render={
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600">
                              <Pencil className="w-4 h-4" />
                            </Button>
                          } />
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Edit Session</DialogTitle>
                            </DialogHeader>
                            <CommunitySessionForm 
                              upcomingDays={upcomingDays} 
                              initialData={s} 
                              isAdmin={isAdmin}
                            />
                          </DialogContent>
                        </Dialog>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400 hover:text-indigo-600"
                          onClick={() => handleDuplicate(s.id)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400 hover:text-rose-600"
                          onClick={() => handleDelete(s.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" />
                        {s.room}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4" />
                        {s.enrollments.length} / {s.capacity}
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-600 h-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, (s.enrollments.length / s.capacity) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    <Dialog>
                      <DialogTrigger render={
                        <Button variant="outline" className="w-full justify-between group/btn border-slate-200 dark:border-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400">
                          View Roster
                          <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
                        </Button>
                      } />
                      <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Session Roster: {s.title}</DialogTitle>
                        </DialogHeader>
                        <CommunityEnrollmentList sessionId={s.id} enrollments={s.enrollments} />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
