"use client"

import { useState } from "react"
import { useFormStatus } from "react-dom"
import { inviteUser } from "@/app/actions/user"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button 
      type="submit" 
      disabled={pending}
      className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-full py-6 shadow-lg shadow-indigo-100 dark:shadow-none"
    >
      {pending ? "Sending..." : "Send Invitation"}
    </Button>
  )
}

export function InviteUserForm({ students = [] }: { students?: any[] }) {
  const [role, setRole] = useState("STUDENT")
  const [selectedGrade, setSelectedGrade] = useState("9")

  async function handleAction(formData: FormData) {
    try {
      await inviteUser(formData)
      toast.success("User invited successfully")
      // Quick way to reset standard form fields
      document.querySelector<HTMLFormElement>("#invite-form")?.reset()
      setRole("STUDENT")
    } catch (error: any) {
      toast.error(error.message || "Failed to invite user")
    }
  }

  return (
    <form id="invite-form" action={handleAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</Label>
        <Input id="email" name="email" type="email" placeholder="email@school.dev" required className="rounded-xl" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</Label>
        <Input id="name" name="name" placeholder="Johnny Apple" required className="rounded-xl" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Role</Label>
        <Select name="role" value={role} onValueChange={(v) => setRole(v || "STUDENT")}>
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="STUDENT">Student</SelectItem>
            <SelectItem value="TEACHER">Teacher</SelectItem>
            <SelectItem value="PARENT">Parent</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {role === "PARENT" && (
        <div className="space-y-2">
          <Label htmlFor="studentId" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Link to Student</Label>
          <select 
            name="studentId"
            className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="" disabled selected>Select Student</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.user.name} (Grade {s.gradeLevel})
              </option>
            ))}
          </select>
        </div>
      )}

      {role === "STUDENT" && (
        <div className="space-y-2">
          <Label htmlFor="gradeLevel" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Grade Level</Label>
          <Select name="gradeLevel" value={selectedGrade} onValueChange={(val) => setSelectedGrade(val || "9")}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Select Grade" />
            </SelectTrigger>
            <SelectContent>
              {[...Array(13)].map((_, i) => (
                <SelectItem key={i} value={String(i)}>
                  {i === 0 ? "Kindergarten" : `Grade ${i}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <SubmitButton />
    </form>
  )
}
