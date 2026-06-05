"use client"

import { signOut } from "next-auth/react"
import { useState } from "react"
import Link from "next/link"

interface UserMenuProps {
  name: string
  email: string
  role: string
}

const roleColors: Record<string, string> = {
  ADMIN:   "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  TEACHER: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  STUDENT: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  PARENT:  "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
}

export function UserMenu({ name, email, role }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label="User profile menu"
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-sidebar-accent transition-colors text-left"
      >
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold">
          {initials}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className="text-sm font-semibold text-sidebar-foreground truncate">{name}</p>
          <span className={`inline-block mt-0.5 px-1.5 py-0 text-[10px] font-bold rounded uppercase tracking-wide ${roleColors[role] ?? roleColors.PARENT}`}>
            {role}
          </span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 text-sidebar-foreground/50 flex-shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 right-0 mb-1 z-20 rounded-lg border border-sidebar-border bg-sidebar shadow-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-sidebar-border">
              <p className="text-xs text-sidebar-foreground/60 truncate">{email}</p>
            </div>
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
              My Profile
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
              </svg>
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
