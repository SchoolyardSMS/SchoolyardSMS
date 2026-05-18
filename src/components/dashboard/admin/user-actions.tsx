"use client"

import { useState } from "react"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { editUser, deleteUser } from "@/app/actions/user"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

export function UserActions({ user }: { user: any }) {
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [role, setRole] = useState(user.role)
  const [isDeleting, setIsDeleting] = useState(false)

  const gradeLevel = user.studentProfile?.[0]?.gradeLevel?.toString() || "9"
  const [selectedGrade, setSelectedGrade] = useState(gradeLevel)

  async function handleEdit(formData: FormData) {
    try {
      await editUser(user.id, formData)
      toast.success("User updated successfully")
      setShowEdit(false)
    } catch (error: any) {
      toast.error(error.message || "Failed to update user")
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await deleteUser(user.id)
      toast.success("User deleted successfully")
      setShowDelete(false)
    } catch (error: any) {
      toast.error(error.message || "Failed to delete user")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        {/* @ts-expect-error type inference collision with Shadcn Base UI */}
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setShowEdit(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowDelete(true)} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
          </DialogHeader>
          <form action={handleEdit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" name="email" type="email" defaultValue={user.email} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" name="name" defaultValue={user.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select name="role" value={role} onValueChange={(v) => setRole(v || "STUDENT")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT">Student</SelectItem>
                  <SelectItem value="TEACHER">Teacher</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {role === "STUDENT" && (
              <div className="space-y-2">
                <Label htmlFor="gradeLevel">Grade Level</Label>
                <Select name="gradeLevel" value={selectedGrade} onValueChange={(val) => setSelectedGrade(val || "9")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(13)].map((_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {i === 0 ? "Kindergarten" : `Grade ${i}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <strong>{user.name}</strong>? This action cannot be undone and will permanently remove their profile, enrollments, and related data.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowDelete(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
