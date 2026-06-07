"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { 
  User as UserIcon, 
  GraduationCap, 
  ChevronRight, 
  Archive, 
  CheckSquare, 
  Square,
  Loader2
} from "lucide-react"
import { bulkArchiveStudents } from "@/app/actions/archive"

interface Student {
  id: string
  isArchived: boolean
  gradeLevel: number
  user: {
    name: string
    email: string
  }
}

export function StudentDirectoryList({ 
  students, 
  isAdmin 
}: { 
  students: Student[]
  isAdmin: boolean 
}) {
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Filter students that can be archived (not already archived)
  const archivableStudents = students.filter(s => !s.isArchived)

  const toggleSelectAll = () => {
    if (selectedIds.length === archivableStudents.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(archivableStudents.map(s => s.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleBulkArchive = () => {
    if (selectedIds.length === 0) return

    const confirmMsg = `Are you sure you want to archive the records of these ${selectedIds.length} selected students?\n\nThis will compress their data and remove their active relational database rows. This action is irreversible.`
    if (!window.confirm(confirmMsg)) return

    startTransition(async () => {
      const res = await bulkArchiveStudents(selectedIds)
      if (res.error) {
        alert(res.error)
      } else {
        alert(`Successfully archived ${res.successCount} students.${res.failedCount ? ` Failed to archive ${res.failedCount} students.` : ""}`)
        setSelectedIds([])
        setBulkMode(false)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <Button
              variant={bulkMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setBulkMode(!bulkMode)
                setSelectedIds([])
              }}
              className="rounded-lg font-medium"
            >
              {bulkMode ? "Cancel Bulk Actions" : "Enable Bulk Actions"}
            </Button>
            {bulkMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
                className="rounded-lg"
              >
                {selectedIds.length === archivableStudents.length ? "Deselect All" : "Select All"}
              </Button>
            )}
          </div>

          {bulkMode && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                {selectedIds.length} of {archivableStudents.length} selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                disabled={selectedIds.length === 0 || isPending}
                onClick={handleBulkArchive}
                className="rounded-lg shadow-sm"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Archive className="w-4 h-4 mr-2" />
                )}
                Archive Selected
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {students.map((student) => {
          const isSelected = selectedIds.includes(student.id)
          const isArchivable = !student.isArchived

          const cardContent = (
            <div className="flex items-center gap-4 relative">
              {bulkMode && isArchivable && (
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    toggleSelect(student.id)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      e.stopPropagation()
                      toggleSelect(student.id)
                    }
                  }}
                  className="shrink-0 text-indigo-600 dark:text-indigo-400 cursor-pointer"
                >
                  {isSelected ? (
                    <CheckSquare className="h-5 w-5" />
                  ) : (
                    <Square className="h-5 w-5 text-slate-400" />
                  )}
                </div>
              )}
              
              <div className="h-14 w-14 rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                <UserIcon className="h-7 w-7 text-indigo-600 dark:text-indigo-400 group-hover:text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg truncate text-foreground">{student.user.name}</h3>
                  {student.isArchived && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] uppercase font-bold tracking-widest shrink-0">
                      Archived
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <GraduationCap className="h-3 w-3" /> Grade {student.gradeLevel}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{student.id.substring(0, 8)}</span>
                </div>
              </div>
              {!bulkMode && (
                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
              )}
            </div>
          )

          if (bulkMode && isArchivable) {
            return (
              <div
                key={student.id}
                role="button"
                tabIndex={0}
                onClick={() => toggleSelect(student.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    toggleSelect(student.id)
                  }
                }}
                className={`group block bg-white dark:bg-slate-900 rounded-xl border p-6 transition-all cursor-pointer select-none ${
                  isSelected 
                    ? "border-indigo-500 ring-2 ring-indigo-500/20 shadow-md" 
                    : "border-slate-200 dark:border-slate-800 hover:shadow-md hover:border-indigo-400"
                }`}
              >
                {cardContent}
              </div>
            )
          }

          return (
            <Link 
              key={student.id} 
              href={`/dashboard/directory/${student.id}`}
              className="group block bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-lg hover:border-indigo-400 dark:hover:border-indigo-600 transition-all transform hover:-translate-y-1"
            >
              {cardContent}
            </Link>
          )
        })}

        {students.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed rounded-2xl border-slate-200 dark:border-slate-800">
            <UserIcon className="h-12 w-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-400">No students found</h3>
            <p className="text-muted-foreground">Try adjusting your search terms or grade filter.</p>
          </div>
        )}
      </div>
    </div>
  )
}
