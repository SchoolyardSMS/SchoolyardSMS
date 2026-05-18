import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AssignmentCalendar } from "./calendar-client"
import { unstable_noStore as noStore } from "next/cache"

export const dynamic = "force-dynamic"
export const metadata = {
  title: "Weekly Calendar | Schoolyard",
}

export default async function AssignmentsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")
  noStore()

  const role = session.user.role

  if (role === "PARENT") {
    redirect("/dashboard")
  }

  // Handle Staff View
  if (role !== "STUDENT") {
    const all = await db.assignment.findMany({
      include: { section: { include: { course: true } } },
      orderBy: { dueDate: "desc" },
      take: 50
    })
    
    return (
      <div className="flex-1 space-y-6 p-8 pt-6 min-h-screen bg-transparent">
        <div className="flex items-center justify-between pb-4 border-b">
           <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100 uppercase">Assignment Oversight</h2>
        </div>
        <div className="rounded-3xl border bg-white dark:bg-slate-900 overflow-hidden shadow-xl border-slate-200 dark:border-slate-800">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-800">
              <tr>
                <th className="p-4 text-left font-black text-slate-400">DUE DATE</th>
                <th className="p-4 text-left font-black text-slate-400">COURSE</th>
                <th className="p-4 text-left font-black text-slate-400">ASSIGNMENT</th>
              </tr>
            </thead>
            <tbody>
              {all.map(a => (
                <tr key={a.id} className="border-b last:border-0 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 text-slate-600 dark:text-slate-400">{new Date(a.dueDate).toLocaleDateString("en-US", { timeZone: "UTC" })}</td>
                  <td className="p-4 font-bold text-indigo-600 dark:text-indigo-400">{a.section.course.name}</td>
                  <td className="p-4 text-slate-700 dark:text-slate-200">{a.title}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Student View
  const student = await db.student.findUnique({
    where: { userId: session.user.id }
  })
  if (!student) redirect("/dashboard")

  const enrollments = await db.enrollment.findMany({
    where: { studentId: student.id },
    include: {
      section: {
        include: {
          course: true,
          assignments: {
            where: {
              status: "PUBLISHED",
              OR: [
                { publishDate: null },
                { publishDate: { lte: new Date() } }
              ]
            },
            include: {
              submissions: {
                where: { studentId: student.id }
              }
            }
          }
        }
      }
    }
  })

  const allAssignments = (enrollments || []).flatMap(enr => 
    enr.section.assignments.map(ass => ({
      ...ass,
      courseName: enr.section.course.name,
      isSubmitted: ass.submissions.length > 0
    }))
  )

  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - now.getDay())
  start.setHours(0,0,0,0)

  return (
    <AssignmentCalendar 
       initialAssignments={allAssignments} 
       initialStart={start.toISOString()} 
    />
  )
}
