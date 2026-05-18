"use client"

import { useState, useEffect } from "react"
import { updateReportCardTemplate, getSchoolSettings } from "@/app/actions/reports"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Save, 
  Settings, 
  Layout as LayoutIcon,
  CheckCircle2,
  AlertCircle,
  Plus
} from "lucide-react"

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
          <Card className="h-full border-slate-200 dark:border-slate-800 flex flex-col">
            <CardHeader className="pb-3 border-b shrink-0">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <LayoutIcon className="h-4 w-4" /> Layout Sections
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1 overflow-y-auto flex-1 scrollbar-hide">
              {sections.map((section, index) => (
                <div 
                  key={section.id}
                  onClick={() => toggleSection(section.id)}
                  className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all ${
                    selectedSectionId === section.id 
                      ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 border" 
                      : "hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent"
                  }`}
                >
                  <div className="flex flex-col gap-1">
                     <button onClick={(e) => { e.stopPropagation(); moveSection(index, "up"); }} disabled={index === 0} className="text-slate-400 hover:text-indigo-600 disabled:opacity-0">
                       <ChevronUp className="h-3 w-3" />
                     </button>
                     <button onClick={(e) => { e.stopPropagation(); moveSection(index, "down"); }} disabled={index === sections.length - 1} className="text-slate-400 hover:text-indigo-600 disabled:opacity-0">
                       <ChevronDown className="h-3 w-3" />
                     </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{section.type.replace(/_/g,' ')}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{section.id}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteSection(section.id); }} className="text-slate-300 hover:text-rose-500 p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              
              <DropdownMenu>
                <DropdownMenuTrigger className="w-full mt-4 border-2 border-dashed border-slate-200 dark:border-slate-800 h-10 text-xs text-muted-foreground hover:border-indigo-400 hover:text-indigo-600 rounded-md transition-all flex items-center justify-center">
                   <Plus className="h-3 w-3 mr-2" /> Add Section
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[200px]">
                  <DropdownMenuItem onClick={() => addSection("HEADER")}>Header</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addSection("STUDENT_INFO")}>Student Information</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addSection("GRADES_TABLE")}>Grades Table</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addSection("ATTENDANCE_SUMMARY")}>Attendance Summary</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addSection("GPA_SUMMARY")}>GPA Summary</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addSection("CUSTOM_TEXT")}>Custom Text/Comments</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addSection("SIGNATURE_BLOCKS")}>Signature Blocks</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addSection("DETAILED_ATTENDANCE")}>Detailed Attendance</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addSection("FOOTER")}>Footer</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        </div>

        {/* Middle: Preview */}
        <div className="w-full md:w-2/4 space-y-4 h-full relative">
           <Card className="h-full bg-slate-100 dark:bg-slate-950 overflow-y-auto border-slate-200 dark:border-slate-800 p-8 scrollbar-hide shadow-inner">
             <div className="bg-white text-slate-900 shadow-2xl mx-auto min-h-[1056px] w-full max-w-[8.5in] flex flex-col p-[0.75in]">
                <div className="flex-1 space-y-10">
                  {sections.map((section) => (
                    <div 
                      key={section.id} 
                      onClick={() => toggleSection(section.id)}
                      className={`group relative p-4 border-2 border-transparent hover:border-indigo-200 rounded-md transition-all cursor-pointer ${selectedSectionId === section.id ? "border-indigo-400 bg-indigo-50/10" : ""}`}
                    >
                      {/* Visual representation based on type */}
                      {section.type === "HEADER" && (
                        <div className="text-center py-6 border-b-2 border-slate-900">
                          <h1 className="text-3xl font-black uppercase tracking-tighter">{section.config.title || "REPORT CARD"}</h1>
                          <p className="text-sm font-bold mt-2 uppercase tracking-wide">{section.config.subtitle || schoolSettings?.name || "SCHOOLYARD ACADEMY"}</p>
                        </div>
                      )}
                      {section.type === "STUDENT_INFO" && (
                        <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-sm font-medium border-b py-6 text-slate-900">
                          <div className="flex justify-between border-b border-slate-100 pb-1">
                             <span className="text-slate-400 uppercase text-[10px] font-bold">Student</span>
                             <span className="text-slate-900 font-bold">John Doe</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-1">
                             <span className="text-slate-400 uppercase text-[10px] font-bold">Grade</span>
                             <span className="text-slate-900 font-bold">10</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-1">
                             <span className="text-slate-400 uppercase text-[10px] font-bold">ID</span>
                             <span className="text-slate-900 font-bold">STD-12345</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-1">
                             <span className="text-slate-400 uppercase text-[10px] font-bold">Term</span>
                             <span className="text-slate-900 font-bold">Fall 2026</span>
                          </div>
                        </div>
                      )}
                      {section.type === "GRADES_TABLE" && (
                        <div className="space-y-4 py-4">
                          <table className="w-full border-collapse">
                            <thead>
                               <tr 
                                className="text-white text-[10px] font-black uppercase tracking-widest text-left"
                                style={{ backgroundColor: section.config.headerColorHex || "#0f172a" }}
                               >
                                  {(section.config.columns || ["Subject", "Grade"]).map((col: string) => (
                                    <th key={col} className="p-3">{col}</th>
                                  ))}
                               </tr>
                            </thead>
                            <tbody>
                               <tr className="border-b text-sm text-slate-900">
                                  {(section.config.columns || ["Subject", "Grade"]).map((col: string) => (
                                    <td key={col} className="p-3">
                                      {col === "Subject" ? "Introduction to Computer Science" : 
                                       col === "Grade" ? "A" : 
                                       col === "Percentage" ? "95%" : 
                                       col === "Instructor" ? "Jane Smith" : "Fall 2026"}
                                    </td>
                                  ))}
                               </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                      {section.type === "ATTENDANCE_SUMMARY" && (
                        <div className="flex gap-8 py-4 border px-6 rounded-lg bg-slate-50 text-slate-900">
                           <div className="text-center flex-1">
                              <p className="text-2xl font-black">0</p>
                              <p className="text-[10px] uppercase font-bold text-slate-400">Absences</p>
                           </div>
                           <div className="text-center flex-1 border-x border-slate-200">
                              <p className="text-2xl font-black text-rose-500">2</p>
                              <p className="text-[10px] uppercase font-bold text-slate-400">Tardies</p>
                           </div>
                           <div className="text-center flex-1">
                              <p className="text-2xl font-black text-emerald-600">98%</p>
                              <p className="text-[10px] uppercase font-bold text-slate-400">Presence</p>
                           </div>
                        </div>
                      )}
                      {section.type === "GPA_SUMMARY" && (
                        <div className="flex justify-end pt-6 border-t-4 border-double border-slate-900 text-slate-900">
                          <div className="text-right">
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none">{section.config.label || "CUMULATIVE GPA"}</p>
                            <p className="text-4xl font-black italic tracking-tighter">92.5%</p>
                          </div>
                        </div>
                      )}
                      {section.type === "CUSTOM_TEXT" && (
                        <div className="py-4 text-slate-900">
                           <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-slate-400">{section.config.title || "Additional Information"}</h4>
                           <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">{section.config.content}</p>
                        </div>
                      )}
                      {section.type === "DETAILED_ATTENDANCE" && (
                        <div className="py-4 border-t border-slate-100">
                           <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">{section.config.title || "ATTENDANCE HISTORY"}</h4>
                           <div className="text-[10px] text-slate-500 space-y-1">
                              <p className="flex justify-between border-b pb-1"><span>03/15/2026</span> <span className="font-bold text-rose-500 uppercase">Absent (Unexcused)</span></p>
                              <p className="flex justify-between border-b pb-1"><span>03/10/2026</span> <span className="font-bold text-amber-500 uppercase">Tardy</span></p>
                           </div>
                        </div>
                      )}
                      {section.type === "SIGNATURE_BLOCKS" && (
                        <div className="grid grid-cols-2 gap-12 py-10">
                           {section.config.principal && (
                             <div className="border-t border-slate-900 pt-2">
                               <p className="text-[10px] font-black uppercase">Principal Signature</p>
                             </div>
                           )}
                           {section.config.teacher && (
                             <div className="border-t border-slate-900 pt-2">
                               <p className="text-[10px] font-black uppercase">Teacher Signature</p>
                             </div>
                           )}
                        </div>
                      )}
                      {section.type === "FOOTER" && (
                        <div className="text-center pt-12 border-t mt-auto text-slate-900">
                          <p className="text-[10px] text-slate-400 italic max-w-sm mx-auto">{section.config.text || `Official Enrollment Record - ${schoolSettings?.name || "Schoolyard Academy"}`}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
             </div>
           </Card>
        </div>

        {/* Right: Config */}
        <div className="w-full md:w-1/4 h-full">
          <Card className="h-full border-slate-200 dark:border-slate-800 flex flex-col shadow-sm">
            <CardHeader className="pb-3 border-b shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Settings className="h-4 w-4 text-indigo-500" /> Section Config
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6 overflow-y-auto flex-1 scrollbar-hide">
              {selectedSection ? (
                <div className="space-y-6">
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-indigo-600">Label / Title</label>
                     <Input 
                        value={selectedSection.config.title || ""} 
                        onChange={(e) => updateSectionConfig(selectedSection.id, { title: e.target.value })}
                        placeholder="Section title..."
                        className="bg-slate-50 dark:bg-slate-800 border-none h-10"
                     />
                   </div>
                   
                   {selectedSection.type === "HEADER" && (
                     <div className="space-y-4">
                       <div className="space-y-2">
                          <label className="text-xs font-bold text-muted-foreground uppercase">Subtitle / School Name</label>
                          <Input 
                             value={selectedSection.config.subtitle || ""} 
                             onChange={(e) => updateSectionConfig(selectedSection.id, { subtitle: e.target.value })}
                             placeholder={schoolSettings?.name || "School Name"}
                             className="bg-slate-50 dark:bg-slate-800 border-none"
                          />
                       </div>
                       <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                          <input 
                             type="checkbox" 
                             checked={selectedSection.config.showLogo} 
                             onChange={(e) => updateSectionConfig(selectedSection.id, { showLogo: e.target.checked })}
                             className="rounded border-slate-300 text-indigo-600 h-4 w-4 focus:ring-indigo-500"
                          />
                          <label className="text-sm font-medium">Show School Logo</label>
                       </div>
                     </div>
                   )}

                   {selectedSection.type === "GRADES_TABLE" && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                           <label className="text-xs font-bold text-muted-foreground uppercase">Header Color (HEX)</label>
                           <div className="flex gap-2">
                              <Input 
                                 value={selectedSection.config.headerColorHex || "#0f172a"} 
                                 onChange={(e) => updateSectionConfig(selectedSection.id, { headerColorHex: e.target.value })}
                                 className="bg-slate-50 dark:bg-slate-800 border-none font-mono"
                              />
                              <div className="h-10 w-10 rounded border" style={{ backgroundColor: selectedSection.config.headerColorHex || "#0f172a" }} />
                           </div>
                        </div>
                        <div className="space-y-2">
                           <label className="text-xs font-bold text-muted-foreground uppercase">Visible Columns</label>
                           <div className="grid grid-cols-2 gap-2">
                              {["Subject", "Instructor", "Term", "Percentage", "Grade"].map(col => (
                                <div key={col} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-md border border-slate-100 dark:border-slate-800">
                                   <input 
                                      type="checkbox" 
                                      checked={selectedSection.config.columns?.includes(col)} 
                                      onChange={(e) => {
                                        const cols = selectedSection.config.columns || []
                                        const newCols = e.target.checked 
                                          ? [...cols, col] 
                                          : cols.filter((c: string) => c !== col)
                                        updateSectionConfig(selectedSection.id, { columns: newCols })
                                      }}
                                      className="rounded border-slate-300 text-indigo-600 h-4 w-4"
                                   />
                                   <label className="text-[10px] font-bold uppercase">{col}</label>
                                </div>
                              ))}
                           </div>
                        </div>
                      </div>
                   )}

                   {selectedSection.type === "SIGNATURE_BLOCKS" && (
                     <div className="space-y-3">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Visible Signatures</label>
                        <div className="space-y-2">
                           {["principal", "teacher", "advisor"].map(role => (
                             <div key={role} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-md border border-slate-100 dark:border-slate-800">
                                <input 
                                   type="checkbox" 
                                   checked={selectedSection.config[role]} 
                                   onChange={(e) => updateSectionConfig(selectedSection.id, { [role]: e.target.checked })}
                                   className="rounded border-slate-300 text-indigo-600 h-4 w-4"
                                />
                                <label className="text-xs font-medium uppercase">{role}</label>
                             </div>
                           ))}
                        </div>
                     </div>
                   )}

                   {selectedSection.type === "CUSTOM_TEXT" && (
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-indigo-600">Content</label>
                        <textarea
                           value={selectedSection.config.content || ""}
                           onChange={(e) => updateSectionConfig(selectedSection.id, { content: e.target.value })}
                           className="w-full h-48 rounded-md bg-slate-50 dark:bg-slate-800 border-none p-4 text-sm resize-none focus:ring-1 focus:ring-indigo-500 outline-none transition-all shadow-inner"
                        />
                     </div>
                   )}

                   {selectedSection.type === "FOOTER" && (
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-indigo-600">Footer Text</label>
                        <textarea
                           value={selectedSection.config.text || ""}
                           onChange={(e) => updateSectionConfig(selectedSection.id, { text: e.target.value })}
                           className="w-full h-32 rounded-md bg-slate-50 dark:bg-slate-800 border-none p-4 text-sm resize-none focus:ring-1 focus:ring-indigo-500 outline-none transition-all shadow-inner"
                        />
                     </div>
                   )}

                   <div className="pt-6 border-t mt-6">
                      <Button variant="destructive" size="sm" className="w-full shadow-sm" onClick={() => deleteSection(selectedSection.id)}>
                         <Trash2 className="h-4 w-4 mr-2" /> Remove Section
                      </Button>
                   </div>
                </div>
              ) : (
                <div className="text-center py-24 text-muted-foreground bg-slate-50/30 dark:bg-slate-800/30 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                  <AlertCircle className="h-10 w-10 mx-auto mb-4 opacity-10" />
                  <p className="text-sm font-medium">Select a section to customize</p>
                  <p className="text-[10px] mt-1 uppercase tracking-widest font-bold opacity-50">Editor Active</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
