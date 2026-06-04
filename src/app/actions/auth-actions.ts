"use server"

import { db } from "@/lib/db"
import { randomUUID } from "crypto"
import { sendPasswordResetEmail } from "@/lib/mail"
import { headers } from "next/headers"
import bcrypt from "bcryptjs"

export async function forgotPassword(email: string) {
  if (!email) {
    return { error: "Email is required" }
  }

  try {
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
      // For security, don't reveal if user exists or not
      return { success: true }
    }

    const token = randomUUID()
    const expires = new Date(Date.now() + 3600000) // 1 hour

    await db.userToken.upsert({
      where: { email_token: { email: email.toLowerCase(), token } },
      update: { token, expires },
      create: { 
        email: email.toLowerCase(), 
        token, 
        role: user.role, 
        expires 
      }
    })

    const headersList = await headers()
    const host = headersList.get('host')
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = process.env.NEXTAUTH_URL ? process.env.NEXTAUTH_URL.replace(/\/$/, '') : `${protocol}://${host}`
    
    const resetLink = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(email.toLowerCase())}`
    await sendPasswordResetEmail(email.toLowerCase(), resetLink)

    return { success: true }
  } catch (error) {
    console.error("Forgot password error:", error)
    return { error: "Something went wrong. Please try again later." }
  }
}

export async function resetPassword(formData: FormData) {
  const token = formData.get("token") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!token || !email || !password) {
    return { error: "All fields are required" }
  }

  try {
    const userToken = await db.userToken.findFirst({
      where: {
        token,
        email: email.toLowerCase(),
        expires: { gt: new Date() }
      }
    })

    if (!userToken) {
      return { error: "Invalid or expired reset link." }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // Parallelize user password update and token deletion
    await Promise.all([
      db.user.update({
        where: { email: email.toLowerCase() },
        data: { hashedPassword }
      }),
      db.userToken.delete({
        where: { id: userToken.id }
      })
    ])

    return { success: true }
  } catch (error) {
    console.error("Reset password error:", error)
    return { error: "Failed to reset password. Please try again." }
  }
}
