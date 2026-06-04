"use client"

import { useState } from "react"
import { uploadAssignmentSubmission } from "@/app/actions/upload"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function FileUploader({ assignmentId }: { assignmentId: string }) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleUpload = async () => {
    if (!file) return
    setIsUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("assignmentId", assignmentId)

    try {
      await uploadAssignmentSubmission(formData)
      toast.success("File submitted successfully!")
      setFile(null)
    } catch (e) {
      toast.error("Upload failed.")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <input 
        type="file" 
        aria-label="Choose submission file"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-slate-900 dark:text-white"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        disabled={isUploading}
      />
      <Button onClick={handleUpload} disabled={!file || isUploading} className="w-full">
        {isUploading ? "Uploading..." : "Submit File"}
      </Button>
    </div>
  )
}
