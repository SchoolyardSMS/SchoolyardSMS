"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { X, Smartphone, Download } from "lucide-react"

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const deferredPromptRef = useRef<any>(null)

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (isStandalone) return

    // Debug mode
    const searchParams = new URLSearchParams(window.location.search)
    if (searchParams.get('showInstall') === 'true') {
      requestAnimationFrame(() => {
        setShowPrompt(true)
      })
    }

    // iOS Detection
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent)
    if (isIOSDevice) {
      requestAnimationFrame(() => {
        setIsIOS(true)
        setShowPrompt(true)
      })
      return
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      deferredPromptRef.current = e
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  const handleInstallClick = async () => {
    if (isIOS) {
      // On iOS, we just show the instructions (which are already in the UI)
      return
    }
    if (!deferredPromptRef.current) return
    deferredPromptRef.current.prompt()
    await deferredPromptRef.current.userChoice
    deferredPromptRef.current = null
    setShowPrompt(false)
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] md:left-auto md:max-w-sm animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 flex flex-col gap-4">
        <button 
          type="button"
          onClick={() => setShowPrompt(false)}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            {isIOS ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15" />
              </svg>
            ) : (
              <Smartphone className="h-6 w-6" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">
              {isIOS ? "Add to Home Screen" : "Install Schoolyard"}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {isIOS 
                ? "Tap the share button in your Safari browser bar and select 'Add to Home Screen' to install." 
                : "Add Schoolyard to your home screen for a faster, app-like experience and push notifications."}
            </p>
          </div>
        </div>
        
        {isIOS ? (
           <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-3 flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
             <div className="bg-white dark:bg-slate-700 p-1 rounded shadow-sm">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15" />
               </svg>
             </div>
             <span>Step 1: Tap Share</span>
             <span className="opacity-30">|</span>
             <span>Step 2: Add to Home Screen</span>
           </div>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleInstallClick} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all active:scale-95">
              <Download className="h-4 w-4 mr-2" />
              Install App
            </Button>
            <Button variant="ghost" onClick={() => setShowPrompt(false)} className="text-slate-500 dark:text-slate-400 font-medium">
              Later
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
