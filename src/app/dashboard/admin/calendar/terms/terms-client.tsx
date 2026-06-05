"use client"

import { useState, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  createSchoolYear, updateSchoolYear, deleteSchoolYear,
  createTerm, updateTerm, deleteTerm, setSchoolYearActive,
  duplicateSchoolYear, duplicateTerm
} from "@/app/actions/terms"
import { toast } from "sonner"
import {
  Plus, Pencil, Trash2, Check, X, Loader2, Calendar,
  ChevronDown, ChevronRight, Copy
} from "lucide-react"

type Term = {
  id: string
  name: string
  type: string
  parentId: string | null
  startDate: Date
  endDate: Date
}

type SchoolYear = {
  id: string
  name: string
  isActive: boolean
  startDate: Date
  endDate: Date
  terms: Term[]
}

const TERM_TYPES = ["YEAR", "SEMESTER", "QUARTER", "TRIMESTER", "OTHER"]

/** Format a @db.Date value correctly — stored as UTC midnight, display with UTC tz to avoid shift */
function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })
}

function toDateInput(d: Date) {
  return new Date(d).toISOString().split("T")[0]
}

// ─── Inline editor for a Term ─────────────────────────────────────────────────
function TermRow({
  term,
  allTerms,
  depth,
  onDone,
  schoolYears,
  currentSchoolYearId,
}: {
  term: Term
  allTerms: Term[]
  depth: number
  onDone: () => void
  schoolYears: SchoolYear[]
  currentSchoolYearId: string
}) {
  const [editing, setEditing] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [pending, startTransition] = useTransition()

  const handleDelete = () => {
    const hasChildren = allTerms.some(t => t.parentId === term.id)
    const msg = hasChildren
      ? `Delete "${term.name}"? Its child terms will also be deleted.`
      : `Delete term "${term.name}"? This cannot be undone.`
    if (!confirm(msg)) return
    startTransition(async () => {
      const res = await deleteTerm(term.id)
      if (res?.error) toast.error(res.error)
      else { toast.success(`"${term.name}" deleted`); onDone() }
    })
  }

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await updateTerm(term.id, fd)
      if (res?.error) toast.error(res.error)
      else { toast.success("Term updated"); setEditing(false); onDone() }
    })
  }

  const indentClass = depth === 1 ? "ml-6" : depth === 2 ? "ml-12" : depth >= 3 ? "ml-[4.5rem]" : ""
  const connectorChar = depth > 0 ? "└" : null

  if (editing) {
    const parentOptions: any[] = []
    for (const t of allTerms) {
      if (t.id !== term.id) {
        parentOptions.push(
          <option key={t.id} value={t.id}>
            {t.name} ({t.type})
          </option>
        )
      }
    }

    return (
      <div className={indentClass}>
        <form onSubmit={handleEdit} className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 space-y-3 mt-1">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor={`edit-term-name-${term.id}`} className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Name</label>
              <Input id={`edit-term-name-${term.id}`} name="name" defaultValue={term.name} required className="h-8 text-sm" />
            </div>
            <div>
              <label htmlFor={`edit-term-type-${term.id}`} className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Type</label>
              <select id={`edit-term-type-${term.id}`} name="type" defaultValue={term.type} className="h-8 w-full px-2 rounded-md border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-900">
                {TERM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor={`edit-term-start-${term.id}`} className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Start</label>
              <input id={`edit-term-start-${term.id}`} aria-label="Start Date" type="date" name="startDate" defaultValue={toDateInput(term.startDate)} required className="h-8 w-full px-2 rounded-md border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-900" />
            </div>
            <div>
              <label htmlFor={`edit-term-end-${term.id}`} className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">End</label>
              <input id={`edit-term-end-${term.id}`} aria-label="End Date" type="date" name="endDate" defaultValue={toDateInput(term.endDate)} required className="h-8 w-full px-2 rounded-md border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-900" />
            </div>
          </div>
          <div>
            <label htmlFor={`edit-term-parent-${term.id}`} className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Parent Term</label>
            <select id={`edit-term-parent-${term.id}`} name="parentId" defaultValue={term.parentId || ""} className="h-8 w-full px-2 rounded-md border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-900">
              <option value="">None (Top-level)</option>
              {parentOptions}
            </select>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
              <X className="w-3.5 h-3.5 mr-1" /> Cancel
            </Button>
          </div>
        </form>
      </div>
    )
  }

  if (duplicating) {
    const handleDuplicate = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const fd = new FormData(e.currentTarget)
      const targetSchoolYearId = fd.get("targetSchoolYearId") as string
      const newName = fd.get("name") as string
      const startDate = fd.get("startDate") as string
      const endDate = fd.get("endDate") as string
      const duplicateChildren = fd.get("duplicateChildren") === "on"

      startTransition(async () => {
        const res = await duplicateTerm(term.id, targetSchoolYearId, newName, startDate, endDate, duplicateChildren)
        if (res?.error) toast.error(res.error)
        else {
          toast.success(`"${term.name}" duplicated`)
          setDuplicating(false)
          onDone()
        }
      })
    }

    return (
      <div className={indentClass}>
        <form onSubmit={handleDuplicate} className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-slate-800 space-y-3 mt-1">
          <h5 className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">Duplicate Term</h5>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor={`dup-term-name-${term.id}`} className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">New Name</label>
              <Input id={`dup-term-name-${term.id}`} name="name" defaultValue={`Copy of ${term.name}`} required className="h-8 text-sm" />
            </div>
            <div>
              <label htmlFor={`dup-term-year-${term.id}`} className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Target School Year</label>
              <select id={`dup-term-year-${term.id}`} name="targetSchoolYearId" defaultValue={currentSchoolYearId} className="h-8 w-full px-2 rounded-md border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-900">
                {schoolYears.map(y => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor={`dup-term-start-${term.id}`} className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Start Date</label>
              <input id={`dup-term-start-${term.id}`} aria-label="Start Date" type="date" name="startDate" defaultValue={toDateInput(term.startDate)} required className="h-8 w-full px-2 rounded-md border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-900" />
            </div>
            <div>
              <label htmlFor={`dup-term-end-${term.id}`} className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">End Date</label>
              <input id={`dup-term-end-${term.id}`} aria-label="End Date" type="date" name="endDate" defaultValue={toDateInput(term.endDate)} required className="h-8 w-full px-2 rounded-md border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-900" />
            </div>
          </div>
          {allTerms.some(t => t.parentId === term.id) && (
            <div className="flex items-center gap-2">
              <input type="checkbox" name="duplicateChildren" id={`dup-child-${term.id}`} aria-label="Duplicate sub-terms recursively" defaultChecked className="rounded border-slate-300 bg-white text-teal-600 focus:ring-teal-500 h-4 w-4" />
              <label htmlFor={`dup-child-${term.id}`} className="text-xs text-slate-600 dark:text-slate-400 select-none">Duplicate sub-terms recursively</label>
            </div>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending} className="bg-teal-600 hover:bg-teal-700 text-white">
              {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Duplicate
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setDuplicating(false)}>
              <X className="w-3.5 h-3.5 mr-1" /> Cancel
            </Button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className={`${indentClass} mt-1`}>
      <div className="flex justify-between items-center px-3 py-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
        <div className="flex items-center gap-2.5">
          {connectorChar && <span className="text-slate-300 dark:text-slate-600 select-none">{connectorChar}</span>}
          <div>
            <span className="font-medium text-sm text-slate-900 dark:text-white">{term.name}</span>
            <span className="ml-2 text-[9px] uppercase font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{term.type}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-mono hidden sm:block">
            {fmtDate(term.startDate)} → {fmtDate(term.endDate)}
          </span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-teal-600" onClick={() => setDuplicating(true)} title="Duplicate term">
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-indigo-600" onClick={() => setEditing(true)} title="Edit term">
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-600" onClick={handleDelete} disabled={pending} title="Delete term">
              {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Recursively renders a term and all its descendants at arbitrary depth.
 */
function TermTree({
  term,
  allTerms,
  depth,
  onDone,
  schoolYears,
  currentSchoolYearId,
}: {
  term: Term
  allTerms: Term[]
  depth: number
  onDone: () => void
  schoolYears: SchoolYear[]
  currentSchoolYearId: string
}) {
  const children = allTerms.filter(t => t.parentId === term.id)
  return (
    <>
      <TermRow
        term={term}
        allTerms={allTerms}
        depth={depth}
        onDone={onDone}
        schoolYears={schoolYears}
        currentSchoolYearId={currentSchoolYearId}
      />
      {children.map(child => (
        <TermTree
          key={child.id}
          term={child}
          allTerms={allTerms}
          depth={depth + 1}
          onDone={onDone}
          schoolYears={schoolYears}
          currentSchoolYearId={currentSchoolYearId}
        />
      ))}
    </>
  )
}

// ─── Inline editor for a School Year ─────────────────────────────────────────
function SchoolYearCard({ year, schoolYears }: { year: SchoolYear; schoolYears: SchoolYear[] }) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(true)
  const [editingYear, setEditingYear] = useState(false)
  const [duplicatingYear, setDuplicatingYear] = useState(false)
  const [showAddTerm, setShowAddTerm] = useState(false)
  const [pending, startTransition] = useTransition()

  const refresh = useCallback(() => router.refresh(), [router])

  const handleDeleteYear = () => {
    if (!confirm(`Delete school year "${year.name}"? All associated terms will also be deleted.`)) return
    startTransition(async () => {
      const res = await deleteSchoolYear(year.id)
      if (res?.error) toast.error(res.error)
      else { toast.success(`"${year.name}" deleted`); refresh() }
    })
  }

  const handleDuplicateYear = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const name = fd.get("name") as string
    const startDate = fd.get("startDate") as string
    const endDate = fd.get("endDate") as string

    startTransition(async () => {
      const res = await duplicateSchoolYear(year.id, name, startDate, endDate)
      if (res?.error) toast.error(res.error)
      else {
        toast.success(`"${year.name}" duplicated`)
        setDuplicatingYear(false)
        refresh()
      }
    })
  }

  const handleEditYear = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await updateSchoolYear(year.id, fd)
      if (res?.error) toast.error(res.error)
      else { toast.success("School year updated"); setEditingYear(false); refresh() }
    })
  }

  const handleSetActive = () => {
    startTransition(async () => {
      const res = await setSchoolYearActive(year.id)
      if (res?.error) toast.error(res.error)
      else { toast.success(`${year.name} is now active`); refresh() }
    })
  }

  const handleCreateTerm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("schoolYearId", year.id)
    startTransition(async () => {
      const res = await createTerm(fd)
      if (res?.error) toast.error(res.error)
      else {
        toast.success("Term created")
        setShowAddTerm(false)
        ;(e.target as HTMLFormElement).reset()
        refresh()
      }
    })
  }

  // Only top-level terms (no parentId) — children are rendered recursively
  const rootTerms = year.terms.filter(t => !t.parentId)

  return (
    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      {/* Year Header */}
      <div className="p-4 flex justify-between items-center bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <button type="button" onClick={() => setExpanded(e => !e)} className="flex items-center gap-2 flex-1 text-left">
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          {editingYear ? null : (
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">{year.name}</h3>
                {year.isActive && (
                  <span className="px-2 py-0.5 text-[10px] uppercase tracking-widest font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded">Active</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {fmtDate(year.startDate)} – {fmtDate(year.endDate)}
                {" · "}{year.terms.length} term{year.terms.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </button>
        <div className="flex items-center gap-1.5 ml-4">
          {!year.isActive && (
            <Button size="sm" variant="outline" onClick={handleSetActive} disabled={pending} className="text-xs h-7">
              Set Active
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-teal-600" onClick={() => setDuplicatingYear(e => !e)} title="Duplicate year">
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-indigo-600" onClick={() => setEditingYear(e => !e)} title="Edit year" aria-label="Edit year">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-600" onClick={handleDeleteYear} disabled={pending} title="Delete year" aria-label="Delete year">
            {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {editingYear && (
        <form onSubmit={handleEditYear} className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-900/30 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label htmlFor={`edit-year-name-${year.id}`} className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Year Name</label>
              <Input id={`edit-year-name-${year.id}`} name="name" defaultValue={year.name} required className="h-8 text-sm" />
            </div>
            <div>
              <label htmlFor={`edit-year-start-${year.id}`} className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Start</label>
              <input id={`edit-year-start-${year.id}`} aria-label="Start Date" type="date" name="startDate" defaultValue={toDateInput(year.startDate)} required className="h-8 w-full px-2 rounded-md border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-900" />
            </div>
            <div>
              <label htmlFor={`edit-year-end-${year.id}`} className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">End</label>
              <input id={`edit-year-end-${year.id}`} aria-label="End Date" type="date" name="endDate" defaultValue={toDateInput(year.endDate)} required className="h-8 w-full px-2 rounded-md border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-900" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditingYear(false)}><X className="w-3.5 h-3.5 mr-1" /> Cancel</Button>
          </div>
        </form>
      )}

      {duplicatingYear && (
        <form onSubmit={handleDuplicateYear} className="p-4 bg-teal-50 dark:bg-teal-900/20 border-b border-teal-100 dark:border-teal-900/30 space-y-3">
          <h4 className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Duplicate School Year</h4>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label htmlFor={`dup-year-name-${year.id}`} className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">New Year Name</label>
              <Input id={`dup-year-name-${year.id}`} name="name" defaultValue={`Copy of ${year.name}`} required className="h-8 text-sm" />
            </div>
            <div>
              <label htmlFor={`dup-year-start-${year.id}`} className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Start Date</label>
              <input id={`dup-year-start-${year.id}`} aria-label="Start Date" type="date" name="startDate" defaultValue={toDateInput(year.startDate)} required className="h-8 w-full px-2 rounded-md border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-900" />
            </div>
            <div>
              <label htmlFor={`dup-year-end-${year.id}`} className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">End Date</label>
              <input id={`dup-year-end-${year.id}`} aria-label="End Date" type="date" name="endDate" defaultValue={toDateInput(year.endDate)} required className="h-8 w-full px-2 rounded-md border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-900" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending} className="bg-teal-600 hover:bg-teal-700 text-white">
              {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Duplicate
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setDuplicatingYear(false)}><X className="w-3.5 h-3.5 mr-1" /> Cancel</Button>
          </div>
        </form>
      )}

      {expanded && (
        <div className="p-4 space-y-2">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Terms</h4>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowAddTerm(a => !a)}>
              <Plus className="w-3 h-3 mr-1" /> Add Term
            </Button>
          </div>

          {showAddTerm && (
            <form onSubmit={handleCreateTerm} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3 mb-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor={`create-term-name-${year.id}`} className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Name</label>
                  <Input id={`create-term-name-${year.id}`} name="name" placeholder="e.g. Q1" required className="h-8 text-sm" />
                </div>
                <div>
                  <label htmlFor={`create-term-type-${year.id}`} className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Type</label>
                  <select id={`create-term-type-${year.id}`} name="type" className="h-8 w-full px-2 rounded-md border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-900">
                    {TERM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor={`create-term-parent-${year.id}`} className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                  Parent Term <span className="text-slate-400 normal-case font-normal">(optional)</span>
                </label>
                <select id={`create-term-parent-${year.id}`} name="parentId" className="h-8 w-full px-2 rounded-md border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-900">
                  <option value="">None (Top-level under this year)</option>
                  {year.terms.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor={`create-term-start-${year.id}`} className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Start</label>
                  <input id={`create-term-start-${year.id}`} aria-label="Start Date" type="date" name="startDate" required className="h-8 w-full px-2 rounded-md border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-900" />
                </div>
                <div>
                  <label htmlFor={`create-term-end-${year.id}`} className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">End</label>
                  <input id={`create-term-end-${year.id}`} aria-label="End Date" type="date" name="endDate" required className="h-8 w-full px-2 rounded-md border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-900" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={pending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Create
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowAddTerm(false)}><X className="w-3.5 h-3.5 mr-1" /> Cancel</Button>
              </div>
            </form>
          )}

          {year.terms.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-4 text-center">No terms yet. Click "Add Term" to create one.</p>
          ) : (
            <div className="space-y-0">
              {rootTerms.map(t => (
                <TermTree
                  key={t.id}
                  term={t}
                  allTerms={year.terms}
                  depth={0}
                  onDone={refresh}
                  schoolYears={schoolYears}
                  currentSchoolYearId={year.id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main client component ────────────────────────────────────────────────────
export function TermsManagerClient({ schoolYears }: { schoolYears: SchoolYear[] }) {
  const router = useRouter()
  const [showNewYear, setShowNewYear] = useState(false)
  const [pending, startTransition] = useTransition()

  const handleCreateYear = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await createSchoolYear(fd)
      if (res?.error) toast.error(res.error)
      else {
        toast.success("School year created")
        setShowNewYear(false)
        ;(e.target as HTMLFormElement).reset()
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Create new school year */}
      <div className="flex justify-end">
        <Button onClick={() => setShowNewYear(s => !s)} variant="outline" className="gap-2">
          <Plus className="w-4 h-4" /> New School Year
        </Button>
      </div>

      {showNewYear && (
        <form onSubmit={handleCreateYear} className="bg-white dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-bold text-sm border-b border-slate-100 dark:border-slate-800 pb-2 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-500" /> Create School Year
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="create-year-name" className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Name</label>
              <Input id="create-year-name" name="name" placeholder="2025-2026" required className="h-9 text-sm" />
            </div>
            <div>
              <label htmlFor="create-year-start" className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Start Date</label>
              <input id="create-year-start" type="date" name="startDate" required className="h-9 w-full px-3 rounded-md border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-900" />
            </div>
            <div>
              <label htmlFor="create-year-end" className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">End Date</label>
              <input id="create-year-end" type="date" name="endDate" required className="h-9 w-full px-3 rounded-md border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-900" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {pending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />} Create Year
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowNewYear(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {schoolYears.length === 0 ? (
        <div className="p-12 text-center bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <Calendar className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 font-medium">No school years defined yet.</p>
          <p className="text-sm text-slate-400 mt-1">Click "New School Year" above to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {schoolYears.map(year => (
            <SchoolYearCard key={year.id} year={year as any} schoolYears={schoolYears} />
          ))}
        </div>
      )}
    </div>
  )
}
