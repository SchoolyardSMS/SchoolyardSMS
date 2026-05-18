"use client"

import React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useFormStatus } from "react-dom"

interface SectionFormProps {
  courseId: string
  action: (formData: FormData) => Promise<void>
  initialData?: {
    id?: string
    teacherId: string
    termId: string | null
    legacyTerm: string | null
    room: string | null
    schedule: string | null
    bellPeriodId: string | null
  }
  teachers: any[]
  terms: any[]
  periods: any[]
  onCancel?: () => void
  cancelHref?: string
  submitLabel?: string
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button 
      type="submit" 
      disabled={pending}
      className="bg-indigo-600 hover:bg-indigo-700 text-white"
    >
      {pending ? "Saving..." : label}
    </Button>
  )
}

export function SectionForm({
  courseId,
  action,
  initialData,
  teachers,
  terms,
  periods,
  onCancel,
  cancelHref,
  submitLabel = "Save Section"
}: SectionFormProps) {
  const [teacherId, setTeacherId] = React.useState(initialData?.teacherId || "")
  const [termId, setTermId] = React.useState(initialData?.termId || "")
  const [bellPeriodId, setBellPeriodId] = React.useState(initialData?.bellPeriodId || "NONE")

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="courseId" value={courseId} />
      {initialData?.id && <input type="hidden" name="id" value={initialData.id} />}
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="teacherId">Instructor <span className="text-red-500">*</span></Label>
          <Select name="teacherId" value={teacherId} onValueChange={(val) => setTeacherId(val || "")}>
            <SelectTrigger>
              <SelectValue placeholder="Select a teacher..." />
            </SelectTrigger>
            <SelectContent>
              {teachers.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="termId">Term <span className="text-red-500">*</span></Label>
            <Select name="termId" value={termId} onValueChange={(val) => setTermId(val || "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select a term..." />
              </SelectTrigger>
              <SelectContent>
                {terms.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.schoolYear.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-slate-500">
              Legacy: {initialData?.legacyTerm || "None"}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="room">Room</Label>
            <Input 
              id="room" 
              name="room" 
              placeholder="e.g. Room 101" 
              defaultValue={initialData?.room || ""} 
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bellPeriodId">Bell Period (Optional)</Label>
          <Select name="bellPeriodId" value={bellPeriodId} onValueChange={(val) => setBellPeriodId(val || "NONE")}>
            <SelectTrigger>
              <SelectValue placeholder="No specific period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">No specific period (use manual schedule)</SelectItem>
              {periods.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  P{p.periodNumber}: {p.name} ({p.startTime}-{p.endTime})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="schedule">Manual Schedule Description</Label>
          <Input 
            id="schedule" 
            name="schedule" 
            placeholder="e.g. MWF 9:00 AM" 
            defaultValue={initialData?.schedule || ""} 
          />
          <p className="text-[11px] text-muted-foreground italic">Use this if not assigning a specific Bell Period.</p>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton label={submitLabel} />
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        {cancelHref && !onCancel && (
          <a href={cancelHref}>
            <Button type="button" variant="outline">Cancel</Button>
          </a>
        )}
      </div>
    </form>
  )
}
