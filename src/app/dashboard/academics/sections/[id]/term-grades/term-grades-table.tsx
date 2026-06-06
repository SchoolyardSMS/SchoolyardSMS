import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { BarChart3, Loader2, Save, Check } from "lucide-react"

export function TermGradesTable({
  pageEnrollments,
  termId,
  grades,
  gradingScale,
  selectedTerm,
  isSecondSemester,
  allTerms,
  setScore,
  setMidtermScore,
  setFinalScore,
  setMidtermExempt,
  setFinalExempt,
  setLetterGrade,
  setComments,
  handleSave,
  loading,
  setActiveStudentBreakdown,
  resolveLetterGrade,
  normalizedGradingScale
}: {
  pageEnrollments: any[]
  termId: string
  grades: any
  gradingScale: any
  selectedTerm: any
  isSecondSemester: boolean
  allTerms: any[]
  setScore: (id: string, val: string) => void
  setMidtermScore: (id: string, val: string) => void
  setFinalScore: (id: string, val: string) => void
  setMidtermExempt: (id: string, val: boolean) => void
  setFinalExempt: (id: string, val: boolean) => void
  setLetterGrade: (id: string, val: string) => void
  setComments: (id: string, val: string) => void
  handleSave: (id: string) => void
  loading: string | null
  setActiveStudentBreakdown: (v: any) => void
  resolveLetterGrade: (score: string, scale: unknown) => string
  normalizedGradingScale: any[]
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
            <th className="py-3 pl-6 text-[10px] font-black uppercase tracking-widest text-slate-500 w-1/4">Student</th>
            {selectedTerm?.type === "SEMESTER" && (
              <th className="py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 w-[240px]">
                {isSecondSemester ? "Final Exam" : "Midterm Exam"}
              </th>
            )}
            <th className="py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 w-[130px]">Score (0–100)</th>
            <th className="py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 w-[110px]">
              Letter
              {normalizedGradingScale.length > 0 && <span className="ml-1 text-emerald-500">✦ auto</span>}
            </th>
            <th className="py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 pr-4">Teacher Comments</th>
            <th className="py-3 pr-6 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Save</th>
          </tr>
        </thead>
        <tbody>
          {pageEnrollments.map(enr => {
            const tg = enr.termGrades?.find((t: any) => t.termId === termId)
            const isSaved = tg?.isPosted
            const g = grades[enr.id]
            const derivedLetter = g?.overrideScore ? resolveLetterGrade(g.overrideScore, gradingScale) : ""
            const letterMismatch = derivedLetter && g?.letterGrade && g.letterGrade !== derivedLetter

            return (
              <tr key={enr.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                <td className="py-3 pl-6">
                  <div className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    {enr.student.user.name}
                    <Button
                      size="icon"
                      type="button"
                      variant="ghost"
                      className="h-6 w-6 rounded-full text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                      title="View assignment gradebook for this student"
                      onClick={() => setActiveStudentBreakdown(enr)}
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-semibold">
                    {selectedTerm?.type === "SEMESTER" ? (
                      <>
                        Quarters Avg: {(() => {
                          const childQuarters = allTerms.filter(t => t.parentId === selectedTerm.id && t.type === "QUARTER")
                          const quarterScores: { name: string; score: number }[] = []
                          enr.termGrades?.forEach((tgRec: any) => {
                            const match = childQuarters.find(q => q.id === tgRec.termId)
                            if (match && tgRec.isPosted) {
                              const score = tgRec.overrideScore ?? tgRec.calculatedScore
                              if (score !== null && score !== undefined) {
                                quarterScores.push({ name: match.name, score })
                              }
                            }
                          })
                          if (quarterScores.length > 0) {
                            const avg = quarterScores.reduce((s, v) => s + v.score, 0) / quarterScores.length
                            const listStr = quarterScores.map(q => `${q.name}: ${q.score.toFixed(1)}%`).join(", ")
                            return <span className="text-slate-600 dark:text-slate-400 font-bold">{avg.toFixed(1)}% <span className="text-slate-400 dark:text-slate-500 font-normal">({listStr})</span></span>
                          }
                          return <span className="text-slate-400 italic">No Quarter Grades Posted</span>
                        })()}
                      </>
                    ) : selectedTerm?.type === "YEAR" ? (
                      <>
                        Semesters Avg: {(() => {
                          const childSemesters = allTerms.filter(t => t.parentId === selectedTerm.id && t.type === "SEMESTER")
                          const semesterScores: { name: string; score: number }[] = []
                          enr.termGrades?.forEach((tgRec: any) => {
                            const match = childSemesters.find(s => s.id === tgRec.termId)
                            if (match && tgRec.isPosted) {
                              const score = tgRec.overrideScore ?? tgRec.calculatedScore
                              if (score !== null && score !== undefined) {
                                semesterScores.push({ name: match.name, score })
                              }
                            }
                          })
                          if (semesterScores.length > 0) {
                            const avg = semesterScores.reduce((s, v) => s + v.score, 0) / semesterScores.length
                            const listStr = semesterScores.map(s => `${s.name}: ${s.score.toFixed(1)}%`).join(", ")
                            return <span className="text-indigo-600 dark:text-indigo-400 font-bold">{avg.toFixed(1)}% <span className="text-slate-400 dark:text-slate-500 font-normal">({listStr})</span></span>
                          }
                          return <span className="text-slate-400 italic">No Semester Grades Posted</span>
                        })()}
                      </>
                    ) : (
                      `Calc: ${tg?.calculatedScore ? `${tg.calculatedScore.toFixed(1)}%` : "—"}`
                    )}
                  </div>
                </td>
                {selectedTerm?.type === "SEMESTER" && (
                  <td className="py-3 pr-3">
                    {isSecondSemester ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          min={0}
                          max={120}
                          className="h-9 w-24 bg-transparent border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-800 dark:text-slate-200"
                          placeholder="Final Score"
                          value={g?.finalScore || ""}
                          onChange={e => setFinalScore(enr.id, e.target.value)}
                          disabled={g?.finalExempt}
                        />
                        <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
                          <input
                            type="checkbox"
                            checked={g?.finalExempt || false}
                            onChange={e => setFinalExempt(enr.id, e.target.checked)}
                            className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                          />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Exempt</span>
                        </label>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          min={0}
                          max={120}
                          className="h-9 w-24 bg-transparent border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-800 dark:text-slate-200"
                          placeholder="Midterm Score"
                          value={g?.midtermScore || ""}
                          onChange={e => setMidtermScore(enr.id, e.target.value)}
                          disabled={g?.midtermExempt}
                        />
                        <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
                          <input
                            type="checkbox"
                            checked={g?.midtermExempt || false}
                            onChange={e => setMidtermExempt(enr.id, e.target.checked)}
                            className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                          />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Exempt</span>
                        </label>
                      </div>
                    )}
                  </td>
                )}
                <td className="py-3 pr-3">
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    max={120}
                    className="h-9 w-28 bg-transparent border-slate-200 dark:border-slate-700 text-sm font-bold text-indigo-600 dark:text-indigo-400"
                    placeholder="92.5"
                    value={g?.overrideScore || ""}
                    onChange={e => setScore(enr.id, e.target.value)}
                  />
                </td>
                <td className="py-3 pr-3">
                  <div className="relative">
                    <Input
                      className={`h-9 w-24 bg-transparent text-sm font-mono font-bold ${
                        letterMismatch
                          ? "border-amber-400 dark:border-amber-600 text-amber-600"
                          : "border-slate-200 dark:border-slate-700"
                      }`}
                      placeholder={derivedLetter || "A"}
                      value={g?.letterGrade || ""}
                      onChange={e => setLetterGrade(enr.id, e.target.value)}
                    />
                    {letterMismatch && (
                      <div className="absolute -bottom-4 left-0 text-[9px] text-amber-500 whitespace-nowrap">
                        Scale says {derivedLetter}
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <Textarea
                    className="h-9 min-h-[36px] resize-y bg-transparent border-slate-200 dark:border-slate-700 text-xs"
                    placeholder="Optional comment for report card…"
                    value={g?.comments || ""}
                    onChange={e => setComments(enr.id, e.target.value)}
                  />
                </td>
                <td className="py-3 pr-6 text-right">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleSave(enr.id)}
                    disabled={loading === enr.id || loading === "all"}
                    title="Save this student's grade"
                    className={isSaved
                      ? "border-emerald-200 text-emerald-600 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : ""
                    }
                  >
                    {loading === enr.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : isSaved
                        ? <Check className="w-4 h-4" />
                        : <Save className="w-4 h-4" />
                    }
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
        </table>
      </div>
    </div>
  )
}
