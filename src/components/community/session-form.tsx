"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { createCommunitySession, updateCommunitySession } from "@/app/actions/community"
import { toast } from "sonner"
import { UserSearch } from "@/components/ui/user-search"

interface SessionFormProps {
  upcomingDays: any[]
  teachers?: any[] // Only for admins
  initialData?: any
  onSuccess?: () => void
  isAdmin?: boolean
}

export function CommunitySessionForm({ upcomingDays, teachers, initialData, onSuccess, isAdmin }: SessionFormProps) {
  const [title, setTitle] = useState(initialData?.title || "")
  const [room, setRoom] = useState(initialData?.room || "")
  const [capacity, setCapacity] = useState(initialData?.capacity || 30)
  const [dayId, setDayId] = useState(initialData?.calendarDayId || upcomingDays[0]?.id || "")
  const [isRestricted, setIsRestricted] = useState(initialData?.isRestricted || false)
  const [teacherId, setTeacherId] = useState(initialData?.teacherId || "")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = { 
        calendarDayId: dayId, 
        title, 
        description: "", 
        room, 
        capacity, 
        isRestricted,
        teacherId: isAdmin ? teacherId : undefined
      }

      if (initialData?.id) {
        await updateCommunitySession(initialData.id, data)
        toast.success("Session updated!")
      } else {
        await createCommunitySession(data)
        toast.success("Session created!")
        if (!initialData) {
          setTitle("")
          setRoom("")
        }
      }
      onSuccess?.()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <h3 className="font-bold text-lg">{initialData ? "Edit Session" : "Create Session"}</h3>
      
      {isAdmin && !initialData && (
        <div className="space-y-1">
          <span className="block text-sm font-medium">Teacher</span>
          <UserSearch 
            role="TEACHER" 
            placeholder="Search for a teacher..." 
            onSelect={(u) => setTeacherId(u.teacherId)} 
          />
          {teacherId && <p className="text-[10px] text-green-600 font-medium">Teacher selected</p>}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="session-date-select" className="block text-sm font-medium">Date</label>
          <select 
            id="session-date-select"
            value={dayId} 
            onChange={e => setDayId(e.target.value)} 
            required 
            className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-transparent text-sm"
          >
            {upcomingDays.map((d: any) => (
              <option key={d.id} value={d.id}>{format(new Date(d.date), 'MMM d, yyyy')}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="session-room-input" className="block text-sm font-medium">Room</label>
          <input 
            id="session-room-input"
            value={room} 
            onChange={e => setRoom(e.target.value)} 
            required 
            placeholder="e.g. Room 101"
            className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-transparent text-sm" 
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="session-title-input" className="block text-sm font-medium">Title</label>
        <input 
          id="session-title-input"
          value={title} 
          onChange={e => setTitle(e.target.value)} 
          required 
          placeholder="e.g. Math Help / Chess Club"
          className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-transparent text-sm" 
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="session-capacity-input" className="block text-sm font-medium">Capacity</label>
          <input 
            id="session-capacity-input"
            type="number" 
            value={capacity} 
            onChange={e => setCapacity(Number(e.target.value))} 
            className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-transparent text-sm" 
          />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input 
            type="checkbox" 
            checked={isRestricted} 
            onChange={e => setIsRestricted(e.target.checked)} 
            id="restr-form" 
            className="rounded border-slate-300"
          />
          <label htmlFor="restr-form" className="text-sm font-medium">Restricted (Invite Only)</label>
        </div>
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="w-full py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
      >
        {loading ? "Saving..." : (initialData ? "Update Session" : "Create Session")}
      </button>
    </form>
  )
}
