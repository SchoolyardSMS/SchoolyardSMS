"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { createAnnouncement, deleteAnnouncement } from "@/app/actions/announcements"
import { formatDistanceToNow } from "date-fns"
import { Trash2, Megaphone, User } from "lucide-react"
import { toast } from "sonner"

interface AnnouncementStreamProps {
  sectionId: string
  announcements: any[]
  isStaff: boolean
  currentUserId: string
}

export function AnnouncementStream({ sectionId, announcements, isStaff, currentUserId }: AnnouncementStreamProps) {
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append("sectionId", sectionId)
      formData.append("content", content)
      
      await createAnnouncement(formData)
      setContent("")
      toast.success("Announcement posted")
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return
    
    try {
      await deleteAnnouncement(id, sectionId)
      toast.success("Announcement deleted")
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Post Box */}
      {isStaff && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-4">
              <div className="h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-indigo-600" />
              </div>
              <Textarea 
                placeholder="Announce something to your class..." 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[100px] border-none focus-visible:ring-0 text-lg resize-none p-0 bg-transparent placeholder:text-slate-400"
              />
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button 
                type="submit" 
                disabled={isSubmitting || !content.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full px-6"
              >
                {isSubmitting ? "Posting..." : "Post Announcement"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Feed */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="text-center py-20 bg-slate-50/50 dark:bg-slate-900/20 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <Megaphone className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <h3 className="font-bold text-slate-900 dark:text-white">The stream is empty</h3>
            <p className="text-sm text-slate-500 mt-1">Check back later for updates from your instructor.</p>
          </div>
        ) : (
          announcements.map((ann) => (
            <div key={ann.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-black text-white shadow-sm">
                    {ann.author.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{ann.author.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                      {formatDistanceToNow(new Date(ann.createdAt))} ago
                    </p>
                  </div>
                </div>
                {(isStaff || ann.authorId === currentUserId) && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDelete(ann.id)}
                    className="h-8 w-8 text-slate-400 hover:text-rose-600 rounded-full"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {ann.content}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
