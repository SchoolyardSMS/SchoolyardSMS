"use client"

import { useState } from "react"
import { MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react"
import { deleteAssignment } from "@/app/actions/academics"
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
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface AssignmentActionsProps {
  assignment: { id: string; title: string }
  sectionId: string
  isStaff: boolean
}

export function AssignmentActions({ assignment, sectionId, isStaff }: AssignmentActionsProps) {
  const [showDelete, setShowDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await deleteAssignment(assignment.id)
      toast.success("Assignment deleted successfully")
      setShowDelete(false)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete assignment"
      toast.error(message)
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
          <DropdownMenuItem onClick={() => router.push(`/dashboard/academics/sections/${sectionId}/assignments/${assignment.id}`)}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          {isStaff && (
            <>
              <DropdownMenuItem onClick={() => router.push(`/dashboard/academics/sections/${sectionId}/assignments/${assignment.id}/edit`)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Assignment
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowDelete(true)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Assignment
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {isStaff && (
        <Dialog open={showDelete} onOpenChange={setShowDelete}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Assignment</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete <strong>{assignment.title}</strong>? This action will permanently remove all student submissions and grades associated with this assignment.
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
      )}
    </>
  )
}
