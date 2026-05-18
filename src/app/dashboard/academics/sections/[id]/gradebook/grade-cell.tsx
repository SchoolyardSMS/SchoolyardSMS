"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { mutateGrade } from "@/app/actions/academics"
import { toast } from "sonner"

interface GradeCellProps {
  assignmentId: string
  studentId: string
  initialScore: number | null
  maxScore: number
}

export function GradeCell({ assignmentId, studentId, initialScore, maxScore }: GradeCellProps) {
  const [score, setScore] = useState<string>(initialScore !== null ? String(initialScore) : "")
  const [isSaving, setIsSaving] = useState(false)

  const handleBlur = async () => {
    if (score === "" && initialScore === null) return
    if (Number(score) === initialScore) return

    setIsSaving(true)
    try {
      await mutateGrade(assignmentId, studentId, Number(score))
      toast.success("Grade saved")
    } catch (error) {
      toast.error("Failed to save grade")
      setScore(initialScore !== null ? String(initialScore) : "")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        placeholder={String(maxScore)}
        className={`w-20 text-right ${isSaving ? "opacity-50" : "hover:border-indigo-400 focus:border-indigo-500"}`}
        value={score}
        onChange={(e) => setScore(e.target.value)}
        onBlur={handleBlur}
        disabled={isSaving}
      />
    </div>
  )
}
