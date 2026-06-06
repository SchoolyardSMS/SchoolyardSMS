"use client"

import { useState, useEffect } from "react"
import { updateReportCardTemplate, getSchoolSettings } from "@/app/actions/reports"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { 
  Save, 
  CheckCircle2,
} from "lucide-react"
import { 
  ReportCardSectionBrowser
} from "./report-card-section-browser"
import {
  ReportCardPreview
} from "./report-card-preview"
import {
  ReportCardSectionConfig 
} from "./report-card-section-config"

interface Section {
  id: string
  type: string
  config: any
}

interface Template {
  id: string
  name: string
  isDefault: boolean
  layout: {
    sections: Section[]
  }
}

export function ReportCardEditor({ template: initialTemplate }: { template: Template }) {
  const [template, setTemplate] = useState<Template>(initialTemplate)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [schoolSettings, setSchoolSettings] = useState<any>(null)

  useEffect(() => {
    getSchoolSettings().then(setSchoolSettings)
  }, [])

  const sections = template.layout?.sections || []

  const updateLayout = (newSections: Section[]) => {
    setTemplate({
      ...template,
      layout: { ...template.layout, sections: newSections }
    })
  }

  const addSection = (type: string) => {
    const newId = `${type.toLowerCase()}_${Date.now()}`
    const defaultConfig: any = {
      HEADER: { title: "Official Report Card", subtitle: schoolSettings?.name || "Schoolyard Academy", showLogo: true },
      STUDENT_INFO: { fields: ["name", "id", "gradeLevel"] },
      GRADES_TABLE: { columns: ["Subject", "Grade"], headerColorHex: "#0f172a" },
      ATTENDANCE_SUMMARY: { showTardy: true, showAbsent: true },
      GPA_SUMMARY: { label: "Cumulative Average" },
      FOOTER: { text: `Official Enrollment Record - ${schoolSettings?.name || "Schoolyard Academy"}` },
      CUSTOM_TEXT: { title: "Additional Notes", content: "Enter your custom text here..." },
      SIGNATURE_BLOCKS: { principal: true, teacher: true, advisor: false },
      DETAILED_ATTENDANCE: { title: "Attendance History", showDates: true }
    }
    
    const newSection: Section = {
      id: newId,
      type,
      config: defaultConfig[type] || {}
    }

    updateLayout([...sections, newSection])
    setSelectedSectionId(newId)
    toast.success(`Added ${type.replace(/_/g, ' ')} section`)
  }

  const moveSection = (index: number, direction: "up" | "down") => {
    const newSections = [...sections]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newSections.length) return
    
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]]
    updateLayout(newSections)
  }

  const toggleSection = (id: string) => {
    setSelectedSectionId(id === selectedSectionId ? null : id)
  }

  const deleteSection = (id: string) => {
    const newSections = sections.filter(s => s.id !== id)
    updateLayout(newSections)
    if (selectedSectionId === id) setSelectedSectionId(null)
  }

  const updateSectionConfig = (id: string, newConfig: any) => {
    const newSections = sections.map(s => 
      s.id === id ? { ...s, config: { ...s.config, ...newConfig } } : s
    )
    updateLayout(newSections)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateReportCardTemplate(template.id, {
        name: template.name,
        layout: template.layout,
        isDefault: template.isDefault
      })
      toast.success("Template saved successfully!")
    } catch (e) {
      toast.error("Failed to save template.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSetDefault = async () => {
    setIsSaving(true)
    try {
      await updateReportCardTemplate(template.id, { isDefault: true })
      setTemplate({ ...template, isDefault: true })
      toast.success("This template is now the active default!")
    } catch (e) {
      toast.error("Failed to update status.")
    } finally {
      setIsSaving(false)
    }
  }

  const selectedSection = sections.find(s => s.id === selectedSectionId)

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] gap-6">
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <Input 
            value={template.name}
            onChange={(e) => setTemplate({ ...template, name: e.target.value })}
            className="text-xl font-bold border-none bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 focus:bg-slate-50 dark:focus:bg-slate-800 w-auto min-w-[300px]"
          />
          {template.isDefault && (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
              <CheckCircle2 className="h-3 w-3" /> Active Default
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!template.isDefault && (
             <Button variant="outline" size="sm" onClick={handleSetDefault} disabled={isSaving}>
               Set as Default
             </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700">
            <Save className="h-4 w-4 mr-2" /> {isSaving ? "Saving..." : "Save Template"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-[600px] overflow-hidden">
        {/* Left: Section Browser */}
        <div className="w-full md:w-1/4 space-y-4 h-full">
          <ReportCardSectionBrowser 
            sections={sections}
            selectedSectionId={selectedSectionId}
            toggleSection={toggleSection}
            moveSection={moveSection}
            deleteSection={deleteSection}
            addSection={addSection}
          />
        </div>

        {/* Middle: Preview */}
        <div className="w-full md:w-2/4 space-y-4 h-full relative">
          <ReportCardPreview 
            sections={sections}
            selectedSectionId={selectedSectionId}
            toggleSection={toggleSection}
            schoolSettings={schoolSettings}
          />
        </div>

        {/* Right: Config */}
        <div className="w-full md:w-1/4 h-full">
          <ReportCardSectionConfig 
            selectedSection={selectedSection}
            updateSectionConfig={updateSectionConfig}
            deleteSection={deleteSection}
            schoolSettings={schoolSettings}
          />
        </div>
      </div>
    </div>
  )
}
