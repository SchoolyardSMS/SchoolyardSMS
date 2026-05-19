"use server"

import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { assertRole } from "@/lib/rbac"

export async function createTopic(sectionId: string, title: string, description?: string) {
  const session = await getServerSession(authOptions)
  assertRole(session, ["ADMIN", "TEACHER"])

  const topic = await db.topic.create({
    data: {
      sectionId,
      title,
      description,
      order: 0, // Default order
    }
  })

  revalidatePath(`/dashboard/academics/sections/${sectionId}`)
  return topic
}

export async function deleteTopic(topicId: string, sectionId: string) {
  const session = await getServerSession(authOptions)
  assertRole(session, ["ADMIN", "TEACHER"])

  await db.topic.delete({
    where: { id: topicId }
  })

  revalidatePath(`/dashboard/academics/sections/${sectionId}`)
  return { success: true }
}

export async function addMaterial(topicId: string, sectionId: string, title: string, type: "LINK" | "FILE", url: string) {
  const session = await getServerSession(authOptions)
  assertRole(session, ["ADMIN", "TEACHER"])

  const material = await db.topicMaterial.create({
    data: {
      topicId,
      title,
      type,
      url,
    }
  })

  revalidatePath(`/dashboard/academics/sections/${sectionId}`)
  return material
}

export async function deleteMaterial(materialId: string, sectionId: string) {
  const session = await getServerSession(authOptions)
  assertRole(session, ["ADMIN", "TEACHER"])

  await db.topicMaterial.delete({
    where: { id: materialId }
  })

  revalidatePath(`/dashboard/academics/sections/${sectionId}`)
  return { success: true }
}
