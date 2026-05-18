import { Metadata } from "next"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Send, Users, ShieldAlert, BadgeInfo } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatInET } from "@/lib/dates"

export const metadata: Metadata = {
  title: "Messages | Schoolyard",
}

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")

  const { tab = "inbox" } = await searchParams
  const role = session.user.role
  const canSendMessages = role === "ADMIN" || role === "TEACHER"

  let displayItems: any[] = []

  if (tab === "sent") {
    // Fetch individual direct messages sent by the user
    const directMessages = await db.message.findMany({
      where: { senderId: session.user.id, broadcastId: null },
      include: {
        sender: { select: { name: true } },
        receiver: { select: { name: true } }
      }
    })

    // Fetch broadcasts sent by the user
    const broadcasts = await db.broadcast.findMany({
      where: { senderId: session.user.id },
      include: {
        sender: { select: { name: true } }
      }
    })

    // Merge and map to a common format
    displayItems = [
      ...directMessages.map(m => ({ ...m, type: 'message' })),
      ...broadcasts.map(b => ({ ...b, type: 'broadcast', receiver: { name: b.audience } }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  } else {
    // Inbox logic: Fetch messages received by the user
    const inboxMessages = await db.message.findMany({
      where: { receiverId: session.user.id },
      include: {
        sender: { select: { name: true } },
        receiver: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    displayItems = inboxMessages.map(m => ({ ...m, type: 'message' }))
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messaging Hub</h1>
          <p className="text-muted-foreground mt-1">
            School-wide announcements and direct communications.
          </p>
        </div>
        {canSendMessages && (
          <Button asChild style={{ background: "var(--school-primary,#4f46e5)" }} className="text-white">
            <Link href="/dashboard/messages/new">
              <Send className="mr-2 h-4 w-4" />
              New Blast
            </Link>
          </Button>
        )}
      </div>

      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <Link 
          href="/dashboard/messages?tab=inbox"
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${tab === "inbox" ? "border-indigo-600 text-indigo-600" : "border-transparent text-muted-foreground hover:text-slate-900"}`}
        >
          Inbox
        </Link>
        <Link 
          href="/dashboard/messages?tab=sent"
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${tab === "sent" ? "border-indigo-600 text-indigo-600" : "border-transparent text-muted-foreground hover:text-slate-900"}`}
        >
          Sent
        </Link>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">{tab === "sent" ? "Sent Messages" : "Direct Message Inbox"}</h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/messages/compose">Compose Message</Link>
          </Button>
        </div>

        {displayItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center text-muted-foreground bg-slate-50/50 dark:bg-slate-900/50">
             <p className="font-semibold text-lg text-slate-700 dark:text-slate-300">Nothing here yet</p>
             <p className="text-sm mt-1 max-w-sm mx-auto">You have no {tab} messages at this time.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {displayItems.map((item: any) => (
              <Link 
                key={item.id} 
                href={item.type === 'broadcast' ? `/dashboard/messages?tab=sent` : `/dashboard/messages/${item.id}`} 
                className={`block rounded-xl border bg-card p-5 hover:shadow-md transition-all ${item.type === 'broadcast' ? 'border-amber-200 bg-amber-50/20' : ''}`}
              >
                <div className="flex justify-between items-start mb-2">
                   <div className="flex items-center gap-2">
                     <div className="font-semibold text-lg">{item.subject}</div>
                     {item.type === 'broadcast' && (
                       <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] font-bold">ANNOUNCEMENT</Badge>
                     )}
                   </div>
                   <div className="text-xs text-muted-foreground whitespace-nowrap">{formatInET(item.createdAt, { month: "short", day: "numeric", year: "numeric" })}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                      {tab === "sent" 
                        ? (item.type === 'broadcast' ? `Audience: ${item.receiver.name}` : `To: ${item.receiver.name}`)
                        : `From: ${item.sender.name}`
                      }
                    </span>
                    {item.type === 'message' && !item.read && item.receiverId === session.user.id && (
                      <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 text-xs px-2 py-0.5 rounded-full font-bold">NEW</span>
                    )}
                  </div>
                  
                  {tab === "sent" && item.type === 'message' && (
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                        item.status === "DELIVERED" ? "bg-emerald-100 text-emerald-700" :
                        item.status === "BOUNCED" || item.status === "FAILED" ? "bg-red-100 text-red-700" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  )}

                  {tab === "sent" && item.type === 'broadcast' && (
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-tight">Mass Email Blast</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
