"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { runSchoolYearRollover } from "@/app/actions/archive"
import { toast } from "sonner"
import { AlertTriangle, Archive, Loader2, Play, ChevronDown } from "lucide-react"

type SchoolYear = {
  id: string
  name: string
  isActive: boolean
  startDate: Date
  endDate: Date
}

export function SchoolYearArchive({ schoolYears }: { schoolYears: SchoolYear[] }) {
  const router = useRouter()
  const [selectedYearId, setSelectedYearId] = useState("")
  const [graduatingGrade, setGraduatingGrade] = useState(12)
  const [pending, startTransition] = useTransition()
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const handleExecuteRollover = () => {
    if (!selectedYearId) return

    startTransition(async () => {
      try {
        const res = await runSchoolYearRollover(selectedYearId, graduatingGrade)
        if (res?.success) {
          toast.success("School year rollover, section compression, and student promotions completed successfully!")
          setShowConfirmModal(false)
          setSelectedYearId("")
          router.refresh()
        } else {
          toast.error(res?.error || "Failed to execute rollover")
        }
      } catch (e: any) {
        console.error(e)
        toast.error(e.message || "Failed to execute rollover")
      }
    })
  }

  const selectedYearName = schoolYears.find(y => y.id === selectedYearId)?.name || ""

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden mt-8">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/10 flex items-center gap-3">
        <div className="p-3 bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 rounded-2xl">
          <Archive className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-950 dark:text-white uppercase tracking-tight">School Year Rollover & Archival</h2>
          <p className="text-xs text-slate-500 mt-0.5">Archive past year sections with gzip compression, promote students, and graduate seniors.</p>
        </div>
      </div>

      {/* Body Controls */}
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="archive-school-year" className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Select School Year to Archive:
            </label>
            <div className="relative">
              <select
                id="archive-school-year"
                value={selectedYearId}
                onChange={(e) => setSelectedYearId(e.target.value)}
                className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 pr-10 rounded-xl text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="">-- Choose School Year --</option>
                {schoolYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.isActive ? "(Active)" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="graduating-grade-level" className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Graduating Grade Level:
            </label>
            <select
              id="graduating-grade-level"
              value={graduatingGrade}
              onChange={(e) => setGraduatingGrade(Number(e.target.value))}
              className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 pr-10 rounded-xl text-xs font-bold focus:outline-none cursor-pointer"
            >
              {[12, 8, 5].map(lvl => (
                <option key={lvl} value={lvl}>Grade {lvl} (Senior)</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={() => setShowConfirmModal(true)}
            disabled={!selectedYearId}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs px-6 shadow-md shadow-teal-600/10"
          >
            <Play className="w-3.5 h-3.5 mr-2" />
            Initiate Rollover & Compression
          </Button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden shadow-2xl flex flex-col p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-2xl text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-950 dark:text-white uppercase tracking-tight">Perform Rollover?</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Are you sure you want to run the rollover and archive the school year <span className="font-bold text-slate-950 dark:text-white">"{selectedYearName}"</span>?
                </p>
              </div>
            </div>

            <div className="my-2 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs leading-relaxed text-slate-650 dark:text-slate-350">
              <p>⚡ This compresses and archives all sections linked to this school year.</p>
              <p>⚡ Detailed grades, submissions, and attendance logs for these sections will be deleted from active tables to free database space.</p>
              <p>⚡ Graduating Grade {graduatingGrade} students will be archived.</p>
              <p>⚡ Active students below Grade {graduatingGrade} will be promoted to the next grade level.</p>
              <p>⚡ Any legacy archived sections will be automatically converted and compressed.</p>
            </div>

            <div className="flex gap-2 justify-end mt-4">
              <Button
                variant="ghost"
                onClick={() => setShowConfirmModal(false)}
                className="rounded-xl font-bold text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleExecuteRollover}
                disabled={pending}
                className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-md shadow-teal-600/20"
              >
                {pending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    Running Rollover...
                  </>
                ) : (
                  "Execute Rollover"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
