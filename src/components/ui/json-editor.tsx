"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { CheckCircle2, XCircle, WrapText, ChevronDown } from "lucide-react"

interface JsonEditorProps {
  name: string
  defaultValue?: string
  rows?: number
  label?: string
  description?: string
}

export function JsonEditor({ name, defaultValue = "", rows = 8, label, description }: JsonEditorProps) {
  const [value, setValue] = useState(() => {
    if (!defaultValue?.trim()) return defaultValue
    try {
      return JSON.stringify(JSON.parse(defaultValue), null, 2)
    } catch {
      return defaultValue
    }
  })
  const [isValid, setIsValid] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const validate = useCallback((v: string) => {
    if (!v.trim()) {
      setIsValid(true)
      setError(null)
      return
    }
    try {
      JSON.parse(v)
      setIsValid(true)
      setError(null)
    } catch (e: any) {
      setIsValid(false)
      setError(e.message)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    validate(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault()
      const ta = textareaRef.current!
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const spaces = "  " // 2-space indent
      const newValue = value.substring(0, start) + spaces + value.substring(end)
      setValue(newValue)
      // Restore cursor after state update
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + spaces.length
      })
    }
    // Shift+Enter = newline (already default), Ctrl/Cmd+Enter = format
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault()
      handleFormat()
    }
  }

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(value)
      const formatted = JSON.stringify(parsed, null, 2)
      setValue(formatted)
      setIsValid(true)
      setError(null)
    } catch {
      // Already invalid — do nothing
    }
  }

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex justify-between items-center">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFormat}
              title="Format JSON (Ctrl+Enter)"
              className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-2 py-1 rounded transition-colors"
            >
              <WrapText className="w-3 h-3" />
              Format
            </button>
            {value.trim() && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${
                isValid 
                  ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30" 
                  : "text-red-600 bg-red-50 dark:bg-red-900/30"
              }`}>
                {isValid ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                {isValid ? "Valid JSON" : "Invalid"}
              </span>
            )}
          </div>
        </div>
      )}
      {description && (
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{description}</p>
      )}
      <div className="relative">
        {/* Line numbers */}
        <div
          aria-hidden="true"
          className="absolute left-0 top-0 bottom-0 w-9 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-l-md select-none overflow-hidden pointer-events-none"
          style={{ fontFamily: "var(--font-geist-mono, monospace)", fontSize: "11px", lineHeight: "20px", paddingTop: "8px" }}
        >
          {value.split("\n").map((_, i) => (
            <div key={i} className="text-right pr-2 text-slate-400 dark:text-slate-600">
              {i + 1}
            </div>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          name={name}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={rows}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          className={`flex w-full rounded-md border pl-11 pr-3 py-2 text-[11px] leading-5 font-mono outline-none focus:ring-2 resize-y bg-white dark:bg-slate-900 transition-colors ${
            !isValid && value.trim()
              ? "border-red-300 dark:border-red-800 focus:ring-red-400"
              : "border-slate-200 dark:border-slate-800 focus:ring-indigo-500"
          }`}
          style={{ fontFamily: "var(--font-geist-mono, monospace)" }}
        />
      </div>
      {!isValid && error && (
        <p className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium">
          <XCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}
      <p className="text-[10px] text-slate-400">
        Tab to indent · Ctrl+Enter to format
      </p>
    </div>
  )
}
