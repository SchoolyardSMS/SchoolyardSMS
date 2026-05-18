"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { reportAttendance } from "@/app/actions/attendance"
import { toast } from "sonner"
import { AlertCircle } from "lucide-react"

interface ReportAttendanceDialogProps {
  children: { id: string; user: { name: string } }[]
}

export function ReportAttendanceDialog({ children }: ReportAttendanceDialogProps) {
  const [open, setOpen] = useState(false)
  const [studentId, setStudentId] = useState(children[0]?.id || "")
  const [type, setType] = useState<"SICK" | "LATE" | "EARLY_DISMISSAL">("SICK")
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!studentId || !date) return
    setIsSubmitting(true)
    try {
      await reportAttendance(studentId, type, date, reason)
      toast.success("Attendance report submitted to school office")
      setOpen(false)
      setReason("")
    } catch (err) {
      toast.error("Failed to submit report")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <AlertCircle className="h-4 w-4 mr-2" /> Report Absence / Late
        </Button>
      } />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report Attendance Issue</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Student</label>
            <select 
              value={studentId} 
              onChange={(e) => setStudentId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="" disabled>Select a child</option>
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.user.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <select 
                value={type} 
                onChange={(e) => setType(e.target.value as any)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="SICK">Sick (All Day)</option>
                <option value="LATE">Late Arrival</option>
                <option value="EARLY_DISMISSAL">Early Dismissal</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Reason / Note</label>
            <Textarea 
              value={reason} 
              onChange={(e) => setReason(e.target.value)} 
              placeholder="e.g. Doctor's appointment, family emergency..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
