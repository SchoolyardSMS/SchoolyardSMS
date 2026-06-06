import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertCircle } from "lucide-react"
import { acknowledgeAttendanceNotification } from "@/app/actions/attendance"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/dates"

export function AttendanceNotificationsTable({ 
  notifications, 
  isParent, 
  isAdmin 
}: { 
  notifications: any[], 
  isParent: boolean, 
  isAdmin: boolean 
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <AlertCircle className="h-5 w-5 text-indigo-500" />
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
          {isParent ? "Recent Absence Reports" : "Parent Absence Notifications"}
        </h3>
      </div>
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <TableHead className="font-bold">Student</TableHead>
              <TableHead className="font-bold">Type</TableHead>
              <TableHead className="font-bold">Date</TableHead>
              <TableHead className="font-bold">Reason</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              {isAdmin && <TableHead className="text-right font-bold">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {notifications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="text-center h-32 text-slate-500 italic">
                  No active notifications or reports found.
                </TableCell>
              </TableRow>
            ) : (
              notifications.map((n) => (
                <TableRow key={n.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <TableCell className="font-semibold text-slate-900 dark:text-slate-100">{n.student.user.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        n.type === "SICK" ? "bg-rose-500" :
                        n.type === "LATE" ? "bg-amber-500" : "bg-blue-500"
                      )} />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        {n.type.replace("_", " ")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-400 text-sm">
                    {formatDate(n.date, { timeZone: "UTC", month: 'short', day: 'numeric', year: 'numeric' })}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 dark:text-slate-400 max-w-[240px] truncate">{n.reason || "No reason provided"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={n.status === "ACKNOWLEDGED" ? "secondary" : "outline"}
                      className={cn(
                        "text-[10px] font-bold uppercase",
                        n.status === "PENDING" ? "border-amber-200 text-amber-700 bg-amber-50" : ""
                      )}
                    >
                      {n.status}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      {n.status === "PENDING" && (
                        <form action={async () => {
                          "use server"
                          await acknowledgeAttendanceNotification(n.id)
                        }}>
                          <Button size="sm" variant="ghost" className="h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-bold text-xs">
                            <CheckCircle className="h-4 w-4 mr-1.5" /> Acknowledge
                          </Button>
                        </form>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
