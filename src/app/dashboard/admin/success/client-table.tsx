"use client"

import { useState } from "react"
import { Search, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

type StudentData = {
  id: string
  userId: string
  name: string
  email: string
  grade: number
  absences: number
  incidents: number
  missingWork: number
  activeClasses: number
  riskScore: number
  riskLevel: string
}

function SortIcon({
  field,
  sortField,
  sortAsc,
}: {
  field: keyof StudentData
  sortField: keyof StudentData
  sortAsc: boolean
}) {
  if (sortField !== field) return <span className="ml-1 opacity-0 group-hover:opacity-50">↕</span>
  return sortAsc ? <ChevronUp className="inline w-3 h-3 ml-1" /> : <ChevronDown className="inline w-3 h-3 ml-1" />
}

export function SuccessClientTable({ initialData }: { initialData: StudentData[] }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState<keyof StudentData>("riskScore")
  const [sortAsc, setSortAsc] = useState(false)

  const filtered = initialData.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const sorted = [...filtered].sort((a, b) => {
    const valA = a[sortField]
    const valB = b[sortField]
    if (typeof valA === "string" && typeof valB === "string") {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA)
    }
    if (valA < valB) return sortAsc ? -1 : 1
    if (valA > valB) return sortAsc ? 1 : -1
    return 0
  })

  const toggleSort = (field: keyof StudentData) => {
    if (sortField === field) setSortAsc(!sortAsc)
    else {
      setSortField(field)
      setSortAsc(false) // Default descending for most metrics
    }
  }

  return (
    <div>
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="text-sm text-slate-500 font-medium">
          Showing {sorted.length} students
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
            <tr>
              <th className="px-6 py-4 cursor-pointer group hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => toggleSort("name")}>
                Student <SortIcon field="name" sortField={sortField} sortAsc={sortAsc} />
              </th>
              <th className="px-6 py-4 cursor-pointer group hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => toggleSort("grade")}>
                Grade <SortIcon field="grade" sortField={sortField} sortAsc={sortAsc} />
              </th>
              <th className="px-6 py-4 cursor-pointer group hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => toggleSort("absences")}>
                Absences <SortIcon field="absences" sortField={sortField} sortAsc={sortAsc} />
              </th>
              <th className="px-6 py-4 cursor-pointer group hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => toggleSort("incidents")}>
                Incidents <SortIcon field="incidents" sortField={sortField} sortAsc={sortAsc} />
              </th>
              <th className="px-6 py-4 cursor-pointer group hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => toggleSort("missingWork")}>
                Missing Work <SortIcon field="missingWork" sortField={sortField} sortAsc={sortAsc} />
              </th>
              <th className="px-6 py-4 cursor-pointer group hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => toggleSort("riskScore")}>
                Risk Level <SortIcon field="riskScore" sortField={sortField} sortAsc={sortAsc} />
              </th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {sorted.map(s => (
              <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4">
                  <Link href={`/dashboard/directory/${s.id}`} className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400">
                    {s.name}
                  </Link>
                  <p className="text-xs text-slate-500">{s.email}</p>
                </td>
                <td className="px-6 py-4 font-medium">{s.grade}</td>
                <td className="px-6 py-4">
                  <span className={`font-bold ${s.absences > 5 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>
                    {s.absences}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`font-bold ${s.incidents > 0 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>
                    {s.incidents}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`font-bold ${s.missingWork > 3 ? 'text-amber-500' : 'text-slate-700 dark:text-slate-300'}`}>
                    {s.missingWork}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {s.riskLevel === "HIGH" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400 text-xs font-bold tracking-widest uppercase">
                      <AlertTriangle className="w-3.5 h-3.5" /> High Risk
                    </span>
                  )}
                  {s.riskLevel === "MODERATE" && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 text-xs font-bold tracking-widest uppercase">
                      Moderate
                    </span>
                  )}
                  {s.riskLevel === "LOW" && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 text-slate-400 text-xs font-bold tracking-widest uppercase">
                      Low Risk
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <Button size="sm" variant="outline" asChild className="mr-2">
                    <Link href={`/dashboard/messages/new?to=${s.userId}`}>Message</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href={`/dashboard/directory/${s.id}`}>View 360 Profile</Link>
                  </Button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                  No students found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
