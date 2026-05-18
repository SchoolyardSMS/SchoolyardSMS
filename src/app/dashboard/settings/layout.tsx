import { ReactNode } from "react"
import Link from "next/link"
import { Palette, ToggleLeft, GraduationCap, ShieldAlert } from "lucide-react"

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const navItems = [
    { name: "Branding & Identity", href: "/dashboard/settings/branding", icon: Palette },
    { name: "Features & Modules", href: "/dashboard/settings/features", icon: ToggleLeft },
    { name: "Academic Standards", href: "/dashboard/settings/academics", icon: GraduationCap },
    { name: "Behavior & Rules", href: "/dashboard/settings/behavior", icon: ShieldAlert },
  ]

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)] p-8 max-w-7xl mx-auto gap-8">
      {/* Settings Sidebar */}
      <div className="w-full md:w-64 shrink-0 space-y-1">
        <h2 className="text-xl font-bold tracking-tight mb-4 px-3">School Settings</h2>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <item.icon className="w-4 h-4" />
            {item.name}
          </Link>
        ))}
      </div>

      {/* Main Settings Content */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 min-h-[600px]">
        {children}
      </div>
    </div>
  )
}
