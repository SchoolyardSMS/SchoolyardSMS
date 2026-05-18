"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { DayType } from "@prisma/client"

export async function generateCalendar(year: number, month: number) {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "ADMIN") {
    throw new Error("Unauthorized")
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  const dates = []
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(Date.UTC(year, month, i, 12, 0, 0)) // Noon to avoid timezone shifts
    dates.push(date)
  }

  // Create entries only if they don't exist
  for (const date of dates) {
    const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6
    const dayType = isWeekend ? "OTHER" : "INSTRUCTIONAL"
    
    await db.calendarDay.upsert({
      where: { date },
      update: {},
      create: {
        date,
        type: dayType,
        name: isWeekend ? "Weekend" : null
      }
    })
  }

  revalidatePath("/dashboard/admin/calendar")
  return { success: true }
}

export async function declareSnowDay(dateStr: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "ADMIN") {
    throw new Error("Unauthorized")
  }

  const snowDate = new Date(dateStr)

  // 1. Mark the day as SNOW_DAY
  const targetDay = await db.calendarDay.findUnique({ where: { date: snowDate } })
  if (!targetDay) throw new Error("Date not found in calendar")

  await db.calendarDay.update({
    where: { date: snowDate },
    data: {
      type: "SNOW_DAY",
      name: "Snow Day",
      blockDay: "NONE"
    }
  })

  if (targetDay.blockDay === "NONE") {
    // If it wasn't an instructional block day anyway, no need to shift
    revalidatePath("/dashboard/admin/calendar")
    return { success: true }
  }

  // 2. Shift all subsequent block days forward
  const futureDays = await db.calendarDay.findMany({
    where: {
      date: { gt: snowDate },
      type: { in: ["INSTRUCTIONAL"] } // Only shift instructional days
    },
    orderBy: { date: "asc" }
  })

  // We have a sequence of block days that need to be shifted right by one index
  // The first future day gets the block day that was originally on the snow day
  let nextBlockDayToAssign: any = targetDay.blockDay

  for (const day of futureDays) {
    const currentBlockDayOfThisDay = day.blockDay
    
    await db.calendarDay.update({
      where: { id: day.id },
      data: { blockDay: nextBlockDayToAssign }
    })

    nextBlockDayToAssign = currentBlockDayOfThisDay
  }

  // The last block day simply falls off the edge of the calendar (dropped)
  
  revalidatePath("/dashboard/admin/calendar")
  return { success: true }
}

export async function updateCalendarDay(dateStr: string, updates: { type?: DayType, hasCommunityPeriod?: boolean, name?: string | null, blockDay?: any, isMidterm?: boolean, isFinal?: boolean }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "ADMIN") {
    throw new Error("Unauthorized")
  }

  const date = new Date(dateStr)
  
  await db.calendarDay.upsert({
    where: { date },
    update: updates,
    create: {
      date,
      type: updates.type || "INSTRUCTIONAL",
      hasCommunityPeriod: updates.hasCommunityPeriod || false,
      name: updates.name || null,
      blockDay: updates.blockDay || "NONE",
      isMidterm: updates.isMidterm || false,
      isFinal: updates.isFinal || false
    }
  })

  revalidatePath("/dashboard/admin/calendar")
  return { success: true }
}

export async function getCalendarDays(start: Date, end: Date) {
  return await db.calendarDay.findMany({
    where: {
      date: {
        gte: start,
        lte: end
      }
    },
    orderBy: {
      date: "asc"
    }
  })
}
