import { db } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { updateSchoolSettings } from "@/app/actions/settings"
import { ColorPresets } from "@/components/layout/color-presets"
import { Button } from "@/components/ui/button"
import { BrandingUploads } from "@/components/dashboard/settings/branding-uploads"

export const metadata = { title: "Branding & Identity | Schoolyard Settings" }

export default async function BrandingSettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard")

  const settings = await db.schoolSettings.findUnique({ where: { id: "singleton" } })

  const primary   = settings?.primaryColor   ?? "#4f46e5"
  const secondary = settings?.secondaryColor ?? "#6b7280"
  const initials  = settings?.initials       ?? "SA"

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Branding & Identity</h2>
        <p className="text-sm text-slate-500 mt-1">Configure your school's global identity, colors, and logos.</p>
      </div>

      <form action={updateSchoolSettings} className="space-y-6">
        <input type="hidden" name="activeSettingsTab" value="branding" />

        {/* Identity */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-6 space-y-5">
          <h3 className="font-semibold text-base border-b border-slate-200 dark:border-slate-800 pb-3">Identity</h3>

          <div className="space-y-2">
            <label htmlFor="setting-school-name" className="text-sm font-medium">School Name</label>
            <input id="setting-school-name" name="name" type="text" required
              defaultValue={settings?.name ?? "Schoolyard Academy"}
              className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="setting-school-initials" className="text-sm font-medium">
                Initials <span className="text-slate-400 text-xs">(sidebar)</span>
              </label>
              <input id="setting-school-initials" name="initials" type="text" maxLength={3}
                defaultValue={initials}
                className="flex h-10 w-24 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="setting-school-tagline" className="text-sm font-medium">Tagline</label>
              <input id="setting-school-tagline" name="tagline" type="text"
                defaultValue={settings?.tagline ?? "Excellence in Education"}
                className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <BrandingUploads initialLogo={settings?.logoUrl || ""} initialFavicon={settings?.faviconUrl || ""} />
          </div>
        </div>

        {/* Colors */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-6 space-y-5">
          <h3 className="font-semibold text-base border-b border-slate-200 dark:border-slate-800 pb-3">School Colors</h3>

          <div className="space-y-2">
            <span className="block text-sm font-medium">Quick Presets</span>
            <ColorPresets />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="setting-primary-color" className="text-sm font-medium">Primary Color</label>
              <div className="flex items-center gap-3">
                <input id="setting-primary-color" name="primaryColor" type="color" defaultValue={primary}
                  className="h-10 w-16 cursor-pointer rounded-md border border-slate-200 dark:border-slate-800 p-0.5 bg-white dark:bg-slate-900"
                />
                <span className="text-xs text-slate-500">Sidebar, active states</span>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="setting-secondary-color" className="text-sm font-medium">Secondary Color</label>
              <div className="flex items-center gap-3">
                <input id="setting-secondary-color" name="secondaryColor" type="color" defaultValue={secondary}
                  className="h-10 w-16 cursor-pointer rounded-md border border-slate-200 dark:border-slate-800 p-0.5 bg-white dark:bg-slate-900"
                />
                <span className="text-xs text-slate-500">Accents, borders</span>
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Preview</p>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                style={{ background: primary }}>
                {initials}
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900 dark:text-white">{settings?.name ?? "Schoolyard Academy"}</p>
                <p className="text-xs text-slate-500">{settings?.tagline ?? "Excellence in Education"}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <span className="h-5 rounded px-2 text-[10px] text-white uppercase tracking-widest font-black flex items-center" style={{ background: primary }}>Primary</span>
              <span className="h-5 rounded px-2 text-[10px] text-white uppercase tracking-widest font-black flex items-center" style={{ background: secondary }}>Secondary</span>
            </div>
          </div>

          {/* Advanced Theme Config */}
          <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center pb-3">
              <h3 className="font-semibold text-base">Advanced Theme Config (Raw JSON)</h3>
              <span className="text-[10px] uppercase font-black tracking-widest text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">Advanced</span>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Inject additional CSS custom properties directly into the theme root.</p>
              <textarea name="themeConfig" aria-label="Advanced Theme Config (Raw JSON)" rows={4}
                defaultValue={settings?.themeConfig ? JSON.stringify(settings.themeConfig, null, 2) : '{\n  "borderRadius": "0.5rem",\n  "fontFamily": "Inter"\n}'}
                className="flex w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <Button type="submit" className="text-white shadow-md rounded-full px-8" style={{ background: primary }}>
          Save Branding Settings
        </Button>
      </form>
    </div>
  )
}
