"use client"

import { useState } from "react"
import { Clock, Trash2, Edit2, X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { deleteBellPeriod, upsertBellPeriod } from "@/app/actions/schedule"
import { toast } from "sonner"

const DAYS = ["MON","TUE","WED","THU","FRI","SAT","SUN","A","B","C","D","E","F","G"]
const DAY_LABELS: Record<string,string> = {
  MON:"Mon",TUE:"Tue",WED:"Wed",THU:"Thu",FRI:"Fri",SAT:"Sat",SUN:"Sun",
  A:"A",B:"B",C:"C",D:"D",E:"E",F:"F",G:"G"
}

export function BellPeriodList({ periods, years }: { periods: any[], years: string[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <div className="space-y-8">
      {years.map(year => (
        <div key={year} className="space-y-3">
          <h3 className="font-semibold text-base text-muted-foreground flex items-center gap-2">
            <span>{year}</span>
            <span className="h-px flex-1 bg-border" />
          </h3>
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden divide-y divide-border">
            {periods.filter(p => p.schoolYear === year).map(period => (
              <div key={period.id} className="p-4">
                {editingId === period.id ? (
                  <form action={async (formData) => {
                    try {
                      await upsertBellPeriod(formData)
                      setEditingId(null)
                      toast.success("Period updated")
                    } catch (e: any) {
                      toast.error(e.message)
                    }
                  }} className="space-y-4">
                    <input type="hidden" name="id" value={period.id} />
                    <input type="hidden" name="schoolYear" value={period.schoolYear} />
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <label htmlFor={`period-number-${period.id}`} className="text-xs font-bold uppercase text-muted-foreground">Period #</label>
                        <input id={`period-number-${period.id}`} name="periodNumber" type="number" defaultValue={period.periodNumber} required
                          aria-label="Period Number"
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div className="col-span-2 space-y-2 sm:col-span-1">
                        <label htmlFor={`period-name-${period.id}`} className="text-xs font-bold uppercase text-muted-foreground">Name</label>
                        <input id={`period-name-${period.id}`} name="name" type="text" defaultValue={period.name} required
                          aria-label="Period Name"
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor={`period-start-${period.id}`} className="text-xs font-bold uppercase text-muted-foreground">Times</label>
                        <div className="flex items-center gap-2">
                          <input id={`period-start-${period.id}`} name="startTime" type="time" defaultValue={period.startTime} required
                            aria-label="Start Time"
                            className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
                          />
                          <span className="text-muted-foreground">–</span>
                          <input id={`period-end-${period.id}`} name="endTime" type="time" defaultValue={period.endTime} required
                            aria-label="End Time"
                            className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="block text-xs font-bold uppercase text-muted-foreground">Days</span>
                      <div className="flex flex-wrap gap-2">
                        {DAYS.map(d => (
                          <label key={d} className="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" name="days" value={d} defaultChecked={period.days.includes(d)}
                              className="h-3 w-3 rounded border-input accent-indigo-600"
                            />
                            <span className="text-[10px] font-medium">{DAY_LABELS[d]}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                      </Button>
                      <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Check className="h-4 w-4 mr-1" /> Save Changes
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg border bg-muted/40 px-3 py-2 min-w-[48px] text-center">
                      <p className="text-xs text-muted-foreground font-medium">P</p>
                      <p className="text-xl font-bold">{period.periodNumber}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{period.name}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {period.startTime} – {period.endTime}
                        </span>
                        <span className="flex gap-1">
                          {DAYS.map(d => (
                            <span key={d}
                              className={`w-7 h-6 rounded text-xs font-bold flex items-center justify-center ${
                                period.days.includes(d)
                                  ? "text-white"
                                  : "bg-muted/40 text-muted-foreground"
                              }`}
                              style={period.days.includes(d) ? { background: "var(--school-primary,#4f46e5)" } : {}}
                            >
                              {DAY_LABELS[d]}
                            </span>
                          ))}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs text-muted-foreground mr-2">{period._count.sections} section{period._count.sections !== 1 ? "s" : ""}</span>
                      <Button variant="ghost" size="icon" onClick={() => setEditingId(period.id)} className="text-muted-foreground hover:text-indigo-600">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <form action={async () => {
                        if (confirm("Are you sure? This will remove this period from all assigned sections.")) {
                          await deleteBellPeriod(period.id)
                          toast.success("Period deleted")
                        }
                      }}>
                        <Button type="submit" variant="ghost" size="icon" className="text-muted-foreground hover:text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
