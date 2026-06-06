import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Trash2, ChevronUp, ChevronDown, Layout as LayoutIcon, Plus } from "lucide-react"

export function ReportCardSectionBrowser({ 
  sections, 
  selectedSectionId, 
  toggleSection, 
  moveSection, 
  deleteSection, 
  addSection 
}: any) {
  return (
    <Card className="h-full border-slate-200 dark:border-slate-800 flex flex-col">
      <CardHeader className="pb-3 border-b shrink-0">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <LayoutIcon className="h-4 w-4" /> Layout Sections
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 space-y-1 overflow-y-auto flex-1 scrollbar-hide">
        {sections.map((section: any, index: number) => (
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
               <button type="button" onClick={(e) => { e.stopPropagation(); moveSection(index, "up"); }} disabled={index === 0} className="text-slate-400 hover:text-indigo-600 disabled:opacity-0">
                 <ChevronUp className="h-3 w-3" />
               </button>
               <button type="button" onClick={(e) => { e.stopPropagation(); moveSection(index, "down"); }} disabled={index === sections.length - 1} className="text-slate-400 hover:text-indigo-600 disabled:opacity-0">
                 <ChevronDown className="h-3 w-3" />
               </button>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{section.type?.replace(/_/g,' ') || 'Unknown Section'}</p>
              <p className="text-[10px] text-muted-foreground truncate">{section.id}</p>
            </div>
            <button type="button" onClick={(e) => { e.stopPropagation(); deleteSection(section.id); }} className="text-slate-300 hover:text-rose-500 p-1">
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
  )
}
