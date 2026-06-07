"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { uploadBrandingFile } from "@/app/actions/upload"
import { Upload, X, Check, Loader2 } from "lucide-react"

interface BrandingUploadsProps {
  initialLogo?: string
  initialFavicon?: string
}

export function BrandingUploads({ initialLogo, initialFavicon }: BrandingUploadsProps) {
  const [logoUrl, setLogoUrl] = useState(initialLogo || "")
  const [faviconUrl, setFaviconUrl] = useState(initialFavicon || "")
  const [isUploading, setIsUploading] = useState<string | null>(null)

  async function handleUpload(type: "logo" | "favicon", e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(type)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const result = await uploadBrandingFile(formData)
      if (result.success && result.url) {
        if (type === "logo") setLogoUrl(result.url)
        else setFaviconUrl(result.url)
      }
    } catch (err) {
      console.error(err)
      alert("Upload failed")
    } finally {
      setIsUploading(null)
    }
  }

  return (
    <div className="space-y-6">
      <input type="hidden" name="logoUrl" value={logoUrl} />
      <input type="hidden" name="faviconUrl" value={faviconUrl} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Logo Upload */}
        <div className="space-y-3">
          <label htmlFor="logo-upload" className="text-sm font-medium">School Logo</label>
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center bg-slate-50 dark:bg-slate-900 overflow-hidden relative group">
              {logoUrl ? (
                <>
                  {/* react-doctor-disable-next-line react-doctor/nextjs-no-img-element */}
                  <img src={logoUrl} alt="Logo" className="h-full w-full object-contain p-2" />
                  <button 
                    type="button"
                    onClick={() => setLogoUrl("")}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                </>
              ) : isUploading === "logo" ? (
                <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
              ) : (
                <Upload className="h-5 w-5 text-slate-300" />
              )}
            </div>
            <div className="space-y-1">
              <input 
                type="file" 
                id="logo-upload" 
                className="hidden" 
                accept="image/*"
                onChange={(e) => handleUpload("logo", e)}
                aria-label="School Logo"
              />
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => document.getElementById("logo-upload")?.click()}
                disabled={!!isUploading}
              >
                {logoUrl ? "Change Logo" : "Upload Logo"}
              </Button>
              <p className="text-[10px] text-muted-foreground italic">SVG, PNG or JPG (Max 2MB)</p>
            </div>
          </div>
        </div>

        {/* Favicon Upload */}
        <div className="space-y-3">
          <label htmlFor="favicon-upload" className="text-sm font-medium">Favicon</label>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center bg-slate-50 dark:bg-slate-900 overflow-hidden relative group">
              {faviconUrl ? (
                <>
                  {/* react-doctor-disable-next-line react-doctor/nextjs-no-img-element */}
                  <img src={faviconUrl} alt="Favicon" className="h-full w-full object-contain p-1" />
                  <button 
                    type="button"
                    onClick={() => setFaviconUrl("")}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </>
              ) : isUploading === "favicon" ? (
                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
              ) : (
                <Upload className="h-4 w-4 text-slate-300" />
              )}
            </div>
            <div className="space-y-1">
              <input 
                type="file" 
                id="favicon-upload" 
                className="hidden" 
                accept="image/x-icon,image/png"
                onChange={(e) => handleUpload("favicon", e)}
                aria-label="Favicon"
              />
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => document.getElementById("favicon-upload")?.click()}
                disabled={!!isUploading}
              >
                {faviconUrl ? "Change Icon" : "Upload Icon"}
              </Button>
              <p className="text-[10px] text-muted-foreground italic">ICO or PNG (Max 512KB)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
