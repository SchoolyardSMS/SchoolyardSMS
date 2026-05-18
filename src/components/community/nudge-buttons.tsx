"use client"

import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { nudgeMissingStudent, nudgeAllMissingStudents } from "@/app/actions/community"
import { toast } from "sonner"
import { useState } from "react"

export function NudgeAllButton({ dayId, count }: { dayId: string, count: number }) {
  const [isPending, setIsPending] = useState(false)

  const handleNudgeAll = async () => {
    if (count === 0) return
    setIsPending(true)
    try {
      const res = await nudgeAllMissingStudents(dayId)
      toast.success(`Nudged ${res.count} students!`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Button 
      size="sm" 
      variant="outline" 
      className="text-xs" 
      onClick={handleNudgeAll}
      disabled={isPending || count === 0}
    >
      <Send className="w-3.5 h-3.5 mr-2" />
      {isPending ? "Nudging..." : "Nudge All"}
    </Button>
  )
}

export function NudgeStudentButton({ studentId, dayId, studentName }: { studentId: string, dayId: string, studentName: string }) {
  const [isPending, setIsPending] = useState(false)

  const handleNudge = async () => {
    setIsPending(true)
    try {
      await nudgeMissingStudent(studentId, dayId)
      toast.success(`Reminder sent to ${studentName}`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="flex-1 sm:flex-none text-xs text-slate-500 hover:text-indigo-600"
      onClick={handleNudge}
      disabled={isPending}
    >
      <Send className="w-3.5 h-3.5 mr-2" />
      {isPending ? "Nudging..." : "Nudge"}
    </Button>
  )
}
