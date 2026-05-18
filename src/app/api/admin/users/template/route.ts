import { NextResponse } from "next/server"

export async function GET() {
  const headers = "name,email,role,gradeLevel(optional),studentId(optional)\n"
  const examples = "John Doe,john@example.com,STUDENT,9,\nJane Smith,jane@example.com,TEACHER,,\n"
  
  const csv = headers + examples
  
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="schoolyard_user_template.csv"',
    },
  })
}
