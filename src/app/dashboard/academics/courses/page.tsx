import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { GraduationCap, Plus, BookOpen } from "lucide-react"
import { CourseActions } from "@/components/dashboard/academics/course-actions"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { unstable_noStore as noStore } from "next/cache"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { CourseCard } from "@/components/dashboard/academics/course-card"

export const dynamic = "force-dynamic"
export const metadata = {
  title: "My Courses | Schoolyard",
}

export default async function CoursesPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")
  noStore()

  const role = session.user.role

  if (role === "PARENT") {
    redirect("/dashboard")
  }

  if (role === "STUDENT") {
    const student = await db.student.findUnique({
      where: { userId: session.user.id },
      include: {
        enrollments: {
          include: {
            section: {
              include: {
                course: true,
                teacher: { include: { user: true } },
                assignments: {
                  where: { 
                    dueDate: { gte: new Date() },
                    status: "PUBLISHED",
                    OR: [
                      { publishDate: null },
                      { publishDate: { lte: new Date() } }
                    ]
                  },
                  include: {
                    submissions: {
                      where: { student: { userId: session.user.id } }
                    }
                  },
                  orderBy: { dueDate: "asc" },
                  take: 2
                }
              }
            }
          }
        }
      }
    })

    const sections = (student?.enrollments || []).map(enr => enr.section)
    
    const gradients = [
      "from-indigo-600 to-indigo-800",
      "from-emerald-600 to-emerald-800",
      "from-rose-600 to-rose-800",
      "from-blue-600 to-blue-800",
      "from-violet-600 to-violet-800",
      "from-amber-600 to-amber-800"
    ]

    return (
      <div className="p-8 max-w-7xl mx-auto space-y-10">
        <DashboardPageHeader 
          title="My Courses" 
          description="View your active course enrollments, upcoming tasks, and teacher information."
          icon={GraduationCap}
        />

        {sections.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-20 text-center bg-slate-50/50 dark:bg-slate-900/20">
            <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
              <BookOpen className="h-10 w-10 text-slate-300" />
            </div>
            <h4 className="font-bold text-xl text-slate-900 dark:text-white">No Enrollments</h4>
            <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
              You are not currently enrolled in any active course sections.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {sections.map((sec, i) => (
              <CourseCard key={sec.id} section={sec} gradient={gradients[i % gradients.length]} />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Staff View (Keep Table)
  const allCourses = await db.course.findMany({
    where: role === "TEACHER" ? {
      sections: {
        some: { teacher: { userId: session.user.id } }
      }
    } : {},
    include: { 
      sections: { 
        where: role === "TEACHER" ? { teacher: { userId: session.user.id } } : {},
        include: { teacher: { include: { user: true } } } 
      } 
    },
    orderBy: { code: "asc" }
  })

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      <DashboardPageHeader 
        title="Course Catalog" 
        description={role === "ADMIN" ? "Manage the school's academic offerings and section assignments." : "View the courses and sections you are currently instructing."}
        icon={BookOpen}
      >
        {role === "ADMIN" && (
          <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
            <Link href="/dashboard/academics/courses/new">
              <Plus className="w-4 h-4 mr-2" />
              Create Course
            </Link>
          </Button>
        )}
      </DashboardPageHeader>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-500 py-4 pl-6">Code</TableHead>
              <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-500 py-4">Course Name</TableHead>
              <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-500 py-4">Active Sections</TableHead>
              <TableHead className="text-right font-black uppercase tracking-widest text-[10px] text-slate-500 py-4 pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allCourses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-32 text-slate-500 italic">
                  No courses found in the catalog.
                </TableCell>
              </TableRow>
            ) : (
              allCourses.map((c) => (
                <TableRow key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-100 dark:border-slate-800/50 group">
                  <TableCell className="font-mono font-bold text-indigo-600 dark:text-indigo-400 py-4 pl-6">
                    <Link href={`/dashboard/academics/courses/${c.id}`} className="hover:underline">{c.code}</Link>
                  </TableCell>
                  <TableCell className="py-4 font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                    <Link href={`/dashboard/academics/courses/${c.id}`} className="hover:underline">{c.name}</Link>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge variant="outline" className="rounded-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 font-bold text-[10px]">
                      {c.sections.length} Sections
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right py-4 pr-6">
                    <CourseActions course={c} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
