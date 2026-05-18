"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from 'tiptap-markdown'
import { useEffect, useState } from 'react'
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2, 
  Quote, 
  Code,
  Undo,
  Redo
} from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface MarkdownEditorProps {
  name: string
  defaultValue?: string
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  rows?: number
}

const Toolbar = ({ editor }: { editor: any }) => {
  if (!editor) return null

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-slate-50 dark:bg-slate-900/50">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8", editor.isActive('bold') && "bg-slate-200 dark:bg-slate-800")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8", editor.isActive('italic') && "bg-slate-200 dark:bg-slate-800")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8", editor.isActive('heading', { level: 1 }) && "bg-slate-200 dark:bg-slate-800")}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8", editor.isActive('heading', { level: 2 }) && "bg-slate-200 dark:bg-slate-800")}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8", editor.isActive('bulletList') && "bg-slate-200 dark:bg-slate-800")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8", editor.isActive('orderedList') && "bg-slate-200 dark:bg-slate-800")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8", editor.isActive('blockquote') && "bg-slate-200 dark:bg-slate-800")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8", editor.isActive('codeBlock') && "bg-slate-200 dark:bg-slate-800")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <Code className="h-4 w-4" />
      </Button>
      <div className="flex-1" />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      >
        <Undo className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      >
        <Redo className="h-4 w-4" />
      </Button>
    </div>
  )
}

export function MarkdownEditor({ name, defaultValue = "", value, onChange, placeholder, className, rows = 5 }: MarkdownEditorProps) {
  const [content, setContent] = useState(defaultValue)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: placeholder || 'Start writing...',
      }),
      Markdown.configure({
        html: false,
        tightLists: true,
      }),
    ],
    content: value !== undefined ? value : defaultValue,
    onUpdate: ({ editor }) => {
      const markdown = (editor.storage as any).markdown.getMarkdown()
      setContent(markdown)
      if (onChange) onChange(markdown)
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-slate dark:prose-invert max-w-none focus:outline-none p-4 min-h-[150px] text-sm sm:text-base",
          "prose-headings:font-bold prose-headings:mt-4 prose-headings:mb-2",
          "prose-p:my-2 prose-ul:my-2 prose-ol:my-2",
          className
        ),
      },
    },
  })

  // Sync value if it's controlled
  useEffect(() => {
    if (editor && value !== undefined && value !== (editor.storage as any).markdown.getMarkdown()) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  // Sync initial defaultValue if it changes and not controlled
  useEffect(() => {
    if (editor && value === undefined && defaultValue !== (editor.storage as any).markdown.getMarkdown()) {
      editor.commands.setContent(defaultValue)
    }
  }, [defaultValue, editor, value])

  return (
    <div className="rounded-md border border-input bg-background overflow-hidden ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={content} />
      <style jsx global>{`
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </div>
  )
}
