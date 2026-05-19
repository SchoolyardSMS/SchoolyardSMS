"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { bulkUploadUsers } from "@/app/actions/user"
import { toast } from "sonner"
import { Upload, Download, Loader2 } from "lucide-react"

export function BulkUploadDialog() {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setIsUploading(true)
    try {
      const text = await file.text()
      const res = await bulkUploadUsers(text)
      if ("error" in res && res.error) {
        toast.error(res.error)
      } else {
        toast.success(res.message || "Bulk upload scheduled in the background.")
        setFile(null)
        setTimeout(() => setOpen(false), 2000)
      }
    } catch (err) {
      toast.error("Failed to process CSV file")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" /> Bulk Upload
        </Button>
      } />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk User Upload</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/50">
            <div className="space-y-1">
              <p className="text-sm font-bold text-indigo-900 dark:text-indigo-100">Step 1: Download Template</p>
              <p className="text-xs text-indigo-700 dark:text-indigo-300">Start with our formatted CSV structure.</p>
            </div>
            <Button size="sm" variant="ghost" asChild className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100">
              <a href="/api/admin/users/template" download>
                <Download className="h-4 w-4 mr-2" /> Download
              </a>
            </Button>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-bold">Step 2: Upload your CSV</p>
            <div className="grid w-full items-center gap-1.5">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleUpload} disabled={!file || isUploading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scheduling...
              </>
            ) : "Start Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
