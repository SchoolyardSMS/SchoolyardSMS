"use client"

import { useState } from "react"
import { UserProfileForm } from "@/components/auth/user-profile-form"
import { Button } from "@/components/ui/button"
import { 
  User as UserIcon, 
  Mail, 
  ShieldCheck, 
  GraduationCap, 
  Briefcase, 
  Calendar, 
  Edit3, 
  X,
  ArrowLeft,
  Download
} from "lucide-react"
import Link from "next/link"

interface ProfileViewProps {
  user: any
  student?: any
  teacher?: any
  parent?: any
}

export function ProfileView({ user, student, teacher, parent }: ProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="rounded-full">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
          </Link>
        </Button>
        <Button 
          variant={isEditing ? "outline" : "default"} 
          size="sm" 
          onClick={() => setIsEditing(!isEditing)}
          className="rounded-full"
        >
          {isEditing ? (
            <><X className="h-4 w-4 mr-2" /> Cancel Edit</>
          ) : (
            <><Edit3 className="h-4 w-4 mr-2" /> Edit Profile</>
          )}
        </Button>
      </div>

      {isEditing ? (
        <div className="max-w-2xl mx-auto">
           <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
             <h3 className="text-xl font-bold mb-6">Edit Your Information</h3>
             <UserProfileForm
                initialData={{
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  role: user.role
                }}
              />
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Identity Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="h-32 bg-indigo-600 dark:bg-indigo-900" />
              <div className="px-6 pb-6">
                <div className="relative -mt-12 mb-4">
                  <div className="h-24 w-24 rounded-2xl bg-white dark:bg-slate-900 p-1 shadow-lg">
                    <div className="h-full w-full rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <UserIcon className="h-12 w-12 text-slate-400" />
                    </div>
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-foreground">{user.name}</h2>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground uppercase font-bold tracking-widest text-[10px]">
                   {user.role === "STUDENT" && <><GraduationCap className="h-4 w-4" /> Grade {student?.gradeLevel} Student</>}
                   {user.role === "TEACHER" && <><Briefcase className="h-4 w-4" /> Faculty Member</>}
                   {user.role === "ADMIN" && <><ShieldCheck className="h-4 w-4" /> System Administrator</>}
                   {user.role === "PARENT" && <><UserIcon className="h-4 w-4" /> Parent / Guardian</>}
                </div>
                
                <div className="mt-6 space-y-3">
                   <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                      <Mail className="h-4 w-4 text-indigo-500" />
                      <span>{user.email}</span>
                   </div>
                   <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                      <ShieldCheck className="h-4 w-4 text-indigo-500" />
                      <span className="font-mono text-[10px] uppercase font-bold tracking-widest">{user.id}</span>
                   </div>
                </div>

                {user.role === "STUDENT" && student && (
                  <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-md rounded-xl">
                      <a href={`/api/reports/report-card/${student.id}`} download>
                        <Download className="h-4 w-4 mr-2" /> Download Report Card
                      </a>
                    </Button>
                    <p className="text-[10px] text-center text-muted-foreground mt-3 italic">
                      Official PDF generated from latest grades.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Details Area */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-500" /> Account Summary
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-1">
                   <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Joined</p>
                   <p className="font-medium">{new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
                 </div>
                 
                 {user.role === "STUDENT" && student && (
                   <div className="space-y-1">
                     <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Date of Birth</p>
                     <p className="font-medium">{new Date(student.dateOfBirth).toLocaleDateString("en-US", { timeZone: "UTC" })}</p>
                   </div>
                 )}

                 {user.role === "TEACHER" && teacher && (
                   <div className="space-y-1">
                     <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Department</p>
                     <p className="font-medium">{teacher.department || "General Faculty"}</p>
                   </div>
                 )}

                 <div className="space-y-1">
                   <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Status</p>
                   <p className="font-medium inline-flex items-center gap-1 text-emerald-600">
                     Active Account <div className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                   </p>
                 </div>
              </div>
            </div>

            {user.role === "PARENT" && parent && (
               <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-indigo-500" /> Linked Children
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {parent.children?.map((c: any) => (
                       <Link 
                        key={c.studentId} 
                        href={`/dashboard/directory/${c.studentId}`}
                        className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-indigo-200"
                       >
                          <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold">
                             {c.student.user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{c.student.user.name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Grade {c.student.gradeLevel}</p>
                          </div>
                       </Link>
                     ))}
                  </div>
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
