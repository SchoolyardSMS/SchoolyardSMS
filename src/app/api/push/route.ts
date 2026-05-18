import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const { subscription } = await req.json()

  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return new NextResponse("Invalid subscription", { status: 400 })
  }

  try {
    await db.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        userId: session.user.id,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      create: {
        userId: session.user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error saving push subscription:", error)
    return new NextResponse(error.message, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const { endpoint } = await req.json()

  try {
    await db.pushSubscription.delete({
      where: { endpoint },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting push subscription:", error)
    return new NextResponse(error.message, { status: 500 })
  }
}
