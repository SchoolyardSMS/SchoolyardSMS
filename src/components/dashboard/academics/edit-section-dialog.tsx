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
import { Pencil } from "lucide-react"
import { SectionForm } from "./section-form"
import { updateSection } from "@/app/actions/academics"
import { toast } from "sonner"

interface EditSectionDialogProps {
  section: {
    id: string
    courseId: string
    teacherId: string
    termId: string | null
    legacyTerm: string | null
    room: string | null
    schedule: string | null
    bellPeriodId: string | null
  }
  teachers: any[]
  periods: any[]
  terms: any[]
}

export function EditSectionDialog({ section, teachers, periods, terms }: EditSectionDialogProps) {
  const [open, setOpen] = useState(false)

  async function handleUpdate(formData: FormData) {
    // Add the section ID to the form data
    const id = section.id
    
    // We adjust the bellPeriodId if "NONE" was selected
    const bellPeriodId = formData.get("bellPeriodId")
    if (bellPeriodId === "NONE") {
      formData.set("bellPeriodId", "")
    }

    try {
      await updateSection(id, formData)
      toast.success("Section updated successfully")
      setOpen(false)
    } catch (error: any) {
      toast.error(error.message || "Failed to update section")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600">
            <Pencil className="h-4 w-4" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Section</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <SectionForm 
            courseId={section.courseId}
            action={handleUpdate}
            initialData={section}
            teachers={teachers}
            periods={periods}
            terms={terms}
            onCancel={() => setOpen(false)}
            submitLabel="Update Section"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
