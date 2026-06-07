"use client"

const colorPresets = [
  { name: "Indigo & Slate",  primary: "#4f46e5", secondary: "#64748b" },
  { name: "Crimson & Grey",  primary: "#dc143c", secondary: "#6b7280" },
  { name: "Navy & Gold",     primary: "#1e3a5f", secondary: "#f59e0b" },
  { name: "Forest & Brown",  primary: "#15803d", secondary: "#92400e" },
  { name: "Royal & Silver",  primary: "#5b21b6", secondary: "#94a3b8" },
  { name: "Maroon & Gold",   primary: "#7f1d1d", secondary: "#ca8a04" },
]

interface ColorPresetsProps {
  primaryRef: string
  secondaryRef: string
}

function applyPreset(primary: string, secondary: string) {
  const p = document.querySelector<HTMLInputElement>('[name=primaryColor]')
  const s = document.querySelector<HTMLInputElement>('[name=secondaryColor]')
  if (p) p.value = primary
  if (s) s.value = secondary
}

export function ColorPresets() {

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {colorPresets.map(preset => (
        <button
          key={preset.name}
          type="button"
          onClick={() => applyPreset(preset.primary, preset.secondary)}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent transition-colors text-left"
        >
          <span className="flex gap-1">
            <span className="h-4 w-4 rounded-full border border-border/50 flex-shrink-0" style={{ background: preset.primary }} />
            <span className="h-4 w-4 rounded-full border border-border/50 flex-shrink-0" style={{ background: preset.secondary }} />
          </span>
          {preset.name}
        </button>
      ))}
    </div>
  )
}
