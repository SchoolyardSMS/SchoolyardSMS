import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { completeRegistration } from "@/app/actions/user"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface RegisterPageProps {
  searchParams: Promise<{ token?: string; email?: string }>
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { token, email } = await searchParams

  if (!token || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full border-none shadow-2xl rounded-3xl overflow-hidden">
          <div className="bg-indigo-600 h-2 w-full" />
          <CardHeader className="text-center pt-10">
            <CardTitle className="text-2xl font-black uppercase text-slate-800">Invalid Link</CardTitle>
            <CardDescription className="pt-2">This invitation link is missing required information. Please contact your administrator.</CardDescription>
          </CardHeader>
          <CardContent className="pb-10 text-center">
            <Button asChild variant="outline" className="rounded-full">
              <a href="/login">Back to Login</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Verify token
  const invite = await db.userToken.findUnique({
    where: { email_token: { email, token } }
  })

  if (!invite || invite.expires < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full border-none shadow-2xl rounded-3xl overflow-hidden">
          <div className="bg-rose-500 h-2 w-full" />
          <CardHeader className="text-center pt-10">
            <CardTitle className="text-2xl font-black uppercase text-slate-800">Link Expired</CardTitle>
            <CardDescription className="pt-2">This invitation has expired or is no longer valid. Invitations expire after 7 days.</CardDescription>
          </CardHeader>
          <CardContent className="pb-10 text-center">
            <Button asChild variant="outline" className="rounded-full">
              <a href="/login">Back to Login</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden transition-colors">
      {/* Decorative Elements (Theme-aware) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-indigo-100 dark:bg-indigo-900/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 dark:opacity-30 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-blue-100 dark:bg-blue-900/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 dark:opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-slate-100 dark:bg-slate-800/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 dark:opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <Card className="max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl overflow-hidden relative z-10 transition-colors">
        <div className="bg-indigo-600 h-1.5 w-full" />
        <CardHeader className="pt-10 pb-6 text-center">
          <CardTitle className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Join the school</CardTitle>
          <div className="mt-2 inline-block px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 border border-indigo-100 dark:border-indigo-800">
             <CardDescription className="text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider text-[10px]">Onboarding: {invite.role}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pb-10 px-8">
          <form action={completeRegistration} className="space-y-4">
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="email" value={email} />

            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs font-medium text-slate-600 dark:text-slate-400">Confirm Your Name</Label>
              <Input 
                id="name" 
                name="name" 
                placeholder="Full Name" 
                required 
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800" 
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="email-display" className="text-xs font-medium text-slate-600 dark:text-slate-400">Email Address</Label>
              <Input 
                id="email-display" 
                value={email} 
                disabled 
                className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-900 cursor-not-allowed opacity-80" 
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password" className="text-xs font-medium text-slate-600 dark:text-slate-400">Set Password</Label>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                required 
                autoComplete="new-password" 
                placeholder="••••••••"
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="pt-4">
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-11">
                Complete Account Setup
              </Button>
            </div>
            <p className="text-center text-[10px] text-slate-400 dark:text-slate-600 font-medium">
              By joining, you agree to our school's code of conduct.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
