import { PrintTrigger, PrintButton } from "./print-trigger"

export function GradebookWorksheet({ section }: { section: any }) {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-white text-black min-h-screen">
      <style>{`
        /* Hide sidebar, top mobile nav, and bottom mobile nav both on screen and print */
        aside,
        nav,
        .md\\:hidden.fixed.bottom-0.left-0.right-0,
        .md\\:hidden.flex.items-center.justify-between,
        .no-print {
          display: none !important;
        }
        /* Remove bottom padding of page container to allow full height */
        div.pb-20 {
          padding-bottom: 0 !important;
        }
        html, body, main {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        html::-webkit-scrollbar, body::-webkit-scrollbar, main::-webkit-scrollbar {
          display: none !important;
        }
        main {
          padding: 0 !important;
          margin: 0 !important;
        }
        @media print {
          body { background: white !important; color: black !important; }
          @page { size: landscape; margin: 1cm; }
        }
        table { width: 100%; border-collapse: collapse; margin-top: 24px; }
        th, td { border: 1px solid #cbd5e1; padding: 12px 14px; text-align: left; font-size: 11px; }
        th { background-color: #f8fafc; font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; border-bottom: 2px solid #94a3b8; }
        td { height: 48px; }
      `}</style>
      
      {/* Header Details */}
      <div className="border-b-2 border-slate-900 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wider text-slate-900">Gradebook Worksheet</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Schoolyard Academy • SIS Physical Record</p>
          </div>
          <div className="text-right no-print">
            <PrintButton />
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-6 text-xs font-semibold">
          <div>
            <span className="text-slate-400 uppercase tracking-wider block text-[10px]">Course Title</span>
            <span className="text-slate-900 text-sm font-bold">{section.course.name}</span>
          </div>
          <div>
            <span className="text-slate-400 uppercase tracking-wider block text-[10px]">Teacher Name</span>
            <span className="text-slate-900 text-sm font-bold">{section.teacher.user.name}</span>
          </div>
          <div>
            <span className="text-slate-400 uppercase tracking-wider block text-[10px]">Schedule Period</span>
            <span className="text-slate-900 text-sm font-bold">{section.schedule}</span>
          </div>
          <div>
            <span className="text-slate-400 uppercase tracking-wider block text-[10px]">Academic Year</span>
            <span className="text-slate-900 text-sm font-bold">{section.term?.schoolYear.name || "2025-2026"}</span>
          </div>
        </div>
      </div>

      {/* Worksheet Table */}
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th className="w-[220px]">Student Name</th>
              {Array.from({ length: 10 }).map((_, i) => (
                <th key={i} className="text-center min-w-[70px]">&nbsp;</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section.enrollments.map((enr: any) => (
              <tr key={enr.id} className="hover:bg-slate-50">
                <td className="font-bold text-slate-900">{enr.student.user.name}</td>
                {Array.from({ length: 10 }).map((_, i) => (
                  <td key={i} className="py-4">&nbsp;</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Auto print trigger */}
      <PrintTrigger />
    </div>
  )
}
