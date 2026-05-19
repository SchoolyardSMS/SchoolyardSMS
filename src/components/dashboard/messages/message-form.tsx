"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { sendMessage, sendSchoolMessage } from "@/app/actions/messaging"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Send, ArrowLeft, Loader2, Users, User as UserIcon } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { UserSearch } from "@/components/ui/user-search"

interface MessageFormProps {
  type: "DIRECT" | "BROADCAST"
  sections?: any[]
  initialReceiver?: any
  initialSubject?: string
  initialBody?: string
  parentId?: string
}

export function MessageForm({ 
  type, 
  sections = [], 
  initialReceiver, 
  initialSubject = "", 
  initialBody = "", 
  parentId 
}: MessageFormProps) {
  const router = useRouter()
  const [isSending, setIsSending] = useState(false)
  const [audience, setAudience] = useState("PARENTS")
  const [receiverId, setReceiverId] = useState(initialReceiver?.id || "")
  const [receiverName, setReceiverName] = useState(initialReceiver?.name || "")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSending(true)

    const formData = new FormData(e.currentTarget)
    
    try {
      if (type === "BROADCAST") {
        formData.set("audience", audience)
        const result = await sendSchoolMessage(formData)
        if (result.success) {
          if ((result as any).queued) {
            toast.success('Broadcast queued for delivery.')
          } else {
            toast.success(`Broadcast sent to ${(result as any).count} recipients!`)
          }
          router.push("/dashboard/messages")
        }
      } else {
        if (!receiverId) throw new Error("Please select a recipient.")
        formData.set("receiverId", receiverId)
        if (parentId) formData.set("parentId", parentId)
        await sendMessage(formData)
        toast.success("Message sent!")
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to send message.")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/dashboard/messages">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {type === "BROADCAST" ? "Create Announcement" : "Compose Message"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {type === "BROADCAST" 
              ? "Send a mass update to a selected audience." 
              : "Send a direct message to a specific user."}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {type === "BROADCAST" ? (
            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Select value={audience} onValueChange={(val) => setAudience(val || "PARENTS")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select audience..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PARENTS">All Parents</SelectItem>
                  <SelectItem value="STUDENTS">All Students</SelectItem>
                  <SelectItem value="STAFF">All Staff</SelectItem>
                  {sections.map((sec) => (
                    <SelectItem key={`STU_${sec.id}`} value={`SECTION_STUDENTS_${sec.id}`}>
                      Students: {sec.course.name} ({sec.term})
                    </SelectItem>
                  ))}
                  {sections.map((sec) => (
                    <SelectItem key={`PAR_${sec.id}`} value={`SECTION_PARENTS_${sec.id}`}>
                      Parents: {sec.course.name} ({sec.term})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Recipient</Label>
              {receiverName ? (
                <div className="flex items-center justify-between p-2 rounded-md border bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-slate-400" />
                    <span className="font-medium text-sm">{receiverName}</span>
                  </div>
                  {!parentId && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => { setReceiverId(""); setReceiverName(""); }}
                      className="h-7 text-[10px] uppercase font-bold"
                    >
                      Change
                    </Button>
                  )}
                </div>
              ) : (
                <UserSearch onSelect={(u) => { setReceiverId(u.id); setReceiverName(u.name); }} />
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input 
              id="subject" 
              name="subject" 
              required 
              defaultValue={initialSubject} 
              placeholder="What is this about?" 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Message Body</Label>
            <Textarea 
              id="body" 
              name={type === "BROADCAST" ? "content" : "body"} 
              required 
              defaultValue={initialBody}
              placeholder="Type your message here..." 
              className="min-h-[250px] resize-y"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="ghost" asChild>
              <Link href="/dashboard/messages">Cancel</Link>
            </Button>
            <Button 
              type="submit" 
              disabled={isSending || (type === "DIRECT" && !receiverId)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {type === "BROADCAST" ? "Blast Message" : "Send Message"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
