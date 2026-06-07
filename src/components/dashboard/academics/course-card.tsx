import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BookOpen, Calendar, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface CourseCardProps {
  section: any
  gradient: string
}

export function CourseCard({ section, gradient }: CourseCardProps) {
  return (
    <div className="group flex flex-col rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
      <div className={cn("p-6 text-white h-36 relative overflow-hidden bg-gradient-to-br", gradient)}>
        {/* Subtle background icon */}
        <BookOpen className="absolute -right-4 -bottom-4 w-24 h-24 opacity-10 rotate-12" />
        
        <Link href={`/dashboard/academics/sections/${section.id}`} className="relative z-10 block group/title">
          <h3 className="text-xl font-bold leading-tight truncate pr-10 group-hover/title:underline decoration-white/30 underline-offset-4">
            {section.course.name}
          </h3>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
              {section.term}
            </span>
            <span className="text-[10px] font-medium opacity-80 uppercase tracking-wider">
              {section.course.code}
            </span>
          </div>
        </Link>
        
        <div className="absolute bottom-4 left-6 text-xs font-bold opacity-90 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm text-[10px]">
            {section.teacher.user.name.charAt(0)}
          </div>
          {section.teacher.user.name}
        </div>
      </div>

      <div className="flex-1 p-6 pt-8 space-y-5 bg-transparent">
        <div>
          <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            Upcoming Tasks
          </h4>
          
          {section.assignments.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic py-2">No assignments due soon</p>
          ) : (
            <div className="space-y-3">
              {section.assignments.map((ass: any) => (
                <div key={ass.id} className="flex flex-col gap-0.5 border-l-2 border-slate-100 dark:border-slate-800 pl-3 group/ass transition-colors hover:border-indigo-500">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate group-hover/ass:text-indigo-600 dark:group-hover/ass:text-indigo-400">
                      {ass.title}
                    </span>
                    {ass.submissions.length > 0 && (
                      <span className="text-[8px] font-black text-emerald-600 uppercase bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
                        Done
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    Due {new Date(ass.dueDate).toLocaleDateString(undefined, { timeZone: 'UTC', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-slate-50 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-900/50">
        <Button variant="ghost" className="w-full justify-between group/btn text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" asChild>
          <Link href={`/dashboard/academics/sections/${section.id}`}>
            <span className="text-xs font-bold uppercase tracking-widest">Go to Classroom</span>
            <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
