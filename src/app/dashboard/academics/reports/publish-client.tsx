"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { publishReportCards } from "@/app/actions/report-cards"
import { Loader2, CheckCircle } from "lucide-react"
import { toast } from "sonner"

export function PublishReportCardsClient({ terms }: { terms: { id: string, name: string, type: string, displayName?: string }[] }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [selectedTerm, setSelectedTerm] = useState(terms[0]?.id || "")

  const handlePublish = async () => {
    if (!selectedTerm) return
    setLoading(true)
    setSuccess(false)
    try {
      const res = await publishReportCards(selectedTerm)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success(`Published ${res?.count || 0} report cards`)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (e) {
      console.error(e)
      toast.error("Failed to publish report cards")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
      <h4 className="text-sm font-bold mb-2">Publish Term Report Cards</h4>
      <p className="text-xs text-slate-500 mb-4">Takes a snapshot of current Term Grades and locks them into official Report Cards.</p>
      <div className="flex flex-col gap-3">
        <select 
          className="h-9 px-3 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
          value={selectedTerm}
          onChange={(e) => setSelectedTerm(e.target.value)}
        >
          {terms.map(t => (
            <option key={t.id} value={t.id}>{t.displayName || t.name} ({t.type})</option>
          ))}
        </select>
        <Button onClick={handlePublish} disabled={loading || !selectedTerm} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : success ? <CheckCircle className="w-4 h-4 mr-2" /> : null}
          {success ? "Published!" : "Generate Snapshots"}
        </Button>
      </div>
    </div>
  )
}
