"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Calendar, ClipboardCheck, MessageSquare, User, CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"

const bottomNavItems = [
  {
    label: "Home",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Calendar",
    href: "/dashboard/calendar",
    icon: Calendar,
  },
  {
    label: "Schedule",
    href: "/dashboard/schedule",
    icon: CalendarDays,
  },
  {
    label: "Attendance",
    href: "/dashboard/attendance",
    icon: ClipboardCheck,
  },
  {
    label: "Messages",
    href: "/dashboard/messages",
    icon: MessageSquare,
  },
  {
    label: "Profile",
    href: "/profile",
    icon: User,
  },
]

export function BottomNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_12px_rgba(0,0,0,0.05)] no-print">
      <div className="flex items-center justify-around h-16 px-2">
        {bottomNavItems.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-full h-full transition-all duration-200 active:scale-90",
                active 
                  ? "text-indigo-600 dark:text-indigo-400" 
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              <div className={cn(
                "p-1 rounded-xl transition-colors",
                active ? "bg-indigo-50 dark:bg-indigo-900/20" : ""
              )}>
                <Icon className="w-6 h-6" strokeWidth={active ? 2.5 : 2} />
              </div>
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-wider transition-all",
                active ? "opacity-100 translate-y-0" : "opacity-70"
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
