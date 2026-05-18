"use client"

import { GraduationCap, MapPin, Clock, Users, CalendarDays } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface SectionHeaderProps {
  section: any
}

export function SectionHeader({ section }: SectionHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-8">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl opacity-50" />
      
      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-indigo-600 text-white hover:bg-indigo-600 border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-md shadow-indigo-100 dark:shadow-none">
              {section.course.code}
            </Badge>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {section.term}
            </span>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            {section.course.name}
          </h1>
          
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2">
            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700">
                {section.teacher.user.name.charAt(0)}
              </div>
              {section.teacher.user.name}
            </div>
            
            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
              <MapPin className="w-4 h-4 text-slate-400" />
              {section.room || "Room TBA"}
            </div>
            
            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
              <Clock className="w-4 h-4 text-slate-400" />
              {section.schedule}
            </div>
            
            {section.bellPeriod && (
              <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                <CalendarDays className="w-4 h-4 text-slate-400" />
                {section.bellPeriod.name}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-black text-slate-900 dark:text-slate-100">
              {section.enrollments.length}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enrolled</span>
          </div>
        </div>
      </div>
    </div>
  )
}
