"use client"

import { useState, useEffect, useRef } from "react"
import { Download, ChevronDown, FileX, Clock } from "lucide-react"
import { formatInET } from "@/lib/dates"

interface ReportCard {
  id: string
  termId: string
  publishedAt: Date | string | null
  term: {
    id: string
    name: string
    type: string
  }
}

export function ReportCardDownloader({
  studentId,
  reportCards,
}: {
  studentId: string
  reportCards: ReportCard[]
}) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  // No published reports at all
  if (reportCards.length === 0) {
    return (
      <div className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 flex items-center gap-2.5 text-slate-400">
        <FileX className="w-4 h-4 shrink-0" />
        <span className="text-sm font-medium">No report cards published yet</span>
      </div>
    )
  }

  // Exactly one — keep it simple, direct download
  if (reportCards.length === 1) {
    const rc = reportCards[0]
    return (
      <a
        href={`/api/reports/report-card/${studentId}?termId=${rc.termId}`}
        download
        className="w-full inline-flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 transition-colors text-white font-semibold text-sm px-4 py-2.5 shadow-md shadow-indigo-200 dark:shadow-none gap-2"
      >
        <Download className="h-4 w-4" />
        Report Card — {rc.term.name}
      </a>
    )
  }

  // Multiple — show a dropdown
  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full inline-flex items-center justify-between rounded-xl bg-indigo-600 hover:bg-indigo-700 transition-colors text-white font-semibold text-sm px-4 py-2.5 shadow-md shadow-indigo-200 dark:shadow-none"
      >
        <span className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Official Report Cards
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
          <div className="px-3 pt-2.5 pb-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select a Term</p>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {reportCards.map((rc) => (
              <a
                key={rc.id}
                href={`/api/reports/report-card/${studentId}?termId=${rc.termId}`}
                download
                onClick={() => setOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{rc.term.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <span className="uppercase font-bold">{rc.term.type}</span>
                    {rc.publishedAt && (
                      <>
                        <span>·</span>
                        <Clock className="w-2.5 h-2.5" />
                        Published {formatInET(rc.publishedAt, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </>
                    )}
                  </p>
                </div>
                <Download className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
