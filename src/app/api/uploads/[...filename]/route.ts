import { NextRequest, NextResponse } from "next/server"
import { join } from "path"
import { readFile } from "fs/promises"
import { existsSync } from "fs"

export async function GET(request: NextRequest, { params }: { params: Promise<{ filename: string[] }> }) {
  const resolvedParams = await params
  const filename = resolvedParams.filename.join('/')
  
  if (!filename) {
    return new NextResponse("File not found", { status: 404 })
  }

  // Prevent directory traversal attacks
  if (filename.includes("..") || filename.includes("/")) {
    return new NextResponse("Invalid file path", { status: 400 })
  }

  const filePath = join(process.cwd(), "public/uploads", filename)

  if (!existsSync(filePath)) {
    return new NextResponse("File not found", { status: 404 })
  }

  try {
    // react-doctor-disable-next-line react-doctor/server-hoist-static-io
    const fileBuffer = await readFile(filePath)
    
    // Determine content type based on extension
    const ext = filename.split('.').pop()?.toLowerCase()
    let contentType = "application/octet-stream"
    
    if (ext === "pdf") contentType = "application/pdf"
    else if (ext === "png") contentType = "image/png"
    else if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg"
    else if (ext === "txt") contentType = "text/plain"
    else if (ext === "docx") contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Error serving file:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
