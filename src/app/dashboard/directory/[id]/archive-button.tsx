"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Archive, Loader2 } from "lucide-react"
import { archiveAndCompressStudent } from "@/app/actions/archive"
import { useRouter } from "next/navigation"

export function ArchiveStudentButton({ studentId }: { studentId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleArchive = async () => {
    const confirmArchive = window.confirm(
      "Are you sure you want to archive this student's records?\n\nThis will compress all attendance, grades, report cards, and enrollments, and delete the active relational database entries to prevent bloat. This is irreversible."
    )
    if (!confirmArchive) return

    startTransition(async () => {
      const res = await archiveAndCompressStudent(studentId)
      if (res.error) {
        alert(res.error)
      } else {
        alert("Student records archived successfully.")
        router.refresh()
      }
    })
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleArchive}
      disabled={isPending}
      className="border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-300 dark:bg-amber-900/30"
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Archive className="w-4 h-4 mr-2" />
      )}
      Archive Records
    </Button>
  )
}
