"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface CsvUploaderProps {
  title: string
  description: string
  action: (csvText: string) => Promise<{ success: boolean; count: number }>
  expectedHeaders: string[]
}

export function CsvUploader({ title, description, action, expectedHeaders }: CsvUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setResult(null)

    try {
      const text = await file.text()
      const res = await action(text)
      setResult({ success: true, message: `Successfully imported ${res.count} records.` })
      setFile(null)
    } catch (err: any) {
      setResult({ success: false, message: err.message || "An error occurred during import." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <h3 className="font-bold text-lg">{title}</h3>
      <p className="text-sm text-slate-500 mt-1 mb-4">{description}</p>
      
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Required Columns</label>
          <div className="flex flex-wrap gap-2">
            {expectedHeaders.map(h => (
              <span key={h} className="px-2 py-1 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-[10px] font-mono rounded">
                {h}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input 
            type="file" 
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="flex-1 text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/30 dark:file:text-indigo-400"
          />
          <Button onClick={handleUpload} disabled={!file || loading} className="w-24">
            {loading ? "Importing..." : "Upload"}
          </Button>
        </div>

        {result && (
          <div className={`p-3 rounded-md text-sm ${result.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800' : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:border-red-800'}`}>
            {result.message}
          </div>
        )}
      </div>
    </div>
  )
}
