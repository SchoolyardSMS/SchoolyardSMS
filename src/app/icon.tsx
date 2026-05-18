import { ImageResponse } from "next/og"
import { db } from "@/lib/db"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default async function Icon() {
  let initial = "S"
  let color = "#4f46e5"

  try {
    const settings = await db.schoolSettings.findUnique({ where: { id: "singleton" } })
    if (settings?.name) initial = settings.name.charAt(0).toUpperCase()
    if (settings?.primaryColor) color = settings.primaryColor
  } catch {
    // fallback if DB not available
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          fontWeight: 700,
          fontSize: 18,
          color: "#ffffff",
        }}
      >
        {initial}
      </div>
    ),
    { ...size }
  )
}
