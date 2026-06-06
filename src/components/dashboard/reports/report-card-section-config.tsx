import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, AlertCircle, Settings } from "lucide-react"

export function ReportCardSectionConfig({ selectedSection, updateSectionConfig, deleteSection, schoolSettings }: any) {
  return (
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
               <label htmlFor="config-section-title" className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-indigo-600">Label / Title</label>
               <Input 
                  id="config-section-title"
                  value={selectedSection.config.title || ""} 
                  onChange={(e) => updateSectionConfig(selectedSection.id, { title: e.target.value })}
                  placeholder="Section title..."
                  className="bg-slate-50 dark:bg-slate-800 border-none h-10"
               />
             </div>
             
             {selectedSection.type === "HEADER" && (
               <div className="space-y-4">
                 <div className="space-y-2">
                    <label htmlFor="config-header-subtitle" className="text-xs font-bold text-muted-foreground uppercase">Subtitle / School Name</label>
                    <Input 
                       id="config-header-subtitle"
                       value={selectedSection.config.subtitle || ""} 
                       onChange={(e) => updateSectionConfig(selectedSection.id, { subtitle: e.target.value })}
                       placeholder={schoolSettings?.name || "School Name"}
                       className="bg-slate-50 dark:bg-slate-800 border-none"
                    />
                 </div>
                 <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    <input 
                       id="config-show-logo"
                       type="checkbox" 
                       checked={selectedSection.config.showLogo} 
                       onChange={(e) => updateSectionConfig(selectedSection.id, { showLogo: e.target.checked })}
                       className="rounded border-slate-300 text-indigo-600 h-4 w-4 focus:ring-indigo-500"
                    />
                    <label htmlFor="config-show-logo" className="text-sm font-medium">Show School Logo</label>
                 </div>
               </div>
             )}

             {selectedSection.type === "GRADES_TABLE" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                     <label htmlFor="config-header-color" className="text-xs font-bold text-muted-foreground uppercase">Header Color (HEX)</label>
                     <div className="flex gap-2">
                        <Input 
                           id="config-header-color"
                           value={selectedSection.config.headerColorHex || "#0f172a"} 
                           onChange={(e) => updateSectionConfig(selectedSection.id, { headerColorHex: e.target.value })}
                           className="bg-slate-50 dark:bg-slate-800 border-none font-mono"
                        />
                        <div className="h-10 w-10 rounded border" style={{ backgroundColor: selectedSection.config.headerColorHex || "#0f172a" }} />
                     </div>
                  </div>
                  <div className="space-y-2">
                     <span className="block text-xs font-bold text-muted-foreground uppercase">Visible Columns</span>
                     <div className="grid grid-cols-2 gap-2">
                        {["Subject", "Instructor", "Term", "Percentage", "Grade"].map(col => (
                          <div key={col} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-md border border-slate-100 dark:border-slate-800">
                             <input 
                                id={`col-chk-${col}`}
                                type="checkbox" 
                                checked={selectedSection.config.columns?.includes(col)} 
                                aria-label={col}
                                onChange={(e) => {
                                  const cols = selectedSection.config.columns || []
                                  const newCols = e.target.checked 
                                    ? [...cols, col] 
                                    : cols.filter((c: string) => c !== col)
                                  updateSectionConfig(selectedSection.id, { columns: newCols })
                                }}
                                className="rounded border-slate-300 text-indigo-600 h-4 w-4"
                             />
                             <label htmlFor={`col-chk-${col}`} className="text-[10px] font-bold uppercase">{col}</label>
                          </div>
                        ))}
                     </div>
                  </div>
                </div>
             )}

             {selectedSection.type === "SIGNATURE_BLOCKS" && (
               <div className="space-y-3">
                  <span className="block text-xs font-bold text-muted-foreground uppercase">Visible Signatures</span>
                  <div className="space-y-2">
                     {["principal", "teacher", "advisor"].map(role => (
                       <div key={role} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-md border border-slate-100 dark:border-slate-800">
                          <input 
                             id={`sig-chk-${role}`}
                             type="checkbox" 
                             checked={selectedSection.config[role]} 
                             aria-label={role}
                             onChange={(e) => updateSectionConfig(selectedSection.id, { [role]: e.target.checked })}
                             className="rounded border-slate-300 text-indigo-600 h-4 w-4"
                          />
                          <label htmlFor={`sig-chk-${role}`} className="text-xs font-medium uppercase">{role}</label>
                       </div>
                     ))}
                  </div>
               </div>
             )}

             {selectedSection.type === "CUSTOM_TEXT" && (
               <div className="space-y-2">
                  <label htmlFor="config-custom-text-content" className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-indigo-600">Content</label>
                  <textarea
                     id="config-custom-text-content"
                     value={selectedSection.config.content || ""}
                     onChange={(e) => updateSectionConfig(selectedSection.id, { content: e.target.value })}
                     className="w-full h-48 rounded-md bg-slate-50 dark:bg-slate-800 border-none p-4 text-sm resize-none focus:ring-1 focus:ring-indigo-500 outline-none transition-all shadow-inner"
                  />
               </div>
             )}

             {selectedSection.type === "FOOTER" && (
               <div className="space-y-2">
                  <label htmlFor="config-footer-text" className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-indigo-600">Footer Text</label>
                  <textarea
                     id="config-footer-text"
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
  )
}
