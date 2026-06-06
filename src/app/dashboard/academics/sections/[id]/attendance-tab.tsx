import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

export function AttendanceTab({ 
  id, 
  section 
}: { 
  id: string
  section: any
}) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm text-indigo-600">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-indigo-900 dark:text-indigo-100">Live Attendance</h3>
            <p className="text-xs text-indigo-700/70 dark:text-indigo-300/50">Manage daily presence for this section.</p>
          </div>
        </div>
        <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md">
          <Link href={`/dashboard/academics/sections/${id}/attendance`}>
            Launch Attendance Sheet
          </Link>
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-500 py-4 pl-6">Date</TableHead>
              <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-500 py-4">Student</TableHead>
              <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-500 py-4">Status</TableHead>
              <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-500 py-4 pr-6">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {section.attendance.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-32 text-slate-500 italic">No attendance records yet.</TableCell>
              </TableRow>
            ) : (
              (section.attendance as any[]).map((att: any) => (
                <TableRow key={att.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-100 dark:border-slate-800/50">
                  <TableCell className="py-4 pl-6 font-bold text-slate-900 dark:text-white">
                    {new Date(att.date).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" })}
                  </TableCell>
                  <TableCell className="py-4 font-medium text-slate-700 dark:text-slate-300">
                    {att.student?.user?.name ?? "—"}
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge 
                      className={cn(
                        "px-3 py-0.5 text-[9px] font-black uppercase tracking-widest",
                        att.status === "PRESENT" ? "bg-emerald-100 text-emerald-700" :
                        att.status === "ABSENT"  ? "bg-rose-100 text-rose-700" :
                        att.status === "TARDY"   ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                      )}
                    >
                      {att.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4 pr-6 text-slate-400 text-[10px] italic">{att.notes ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
