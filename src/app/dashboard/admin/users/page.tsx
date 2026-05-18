import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { formatInET } from "@/lib/dates"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { InviteUserForm } from "@/components/dashboard/admin/invite-user-form"
import { UserActions } from "@/components/dashboard/admin/user-actions"
import { BulkUploadDialog } from "@/components/dashboard/admin/users/bulk-upload-dialog"
import { getUsers } from "@/app/actions/user"
import { 
  ChevronLeft, 
  ChevronRight 
} from "lucide-react"

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== 'ADMIN') redirect("/login")

  const currentPage = parseInt((await searchParams).page || "1", 10)
  const { users, totalPages } = await getUsers(currentPage)

  // Fetch all students for the parent invite dropdown
  const allStudents = await db.student.findMany({
    include: { user: true },
    orderBy: { user: { name: "asc" } }
  })

  return (
    <div className="flex-1 space-y-8 p-8 pt-6 bg-transparent">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100 uppercase">User Management</h2>
          <p className="text-sm text-slate-400 font-medium">Manage school members and issue invitations</p>
        </div>
        <BulkUploadDialog />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Invite Form */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl sticky top-8">
            <h3 className="text-lg font-bold mb-4">Invite New Member</h3>
            <InviteUserForm students={allStudents as any} />
          </div>
        </div>

        {/* User List */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden flex flex-col h-full">
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                    <TableHead className="font-bold py-4">User</TableHead>
                    <TableHead className="font-bold py-4 hidden md:table-cell">Role</TableHead>
                    <TableHead className="font-bold py-4 hidden sm:table-cell">Joined</TableHead>
                    <TableHead className="text-center font-bold py-4 hidden md:table-cell">Status</TableHead>
                    <TableHead className="text-right font-bold py-4 pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <TableCell className="py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700 dark:text-slate-200">{user.name}</span>
                          <span className="text-xs text-slate-400">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 hidden md:table-cell">
                        <Badge variant="secondary" className="rounded-full font-bold uppercase tracking-tighter text-[10px]">
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 text-slate-400 text-xs hidden sm:table-cell">
                        {formatInET(user.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-center py-4 hidden md:table-cell">
                        {user.hashedPassword ? (
                          <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-50 border-none rounded-full">Active</Badge>
                        ) : (
                          <Badge className="bg-amber-50 text-amber-600 hover:bg-amber-50 border-none rounded-full">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-4 pr-6">
                        <UserActions user={user} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 mt-auto">
                <p className="text-xs text-slate-400 font-medium italic">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={currentPage <= 1}
                    className="h-8 w-8 p-0 rounded-full"
                    asChild={currentPage > 1}
                  >
                    {currentPage > 1 ? (
                      <a href={`/dashboard/admin/users?page=${currentPage - 1}`}>
                        <ChevronLeft className="h-4 w-4" />
                      </a>
                    ) : (
                      <ChevronLeft className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    className="h-8 w-8 p-0 rounded-full"
                    asChild={currentPage < totalPages}
                  >
                    {currentPage < totalPages ? (
                      <a href={`/dashboard/admin/users?page=${currentPage + 1}`}>
                        <ChevronRight className="h-4 w-4" />
                      </a>
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
