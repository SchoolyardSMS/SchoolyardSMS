"use client"

import { useState } from "react"
import { MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react"
import { deleteCourse } from "@/app/actions/academics"
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

export function CourseActions({ course }: { course: any }) {
  const [showDelete, setShowDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await deleteCourse(course.id)
      toast.success("Course deleted successfully")
      setShowDelete(false)
    } catch (error: any) {
      toast.error(error.message || "Failed to delete course")
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
          <DropdownMenuItem onClick={() => router.push(`/dashboard/academics/courses/${course.id}`)}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push(`/dashboard/academics/courses/${course.id}/edit`)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Course
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowDelete(true)} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Course
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Course</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <strong>{course.code} - {course.name}</strong>? This action cannot be undone and will permanently remove all sections, assignments, and enrollments associated with this course.
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
