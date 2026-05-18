import { Metadata } from "next"
import { Suspense } from "react"
import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = {
  title: "Login | School Management System",
  description: "Login to the School Management System portal.",
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Schoolyard<span className="text-indigo-600 dark:text-indigo-400">SMS</span>
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            The modern standard in education management.
          </p>
        </div>
        <Suspense fallback={<div className="h-64 flex items-center justify-center text-muted-foreground animate-pulse">Loading secure gateway...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
