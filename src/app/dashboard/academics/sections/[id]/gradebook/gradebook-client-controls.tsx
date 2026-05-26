"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ChevronDown, CheckSquare, Printer, FileText } from "lucide-react"

export function GradebookClientControls({
  sectionId,
  possibleTerms,
  currentTermId,
}: {
  sectionId: string
  possibleTerms: any[]
  currentTermId: string | null
  sectionActiveTermId: string | null
}) {
  const router = useRouter()

  const handleFilterChange = (val: string) => {
    if (val === "active") {
      router.push(`/dashboard/academics/sections/${sectionId}/gradebook`)
    } else {
      router.push(`/dashboard/academics/sections/${sectionId}/gradebook?termId=${val}`)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm justify-between">
      {/* Term Filter (Blackbaud style) */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Grades View:</span>
        <div className="relative">
          <select
            value={currentTermId || "active"}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 pr-10 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-all"
          >
            <option value="active">Current Quarter (Active Gradebook)</option>
            {possibleTerms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} (Archived Snapshot)
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Roster & Gradebook Print Actions & Post Term Grades */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => window.print()}
          variant="outline"
          className="rounded-xl font-bold text-xs border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 flex items-center gap-1.5 h-9"
        >
          <Printer className="w-3.5 h-3.5 text-slate-500" />
          Print Gradebook
        </Button>
        <Button
          onClick={() => window.open(`/dashboard/academics/sections/${sectionId}/gradebook?blank=true`, '_blank')}
          variant="outline"
          className="rounded-xl font-bold text-xs border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 flex items-center gap-1.5 h-9"
        >
          <FileText className="w-3.5 h-3.5 text-slate-500" />
          Print Blank Worksheet
        </Button>

        {!currentTermId && (
          <Button
            asChild
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400 dark:hover:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl font-bold text-xs h-9"
          >
            <Link href={`/dashboard/academics/sections/${sectionId}/term-grades`}>
              <CheckSquare className="w-3.5 h-3.5 mr-2" />
              Post Term Grades
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}
