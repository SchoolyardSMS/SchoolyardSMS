import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { RegistrarClient } from "./registrar-client"

export const metadata = { title: "Edit Demographics | Schoolyard" }

export default async function EditDemographicsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard")

  const { id } = await params

  const student = await db.student.findUnique({
    where: { id },
    include: {
      user: true,
      parents: { include: { parent: { include: { user: true } } } }
    }
  })

  if (!student) return notFound()

  // Fetch all parent profiles to allow linking
  const availableParents = await db.parent.findMany({
    include: { user: true },
    orderBy: { user: { name: "asc" } }
  })

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <Link href={`/dashboard/directory/${id}`} className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-widest">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Profile
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Registrar Editing</h1>
        <p className="text-slate-500">
          Student: <span className="font-bold">{student.user.name}</span> (ID: {student.id})
        </p>
      </div>

      <RegistrarClient student={student} availableParents={availableParents} />
    </div>
  )
}
