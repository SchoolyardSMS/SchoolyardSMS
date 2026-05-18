import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface DashboardPageHeaderProps {
  title: string
  description?: string
  icon?: LucideIcon
  children?: React.ReactNode
  className?: string
}

export function DashboardPageHeader({ 
  title, 
  description, 
  icon: Icon, 
  children,
  className
}: DashboardPageHeaderProps) {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8", className)}>
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              <Icon className="w-6 h-6 md:w-8 md:h-8" />
            </div>
          )}
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h1>
        </div>
        {description && (
          <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base">
            {description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {children}
      </div>
    </div>
  )
}
