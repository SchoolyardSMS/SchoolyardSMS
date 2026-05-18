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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
            <Select value={studentId} onValueChange={(v) => v && setStudentId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a child" />
              </SelectTrigger>
              <SelectContent>
                {children.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={type} onValueChange={(v: any) => v && setType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SICK">Sick (All Day)</SelectItem>
                  <SelectItem value="LATE">Late Arrival</SelectItem>
                  <SelectItem value="EARLY_DISMISSAL">Early Dismissal</SelectItem>
                </SelectContent>
              </Select>
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
