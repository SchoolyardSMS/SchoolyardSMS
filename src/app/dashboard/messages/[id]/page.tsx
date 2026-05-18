import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { markAsRead } from "@/app/actions/messaging"
import Link from "next/link"
import { Resend } from "resend"

import { ReplyForm } from "@/components/dashboard/messages/reply-form"

export const metadata = {
  title: "Message | Schoolyard",
}

export default async function MessageThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const { id } = await params

  // 1. Fetch current message and its direct parent/replies
  let message = await db.message.findUnique({
    where: { id },
    include: {
      sender: { select: { id: true, name: true, role: true }  },
      receiver: { select: { id: true, name: true } },
      broadcast: true, // Scale optimization: check for shared body
      parent: {
        include: {
          sender: { select: { name: true, role: true } }
        }
      },
      replies: {
        include: {
          sender: { select: { name: true, role: true } }
        },
        orderBy: { createdAt: 'asc' }
      }
    }
  })

  if (!message) return notFound()

  // 2. Lazy Fetch Body from Resend (Scale Optimization)
  // If the body is null but we have an externalId (inbound email metadata), fetch it now
  if (!message.body && !message.broadcastId && message.externalId) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const { data } = await resend.emails.receiving.get(message.externalId)
      if (data) {
        const rawText = data.text || data.html?.replace(/<style[^>]*>.*<\/style>/gm, "").replace(/<[^>]*>?/gm, "\n").trim() || "No content"
        
        // Clean the body (remove quotes)
        const quoteIndex = rawText.indexOf("On ") !== -1 ? rawText.indexOf("On ") : 
                           rawText.indexOf("wrote:") !== -1 ? Math.max(0, rawText.indexOf("wrote:") - 50) : -1
        const bodyText = quoteIndex > 0 ? rawText.substring(0, quoteIndex).trim() : rawText

        // Update DB so we don't fetch it again
        message = await db.message.update({
          where: { id: message.id },
          data: { body: bodyText },
          include: {
            sender: { select: { id: true, name: true, role: true }  },
            receiver: { select: { id: true, name: true } },
            broadcast: true,
            parent: { include: { sender: { select: { name: true, role: true } } } },
            replies: { include: { sender: { select: { name: true, role: true } } }, orderBy: { createdAt: 'asc' } }
          }
        })
      }
    } catch (err) {
      console.error("[Lazy Load] Failed to fetch email body:", err)
    }
  }

  // 3. Security Check
  if (message.senderId !== session.user?.id && message.receiverId !== session.user?.id) {
    redirect("/dashboard/messages")
  }

  // 4. Mark as Read (Silent)
  if (!message.read && message.receiverId === session.user?.id) {
    await db.message.update({ where: { id }, data: { read: true } })
  }

  // 5. Threading Logic
  const thread = []
  if (message.parent) thread.push(message.parent)
  thread.push(message)
  if (message.replies.length > 0) thread.push(...message.replies)

  // Sort thread by date
  thread.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  return (
    <div className="flex-1 space-y-8 p-8 pt-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/messages">← Back to Inbox</Link>
        </Button>
        <Badge variant="outline" className="bg-slate-50 dark:bg-slate-900 px-3 py-1">
          Thread: {message.subject}
        </Badge>
      </div>

      <div className="space-y-6">
        {thread.map((msg: any, index: number) => {
          const isMe = msg.senderId === session.user?.id
          return (
            <div 
              key={msg.id} 
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={`max-w-[85%] rounded-2xl shadow-sm border p-6 ${
                isMe 
                ? 'bg-indigo-600 text-white border-indigo-500 rounded-tr-none' 
                : 'bg-card text-card-foreground border-slate-200 dark:border-slate-800 rounded-tl-none'
              }`}>
                <div className="flex items-center justify-between gap-4 mb-4 border-b pb-2 border-white/10 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{msg.sender.name}</span>
                    <Badge variant="secondary" className="text-[10px] uppercase font-black opacity-80">
                      {msg.sender.role}
                    </Badge>
                  </div>
                  <span className={`text-[10px] opacity-70`}>
                    {new Date(msg.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className={`whitespace-pre-wrap leading-relaxed ${isMe ? 'text-white/90' : 'text-muted-foreground'}`}>
                  {msg.body || msg.broadcast?.body}
                </div>
                
                {isMe && (
                  <div className="mt-4 pt-2 border-t border-white/10 flex justify-end">
                    <span className="text-[9px] font-black uppercase tracking-tighter opacity-60">
                      STATUS: {msg.status}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 sticky bottom-0 bg-background/80 backdrop-blur-sm pb-8">
        <ReplyForm messageId={id} />
      </div>
    </div>
  )
}
