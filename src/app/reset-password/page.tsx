"use client"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { resetPassword } from "@/app/actions/auth-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import Link from "next/link"
import { Suspense } from "react"

function ResetPasswordForm() {
  const [isLoading, setIsLoading] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  const token = searchParams.get("token")
  const email = searchParams.get("email")

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    formData.append("token", token || "")
    formData.append("email", email || "")

    const result = await resetPassword(formData)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Password reset successfully! You can now log in.")
      router.push("/login")
    }
    setIsLoading(false)
  }

  if (!token || !email) {
    return (
      <div className="text-center space-y-4">
        <p className="text-red-500 font-medium">Invalid or missing reset link parameters.</p>
        <Button asChild variant="outline">
          <Link href="/forgot-password">Request new link</Link>
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
        <Input
          value={email}
          disabled
          className="bg-slate-100 dark:bg-slate-800 border-none"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">New Password</label>
        <Input
          name="password"
          type="password"
          required
          placeholder="••••••••"
          className="bg-slate-50 dark:bg-slate-800 border-none px-4 py-6"
          disabled={isLoading}
        />
      </div>
      <Button 
         className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-6 rounded-lg transition-all shadow-lg mt-4" 
         type="submit" 
         disabled={isLoading}
      >
        {isLoading ? "Resetting..." : "Update Password"}
      </Button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Schoolyard<span className="text-indigo-600 dark:text-indigo-400">SMS</span>
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Set Your New Password
          </p>
        </div>

        <Card className="border-none shadow-xl bg-white dark:bg-slate-900">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
            <CardDescription>
              Please enter your new secure password below to regain access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="h-48 flex items-center justify-center animate-pulse text-muted-foreground">Validating session...</div>}>
              <ResetPasswordForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
