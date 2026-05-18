import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { unstable_noStore as noStore } from "next/cache"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { FileUploader } from "./file-uploader"
import { updateAssignmentGrade } from "@/app/actions/academics"
import { CheckCircle, Clock, Lock, FileText } from "lucide-react"

import { StaffAssignmentView } from "./staff-assignment-view"
import { StudentAssignmentView } from "./student-assignment-view"

export const metadata = { title: "Assignment | Schoolyard" }

const typeConfig: Record<string, { label: string; color: string }> = {
  HOMEWORK: { label: "Homework", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  QUIZ:     { label: "Quiz",     color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  TEST:     { label: "Test",     color: "bg-red-500/10 text-red-600 border-red-500/20" },
  PROJECT:  { label: "Project",  color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  LAB:      { label: "Lab",      color: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20" },
  OTHER:    { label: "Other",    color: "bg-muted text-muted-foreground border-border" },
}

export default async function AssignmentPage({
  params,
}: {
  params: Promise<{ id: string; assignmentId: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const { id, assignmentId } = await params
  noStore()
  const isStaff = session.user?.role === "TEACHER" || session.user?.role === "ADMIN"

  const assignment = (await db.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      section: { include: { course: true, teacher: { include: { user: true } } } },
      documents: {
        include: { uploader: true, student: { include: { user: true } } },
        orderBy: { createdAt: "desc" },
      },
      grades: {
        include: { student: { include: { user: true } } },
      },
      submissions: true,
    } as any,
  })) as any

  if (!assignment || assignment.sectionId !== id) return notFound()

  if (!isStaff) {
    const isVisible = assignment.status === "PUBLISHED" && 
                     (!assignment.publishDate || new Date(assignment.publishDate) <= new Date())
    if (!isVisible) return notFound()
  }

  // For gradebook: fetch all enrolled students so we can show ungraded rows
  const enrollments = isStaff
    ? await db.enrollment.findMany({
        where: { sectionId: id, status: "ENROLLED" },
        include: { student: { include: { user: true } } },
        orderBy: { student: { user: { name: "asc" } } },
      })
    : []

  // Student's own submission info
  const myStudentProfile = !isStaff
    ? await db.student.findUnique({ where: { userId: session.user?.id } })
    : null

  const myDocuments = myStudentProfile
    ? assignment.documents.filter((d: any) => d.uploaderId === session.user?.id)
    : []

  const gradeMap = new Map(assignment.grades.map((g: any) => [g.studentId, g]))
  const grade = myStudentProfile ? gradeMap.get(myStudentProfile.id) : null
  const submissionRecord = myStudentProfile ? assignment.submissions.find((s: any) => s.studentId === myStudentProfile.id) : null
  const isSubmitted = !!submissionRecord

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-5xl mx-auto">
      {/* Back */}
      <Button variant="outline" size="sm" asChild>
        <Link href={`/dashboard/academics/sections/${id}?tab=assignments`}>← Back to Assignments</Link>
      </Button>

      {isStaff ? (
        <StaffAssignmentView 
          assignment={assignment} 
          enrollments={enrollments} 
          typeConfig={typeConfig} 
        />
      ) : (
        <StudentAssignmentView 
          assignment={assignment}
          myStudentProfile={myStudentProfile}
          myDocuments={myDocuments}
          grade={grade}
          isSubmitted={isSubmitted}
          submissionRecord={submissionRecord}
          typeConfig={typeConfig}
        />
      )}
    </div>
  )
}

