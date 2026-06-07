import { ImageResponse } from "next/og"
import { db } from "@/lib/db"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

const baseStyle = {
  width: 32,
  height: 32,
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "sans-serif",
  fontWeight: 700 as const,
  fontSize: 18,
  color: "#ffffff",
}

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
        style={{ ...baseStyle, background: color }}
      >
        {initial}
      </div>
    ),
    { ...size }
  )
}
