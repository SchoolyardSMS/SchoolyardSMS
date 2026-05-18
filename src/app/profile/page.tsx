import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { ProfileView } from "@/components/profile/profile-view"

export const metadata = { title: "My Profile | Schoolyard" }

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/login")

  const user = await db.user.findUnique({ 
    where: { id: session.user.id },
    include: {
        studentProfile: true,
        teacherProfile: true,
        parentProfile: {
            include: {
                children: {
                    include: {
                        student: {
                            include: { user: true }
                        }
                    }
                }
            }
        }
    }
  })
  
  if (!user) redirect("/login")

  return (
    <div className="p-8 pt-6">
      <ProfileView 
        user={user} 
        student={user.studentProfile}
        teacher={user.teacherProfile}
        parent={user.parentProfile}
      />
    </div>
  )
}
