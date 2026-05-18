import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== "ADMIN" && session.user?.role !== "TEACHER")) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  // Fetch all attendance records with student and section details
  const attendance = await db.attendance.findMany({
    include: {
      student: { include: { user: true } },
      section: { include: { course: true } }
    },
    orderBy: { date: "desc" }
  })

  // Create CSV content
  const headers = ["Date", "Student Name", "Course", "Term", "Status"]
  const rows = attendance.map(a => [
    new Date(a.date).toLocaleDateString("en-US", { timeZone: "UTC" }),
    a.student.user.name,
    a.section.course.name,
    a.section.legacyTerm,
    a.status
  ])

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n")

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="Attendance_Report_${new Date().toISOString().split("T")[0]}.csv"`,
    },
  })
}
