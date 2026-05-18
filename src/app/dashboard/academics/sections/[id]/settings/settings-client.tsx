"use client"

import { useState } from "react"
import { updateGradingSettings } from "@/app/actions/academics"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, CheckCircle, Save } from "lucide-react"

// Types matching the Prisma AssignmentType Enum
const AVAILABLE_TYPES = ["HOMEWORK", "QUIZ", "TEST", "PROJECT", "LAB", "OTHER"]

export function SettingsClient({ sectionId, initialConfig }: { sectionId: string, initialConfig: Record<string, number> }) {
  const [config, setConfig] = useState<Record<string, number>>(() => {
    // Fill in missing types with 0
    const fullConfig = { ...initialConfig }
    AVAILABLE_TYPES.forEach(t => {
      if (fullConfig[t] === undefined) fullConfig[t] = 0
    })
    return fullConfig
  })
  
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const totalWeight = Object.values(config).reduce((s, v) => s + (Number(v) || 0), 0)

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(false)
    
    try {
      // Send only the ones greater than 0
      const payload: Record<string, number> = {}
      Object.entries(config).forEach(([key, val]) => {
        if (val > 0) payload[key] = val
      })

      await updateGradingSettings(sectionId, payload)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e: any) {
      setError(e.message || "Failed to save grading settings.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Category Weights</h2>
        <p className="text-slate-500 text-sm mt-1">
          Configure how different assignment categories contribute to the final grade. The total weight must equal exactly 100%, or 0% for an unweighted point-based system.
        </p>
      </div>

      <div className="space-y-4 max-w-lg mb-8">
        {AVAILABLE_TYPES.map(type => (
          <div key={type} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
            <span className="font-bold text-slate-700 dark:text-slate-300 capitalize">
              {type.toLowerCase()}
            </span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="100"
                className="w-24 text-right font-bold"
                value={config[type] || ""}
                onChange={(e) => {
                  setConfig({ ...config, [type]: parseInt(e.target.value) || 0 })
                  setSuccess(false)
                  setError(null)
                }}
              />
              <span className="text-slate-500 font-medium w-4">%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-widest font-black text-slate-400">Total Weight</span>
            <span className={`text-2xl font-black ${totalWeight === 100 || totalWeight === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {totalWeight}%
            </span>
          </div>
          {totalWeight !== 100 && totalWeight !== 0 && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 rounded-full">
              <AlertCircle className="w-3.5 h-3.5" /> Must equal 100% or 0%
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {error && <span className="text-rose-500 text-sm font-medium">{error}</span>}
          {success && (
            <span className="text-emerald-500 text-sm font-bold flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> Saved
            </span>
          )}
          <Button 
            onClick={handleSave} 
            disabled={isSaving || (totalWeight !== 100 && totalWeight !== 0)}
            className="bg-indigo-600 hover:bg-indigo-700 shadow-md"
          >
            {isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Weights</>}
          </Button>
        </div>
      </div>
    </div>
  )
}
