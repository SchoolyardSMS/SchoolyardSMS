"use client"

import { useRef } from "react"
import { JsonEditor } from "@/components/ui/json-editor"
import { Button } from "@/components/ui/button"
import { updateSchoolSettings } from "@/app/actions/settings"
import { toast } from "sonner"

const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault()
  const fd = new FormData(e.currentTarget)

  // Validate JSON fields before submitting
  const incidentTypes = fd.get("incidentTypes") as string
  const attendanceStatuses = fd.get("attendanceStatuses") as string

  if (incidentTypes?.trim()) {
    try { JSON.parse(incidentTypes) } catch {
      toast.error("Incident Types contains invalid JSON. Please fix it before saving.")
      return
    }
  }
  if (attendanceStatuses?.trim()) {
    try { JSON.parse(attendanceStatuses) } catch {
      toast.error("Attendance Statuses contains invalid JSON. Please fix it before saving.")
      return
    }
  }

  try {
    await updateSchoolSettings(fd)
    toast.success("Behavior settings saved")
  } catch (err: any) {
    toast.error(err?.message || "Failed to save settings")
  }
}

export function BehaviorSettingsClient({
  attendanceThreshold,
  incidentTypesJson,
  attendanceStatusesJson,
}: {
  attendanceThreshold: number
  incidentTypesJson: string
  attendanceStatusesJson: string
}) {
  const formRef = useRef<HTMLFormElement>(null)


  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <input type="hidden" name="activeSettingsTab" value="behavior" />

      {/* Attendance Rules */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-6 space-y-5">
        <h3 className="font-semibold text-base border-b border-slate-200 dark:border-slate-800 pb-3">Attendance Engine</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="setting-absence-threshold" className="text-sm font-medium">Chronic Absence Threshold</label>
            <div className="flex items-center gap-2">
              <input
                id="setting-absence-threshold"
                name="attendanceThreshold"
                type="number"
                min="1"
                max="100"
                defaultValue={attendanceThreshold}
                className="flex h-10 w-24 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold text-center outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-sm font-bold text-slate-500">absences</span>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Flags students automatically on SMS.</p>
          </div>
        </div>
      </div>

      {/* Discipline */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-6 space-y-5">
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="font-semibold text-base">Discipline Categories</h3>
          <span className="text-[10px] uppercase font-black tracking-widest text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">Advanced</span>
        </div>

        <JsonEditor
          name="incidentTypes"
          defaultValue={incidentTypesJson}
          rows={8}
          label="Incident Types"
          description="Define custom incident types and severities."
        />

        <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
          <JsonEditor
            name="attendanceStatuses"
            defaultValue={attendanceStatusesJson}
            rows={8}
            label="Attendance Statuses"
            description="Define custom attendance statuses and whether they excuse absences."
          />
        </div>
      </div>

      <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md rounded-full px-8">
        Save Behavior Settings
      </Button>
    </form>
  )
}
