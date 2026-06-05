"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { DayType } from "@prisma/client"
import { assertRole } from "@/lib/rbac"

export async function generateCalendar(year: number, month: number) {
  const session = await getServerSession(authOptions)
  assertRole(session, ["ADMIN"])

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  const dates = []
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(Date.UTC(year, month, i, 12, 0, 0)) // Noon to avoid timezone shifts
    dates.push(date)
  }

  // Create entries only if they don't exist
  const promises = dates.map(async (date) => {
    const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6
    const dayType = isWeekend ? "OTHER" : "INSTRUCTIONAL"
    
    // Find matching term for this date
    const term = await db.term.findFirst({
      where: {
        startDate: { lte: date },
        endDate: { gte: date }
      }
    })

    await db.calendarDay.upsert({
      where: { date },
      update: {
        termId: term?.id || null
      },
      create: {
        date,
        type: dayType,
        name: isWeekend ? "Weekend" : null,
        termId: term?.id || null
      }
    })
  })
  await Promise.all(promises)

  revalidatePath("/dashboard/admin/calendar")
  revalidatePath("/dashboard/calendar")
  return { success: true }
}

export async function declareSnowDay(dateStr: string) {
  const session = await getServerSession(authOptions)
  assertRole(session, ["ADMIN"])

  const snowDate = new Date(dateStr)

  // 1. Mark the day as SNOW_DAY
  const targetDay = await db.calendarDay.findUnique({ where: { date: snowDate } })
  if (!targetDay) throw new Error("Date not found in calendar")

  if (targetDay.blockDay === "NONE") {
    // If it wasn't an instructional block day anyway, no need to shift
    await db.calendarDay.update({
      where: { date: snowDate },
      data: { type: "SNOW_DAY", name: "Snow Day", blockDay: "NONE" }
    })
    revalidatePath("/dashboard/admin/calendar")
    revalidatePath("/dashboard/calendar")
    return { success: true }
  }

  await db.calendarDay.update({
    where: { date: snowDate },
    data: {
      type: "SNOW_DAY",
      name: "Snow Day",
      blockDay: "NONE"
    }
  })

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
  const updatePromises = futureDays.map((day, i) => {
    const newBlockDay = i === 0 ? targetDay.blockDay : futureDays[i - 1].blockDay
    return db.calendarDay.update({
      where: { id: day.id },
      data: { blockDay: newBlockDay }
    })
  })
  await Promise.all(updatePromises)

  // The last block day simply falls off the edge of the calendar (dropped)
  
  revalidatePath("/dashboard/admin/calendar")
  revalidatePath("/dashboard/calendar")
  return { success: true }
}

export async function updateCalendarDay(dateStr: string, updates: { type?: DayType, hasCommunityPeriod?: boolean, name?: string | null, blockDay?: any, isMidterm?: boolean, isFinal?: boolean }) {
  const session = await getServerSession(authOptions)
  assertRole(session, ["ADMIN"])

  const date = new Date(dateStr)
  
  // Find matching term for this date
  const term = await db.term.findFirst({
    where: {
      startDate: { lte: date },
      endDate: { gte: date }
    }
  })
  
  await db.calendarDay.upsert({
    where: { date },
    update: {
      ...updates,
      termId: term?.id || null
    },
    create: {
      date,
      type: updates.type || "INSTRUCTIONAL",
      hasCommunityPeriod: updates.hasCommunityPeriod || false,
      name: updates.name || null,
      blockDay: updates.blockDay || "NONE",
      isMidterm: updates.isMidterm || false,
      isFinal: updates.isFinal || false,
      termId: term?.id || null
    }
  })

  revalidatePath("/dashboard/admin/calendar")
  revalidatePath("/dashboard/calendar")
  return { success: true }
}

export async function getCalendarDays(start: Date, end: Date) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new Error("Unauthorized")
  }
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
