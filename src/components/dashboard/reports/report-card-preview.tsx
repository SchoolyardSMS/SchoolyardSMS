import { Card } from "@/components/ui/card"

export function ReportCardPreview({ sections, selectedSectionId, toggleSection, schoolSettings }: any) {
  return (
    <Card className="h-full bg-slate-100 dark:bg-slate-950 overflow-y-auto border-slate-200 dark:border-slate-800 p-8 scrollbar-hide shadow-inner">
      <div className="bg-white text-slate-900 shadow-2xl mx-auto min-h-[1056px] w-full max-w-[8.5in] flex flex-col p-[0.75in]">
         <div className="flex-1 space-y-10">
           {sections.map((section: any) => (
             // react-doctor-disable-next-line react-doctor/prefer-tag-over-role
             <div 
               key={section.id} 
               role="button"
               tabIndex={0}
               onClick={() => toggleSection(section.id)}
               onKeyDown={(e) => {
                 if (e.key === "Enter" || e.key === " ") {
                   e.preventDefault()
                   toggleSection(section.id)
                 }
               }}
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
  )
}
