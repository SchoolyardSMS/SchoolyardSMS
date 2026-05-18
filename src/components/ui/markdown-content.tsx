"use client"

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from "@/lib/utils"

interface MarkdownContentProps {
  content: string
  className?: string
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  if (!content) return null

  return (
    <div className={cn(
      "prose prose-slate dark:prose-invert max-w-none prose-sm sm:prose-base",
      "prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg",
      "prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline",
      "prose-strong:text-slate-900 dark:prose-strong:text-slate-100",
      "prose-code:text-indigo-600 dark:prose-code:text-indigo-400 prose-code:bg-indigo-50 dark:prose-code:bg-indigo-900/30 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none",
      className
    )}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
