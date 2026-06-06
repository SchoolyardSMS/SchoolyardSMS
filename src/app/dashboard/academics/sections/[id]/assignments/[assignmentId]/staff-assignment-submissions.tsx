import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Clock, FileText, Bell } from "lucide-react"
import { nudgeStudent, nudgeAllPending } from "@/app/actions/academics"
import { toast } from "sonner"

export function StaffAssignmentSubmissions({ assignment, enrollments }: { assignment: any, enrollments: any[] }) {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center">
        <h3 className="font-semibold">Student Submissions</h3>
        <Button 
          variant="outline" 
          size="sm" 
          className="rounded-full text-xs font-bold gap-2"
          onClick={async () => {
            try {
              const res = await nudgeAllPending(assignment.id)
              toast.success(`Nudged ${res.count} students.`)
            } catch (e: any) {
              toast.error(e.message)
            }
          }}
        >
          <Bell className="h-3 w-3" />
          Nudge All Pending
        </Button>
      </div>
      <div className="divide-y divide-border">
        {enrollments.length === 0 ? (
           <p className="p-6 text-sm text-muted-foreground">No students enrolled.</p>
        ) : (
           enrollments.map((enr: any) => {
             const submissionRecord = assignment.submissions.find((s: any) => s.studentId === enr.student.id)
             const isSubmitted = !!submissionRecord
             const submissionDocs = assignment.documents.filter((d: any) => d.studentId === enr.student.id || d.uploaderId === enr.student.userId)
             
             return (
               <div key={enr.student.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                      {enr.student.user.name.charAt(0)}
                    </div>
                    <div>
                       <p className="font-semibold">{enr.student.user.name}</p>
                       <div className="flex gap-2 mt-1">
                         {!assignment.allowUpload && submissionRecord ? (
                           <Badge variant="outline" className={
                             submissionRecord.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800" :
                             submissionRecord.status === "IN_PROGRESS" ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800" :
                             "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800"
                           }>
                             {submissionRecord.status === "COMPLETED" ? <Check className="h-3 w-3 mr-1" /> : 
                              submissionRecord.status === "IN_PROGRESS" ? <Clock className="h-3 w-3 mr-1" /> : 
                              <FileText className="h-3 w-3 mr-1" />}
                             {submissionRecord.status === "COMPLETED" ? "Completed" : 
                              submissionRecord.status === "IN_PROGRESS" ? "In Progress" : 
                              "To Do"}
                           </Badge>
                         ) : isSubmitted ? (
                           <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                             <Check className="h-3 w-3 mr-1" /> Submitted
                           </Badge>
                         ) : (
                           <div className="flex items-center gap-2">
                             <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                               Pending
                             </Badge>
                             <Button 
                               variant="ghost" 
                               size="sm" 
                               className="h-6 px-2 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                               onClick={async () => {
                                 try {
                                   await nudgeStudent(assignment.id, enr.student.id)
                                   toast.success(`Nudge sent to ${enr.student.user.name}`)
                                 } catch (e: any) {
                                   toast.error(e.message)
                                 }
                               }}
                             >
                               <Bell className="h-2.5 w-2.5 mr-1" />
                               Nudge
                             </Button>
                           </div>
                         )}
                       </div>
                    </div>
                  </div>
                  <div className="text-right">
                     {submissionDocs.length > 0 ? (
                        <div className="flex flex-col gap-1 items-end">
                          {submissionDocs.map((s: any) => (
                            <a key={s.id} href={s.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
                              <FileText className="h-4 w-4" /> {s.title}
                            </a>
                          ))}
                        </div>
                     ) : assignment.allowUpload ? (
                        <p className="text-sm text-muted-foreground italic">No files</p>
                     ) : (
                        <p className="text-sm text-muted-foreground italic">Not required</p>
                     )}
                  </div>
               </div>
             )
           })
        )}
      </div>
    </div>
  )
}
