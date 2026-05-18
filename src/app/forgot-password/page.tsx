"use client"

import { useState } from "react"
import { forgotPassword } from "@/app/actions/auth-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string

    const result = await forgotPassword(email)

    if (result.error) {
      toast.error(result.error)
    } else {
      setIsSubmitted(true)
      toast.success("Reset link sent if account exists.")
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Schoolyard<span className="text-indigo-600 dark:text-indigo-400">SMS</span>
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Secure Password Recovery
          </p>
        </div>

        <Card className="border-none shadow-xl bg-white dark:bg-slate-900">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Forgot Password?</CardTitle>
            <CardDescription>
              Enter your email address and we'll send you a recovery link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isSubmitted ? (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    id="email"
                    name="email"
                    placeholder="name@school.edu"
                    type="email"
                    required
                    className="bg-slate-50 dark:bg-slate-800 border-none px-4 py-6"
                    disabled={isLoading}
                  />
                </div>
                <Button 
                   className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-6 rounded-lg transition-all shadow-lg" 
                   type="submit" 
                   disabled={isLoading}
                >
                  {isLoading ? "Sending Link..." : "Send Reset Link"}
                </Button>
                <div className="text-center">
                  <Link 
                    href="/login" 
                    className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Back to Login
                  </Link>
                </div>
              </form>
            ) : (
              <div className="text-center space-y-4 py-4">
                <div className="h-12 w-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  Check your inbox! If an account is associated with that email, you will receive a reset link shortly.
                </p>
                <Button asChild variant="outline" className="w-full py-6">
                  <Link href="/login">Return to Login</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
