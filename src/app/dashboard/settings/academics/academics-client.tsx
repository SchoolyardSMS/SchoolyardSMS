"use client"

import { JsonEditor } from "@/components/ui/json-editor"
import { Button } from "@/components/ui/button"
import { updateSchoolSettings } from "@/app/actions/settings"
import { toast } from "sonner"

const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault()
  const fd = new FormData(e.currentTarget)
  const gradingScale = fd.get("gradingScale") as string
  if (gradingScale?.trim()) {
    try { JSON.parse(gradingScale) } catch {
      toast.error("Grading Scale contains invalid JSON. Please fix it before saving.")
      return
    }
  }
  try {
    await updateSchoolSettings(fd)
    toast.success("Academic settings saved")
  } catch (err: any) {
    toast.error(err?.message || "Failed to save settings")
  }
}

export function AcademicSettingsClient({
  activeTerm,
  passingGrade,
  gpaScale,
  gradingScaleJson,
}: {
  activeTerm: string
  passingGrade: number
  gpaScale: string
  gradingScaleJson: string
}) {

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input type="hidden" name="activeSettingsTab" value="academics" />

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-6 space-y-5">
        <h3 className="font-semibold text-base border-b border-slate-200 dark:border-slate-800 pb-3">Global Configuration</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="setting-active-term" className="text-sm font-medium">Active Term</label>
            <input id="setting-active-term" name="activeTerm" type="text"
              defaultValue={activeTerm}
              className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Default term for new sections.</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-6 space-y-5">
        <h3 className="font-semibold text-base border-b border-slate-200 dark:border-slate-800 pb-3">Grading Scale Engine</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="setting-passing-grade" className="text-sm font-medium">Minimum Passing Grade</label>
            <div className="flex items-center gap-2">
              <input id="setting-passing-grade" name="passingGrade" type="number" min="0" max="100"
                defaultValue={passingGrade}
                className="flex h-10 w-24 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold text-center outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-sm font-bold text-slate-500">%</span>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Scores below this are flagged as failing.</p>
          </div>
          <div className="space-y-2">
            <label htmlFor="setting-gpa-scale" className="text-sm font-medium">GPA Max Scale</label>
            <select id="setting-gpa-scale" name="gpaScale" defaultValue={gpaScale}
              className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="4.0">Standard 4.0 Scale</option>
              <option value="5.0">Weighted 5.0 Scale</option>
              <option value="100">100-Point Scale</option>
            </select>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Formula applied to report cards.</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-6 space-y-5">
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="font-semibold text-base">Grading Scale Config</h3>
          <span className="text-[10px] uppercase font-black tracking-widest text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">Advanced</span>
        </div>
        <JsonEditor
          name="gradingScale"
          defaultValue={gradingScaleJson}
          rows={10}
          label="Letter Grade Thresholds"
          description='Each entry needs "letter" and "min" (minimum % to earn that grade). Sorted descending automatically.'
        />
      </div>

      <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md rounded-full px-8">
        Save Academic Settings
      </Button>
    </form>
  )
}
