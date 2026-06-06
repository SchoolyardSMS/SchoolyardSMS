import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"
import Link from "next/link"

export function TermGradesTab({ id }: { id: string }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm text-indigo-600">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-indigo-900 dark:text-indigo-100">Term Grades</h3>
            <p className="text-xs text-indigo-700/70 dark:text-indigo-300/50">Post final report card grades for this section's students.</p>
          </div>
        </div>
        <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md">
          <Link href={`/dashboard/academics/sections/${id}/term-grades`}>
            Manage Term Grades
          </Link>
        </Button>
      </div>
      <div className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-20 text-center bg-slate-50/50 dark:bg-slate-900/20">
        <CheckCircle className="h-10 w-10 mx-auto mb-4 text-slate-300" />
        <h4 className="font-bold text-xl text-slate-900 dark:text-white">SIS Grading Engine</h4>
        <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">Use the Term Grades manager to input or override final grades for report cards.</p>
      </div>
    </div>
  )
}
