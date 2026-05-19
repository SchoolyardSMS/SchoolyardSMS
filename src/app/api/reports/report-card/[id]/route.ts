import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { getActiveReportCardTemplate } from "@/app/actions/reports"

function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.startsWith('#') ? hex : `#${hex}`
  const r = parseInt(cleanHex.slice(1, 3), 16)
  const g = parseInt(cleanHex.slice(3, 5), 16)
  const b = parseInt(cleanHex.slice(5, 7), 16)
  return [r, g, b] as [number, number, number]
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const { id: studentId } = await params
  const termId = req.nextUrl.searchParams.get("termId")

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

  // Fetch the active template
  const activeTemplate = await getActiveReportCardTemplate()
  const layout = activeTemplate.layout as any
  const sections = layout.sections || []

  // Fetch the report card snapshot
  const reportCards = await db.reportCard.findMany({
    where: {
      studentId,
      ...(termId ? { termId } : {}),
      isPublished: true
    },
    include: { term: true },
    orderBy: { publishedAt: "desc" },
    take: 1
  })

  if (reportCards.length === 0) {
    return new NextResponse("Report card not published for this term.", { status: 404 })
  }

  const reportCard = reportCards[0]
  const snapshot: any = reportCard.snapshot
  const termName = reportCard.term.name

  // Prepare PDF
  const doc = new jsPDF()
  let currentY = 20

  const schoolSettings = await db.schoolSettings.findUnique({ where: { id: "singleton" } })
  const schoolName = schoolSettings?.name || "Schoolyard Academy"

  for (const section of sections) {
    if (section.type === "HEADER") {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(28)
      doc.setTextColor(15, 23, 42)
      doc.text((section.config.title || "REPORT CARD").toUpperCase(), 105, currentY + 10, { align: "center", charSpace: 1 })
      currentY += 18
      
      const subtitle = section.config.subtitle === "Schoolyard Academy" ? schoolName : (section.config.subtitle || schoolName)
      
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(71, 85, 105)
      doc.text(subtitle.toUpperCase(), 105, currentY, { align: "center", charSpace: 0.5 })
      currentY += 8
      
      doc.setDrawColor(15, 23, 42)
      doc.setLineWidth(1.5)
      doc.line(20, currentY, 190, currentY)
      currentY += 12
    }

    if (section.type === "STUDENT_INFO") {
      doc.setFontSize(8)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(148, 163, 184)
      
      doc.text("STUDENT", 20, currentY)
      doc.text("GRADE", 110, currentY)
      
      doc.setFontSize(11)
      doc.setTextColor(15, 23, 42)
      doc.text(snapshot.student.name || "Unknown", 60, currentY)
      doc.text(snapshot.student.gradeLevel.toString(), 150, currentY)
      
      currentY += 6
      doc.setDrawColor(241, 245, 249)
      doc.setLineWidth(0.5)
      doc.line(20, currentY, 190, currentY)
      currentY += 8
      
      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184)
      doc.text("ID", 20, currentY)
      doc.text("TERM", 110, currentY)
      
      doc.setFontSize(11)
      doc.setTextColor(15, 23, 42)
      doc.text(`STD-${snapshot.student.id.substring(0, 8).toUpperCase()}`, 60, currentY)
      doc.text(termName.toUpperCase(), 150, currentY)
      
      currentY += 6
      doc.setDrawColor(15, 23, 42)
      doc.setLineWidth(0.7)
      doc.line(20, currentY, 190, currentY)
      currentY += 15
    }

    if (section.type === "GRADES_TABLE") {
      const visibleCols = section.config.columns || ["Subject", "Grade"]
      const reportData = snapshot.grades.map((g: any) => {
        const row: string[] = []
        visibleCols.forEach((col: string) => {
          if (col === "Subject") row.push(g.courseName)
          if (col === "Instructor") row.push(g.teacherName)
          if (col === "Term") row.push(termName)
          if (col === "Percentage") row.push(`${g.score.toFixed(0)}%`)
          if (col === "Grade") row.push(g.letterGrade)
          if (col === "Comments") row.push(g.comments || "")
        })
        return row
      })

      const headerColor = section.config.headerColorHex 
        ? hexToRgb(section.config.headerColorHex) 
        : ([15, 23, 42] as [number, number, number])

      autoTable(doc, {
        startY: currentY,
        head: [visibleCols.map((c: string) => c.toUpperCase())],
        body: reportData,
        theme: "plain",
        headStyles: { 
          fillColor: headerColor, 
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 9,
          halign: "left"
        },
        bodyStyles: { 
          fontSize: 10,
          textColor: [15, 23, 42],
          cellPadding: 5
        },
        columnStyles: {
          1: { halign: "center", fontStyle: "bold" },
          2: { halign: "center", fontStyle: "bold" }
        }
      })
      
      currentY = (doc as any).lastAutoTable.finalY + 15
    }

    if (section.type === "ATTENDANCE_SUMMARY") {
      doc.setFillColor(248, 250, 252)
      doc.rect(20, currentY, 170, 25, "F")
      doc.setDrawColor(226, 232, 240)
      doc.rect(20, currentY, 170, 25, "S")
      
      currentY += 10
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(15, 23, 42)
      doc.text(snapshot.attendance.absent.toString(), 45, currentY, { align: "center" })
      doc.text(snapshot.attendance.tardy.toString(), 105, currentY, { align: "center" })
      doc.text(`${snapshot.attendance.presence}%`, 165, currentY, { align: "center" })
      
      currentY += 6
      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184)
      doc.text("ABSENCES", 45, currentY, { align: "center" })
      doc.text("TARDIES", 105, currentY, { align: "center" })
      doc.text("PRESENCE", 165, currentY, { align: "center" })
      
      currentY += 20
    }

    if (section.type === "GPA_SUMMARY") {
      doc.setDrawColor(15, 23, 42)
      doc.setLineWidth(2)
      doc.line(120, currentY, 190, currentY)
      currentY += 8
      
      doc.setFontSize(9)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(148, 163, 184)
      doc.text((section.config.label || "TERM GPA").toUpperCase(), 190, currentY, { align: "right" })
      
      currentY += 10
      doc.setFontSize(28)
      doc.setTextColor(15, 23, 42)
      doc.setFont("helvetica", "bold")
      doc.text(snapshot.totalGPA.toFixed(2), 190, currentY, { align: "right" })
      
      currentY += 15
    }

    if (section.type === "CUSTOM_TEXT") {
      doc.setFontSize(8)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(148, 163, 184)
      doc.text((section.config.title || "Additional Information").toUpperCase(), 20, currentY)
      currentY += 6
      
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(71, 85, 105)
      const lines = doc.splitTextToSize(section.config.content || "", 170)
      doc.text(lines, 20, currentY)
      currentY += (lines.length * 5) + 12
    }

    if (section.type === "DETAILED_ATTENDANCE") {
      // Skipped in snapshot for simplicity, could be added to snapshot if needed
    }

    if (section.type === "SIGNATURE_BLOCKS") {
      currentY += 15
      const roles = ["principal", "teacher", "advisor"]
      let xPos = 20
      roles.forEach(role => {
        if (section.config[role]) {
          doc.setDrawColor(15, 23, 42)
          doc.setLineWidth(0.5)
          doc.line(xPos, currentY, xPos + 50, currentY)
          doc.setFontSize(8)
          doc.setFont("helvetica", "bold")
          doc.text((role + " SIGNATURE").toUpperCase(), xPos, currentY + 5)
          xPos += 60
        }
      })
      currentY += 20
    }

    if (section.type === "FOOTER") {
      doc.setFont("helvetica", "italic")
      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184)
      doc.text(section.config.text || "Official Enrollment Record", 105, 285, { align: "center" })
    }
  }

  const pdfOutput = doc.output("arraybuffer")

  return new NextResponse(pdfOutput, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ReportCard_${snapshot.student.name.replace(/\s+/g, "_")}_${termName.replace(/\s+/g, "_")}.pdf"`,
    },
  })
}
