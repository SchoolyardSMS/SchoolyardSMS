"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updateStudentDemographics, linkParentToStudent, unlinkParentFromStudent } from "@/app/actions/registrar"
import { Loader2, CheckCircle, Trash2, Link as LinkIcon } from "lucide-react"
import { toast } from "sonner"

export function RegistrarClient({
  student,
  availableParents
}: {
  student: any
  availableParents: { id: string, userId: string, user: { name: string, email: string } }[]
}) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  
  const [dob, setDob] = useState(student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : "")
  const [grade, setGrade] = useState(student.gradeLevel.toString())

  const [selectedParentId, setSelectedParentId] = useState("")

  const handleUpdate = async () => {
    setLoading(true)
    setSuccess(false)
    try {
      const res = await updateStudentDemographics(student.id, {
        dateOfBirth: new Date(dob),
        gradeLevel: parseInt(grade, 10)
      })
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success("Demographics updated successfully")
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (e) {
      console.error(e)
      toast.error("Failed to update demographics")
    } finally {
      setLoading(false)
    }
  }

  const handleLinkParent = async () => {
    if (!selectedParentId) return
    setLoading(true)
    try {
      const res = await linkParentToStudent(student.id, selectedParentId)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success("Parent linked successfully")
        setSelectedParentId("")
      }
    } catch (e) {
      console.error(e)
      toast.error("Failed to link parent")
    } finally {
      setLoading(false)
    }
  }

  const handleUnlink = async (parentId: string) => {
    if (!confirm("Are you sure you want to unlink this parent?")) return
    setLoading(true)
    try {
      const res = await unlinkParentFromStudent(student.id, parentId)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success("Parent unlinked")
      }
    } catch (e) {
      console.error(e)
      toast.error("Failed to unlink parent")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Demographics */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Demographics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="student-dob" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Date of Birth</label>
            <Input 
              id="student-dob"
              type="date" 
              value={dob} 
              onChange={e => setDob(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800"
            />
          </div>
          <div>
            <label htmlFor="student-grade" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Grade Level</label>
            <Input 
              id="student-grade"
              type="number" 
              value={grade} 
              onChange={e => setGrade(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800"
            />
          </div>
        </div>
        <Button onClick={handleUpdate} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : success ? <CheckCircle className="w-4 h-4 mr-2" /> : null}
          {success ? "Saved" : "Save Demographics"}
        </Button>
      </div>

      {/* Parents / Guardians */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Parents & Guardians</h3>
        
        <div className="space-y-3 mb-6">
          {student.parents.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No parents linked.</p>
          ) : (
            student.parents.map((p: any) => (
              <div key={p.parentId} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">{p.parent.user.name}</p>
                  <p className="text-xs text-slate-500">{p.parent.user.email}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleUnlink(p.parentId)} disabled={loading} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-full">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-3">
          <select 
            className="flex-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm"
            value={selectedParentId}
            onChange={e => setSelectedParentId(e.target.value)}
          >
            <option value="">Select a parent to link...</option>
            {availableParents.map(p => (
              <option key={p.userId} value={p.userId}>{p.user.name} ({p.user.email})</option>
            ))}
          </select>
          <Button onClick={handleLinkParent} disabled={loading || !selectedParentId} className="shrink-0 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold rounded-xl shadow-sm">
            <LinkIcon className="w-4 h-4 mr-2" /> Link Parent
          </Button>
        </div>
      </div>
    </div>
  )
}
