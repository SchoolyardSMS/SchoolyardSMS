"use client"

import { JsonEditor } from "@/components/ui/json-editor"
import { Button } from "@/components/ui/button"
import { updateSchoolSettings } from "@/app/actions/settings"
import { toast } from "sonner"

function ToggleRow({ name, label, description, defaultChecked }: { name: string; label: string; description: string; defaultChecked: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <label className="text-base font-medium">{label}</label>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" name={name} className="sr-only peer" defaultChecked={defaultChecked} />
        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
      </label>
    </div>
  )
}

export function FeaturesSettingsClient({
  features,
  rolePermissionsJson,
}: {
  features: { lms: boolean; discipline: boolean; community: boolean }
  rolePermissionsJson: string
}) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const rolePermissions = fd.get("rolePermissions") as string
    if (rolePermissions?.trim()) {
      try { JSON.parse(rolePermissions) } catch {
        toast.error("Role Permissions contains invalid JSON. Please fix it before saving.")
        return
      }
    }
    try {
      await updateSchoolSettings(fd)
      toast.success("Feature settings saved")
    } catch (err: any) {
      toast.error(err?.message || "Failed to save settings")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input type="hidden" name="activeSettingsTab" value="features" />

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-6 space-y-6">
        <ToggleRow name="feature_lms" label="Learning Management System (LMS)" description="Gradebooks, assignments, and academic tracking." defaultChecked={features.lms} />
        <ToggleRow name="feature_discipline" label="Discipline Tracking" description="Incident reporting and behavioral logging." defaultChecked={features.discipline} />
        <ToggleRow name="feature_community" label="Community Period" description="Extracurricular session scheduling and sign-ups." defaultChecked={features.community} />
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-6 space-y-5">
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="font-semibold text-base">Role Permissions Config</h3>
          <span className="text-[10px] uppercase font-black tracking-widest text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">Advanced</span>
        </div>
        <JsonEditor
          name="rolePermissions"
          defaultValue={rolePermissionsJson}
          rows={8}
          label="Permissions Map"
          description="Define fine-grained permissions for specific roles."
        />
      </div>

      <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md rounded-full px-8">
        Save Feature Toggles
      </Button>
    </form>
  )
}
