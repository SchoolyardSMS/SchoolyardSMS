import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AttendanceTracker } from "./attendance-client"

export const metadata = {
  title: "Class Attendance | Schoolyard",
}

export default async function AttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const { id } = await params

  const section = await db.section.findUnique({
    where: { id },
    include: {
      course: true,
      enrollments: {
        include: {
          student: { 
            include: { 
              user: true,
              attendance: {
                where: {
                  isArchived: false,
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: { section: { include: { course: true } } }
              }
            } 
          }
        },
        orderBy: { student: { user: { name: 'asc' } } }
      },
      attendance: {
        where: { isArchived: false }
      }
    }
  })

  if (!section) return notFound()

  // Only Teachers and Admins can access attendance modifications
  if (session.user?.role !== 'ADMIN' && session.user?.role !== 'TEACHER') {
    redirect(`/dashboard/academics/sections/${id}`)
  }

  // Map students to include "Last Known Location" based on recent attendance
  const studentsWithHistory = section.enrollments.map((enr: any) => {
    const history = enr.student.attendance.filter((a: any) => a.sectionId !== id)
    const lastRecord = history[0]
    return {
      ...enr,
      lastLocation: lastRecord ? `${lastRecord.section.course.code} - ${lastRecord.section.course.name}` : "N/A"
    }
  })

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center space-x-2 pb-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/academics/sections/${id}`}>← Back to Section</Link>
        </Button>
      </div>

      <div className="bg-card border rounded-xl p-6 shadow-sm">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Daily Attendance</h2>
        <p className="text-muted-foreground mt-1">{section.course.name} • {section.legacyTerm}</p>
      </div>

      <AttendanceTracker 
        sectionId={section.id} 
        enrollments={studentsWithHistory} 
        initialData={section.attendance} 
      />
    </div>
  )
}
