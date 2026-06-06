import { EnrollStudentDialog } from "@/components/dashboard/academics/enroll-student-dialog"
import { unenrollStudent } from "@/app/actions/academics"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2 } from "lucide-react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

export function RosterTab({ 
  id, 
  section, 
  isStaff, 
  allStudentUsers, 
  enrolledUserIds 
}: { 
  id: string
  section: any
  isStaff: boolean
  allStudentUsers: any[]
  enrolledUserIds: string[]
}) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {isStaff && (
        <div className="flex justify-end">
          <EnrollStudentDialog 
            sectionId={id} 
            allStudents={allStudentUsers}
            enrolledStudentIds={enrolledUserIds}
          />
        </div>
      )}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-500 py-4 pl-6">Student</TableHead>
              <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-500 py-4">Email</TableHead>
              <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-500 py-4">Grade</TableHead>
              <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-500 py-4">Status</TableHead>
              {isStaff && <TableHead className="text-right font-black uppercase tracking-widest text-[10px] text-slate-500 py-4 pr-6">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {section.enrollments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isStaff ? 5 : 4} className="text-center h-32 text-slate-500 italic">No students enrolled.</TableCell>
              </TableRow>
            ) : (
              (section.enrollments as any[]).map((enr: any) => (
                <TableRow key={enr.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-100 dark:border-slate-800/50">
                  <TableCell className="py-4 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-black text-white bg-indigo-600 shadow-sm">
                        {enr.student.user.name.charAt(0)}
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">{enr.student.user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">{enr.student.user.email}</TableCell>
                  <TableCell className="font-bold text-slate-900 dark:text-white">Grade {enr.student.gradeLevel}</TableCell>
                  <TableCell>
                    <Badge variant={enr.status === "ENROLLED" ? "secondary" : "outline"} className="text-[10px] font-black uppercase">
                      {enr.status}
                    </Badge>
                  </TableCell>
                  {isStaff && (
                    <TableCell className="text-right py-4 pr-6">
                      <form action={async () => {
                        "use server"
                        await unenrollStudent(enr.id, id)
                      }}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600 rounded-full transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </form>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
