import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

const CSV_HEADERS = ["ID", "Date", "Student", "Category", "Severity", "Status", "Title", "Action Taken"]

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user?.role !== "ADMIN" && session.user?.role !== "TEACHER")) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  // Fetch all incidents
  const incidents = await db.incident.findMany({
    include: {
      student: { include: { user: true } }
    },
    orderBy: { date: "desc" }
  })

  // Create CSV content
  const rows = incidents.map(i => [
    i.id.substring(0, 8).toUpperCase(),
    new Date(i.date).toLocaleDateString("en-US", { timeZone: "UTC" }),
    i.student.user.name,
    i.category,
    i.severity,
    i.status,
    i.title,
    i.actionTaken ?? "N/A"
  ])

  const csvContent = [CSV_HEADERS, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n")

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="Discipline_Log_Report_${new Date().toISOString().split("T")[0]}.csv"`,
    },
  })
}
