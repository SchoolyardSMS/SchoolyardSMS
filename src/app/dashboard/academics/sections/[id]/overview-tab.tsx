import { ClipboardList, MessageSquare, BarChart3, Users, CheckCircle } from "lucide-react"
import { AnnouncementStream } from "@/components/dashboard/academics/announcement-stream"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

export function OverviewTab({ 
  section, 
  id, 
  isStaff, 
  userId, 
  visibleAssignments, 
  stats 
}: { 
  section: any
  id: string
  isStaff: boolean
  userId: string
  visibleAssignments: any[]
  stats: { label: string; value: string | number; icon: any; color: string }[]
}) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className={cn("p-3 rounded-xl", stat.color)}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white leading-none mb-1">{stat.value}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Stream Column */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 px-2">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            Class Stream
          </h3>
          <AnnouncementStream 
            sectionId={id} 
            announcements={section.announcements} 
            isStaff={isStaff} 
            currentUserId={userId}
          />
        </div>

        {/* Sidebar Column */}
        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-indigo-600" />
                Upcoming Tasks
              </h3>
            </div>
            <div className="p-6">
              {visibleAssignments.length === 0 ? (
                <p className="text-sm text-slate-500 italic py-10 text-center">No assignments found.</p>
              ) : (
                <div className="space-y-4">
                  {visibleAssignments.slice(0, 5).map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{a.title}</p>
                        <p className="text-[10px] text-slate-400 font-medium">Due {new Date(a.dueDate).toLocaleDateString()}</p>
                      </div>
                      <Badge variant="outline" className="text-[9px] uppercase font-black tracking-tighter shrink-0">
                        {a.maxScore} pts
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                Latest Activity
              </h3>
            </div>
            <div className="p-6 space-y-6">
              {(() => {
                const activity = [
                  ...section.announcements.map((a: any) => ({
                    type: 'announcement',
                    text: `Announcement posted`,
                    date: a.createdAt,
                    color: 'bg-indigo-500'
                  })),
                  ...section.assignments.map((a: any) => ({
                    type: 'assignment',
                    text: `New Assignment: "${a.title}"`,
                    date: a.createdAt,
                    color: 'bg-emerald-500'
                  }))
                ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3)

                if (activity.length === 0) {
                  return <p className="text-sm text-slate-500 italic py-4 text-center">No recent activity.</p>
                }

                return activity.map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", item.color)} />
                    <div>
                      <p className="text-xs font-medium">{item.text}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">
                        {formatDistanceToNow(new Date(item.date))} ago
                      </p>
                    </div>
                  </div>
                ))
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
