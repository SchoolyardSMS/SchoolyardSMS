import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const { id: studentId } = await params
  const isStaff = session.user?.role === "ADMIN" || session.user?.role === "TEACHER"

  if (!isStaff) {
    const studentProfile = await db.student.findUnique({ 
      where: { userId: session.user?.id } 
    })
    
    if (studentProfile && studentProfile.id === studentId) {
      // Access granted
    } else {
      const parentProfile = await db.parent.findUnique({
        where: { userId: session.user?.id },
        include: { children: true }
      })
      const isParentOfStudent = parentProfile?.children.some(c => c.studentId === studentId)
      if (!isParentOfStudent) {
        return new NextResponse("Unauthorized", { status: 403 })
      }
    }
  }

  // Fetch Student data
  const student = await db.student.findUnique({
    where: { id: studentId },
    include: {
      user: true,
      reportCards: {
        where: { isPublished: true },
        include: { term: { include: { schoolYear: true } } },
        orderBy: [{ term: { schoolYear: { startDate: "asc" } } }, { term: { startDate: "asc" } }]
      }
    }
  })

  if (!student) return new NextResponse("Student not found", { status: 404 })

  const schoolSettings = await (db as any).schoolSettings.findUnique({ where: { id: "singleton" } })
  const schoolName = schoolSettings?.name || "Schoolyard Academy"

  // Calculate Cumulative GPA
  let totalGPA = 0
  let totalTerms = 0
  let totalCredits = 0

  student.reportCards.forEach((rc: any) => {
    const snapshot = rc.snapshot
    if (snapshot && snapshot.totalGPA) {
      totalGPA += snapshot.totalGPA
      totalTerms++
    }
    if (snapshot && snapshot.grades) {
       totalCredits += snapshot.grades.length // Assumes 1 credit per course
    }
  })

  const cumulativeGPA = totalTerms > 0 ? (totalGPA / totalTerms).toFixed(2) : "0.00"

  // Prepare PDF
  const doc = new jsPDF()
  let currentY = 20

  // ─── Header ───
  doc.setFont("helvetica", "bold")
  doc.setFontSize(24)
  doc.setTextColor(15, 23, 42)
  doc.text("OFFICIAL TRANSCRIPT", 105, currentY, { align: "center", charSpace: 1 })
  
  currentY += 8
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(71, 85, 105)
  doc.text(schoolName.toUpperCase(), 105, currentY, { align: "center", charSpace: 0.5 })
  
  currentY += 6
  doc.setDrawColor(15, 23, 42)
  doc.setLineWidth(1)
  doc.line(20, currentY, 190, currentY)
  currentY += 8

  // ─── Student Info ───
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(15, 23, 42)
  
  doc.text(`Student Name:`, 20, currentY)
  doc.setFont("helvetica", "normal")
  doc.text(student.user.name, 50, currentY)

  doc.setFont("helvetica", "bold")
  doc.text(`Student ID:`, 120, currentY)
  doc.setFont("helvetica", "normal")
  doc.text(`STD-${student.id.substring(0, 8).toUpperCase()}`, 145, currentY)

  currentY += 6
  const { formatDate, formatInET } = await import("@/lib/dates")

  doc.setFont("helvetica", "bold")
  doc.text(`Date of Birth:`, 20, currentY)
  doc.setFont("helvetica", "normal")
  doc.text(student.dateOfBirth ? formatDate(student.dateOfBirth) : "N/A", 50, currentY)

  doc.setFont("helvetica", "bold")
  doc.text(`Print Date:`, 120, currentY)
  doc.setFont("helvetica", "normal")
  doc.text(formatInET(new Date(), { month: "short", day: "numeric", year: "numeric" }), 145, currentY)

  currentY += 10

  // ─── Academic Record (Terms) ───
  if (student.reportCards.length === 0) {
    doc.setFont("helvetica", "italic")
    doc.text("No academic records found.", 20, currentY)
  } else {
    for (const rc of student.reportCards as any[]) {
      const snapshot = rc.snapshot
      if (!snapshot || !snapshot.grades || snapshot.grades.length === 0) continue

      // Term Header
      doc.setFillColor(241, 245, 249)
      doc.rect(20, currentY, 170, 8, "F")
      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.setTextColor(15, 23, 42)
      doc.text(`${rc.term.schoolYear.name} - ${rc.term.name.toUpperCase()}`, 22, currentY + 5.5)
      
      const termGpaText = `TERM GPA: ${snapshot.totalGPA ? snapshot.totalGPA.toFixed(2) : "N/A"}`
      doc.text(termGpaText, 188, currentY + 5.5, { align: "right" })

      currentY += 10

      // Grades Table
      const tableData = snapshot.grades.map((g: any) => [
        g.courseName,
        "1.00", // Default Credit
        g.letterGrade || "—"
      ])

      autoTable(doc, {
        startY: currentY,
        head: [["COURSE TITLE", "CREDIT", "GRADE"]],
        body: tableData,
        theme: "plain",
        headStyles: { 
          fillColor: [255, 255, 255], 
          textColor: [100, 116, 139],
          fontStyle: "bold",
          fontSize: 8,
          cellPadding: 2,
          lineWidth: { bottom: 0.5 },
          lineColor: [226, 232, 240]
        },
        bodyStyles: { 
          fontSize: 8,
          textColor: [15, 23, 42],
          cellPadding: 2
        },
        columnStyles: {
          1: { halign: "center" },
          2: { halign: "center", fontStyle: "bold" }
        },
        margin: { left: 20, right: 20 }
      })

      currentY = (doc as any).lastAutoTable.finalY + 8
    }
  }

  // ─── Summary Section ───
  currentY += 5
  doc.setDrawColor(15, 23, 42)
  doc.setLineWidth(0.5)
  doc.line(20, currentY, 190, currentY)
  
  currentY += 8
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42)
  
  doc.text(`TOTAL CREDITS EARNED:`, 20, currentY)
  doc.text(totalCredits.toFixed(2), 70, currentY)
  
  doc.text(`CUMULATIVE GPA:`, 120, currentY)
  doc.setFontSize(12)
  doc.text(cumulativeGPA, 160, currentY)

  // ─── Footer ───
  doc.setFontSize(8)
  doc.setFont("helvetica", "italic")
  doc.setTextColor(148, 163, 184)
  doc.text("This document is an official academic transcript generated by the Student Information System.", 105, 285, { align: "center" })

  const pdfOutput = doc.output("arraybuffer")

  return new NextResponse(pdfOutput, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Transcript_${student.user.name.replace(/\s+/g, "_")}.pdf"`,
    },
  })
}
