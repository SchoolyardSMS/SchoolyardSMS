import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/dates"

export function AttendanceDailyLogTable({ 
  records, 
  showStudentColumn 
}: { 
  records: any[], 
  showStudentColumn: boolean 
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Clock className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Daily Class Records</h3>
      </div>
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <TableHead className="font-bold">Date</TableHead>
              {showStudentColumn && <TableHead className="font-bold">Student</TableHead>}
              <TableHead className="font-bold">Course & Section</TableHead>
              <TableHead className="font-bold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showStudentColumn ? 4 : 3} className="text-center h-32 text-slate-500 italic">
                  No classroom attendance records found.
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow key={record.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <TableCell className="font-medium text-slate-600 dark:text-slate-400">
                    {formatDate(record.date, { timeZone: "UTC", month: 'short', day: 'numeric' })}
                  </TableCell>
                  {showStudentColumn && (
                    <TableCell className="font-bold text-slate-900 dark:text-white">{record.student?.user.name}</TableCell>
                  )}
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{record.section?.course.name}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest">
                        {record.section?.term?.name ?? ""}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        "px-3 py-0.5 text-[10px] font-black uppercase tracking-tighter",
                        record.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' :
                        record.status === 'ABSENT' ? 'bg-rose-100 text-rose-700 hover:bg-rose-100' : 'bg-slate-100 text-slate-700'
                      )}
                    >
                      {record.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
