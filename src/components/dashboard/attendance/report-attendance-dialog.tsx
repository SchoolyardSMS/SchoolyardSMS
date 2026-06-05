"use client"

import { useReducer } from "react"
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

type AttendanceType = "SICK" | "LATE" | "EARLY_DISMISSAL"

interface FormState {
  open: boolean
  studentId: string
  type: AttendanceType
  date: string
  reason: string
  isSubmitting: boolean
}

type FormAction =
  | { type: "OPEN" }
  | { type: "CLOSE" }
  | { type: "SET_STUDENT"; id: string }
  | { type: "SET_TYPE"; attendanceType: AttendanceType }
  | { type: "SET_DATE"; date: string }
  | { type: "SET_REASON"; reason: string }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_DONE" }

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "OPEN":        return { ...state, open: true }
    case "CLOSE":       return { ...state, open: false, reason: "", isSubmitting: false }
    case "SET_STUDENT": return { ...state, studentId: action.id }
    case "SET_TYPE":    return { ...state, type: action.attendanceType }
    case "SET_DATE":    return { ...state, date: action.date }
    case "SET_REASON":  return { ...state, reason: action.reason }
    case "SUBMIT_START": return { ...state, isSubmitting: true }
    case "SUBMIT_DONE": return { ...state, isSubmitting: false, open: false, reason: "" }
    default:            return state
  }
}

export function ReportAttendanceDialog({ children }: ReportAttendanceDialogProps) {
  const [state, dispatch] = useReducer(formReducer, {
    open: false,
    studentId: children[0]?.id || "",
    type: "SICK",
    date: new Date().toISOString().split('T')[0],
    reason: "",
    isSubmitting: false,
  })

  const handleSubmit = async () => {
    if (!state.studentId || !state.date) return
    dispatch({ type: "SUBMIT_START" })
    try {
      await reportAttendance(state.studentId, state.type, state.date, state.reason)
      toast.success("Attendance report submitted to school office")
      dispatch({ type: "SUBMIT_DONE" })
    } catch (err) {
      toast.error("Failed to submit report")
      dispatch({ type: "SUBMIT_DONE" })
    }
  }

  return (
    <Dialog open={state.open} onOpenChange={(open) => dispatch({ type: open ? "OPEN" : "CLOSE" })}>
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
            <label htmlFor="report-student-select" className="text-sm font-medium">Select Student</label>
            <select 
              id="report-student-select"
              value={state.studentId} 
              onChange={(e) => dispatch({ type: "SET_STUDENT", id: e.target.value })}
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
              <label htmlFor="report-type-select" className="text-sm font-medium">Type</label>
              <select 
                id="report-type-select"
                value={state.type} 
                onChange={(e) => dispatch({ type: "SET_TYPE", attendanceType: e.target.value as AttendanceType })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="SICK">Sick (All Day)</option>
                <option value="LATE">Late Arrival</option>
                <option value="EARLY_DISMISSAL">Early Dismissal</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="report-date-input" className="text-sm font-medium">Date</label>
              <Input id="report-date-input" type="date" value={state.date} onChange={(e) => dispatch({ type: "SET_DATE", date: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="report-reason-textarea" className="text-sm font-medium">Reason / Note</label>
            <Textarea 
              id="report-reason-textarea"
              value={state.reason} 
              onChange={(e) => dispatch({ type: "SET_REASON", reason: e.target.value })} 
              placeholder="e.g. Doctor's appointment, family emergency..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => dispatch({ type: "CLOSE" })}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={state.isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {state.isSubmitting ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
