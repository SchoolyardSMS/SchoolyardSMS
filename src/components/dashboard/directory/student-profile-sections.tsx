import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  Mail,
  GraduationCap,
  ShieldCheck,
  Smartphone,
  AlertTriangle,
  BookOpen,
  FileText
} from "lucide-react"
import { ReportCardDownloader } from "@/app/dashboard/directory/[id]/report-card-downloader"
import { formatDate } from "@/lib/dates"

export function StudentIdentityCard({ student, canViewSensitive, reportCards }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm relative">
      <div className="h-32 bg-gradient-to-br from-indigo-500 to-purple-600" />
      <div className="px-6 pb-6">
        <div className="relative -mt-12 mb-4">
          <div className="h-24 w-24 rounded-3xl bg-white dark:bg-slate-900 p-1.5 shadow-lg mx-auto lg:mx-0">
            <div className="h-full w-full rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-2xl">
              {student.user.name.charAt(0)}
            </div>
          </div>
        </div>
        <div className="text-center lg:text-left">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{student.user.name}</h2>
          <div className="flex items-center justify-center lg:justify-start gap-2 mt-1.5 text-sm text-slate-500 font-medium">
             <GraduationCap className="h-4 w-4" /> Grade {student.gradeLevel}
          </div>
        </div>
        
        <div className="mt-6 space-y-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4">
           <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
              <Mail className="h-4 w-4 text-indigo-500 shrink-0" />
              <span className="truncate">{student.user.email}</span>
           </div>
           <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
              <ShieldCheck className="h-4 w-4 text-indigo-500 shrink-0" />
              <span className="font-mono text-[11px] uppercase font-bold tracking-widest">{student.id}</span>
           </div>
        </div>

        {canViewSensitive && (
          <div className="mt-6 flex flex-col gap-2">
            <ReportCardDownloader
              studentId={student.id}
              reportCards={reportCards || []}
            />
            <Button asChild variant="outline" className="w-full rounded-xl border-indigo-200 dark:border-indigo-800">
              <a href={`/api/reports/transcript/${student.id}`} download>
                <FileText className="h-4 w-4 mr-2" /> Download Transcript
              </a>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export function StudentContacts({ student }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
      <h3 className="font-bold mb-4 flex items-center gap-2">
        <Smartphone className="h-5 w-5 text-indigo-500" /> Contacts
      </h3>
      <div className="space-y-3">
         {student.parents.map((p: any) => (
           <div key={p.parentId} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/50">
              <p className="font-bold text-sm text-slate-900 dark:text-white">{p.parent.user.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{p.parent.user.email}</p>
              {p.parent.phone && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="px-2 py-1 bg-white dark:bg-slate-900 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700">
                    {p.parent.phone}
                  </span>
                </div>
              )}
           </div>
         ))}
      </div>
    </div>
  )
}

export function StudentMedical({ student, isAdmin }: any) {
  return (
    <div className="bg-rose-50 dark:bg-rose-900/10 rounded-3xl border border-rose-200 dark:border-rose-900/30 p-6 relative">
       {isAdmin && (
         <Button variant="ghost" size="sm" asChild className="absolute top-4 right-4 text-rose-700 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-900/40">
           <Link href={`/dashboard/admin/students/${student.id}/health`}>
             Edit
           </Link>
         </Button>
       )}
       <h3 className="font-bold mb-4 flex items-center gap-2 text-rose-700 dark:text-rose-400">
         <ShieldCheck className="h-5 w-5" /> Accommodations
       </h3>
       <div className="space-y-4">
         {student.medicalAlerts && (
           <div>
             <p className="text-[10px] text-rose-500 uppercase font-black tracking-widest mb-1.5">Medical Alerts</p>
             <p className="text-sm font-medium text-rose-900 dark:text-rose-200 leading-relaxed">
               {student.medicalAlerts}
             </p>
           </div>
         )}
         {student.accommodations && (
           <div>
             <p className="text-[10px] text-indigo-500 uppercase font-black tracking-widest mb-1.5 mt-4">Learning Plan</p>
             <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200 leading-relaxed">
               {student.accommodations}
             </p>
           </div>
         )}
       </div>
    </div>
  )
}

export function StudentStats({ overallGPA, attendanceRate, absentCount, incidentCount }: any) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Overall GPA</p>
        <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{overallGPA}%</p>
      </div>
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Attendance</p>
        <p className={`text-3xl font-black ${attendanceRate < 90 ? 'text-amber-500' : 'text-emerald-500'}`}>{attendanceRate}%</p>
      </div>
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Absences</p>
        <p className={`text-3xl font-black ${absentCount > 5 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>{absentCount}</p>
      </div>
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Open Incidents</p>
        <p className={`text-3xl font-black ${incidentCount > 0 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>{incidentCount}</p>
      </div>
    </div>
  )
}

export function StudentAcademicPerformance({ coursesProgress }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-indigo-500" /> Academic Performance
        </h3>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {coursesProgress.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FileText className="w-8 h-8 mx-auto mb-3 opacity-20" />
            <p>No active enrollments.</p>
          </div>
        ) : (
          coursesProgress.map((cp: any, idx: number) => (
            <div key={idx} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{cp.courseName}</p>
                <p className="text-xs text-slate-500 mt-1">Status: Enrolled</p>
              </div>
              <div className="text-right">
                {cp.percentage !== null ? (
                  <p className={`text-2xl font-black ${cp.percentage < 70 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {cp.percentage.toFixed(1)}%
                  </p>
                ) : (
                  <p className="text-sm font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">No Grades Yet</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export function StudentActiveIncidents({ incidents }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/30 overflow-hidden shadow-sm">
      <div className="bg-rose-50 dark:bg-rose-900/20 p-6 border-b border-rose-100 dark:border-rose-900/30">
        <h3 className="font-bold text-lg flex items-center gap-2 text-rose-700 dark:text-rose-400">
          <AlertTriangle className="h-5 w-5" /> Open Disciplinary Incidents
        </h3>
      </div>
      <div className="divide-y divide-rose-50 dark:divide-rose-900/20">
        {incidents.map((inc: any) => (
          <div key={inc.id} className="p-6 flex flex-col sm:flex-row gap-4 justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 text-[10px] uppercase font-bold tracking-widest">
                  {inc.severity}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  {formatDate(inc.date)}
                </span>
              </div>
              <p className="font-bold text-slate-900 dark:text-white mb-1">{inc.title}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{inc.description}</p>
            </div>
            <Button variant="outline" size="sm" asChild className="shrink-0">
              <Link href={`/dashboard/discipline/${inc.id}`}>View Details</Link>
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
