"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MarkdownEditor } from "@/components/ui/markdown-editor"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Plus, 
  FileText, 
  Link as LinkIcon, 
  Trash2, 
  MoreVertical, 
  ExternalLink,
  BookOpen,
  FolderOpen
} from "lucide-react"
import { createTopic, deleteTopic, addMaterial, deleteMaterial } from "@/app/actions/topics"
import { uploadMaterialFile } from "@/app/actions/upload"
import { toast } from "sonner"
import { MarkdownContent } from "@/components/ui/markdown-content"

interface TopicsClientProps {
  sectionId: string
  isStaff: boolean
  initialTopics: any[]
}

export function TopicsClient({ sectionId, isStaff, initialTopics }: TopicsClientProps) {
  const [isAddingTopic, setIsAddingTopic] = useState(false)
  const [addingMaterialTo, setAddingMaterialTo] = useState<string | null>(null)
  
  // Topic Form State
  const [topicTitle, setTopicTitle] = useState("")
  const [topicDesc, setTopicDesc] = useState("")
  
  // Material Form State
  const [matTitle, setMatTitle] = useState("")
  const [matUrl, setMatUrl] = useState("")
  const [matType, setMatType] = useState<"LINK" | "FILE">("LINK")
  const fileRef = useRef<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleCreateTopic = async () => {
    if (!topicTitle.trim()) return
    try {
      await createTopic(sectionId, topicTitle, topicDesc)
      setIsAddingTopic(false)
      setTopicTitle("")
      setTopicDesc("")
      toast.success("Topic created successfully")
    } catch (err) {
      toast.error("Failed to create topic")
    }
  }

  const handleAddMaterial = async () => {
    if (!matTitle.trim() || !addingMaterialTo) return
    if (matType === "LINK" && !matUrl.trim()) return
    if (matType === "FILE" && !fileRef.current && !matUrl.trim()) return

    setIsUploading(true)
    try {
      let finalUrl = matUrl
      if (matType === "FILE" && fileRef.current) {
        const formData = new FormData()
        formData.append("file", fileRef.current)
        const res = await uploadMaterialFile(formData)
        finalUrl = res.url
      }

      await addMaterial(addingMaterialTo, sectionId, matTitle, matType, finalUrl)
      setAddingMaterialTo(null)
      setMatTitle("")
      setMatUrl("")
      fileRef.current = null
      toast.success("Material added")
    } catch (err) {
      toast.error("Failed to add material")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-indigo-500" /> Course Materials & Topics
        </h3>
        {isStaff && (
          <Dialog open={isAddingTopic} onOpenChange={setIsAddingTopic}>
            <DialogTrigger render={
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full">
                <Plus className="h-4 w-4 mr-2" /> Add Topic
              </Button>
            } />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Topic</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="new-topic-title" className="text-sm font-medium">Topic Title</label>
                  <Input id="new-topic-title" value={topicTitle} onChange={(e) => setTopicTitle(e.target.value)} placeholder="e.g. Unit 1: Introduction to Algebra" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="new-topic-description" className="text-sm font-medium">Description (Optional)</label>
                    <span className="text-[10px] text-muted-foreground font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">Markdown Editor</span>
                  </div>
                  <MarkdownEditor 
                    id="new-topic-description"
                    name="topicDesc" 
                    value={topicDesc} 
                    onChange={setTopicDesc} 
                    placeholder="Briefly describe what this topic covers..." 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddingTopic(false)}>Cancel</Button>
                <Button onClick={handleCreateTopic}>Create Topic</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {initialTopics.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-20 text-center bg-slate-50/50 dark:bg-slate-900/20">
          <FolderOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No topics or materials have been shared yet.</p>
          {isStaff && <p className="text-xs text-slate-400 mt-1">Start by creating your first topic above.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {initialTopics.map((topic) => (
            <div key={topic.id} className="rounded-2xl border bg-card dark:bg-slate-900/40 shadow-sm overflow-hidden group hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all">
              <div className="p-6 border-b bg-slate-50/50 dark:bg-slate-800/30 flex items-start justify-between">
                <div className="space-y-1">
                  <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">{topic.title}</h4>
                  {topic.description && <MarkdownContent content={topic.description} className="text-sm text-muted-foreground prose-sm" />}
                </div>
                {isStaff && (
                  <DropdownMenu>
                    <DropdownMenuTrigger render={
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    } />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setAddingMaterialTo(topic.id)} className="cursor-pointer">
                        <Plus className="h-4 w-4 mr-2" /> Add Material
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={async () => {
                          if (confirm("Delete this topic and all its materials?")) {
                            await deleteTopic(topic.id, sectionId)
                            toast.success("Topic deleted")
                          }
                        }}
                        className="text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete Topic
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              
              <div className="p-2">
                {topic.materials.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic p-4">No materials in this topic yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {topic.materials.map((mat: any) => (
                      <div key={mat.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors group/mat">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${mat.type === "FILE" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30" : "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30"}`}>
                            {mat.type === "FILE" ? <FileText className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
                          </div>
                          <div>
                            <a 
                              href={mat.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm font-semibold hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
                            >
                              {mat.title} <ExternalLink className="h-3 w-3 opacity-0 group-hover/mat:opacity-100 transition-opacity" />
                            </a>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">{mat.type}</p>
                          </div>
                        </div>
                        {isStaff && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-slate-300 hover:text-rose-600 opacity-0 group-hover/mat:opacity-100 transition-opacity"
                            onClick={async () => {
                              await deleteMaterial(mat.id, sectionId)
                              toast.success("Material removed")
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Material Dialog */}
      <Dialog open={!!addingMaterialTo} onOpenChange={(open) => !open && setAddingMaterialTo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Material to Topic</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="new-material-title" className="text-sm font-medium">Title</label>
              <Input id="new-material-title" value={matTitle} onChange={(e) => setMatTitle(e.target.value)} placeholder="e.g. Syllabus PDF or Chapter 1 Slides" />
            </div>
            <div className="space-y-2">
              <label htmlFor="new-material-type" className="text-sm font-medium">Type</label>
              <select 
                id="new-material-type"
                value={matType} 
                onChange={(e) => setMatType(e.target.value as any)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="LINK">External Link / URL</option>
                <option value="FILE">Uploaded File URL</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="material-source" className="text-sm font-medium">{matType === "FILE" ? "Upload File" : "URL"}</label>
              {matType === "FILE" ? (
                <div className="space-y-2">
                  <input 
                    id="material-source"
                    type="file" 
                    onChange={(e) => fileRef.current = e.target.files?.[0] || null}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  {matUrl && <p className="text-[10px] text-muted-foreground">Current URL: {matUrl}</p>}
                </div>
              ) : (
                <Input id="material-source" value={matUrl} onChange={(e) => setMatUrl(e.target.value)} placeholder="https://..." />
              )}
              <p className="text-[10px] text-muted-foreground">
                {matType === "FILE" 
                  ? "Select a file from your computer to share with students." 
                  : "Paste a link to a website, video, or external document."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingMaterialTo(null)}>Cancel</Button>
            <Button onClick={handleAddMaterial} disabled={isUploading}>
              {isUploading ? "Uploading..." : "Add Material"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
