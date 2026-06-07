"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { UserPlus } from "lucide-react"
import { enrollStudents } from "@/app/actions/academics"
import { toast } from "sonner"

interface EnrollStudentDialogProps {
  sectionId: string
  allStudents: any[]
  enrolledStudentIds: string[]
}

const EMPTY_ARRAY: any[] = []

export function EnrollStudentDialog({ sectionId, allStudents = EMPTY_ARRAY, enrolledStudentIds = EMPTY_ARRAY }: EnrollStudentDialogProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const filtered = allStudents.filter((s) => {
    const q = search.toLowerCase()
    return (s.name ?? "").toLowerCase().includes(q) || (s.email ?? "").toLowerCase().includes(q)
  })

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  async function handleEnroll() {
    if (selectedIds.length === 0) return
    setIsLoading(true)
    try {
      await enrollStudents(sectionId, selectedIds)
      toast.success(`Enrolled ${selectedIds.length} student(s)`)
      setSelectedIds([])
      setSearch("")
      setOpen(false)
    } catch (error: any) {
      toast.error(error.message || "Failed to enroll students")
    } finally {
      setIsLoading(false)
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSearch("")
      setSelectedIds([])
    }
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button className="gap-2" style={{ background: "var(--school-primary, #4f46e5)" }}>
            <UserPlus className="h-4 w-4" />
            Enroll Students
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden">
        <DialogHeader className="p-5 pb-2">
          <DialogTitle>Enroll Students</DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-2">
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {allStudents.length === 0 ? (
          <p className="text-sm text-center text-muted-foreground py-10">
            No students found in the system.
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-center text-muted-foreground py-10">No students match your search.</p>
        ) : (
          <ScrollArea className="h-64 border-t">
            <div className="p-2 space-y-1">
              {filtered.map((user) => {
                const checked = selectedIds.includes(user.id)
                const alreadyEnrolled = enrolledStudentIds.includes(user.id)
                return (
                  <button
                    type="button"
                    key={user.id}
                    onClick={() => !alreadyEnrolled && toggleStudent(user.id)}
                    disabled={alreadyEnrolled}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      alreadyEnrolled
                        ? "opacity-50 cursor-not-allowed"
                        : checked
                        ? "bg-indigo-50 dark:bg-indigo-900/30"
                        : "hover:bg-muted"
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={alreadyEnrolled}
                      onCheckedChange={() => !alreadyEnrolled && toggleStudent(user.id)}
                      className="shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    {alreadyEnrolled && (
                      <span className="text-xs text-green-600 font-medium shrink-0">Enrolled</span>
                    )}
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        )}

        <div className="p-4 border-t bg-muted/40 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {selectedIds.length} selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={selectedIds.length === 0 || isLoading}
              onClick={handleEnroll}
              style={{ background: "var(--school-primary, #4f46e5)" }}
              className="text-white"
            >
              {isLoading ? "Enrolling…" : "Enroll"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
