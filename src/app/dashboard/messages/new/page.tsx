import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { MessageForm } from "@/components/dashboard/messages/message-form"

export const metadata = {
  title: "Broadcast Announcement | Schoolyard",
}

export default async function NewMessagePage() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== "ADMIN" && session.user?.role !== "TEACHER")) {
    redirect("/dashboard")
  }

  // Fetch sections for audience selection
  let sections: any[] = []
  if (session.user.role === "ADMIN") {
    sections = await db.section.findMany({
      include: { course: true },
      orderBy: { legacyTerm: "desc" }
    })
  } else {
    const teacherProfile = await db.teacher.findUnique({ where: { userId: session.user.id } })
    if (teacherProfile) {
      sections = await db.section.findMany({
        where: { teacherId: teacherProfile.id },
        include: { course: true },
        orderBy: { legacyTerm: "desc" }
      })
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <MessageForm type="BROADCAST" sections={sections} />
    </div>
  )
}
