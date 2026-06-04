"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { updateStudentHealth } from "@/app/actions/health"
import { Loader2, CheckCircle } from "lucide-react"
import { toast } from "sonner"

export function HealthClient({ student }: { student: any }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  
  const [medicalAlerts, setMedicalAlerts] = useState(student.medicalAlerts || "")
  const [accommodations, setAccommodations] = useState(student.accommodations || "")

  const handleUpdate = async () => {
    setLoading(true)
    setSuccess(false)
    try {
      const res = await updateStudentHealth(student.id, {
        medicalAlerts: medicalAlerts || null,
        accommodations: accommodations || null
      })
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success("Health records updated successfully.")
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (e) {
      console.error(e)
      toast.error("Failed to update health records")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Medical & Accommodations</h3>
        
        <div className="space-y-6 mb-6">
          <div>
            <label htmlFor="medical-alerts-input" className="block text-sm font-bold text-rose-700 dark:text-rose-400 mb-2">Medical Alerts (Allergies, Conditions)</label>
            <Textarea 
              id="medical-alerts-input"
              value={medicalAlerts} 
              onChange={e => setMedicalAlerts(e.target.value)}
              className="bg-rose-50/50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-900/30 min-h-[100px]"
              placeholder="e.g. Peanut allergy, Asthma, Requires inhaler before P.E."
            />
          </div>
          
          <div>
            <label htmlFor="accommodations-input" className="block text-sm font-bold text-indigo-700 dark:text-indigo-400 mb-2">Learning Plan & Accommodations</label>
            <Textarea 
              id="accommodations-input"
              value={accommodations} 
              onChange={e => setAccommodations(e.target.value)}
              className="bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-900/30 min-h-[100px]"
              placeholder="e.g. IEP on file, 50% extended time on tests, preferential seating"
            />
          </div>
        </div>
        
        <Button onClick={handleUpdate} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md w-full sm:w-auto">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : success ? <CheckCircle className="w-4 h-4 mr-2" /> : null}
          {success ? "Records Updated" : "Save Health Records"}
        </Button>
      </div>
    </div>
  )
}
