"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { checkSchoolWideGradesSubmission, runSchoolWideReset } from "@/app/actions/reset-grades"
import { toast } from "sonner"
import { AlertTriangle, CheckCircle2, Loader2, Play, Users, ShieldAlert, ChevronDown } from "lucide-react"

export function SchoolWideReset({ terms }: { terms: any[] }) {
  const router = useRouter()
  const [selectedTermId, setSelectedTermId] = useState(terms[0]?.id || "")
  const [checking, setChecking] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [statusResult, setStatusResult] = useState<any | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const handleCheckStatus = async () => {
    if (!selectedTermId) return
    setChecking(true)
    try {
      const res = await checkSchoolWideGradesSubmission(selectedTermId)
      if (res.success) {
        setStatusResult(res)
        if (res.allFinished) {
          toast.success("Audit complete: All teachers have posted grades!")
        } else {
          toast.warning("Audit complete: Some teachers have missing grades.")
        }
      } else {
        toast.error(res.error || "Failed to audit grades status")
      }
    } catch (e) {
      console.error(e)
      toast.error("Failed to audit grades status")
    } finally {
      setChecking(false)
    }
  }

  const handleExecuteReset = async () => {
    setResetting(true)
    try {
      const res = await runSchoolWideReset(selectedTermId)
      if (res.success) {
        toast.success("School-wide grade reset complete! Active grades snapshotted and assignments archived.")
        setShowConfirmModal(false)
        setStatusResult(null)
        router.refresh()
      } else {
        toast.error(res.error || "Failed to execute reset")
      }
    } catch (e) {
      console.error(e)
      toast.error("Failed to execute reset")
    } finally {
      setResetting(false)
    }
  }

  const selectedTermName = terms.find(t => t.id === selectedTermId)?.name || ""

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden mt-8">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/10 flex items-center gap-3">
        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-2xl">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-950 dark:text-white uppercase tracking-tight">School-Wide End of Quarter Reset</h2>
          <p className="text-xs text-slate-500 mt-0.5">Audit teacher submissions and archive current gradebooks school-wide.</p>
        </div>
      </div>

      {/* Body Controls */}
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-end gap-4 bg-slate-50/50 dark:bg-slate-800/10 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Select Term to Reset & Archive:
            </label>
            <div className="relative">
              <select
                value={selectedTermId}
                onChange={(e) => {
                  setSelectedTermId(e.target.value)
                  setStatusResult(null)
                }}
                className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 pr-10 rounded-xl text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="">-- Choose Term --</option>
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.type})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <Button
            onClick={handleCheckStatus}
            disabled={checking || !selectedTermId}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs h-10 px-5 shadow-md shadow-indigo-600/10"
          >
            {checking ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                Auditing Submissions...
              </>
            ) : (
              "Audit Submissions & Check Status"
            )}
          </Button>
        </div>

        {/* Audit Results Dashboard */}
        {statusResult && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Warning Alert if grades are incomplete */}
            {!statusResult.allFinished ? (
              <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 p-5 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-black text-amber-900 dark:text-amber-400 uppercase tracking-tight">⚠️ INCOMPLETE SUBMISSIONS DETECTED</h4>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                    Warning: Some teachers have not submitted final term grades. If you proceed with the school-wide reset, their current calculated grades will be automatically frozen as their final snapshots.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30 p-5 rounded-2xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-tight">✅ ALL GRADES SUBMITTED</h4>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1 leading-relaxed">
                    Excellent: All teachers have posted their final grades for this term. It is safe to perform the school-wide archive and reset.
                  </p>
                </div>
              </div>
            )}

            {/* Incomplete Sections Roster */}
            <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-widest text-[9px] text-slate-400">
                    <th className="py-3 px-4">Section / Classroom</th>
                    <th className="py-3 px-4">Instructor</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Missing Grades</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-medium">
                  {statusResult.statusList.map((item: any) => (
                    <tr key={item.sectionId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {item.courseName} <span className="font-mono text-[10px] text-slate-400 ml-1">({item.courseCode})</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {item.teacherName}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-black tracking-wider ${
                          item.isFinished
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                            : "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
                        }`}>
                          {item.isFinished ? "Ready" : "Incomplete"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-500">
                        {item.missingCount} / {item.enrolledCount}
                      </td>
                    </tr>
                  ))}
                  {statusResult.statusList.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400 italic">
                        No active sections found for this term.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Execute reset buttons */}
            <div className="flex justify-end pt-2">
              <Button
                onClick={() => setShowConfirmModal(true)}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs px-6 shadow-md shadow-rose-600/10"
              >
                <Play className="w-3.5 h-3.5 mr-2" />
                Perform School-Wide Grade Reset
              </Button>
            </div>
          </div>
        )}
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
                <h3 className="text-lg font-black text-slate-950 dark:text-white uppercase tracking-tight">Double Confirmation</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Are you absolutely sure you want to trigger a school-wide reset for <span className="font-bold text-slate-950 dark:text-white">"{selectedTermName}"</span>?
                </p>
              </div>
            </div>

            <div className="my-2 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <p>🔴 This archives all active assignments in all sections linked to this term.</p>
              <p>🔴 All students' current calculated averages will be permanently frozen as snapshots.</p>
              <p>🔴 All course active gradebooks start at 0% for the next quarter.</p>
              {!statusResult?.allFinished && (
                <p className="text-rose-600 font-bold mt-2">⚠️ WARNING: You are proceeding despite incomplete submissions from teachers!</p>
              )}
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
                onClick={handleExecuteReset}
                disabled={resetting}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md shadow-rose-600/20 animate-pulse"
              >
                {resetting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    Resetting School-Wide...
                  </>
                ) : (
                  "Yes, Proceed School-Wide"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
