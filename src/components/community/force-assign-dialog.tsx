"use client"

import { useState } from "react"
import { forceEnrollStudent } from "@/app/actions/community"
import { toast } from "sonner"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { UserPlus, MapPin, Users } from "lucide-react"

export function ForceAssignDialog({ studentId, studentName, sessions }: { studentId: string, studentName: string, sessions: any[] }) {
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const handleAssign = async (sessionId: string, sessionTitle: string) => {
    setIsPending(true)
    try {
      await forceEnrollStudent(sessionId, studentId)
      toast.success(`${studentName} assigned to ${sessionTitle}`)
      setOpen(false)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button size="sm" className="flex-1 sm:flex-none text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 border-none shadow-none">
          <UserPlus className="w-3.5 h-3.5 mr-2" />
          Force Assign
        </Button>
      } />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign {studentName} to Session</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-4">
          {sessions.length === 0 ? (
            <p className="text-sm text-slate-500 italic text-center py-8">No sessions available for this date.</p>
          ) : (
            sessions.map((s) => (
              <div key={s.id} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors">
                <div className="min-w-0">
                  <h4 className="font-bold text-sm truncate">{s.title}</h4>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {s.room}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {s._count?.enrollments || 0} / {s.capacity}</span>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs h-8"
                  onClick={() => handleAssign(s.id, s.title)}
                  disabled={isPending}
                >
                  Assign
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
