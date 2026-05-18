import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { 
  Search, 
  User as UserIcon, 
  GraduationCap, 
  ChevronRight,
  ChevronLeft
} from "lucide-react"
import { getStudents } from "@/app/actions/academics"

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; grade?: string; page?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")

  const { q, grade, page } = await searchParams
  const searchTerm = q || ""
  const gradeFilter = grade ? parseInt(grade) : undefined
  const currentPage = parseInt(page || "1", 10)

  const { students, totalPages } = await getStudents(currentPage, 12, searchTerm, gradeFilter)

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Student Directory</h2>
        <p className="text-muted-foreground italic">Find and view profiles of students in the Schoolyard community.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <form action="" method="get">
            <Input 
              name="q"
              defaultValue={searchTerm}
              placeholder="Search by name or email..." 
              className="pl-10 bg-slate-50 dark:bg-slate-800 border-none h-11"
            />
            {gradeFilter && <input type="hidden" name="grade" value={gradeFilter} />}
          </form>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          {[9, 10, 11, 12].map((g) => (
            <Button 
              key={g}
              variant={gradeFilter === g ? "default" : "outline"}
              size="sm"
              asChild
              className="px-4"
            >
              <Link href={`/dashboard/directory?grade=${g}${searchTerm ? `&q=${searchTerm}` : ""}`}>
                Grade {g}
              </Link>
            </Button>
          ))}
          {gradeFilter && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/directory">Clear</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {students.map((student: any) => (
          <Link 
            key={student.id} 
            href={`/dashboard/directory/${student.id}`}
            className="group block bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-lg hover:border-indigo-400 dark:hover:border-indigo-600 transition-all transform hover:-translate-y-1"
          >
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                <UserIcon className="h-7 w-7 text-indigo-600 dark:text-indigo-400 group-hover:text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg truncate text-foreground">{student.user.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <GraduationCap className="h-3 w-3" /> Grade {student.gradeLevel}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{student.id.substring(0, 8)}</span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
            </div>
          </Link>
        ))}

        {students.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed rounded-2xl border-slate-200 dark:border-slate-800">
            <Search className="h-12 w-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-400">No students found</h3>
            <p className="text-muted-foreground">Try adjusting your search terms or grade filter.</p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-sm text-slate-400 font-medium">
            Page <span className="text-slate-900 dark:text-white font-bold">{currentPage}</span> of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              asChild={currentPage > 1}
            >
              {currentPage > 1 ? (
                <Link href={`/dashboard/directory?page=${currentPage - 1}${searchTerm ? `&q=${searchTerm}` : ""}${gradeFilter ? `&grade=${gradeFilter}` : ""}`}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Link>
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              asChild={currentPage < totalPages}
            >
              {currentPage < totalPages ? (
                <Link href={`/dashboard/directory?page=${currentPage + 1}${searchTerm ? `&q=${searchTerm}` : ""}${gradeFilter ? `&grade=${gradeFilter}` : ""}`}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              ) : (
                <>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
