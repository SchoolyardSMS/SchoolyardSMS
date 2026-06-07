import { Button } from "@/components/ui/button"
import { BookOpen, X } from "lucide-react"
import { getLetterGrade, calculateGrade } from "@/lib/grading"
import { toast } from "sonner"
import { calculateComposite } from "@/lib/term-grades-utils"

// Helper outside modal to avoid repeating
function resolveLetterGrade(score: string, scale: unknown): string {
  const pct = parseFloat(score)
  if (isNaN(pct) || !Array.isArray(scale)) return ""
  const sorted = [...scale].filter(entry => typeof entry === "object" && entry !== null).sort((a: any, b: any) => b.min - a.min)
  for (const entry of sorted) {
    if (pct >= (entry as any).min) return (entry as any).letter
  }
  return "F"
}

export function TermGradesBreakdownModal({
  activeStudentBreakdown,
  setActiveStudentBreakdown,
  dbGrades,
  assignments,
  selectedTerm,
  allTerms,
  grades,
  gradingScale,
  weightingConfig,
  isSecondSemester,
  setScore,
}: {
  activeStudentBreakdown: any
  setActiveStudentBreakdown: (v: any) => void
  dbGrades: any[]
  assignments: any[]
  selectedTerm: any
  allTerms: any[]
  grades: any
  gradingScale: any
  weightingConfig: any
  isSecondSemester: boolean
  setScore: (id: string, score: string) => void
}) {
  if (!activeStudentBreakdown) return null


  const student = activeStudentBreakdown.student
  const studentGrades = dbGrades.filter(g => g.studentId === student.id)
  
  // Calculate dynamic overall grade based on section configurations
  const studentGradesList = assignments.flatMap(a => {
    const matchingGrade = studentGrades.find(g => g.assignmentId === a.id)
    return matchingGrade !== undefined ? [{ assignmentId: a.id, score: matchingGrade.score }] : []
  }) as { assignmentId: string; score: number }[]

  const isComposite = selectedTerm?.type === "SEMESTER" || selectedTerm?.type === "YEAR"
  
  const calculatedPct = isComposite
    ? calculateComposite(activeStudentBreakdown, selectedTerm, allTerms, grades)
    : (studentGradesList.length > 0
        ? calculateGrade({ weightingConfig }, assignments, studentGradesList)
        : null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">{student.user.name}</h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">Gradebook Breakdown</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {calculatedPct !== null && (
              <div className="text-right">
                <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">{calculatedPct.toFixed(1)}%</div>
                <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Calc Grade: {getLetterGrade(calculatedPct, gradingScale)}</div>
              </div>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full"
              onClick={() => setActiveStudentBreakdown(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable list */}
        <div className="p-6 overflow-y-auto space-y-4">
          {selectedTerm?.type === "SEMESTER" ? (
            // SEMESTER COMPOSITE BREAKDOWN
            (() => {
              const childQuarters = allTerms.filter(t => t.parentId === selectedTerm.id && t.type === "QUARTER")
              const quartersInfo: { name: string; score: number | null; letter: string }[] = childQuarters.map(q => {
                const tgRec = activeStudentBreakdown.termGrades?.find((t: any) => t.termId === q.id)
                const score = tgRec && tgRec.isPosted ? (tgRec.overrideScore ?? tgRec.calculatedScore ?? null) : null
                return {
                  name: q.name,
                  score,
                  letter: score !== null ? resolveLetterGrade(score.toString(), gradingScale) : "—"
                }
              })

              // Get current exam score/exemption from our React state
              const state = grades[activeStudentBreakdown.id]
              const midterm = state?.midtermScore ? parseFloat(state.midtermScore) : null
              const finalExam = state?.finalScore ? parseFloat(state.finalScore) : null
              const isMidtermExempt = !!state?.midtermExempt
              const isFinalExempt = !!state?.finalExempt

              const examScore = isSecondSemester ? finalExam : midterm
              const examExempt = isSecondSemester ? isFinalExempt : isMidtermExempt
              const examLabel = isSecondSemester ? "Final Exam" : "Midterm Exam"

              const activeQuarters = quartersInfo.filter(q => q.score !== null) as { name: string; score: number }[]
              const quartersAvg = activeQuarters.length > 0
                ? activeQuarters.reduce((s, q) => s + q.score, 0) / activeQuarters.length
                : null

              return (
                <div className="space-y-6">
                  {/* Table */}
                  <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-x-auto shadow-sm">
                    <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 font-bold uppercase tracking-widest text-[9px] text-slate-400">
                          <th className="py-3 px-4">Component</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Weight</th>
                          <th className="py-3 px-4 text-right">Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-medium">
                        {quartersInfo.map(q => (
                          <tr key={q.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                            <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">{q.name}</td>
                            <td className="py-3.5 px-4 text-slate-400 uppercase font-black tracking-widest text-[9px]">Quarter Grade</td>
                            <td className="py-3.5 px-4 text-slate-500 font-semibold">{examExempt || examScore === null ? "50%" : "40%"}</td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                              {q.score !== null ? `${q.score.toFixed(1)}%` : "—"}
                              {q.score !== null && <span className="text-[10px] text-indigo-500 ml-1.5 font-bold">({q.letter})</span>}
                            </td>
                          </tr>
                        ))}
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                          <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">{examLabel}</td>
                          <td className="py-3.5 px-4 text-indigo-500 uppercase font-black tracking-widest text-[9px]">Semester Exam</td>
                          <td className="py-3.5 px-4 text-slate-500 font-semibold">{examExempt || examScore === null ? "0% (Exempt)" : "20%"}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold">
                            {examExempt ? (
                              <span className="text-amber-500 bg-amber-50 dark:bg-amber-950/20 px-2.5 py-0.5 rounded-md text-[10px] uppercase font-black tracking-wider border border-amber-200/50 dark:border-amber-900/30">Exempted</span>
                            ) : examScore !== null ? (
                              <span className="text-slate-900 dark:text-white font-black">{examScore.toFixed(1)}%</span>
                            ) : (
                              <span className="text-slate-400 italic">Not Graded</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Formula box */}
                  <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-3">
                    <h4 className="font-black text-[10px] text-slate-900 dark:text-slate-100 uppercase tracking-widest">Composite Calculation Breakdown</h4>
                    <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2.5 leading-relaxed">
                      {quartersAvg !== null ? (
                        <>
                          <p>1. Quarters Average: <span className="font-bold text-slate-800 dark:text-slate-200">{quartersAvg.toFixed(2)}%</span></p>
                          {examExempt || examScore === null ? (
                            <div className="bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/20 p-3 rounded-xl text-emerald-800 dark:text-emerald-400 text-xs">
                              <p className="font-bold mb-0.5">Exam Exempted / Not Graded</p>
                              <p className="font-normal opacity-90">The semester grade is calculated as 100% of the Quarter average.</p>
                              <div className="font-mono font-bold mt-2 text-sm text-center">
                                Formula: {quartersAvg.toFixed(2)}% = {calculatedPct !== null ? `${calculatedPct.toFixed(1)}%` : "—"}
                              </div>
                            </div>
                          ) : (
                            <div className="bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/20 p-3 rounded-xl text-indigo-950 dark:text-indigo-300 text-xs space-y-1.5">
                              <p className="font-bold">Standard Weighting Applied:</p>
                              <p className="font-normal">Quarters average contributes 80% and the Semester Exam contributes 20%.</p>
                              <div className="font-mono font-bold mt-2 text-sm text-center bg-white dark:bg-slate-900 p-2.5 rounded-lg shadow-sm border border-indigo-100 dark:border-slate-800 text-indigo-600 dark:text-indigo-400">
                                ({quartersAvg.toFixed(2)}% × 0.8) + ({examScore.toFixed(1)}% × 0.2) = {calculatedPct !== null ? `${calculatedPct.toFixed(1)}%` : "—"}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="italic text-slate-400 text-center py-2">No Quarter scores available to compute averages.</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()
          ) : selectedTerm?.type === "YEAR" ? (
            // YEAR COMPOSITE BREAKDOWN
            (() => {
              const childSemesters = allTerms.filter(t => t.parentId === selectedTerm.id && t.type === "SEMESTER")
              const semestersInfo: { name: string; score: number | null; letter: string }[] = childSemesters.map(s => {
                const tgRec = activeStudentBreakdown.termGrades?.find((t: any) => t.termId === s.id)
                const score = tgRec && tgRec.isPosted ? (tgRec.overrideScore ?? tgRec.calculatedScore ?? null) : null
                return {
                  name: s.name,
                  score,
                  letter: score !== null ? resolveLetterGrade(score.toString(), gradingScale) : "—"
                }
              })

              const activeSemesters = semestersInfo.filter(s => s.score !== null) as { name: string; score: number }[]
              const semestersAvg = activeSemesters.length > 0
                ? activeSemesters.reduce((s, sem) => s + sem.score, 0) / activeSemesters.length
                : null

              return (
                <div className="space-y-6">
                  {/* Table */}
                  <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-x-auto shadow-sm">
                    <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 font-bold uppercase tracking-widest text-[9px] text-slate-400">
                          <th className="py-3 px-4">Semester</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Weight</th>
                          <th className="py-3 px-4 text-right">Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-medium">
                        {semestersInfo.map(s => (
                          <tr key={s.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                            <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">{s.name}</td>
                            <td className="py-3.5 px-4 text-indigo-500 uppercase font-black tracking-widest text-[9px]">Semester Grade</td>
                            <td className="py-3.5 px-4 text-slate-500 font-semibold">50%</td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                              {s.score !== null ? `${s.score.toFixed(1)}%` : "—"}
                              {s.score !== null && <span className="text-[10px] text-indigo-500 ml-1.5 font-bold">({s.letter})</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Formula box */}
                  <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-3">
                    <h4 className="font-black text-[10px] text-slate-900 dark:text-slate-100 uppercase tracking-widest">Composite Calculation Breakdown</h4>
                    <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2.5 leading-relaxed">
                      {semestersAvg !== null ? (
                        <div className="bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/20 p-3 rounded-xl text-indigo-950 dark:text-indigo-300 text-xs space-y-1.5">
                          <p className="font-bold">Standard Year Average Formula:</p>
                          <p className="font-normal">Calculated as the direct average of both semester grades (50% each).</p>
                          <div className="font-mono font-bold mt-2 text-sm text-center bg-white dark:bg-slate-900 p-2.5 rounded-lg shadow-sm border border-indigo-100 dark:border-slate-800 text-indigo-600 dark:text-indigo-400">
                            ({semestersInfo.map(s => s.score !== null ? `${s.score.toFixed(1)}%` : "—").join(" + ")}) / 2 = {calculatedPct !== null ? `${calculatedPct.toFixed(1)}%` : "—"}
                          </div>
                        </div>
                      ) : (
                        <p className="italic text-slate-400 text-center py-2">No Semester scores available to compute averages.</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()
          ) : (
            // STANDARD ASSIGNMENT LIST
            assignments.length === 0 ? (
              <p className="text-center text-slate-500 italic py-8">No assignments posted for this course.</p>
            ) : (
              <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 font-bold uppercase tracking-widest text-[9px] text-slate-400">
                      <th className="py-3 px-4">Assignment</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-medium">
                    {assignments.map(a => {
                      const grade = studentGrades.find(g => g.assignmentId === a.id)
                      const scoreText = grade !== undefined ? `${grade.score} / ${a.maxScore ?? 100}` : "—"
                      const pct = grade !== undefined && a.maxScore ? (grade.score / a.maxScore) * 100 : null
                      
                      return (
                        <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                          <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{a.title}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {a.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {new Date(a.dueDate).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold">
                            <div>{scoreText}</div>
                            {pct !== null && (
                              <div className="text-[9px] text-indigo-500 font-bold">{pct.toFixed(0)}%</div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/20 text-right">
          <Button
            onClick={() => {
              if (calculatedPct !== null) {
                setScore(activeStudentBreakdown.id, calculatedPct.toFixed(1))
                toast.success(`Copied calculated score ${calculatedPct.toFixed(1)}% to input`)
              }
              setActiveStudentBreakdown(null)
            }}
            disabled={calculatedPct === null}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl"
          >
            Use Calculated Grade ({calculatedPct !== null ? `${calculatedPct.toFixed(0)}%` : "N/A"})
          </Button>
        </div>
      </div>
    </div>
  )
}
