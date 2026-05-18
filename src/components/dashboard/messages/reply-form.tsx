"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { replyToMessage } from "@/app/actions/messaging"
import { toast } from "sonner"
import { Send, Loader2 } from "lucide-react"

interface ReplyFormProps {
  messageId: string
}

export function ReplyForm({ messageId }: ReplyFormProps) {
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleReply() {
    if (!content.trim()) return
    setIsSubmitting(true)
    try {
      await replyToMessage(messageId, content)
      setContent("")
      toast.success("Reply sent")
    } catch (err) {
      toast.error("Failed to send reply")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border bg-slate-50 dark:bg-slate-900/50 p-6">
      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Quick Reply</h4>
      <Textarea 
        value={content} 
        onChange={(e) => setContent(e.target.value)} 
        placeholder="Type your message here..."
        className="min-h-[120px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-indigo-500"
      />
      <div className="flex justify-end">
        <Button 
          onClick={handleReply} 
          disabled={isSubmitting || !content.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Send Reply
        </Button>
      </div>
    </div>
  )
}
