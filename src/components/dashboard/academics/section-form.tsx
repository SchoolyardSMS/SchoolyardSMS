"use client"

import React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

  const yearTerms = React.useMemo(() => terms.filter(t => t.type === "YEAR"), [terms])
  const semesterTerms = React.useMemo(() => terms.filter(t => t.type === "SEMESTER"), [terms])

  const initialType = React.useMemo(() => {
    if (initialData?.termId) {
      const activeTerm = terms.find(t => t.id === initialData.termId)
      if (activeTerm?.type === "YEAR") return "YEAR"
    }
    return "SEMESTER"
  }, [initialData?.termId, terms])

  const [classType, setClassType] = React.useState<"YEAR" | "SEMESTER">(initialType)

  const handleClassTypeChange = (type: "YEAR" | "SEMESTER") => {
    setClassType(type)
    if (type === "YEAR") {
      const firstYear = yearTerms[0]
      setTermId(firstYear ? firstYear.id : "")
    } else {
      const firstSem = semesterTerms[0]
      setTermId(firstSem ? firstSem.id : "")
    }
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="courseId" value={courseId} />
      {initialData?.id && <input type="hidden" name="id" value={initialData.id} />}
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="teacherId">Instructor <span className="text-red-500">*</span></Label>
          <select 
            name="teacherId" 
            value={teacherId} 
            onChange={(e) => setTeacherId(e.target.value)}
            className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="" disabled>Select a teacher...</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.user.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Class Duration Type</Label>
          <div className="flex gap-6 items-center">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
              <input 
                type="radio" 
                name="classType" 
                value="YEAR"
                checked={classType === "YEAR"}
                onChange={() => handleClassTypeChange("YEAR")}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              Year-Long
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
              <input 
                type="radio" 
                name="classType" 
                value="SEMESTER"
                checked={classType === "SEMESTER"}
                onChange={() => handleClassTypeChange("SEMESTER")}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              Semester-Long
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            {classType === "YEAR" ? (
              <>
                <Label htmlFor="termId">Academic Year <span className="text-red-500">*</span></Label>
                <select 
                  name="termId" 
                  value={termId} 
                  onChange={(e) => setTermId(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="" disabled>Select Year...</option>
                  {yearTerms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.displayName || t.name}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <Label htmlFor="termId">Choose Semester <span className="text-red-500">*</span></Label>
                <select 
                  name="termId" 
                  value={termId} 
                  onChange={(e) => setTermId(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="" disabled>Choose Semester...</option>
                  {semesterTerms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.displayName || t.name}
                    </option>
                  ))}
                </select>
              </>
            )}
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
          <select 
            name="bellPeriodId" 
            value={bellPeriodId} 
            onChange={(e) => setBellPeriodId(e.target.value)}
            className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="NONE">No specific period (use manual schedule)</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                P{p.periodNumber}: {p.name} ({p.startTime}-{p.endTime})
              </option>
            ))}
          </select>
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
