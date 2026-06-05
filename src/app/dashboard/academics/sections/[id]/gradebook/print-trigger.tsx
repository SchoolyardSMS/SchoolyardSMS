"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export function PrintTrigger() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print()
    }, 600)
    return () => clearTimeout(timer)
  }, [])

  return null
}

export function PrintButton() {
  return (
    <Button 
      onClick={() => window.print()} 
      className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs px-4 py-2 flex items-center gap-2"
    >
      Print Sheet
    </Button>
  )
}
