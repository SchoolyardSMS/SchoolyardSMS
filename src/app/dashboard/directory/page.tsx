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
import { StudentDirectoryList } from "./directory-list"

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

      <StudentDirectoryList 
        students={students} 
        isAdmin={session.user.role === "ADMIN"} 
      />

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
