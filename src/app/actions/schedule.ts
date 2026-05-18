"use server"

import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

// ── Create / update a bell period ─────────────────────────────────────────────
export async function upsertBellPeriod(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "ADMIN") throw new Error("Unauthorized")

  const id           = formData.get("id") as string | null
  const name         = (formData.get("name") as string)?.trim()
  const startTime    = formData.get("startTime") as string
  const endTime      = formData.get("endTime") as string
  const periodNumber = parseInt(formData.get("periodNumber") as string, 10)
  const schoolYear   = (formData.get("schoolYear") as string)?.trim()
  const rawDays      = formData.getAll("days") as string[]

  if (!name || !startTime || !endTime || !schoolYear) throw new Error("All fields are required")

  if (id) {
    await db.bellPeriod.update({
      where: { id },
      data: { name, startTime, endTime, periodNumber, schoolYear, days: rawDays }
    })
  } else {
    await db.bellPeriod.create({
      data: { name, startTime, endTime, periodNumber, schoolYear, days: rawDays }
    })
  }

  revalidatePath("/dashboard/schedule/manage")
  redirect("/dashboard/schedule/manage")
}

// ── Delete a bell period ──────────────────────────────────────────────────────
export async function deleteBellPeriod(id: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "ADMIN") throw new Error("Unauthorized")

  await db.bellPeriod.delete({ where: { id } })
  revalidatePath("/dashboard/schedule/manage")
}
