import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { getActiveReportCardTemplate } from "@/app/actions/reports"
import { calculateGrade, calculateGPA, getLetterGrade } from "@/lib/grading"

function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.startsWith('#') ? hex : `#${hex}`
  const r = parseInt(cleanHex.slice(1, 3), 16)
  const g = parseInt(cleanHex.slice(3, 5), 16)
  const b = parseInt(cleanHex.slice(5, 7), 16)
  return [r, g, b] as [number, number, number]
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  // Fetch the active template
  const activeTemplate = await getActiveReportCardTemplate()
  const layout = activeTemplate.layout as any
  const sections = layout.sections || []

  // Fetch all students with their enrollments and grades
  const students = await (db.student as any).findMany({
    include: {
      user: true,
      enrollments: {
        where: { status: "ENROLLED" },
        include: {
          section: {
            include: {
              course: true,
              term: { include: { schoolYear: true } },
              teacher: { include: { user: true } },
              assignments: { where: { status: "PUBLISHED" } }
            }
          }
        }
      }
    }
  })

  // Fetch all grades and attendance
  const allGrades = await db.grade.findMany()
  const allAttendance = await db.attendance.findMany()

  const doc = new jsPDF()

  // Fetch School Settings once for branding and grading config
  const schoolSettings = await db.schoolSettings.findUnique({ where: { id: "singleton" } })
  const schoolName = schoolSettings?.name || "Schoolyard Academy"
  const gradingScale = schoolSettings?.gradingScale
  const gpaScale = schoolSettings?.gpaScale ?? 4.0

  for (let i = 0; i < students.length; i++) {
    const student = students[i]
    if (i > 0) doc.addPage()

    let currentY = 20
    const studentGrades = allGrades.filter((g: any) => g.studentId === student.id)
    const studentAttendance = allAttendance.filter((a: any) => a.studentId === student.id)

    // Render each template section
    for (const section of sections) {
      if (section.type === "HEADER") {
        // Premium Header Style
        doc.setFont("helvetica", "bold")
        doc.setFontSize(28)
        doc.setTextColor(15, 23, 42) // slate-900
        doc.text((section.config.title || "REPORT CARD").toUpperCase(), 105, currentY + 10, { align: "center", charSpace: 1 })
        currentY += 18
        
        const subtitle = section.config.subtitle === "Schoolyard Academy" ? schoolName : (section.config.subtitle || schoolName)
        
        doc.setFontSize(10)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(71, 85, 105) // slate-500
        doc.text(subtitle.toUpperCase(), 105, currentY, { align: "center", charSpace: 0.5 })
        currentY += 8
        
        // Double Border
        doc.setDrawColor(15, 23, 42) // slate-900
        doc.setLineWidth(1.5)
        doc.line(20, currentY, 190, currentY)
        currentY += 12

        // Logo Support (Upper Right)
        if (section.config.showLogo && schoolSettings?.logoUrl) {
           try {
           } catch (e) {
             console.error("Logo failed to load", e)
           }
        }
      }

      if (section.type === "STUDENT_INFO") {
        // Premium 2-Column Student Info
        doc.setFontSize(8)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(148, 163, 184) // slate-400
        
        // Row 1
        doc.text("STUDENT", 20, currentY)
        doc.text("GRADE", 110, currentY)
        
        doc.setFontSize(11)
        doc.setTextColor(15, 23, 42) // slate-900
        
        doc.text(student.user?.name || "Unknown", 60, currentY)
        doc.text(student.gradeLevel.toString(), 150, currentY)
        
        currentY += 6
        doc.setDrawColor(241, 245, 249) // slate-100
        doc.setLineWidth(0.5)
        doc.line(20, currentY, 190, currentY)
        currentY += 8
        
        // Row 2
        doc.setFontSize(8)
        doc.setTextColor(148, 163, 184)
        doc.text("ID", 20, currentY)
        doc.text("TERM", 110, currentY)
        
        doc.setFontSize(11)
        doc.setTextColor(15, 23, 42)
        doc.text(`STD-${student.id.substring(0, 8).toUpperCase()}`, 60, currentY)
        doc.text(schoolSettings?.activeTerm || "ACADEMIC YEAR", 150, currentY)
        
        currentY += 6
        doc.setDrawColor(15, 23, 42) // slate-900 thin line at bottom of block
        doc.setLineWidth(0.7)
        doc.line(20, currentY, 190, currentY)
        currentY += 15
      }

      if (section.type === "GRADES_TABLE") {
        const visibleCols = section.config.columns || ["Subject", "Grade"]
        const reportData = student.enrollments.map((enrollment: any) => {
          const sec = enrollment.section
          const sectionGrades = studentGrades.filter((g: any) => 
            sec.assignments.some((a: any) => a.id === g.assignmentId)
          )

          const pct = sectionGrades.length > 0 ? calculateGrade(sec, sec.assignments, sectionGrades) : 0
          
          // Dynamic Column Mapping
          const row: string[] = []
          visibleCols.forEach((col: string) => {
            if (col === "Subject") row.push(sec.course.name)
            if (col === "Instructor") row.push(sec.teacher.user.name)
            if (col === "Term") row.push(sec.term?.name || sec.legacyTerm || "N/A")
            if (col === "Percentage") row.push(`${pct.toFixed(0)}%`)
            if (col === "Grade") row.push(getLetterGrade(pct, gradingScale))
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
          theme: "plain", // Clean professional look
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

      if (section.type === "GPA_SUMMARY") {
        const enrollmentsWithGrades = student.enrollments.map((e: any) => {
          const sec = e.section
          const sectionGrades = studentGrades.filter((g: any) => sec.assignments.some((a: any) => a.id === g.assignmentId))
          return sectionGrades.length > 0 ? calculateGrade(sec, sec.assignments, sectionGrades) : 0
        })

        const avgPct = enrollmentsWithGrades.length > 0 ? (enrollmentsWithGrades.reduce((a: any, b: any) => a + b, 0) / enrollmentsWithGrades.length) : 0
        const finalGPA = calculateGPA(avgPct, gpaScale, gradingScale)

        doc.setDrawColor(15, 23, 42)
        doc.setLineWidth(2)
        doc.line(120, currentY, 190, currentY)
        currentY += 8
        
        doc.setFontSize(9)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(148, 163, 184)
        doc.text((section.config.label || "CUMULATIVE GPA").toUpperCase(), 190, currentY, { align: "right" })
        
        currentY += 10
        doc.setFontSize(28)
        doc.setTextColor(15, 23, 42)
        doc.setFont("helvetica", "bold")
        doc.text(`${finalGPA.toFixed(2)}`, 190, currentY, { align: "right" })
        
        currentY += 15
      }

      if (section.type === "ATTENDANCE_SUMMARY") {
        const totalDays = studentAttendance.length
        const absent = studentAttendance.filter((a: any) => a.status === "ABSENT").length
        const tardy = studentAttendance.filter((a: any) => a.status === "TARDY").length
        const presence = totalDays > 0 ? ((totalDays - absent) / totalDays * 100).toFixed(0) : "100"

        // Attendance Card Look
        doc.setFillColor(248, 250, 252) // slate-50
        doc.rect(20, currentY, 170, 25, "F")
        doc.setDrawColor(226, 232, 240) // slate-200
        doc.rect(20, currentY, 170, 25, "S")
        
        currentY += 10
        doc.setFontSize(16)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(15, 23, 42)
        doc.text(absent.toString(), 45, currentY, { align: "center" })
        doc.text(tardy.toString(), 105, currentY, { align: "center" })
        doc.text(`${presence}%`, 165, currentY, { align: "center" })
        
        currentY += 6
        doc.setFontSize(8)
        doc.setTextColor(148, 163, 184)
        doc.text("ABSENCES", 45, currentY, { align: "center" })
        doc.text("TARDIES", 105, currentY, { align: "center" })
        doc.text("PRESENCE", 165, currentY, { align: "center" })
        
        currentY += 20
      }

      if (section.type === "CUSTOM_TEXT") {
        doc.setFontSize(8)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(148, 163, 184)
        doc.text((section.config.title || "Additional Information").toUpperCase(), 20, currentY)
        currentY += 6
        
        doc.setFontSize(10)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(71, 85, 105) // slate-600
        const lines = doc.splitTextToSize(section.config.content || "", 170)
        doc.text(lines, 20, currentY)
        currentY += (lines.length * 5) + 12
      }

      if (section.type === "DETAILED_ATTENDANCE") {
        const attendance = studentAttendance
          .filter((a: any) => a.status !== "PRESENT")
          .sort((a: any, b: any) => b.date.getTime() - a.date.getTime())
          .slice(0, 5)

        doc.setFontSize(8)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(148, 163, 184)
        doc.text((section.config.title || "ATTENDANCE HISTORY").toUpperCase(), 20, currentY)
        currentY += 6
        
        doc.setFontSize(9)
        doc.setTextColor(71, 85, 105)
        attendance.forEach((a: any) => {
          doc.text(a.date.toLocaleDateString("en-US", { timeZone: "UTC" }), 20, currentY)
          doc.setFont("helvetica", "bold")
          doc.text(a.status, 60, currentY)
          doc.setFont("helvetica", "normal")
          currentY += 5
        })
        currentY += 10
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
  }

  const pdfOutput = doc.output("arraybuffer")

  return new NextResponse(pdfOutput, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Full_School_Report_Cards_${new Date().toISOString().split('T')[0]}.pdf"`,
    },
  })
}
