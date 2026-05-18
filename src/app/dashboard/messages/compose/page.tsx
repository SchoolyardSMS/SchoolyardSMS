import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { MessageForm } from "@/components/dashboard/messages/message-form"

export const metadata = {
  title: "Compose Message | Schoolyard",
}

export default async function ComposePage({ searchParams }: { searchParams: Promise<{ replyTo?: string, receiverId?: string, subject?: string, parentId?: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const { replyTo, receiverId, subject, parentId } = await searchParams

  let initialReceiver: any = null
  let initialSubject = subject || ""
  let initialBody = ""
  let activeParentId = parentId || ""

  if (receiverId) {
    const user = await db.user.findUnique({ where: { id: receiverId }, select: { id: true, name: true } })
    if (user) initialReceiver = user
  }

  if (replyTo) {
    const originalMessage = await db.message.findUnique({
      where: { id: replyTo },
      include: { sender: true, receiver: true }
    })

    if (originalMessage && (originalMessage.receiverId === session.user?.id || originalMessage.senderId === session.user?.id)) {
      const otherUser = originalMessage.senderId === session.user?.id ? originalMessage.receiver : originalMessage.sender
      initialReceiver = { id: otherUser.id, name: otherUser.name }
      initialSubject = originalMessage.subject.startsWith("Re:") ? originalMessage.subject : `Re: ${originalMessage.subject}`
      initialBody = `\n\n\n--- Original Message from ${originalMessage.sender.name} ---\n> ${(originalMessage.body || "").replace(/\n/g, '\n> ')}`
      activeParentId = originalMessage.id
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <MessageForm 
        type="DIRECT"
        initialReceiver={initialReceiver}
        initialSubject={initialSubject}
        initialBody={initialBody}
        parentId={activeParentId}
      />
    </div>
  )
}
