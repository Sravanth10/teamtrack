import React, { useState, useEffect } from 'react'
import { Sparkles, X, ChevronRight, Check } from 'lucide-react'

export const UpdatePopup = () => {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Release Date: July 8, 2026, 07:22:11 UTC (12:52:11 IST)
    const RELEASE_TIME = new Date('2026-07-08T07:22:11Z').getTime()
    const EXPIRATION_TIME = RELEASE_TIME + (24 * 60 * 60 * 1000) // 24 Hours
    const currentTime = Date.now()

    const isWithinActiveWindow = currentTime < EXPIRATION_TIME
    const isDismissed = sessionStorage.getItem('teamtrack_v4_0_dismissed') === 'true'

    if (isWithinActiveWindow && !isDismissed) {
      // Delay showing the popup slightly for a smoother entry feel
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleDismiss = () => {
    sessionStorage.setItem('teamtrack_v4_0_dismissed', 'true')
    setIsOpen(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed bottom-6 right-6 z-[100] w-full max-w-sm transform animate-fade-in transition-all duration-500">
      <div className="relative overflow-hidden rounded-2xl border border-brand-500/20 bg-dark-900/95 p-5 shadow-2xl backdrop-blur-md shadow-brand-500/5">
        {/* Glow effect */}
        <div className="absolute -right-12 -top-12 h-24 w-24 rounded-full bg-brand-500/10 blur-xl pointer-events-none" />

        {/* Close Button */}
        <button 
          onClick={handleDismiss}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-dark-800 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="rounded-lg bg-brand-500/10 p-1.5 border border-brand-500/20">
            <Sparkles className="h-4 w-4 text-brand-400" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-brand-400">Release Update</span>
            <h4 className="font-sans text-sm font-extrabold text-white">What's New in v4.0</h4>
          </div>
        </div>

        {/* Content List */}
        <div className="space-y-3 my-4 pr-2 max-h-[40vh] overflow-y-auto custom-scrollbar">
          <p className="text-xs text-slate-405 leading-relaxed">
            We've rolled out a brand-new update containing powerful role assignments, custom filtering, and workspace archive tools:
          </p>

          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <span className="mt-1 rounded bg-brand-500/20 text-brand-400 p-0.5 shrink-0">
                <ChevronRight className="h-3 w-3" />
              </span>
              <div>
                <span className="font-bold text-slate-200">Custom Build Team Logo Uploads</span>
                <p className="text-slate-450 text-[11px] mt-0.5">Supervisors can click logo icons on dashboard cards to upload custom branding logos. Display badges update automatically across workspaces.</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="mt-1 rounded bg-brand-500/20 text-brand-400 p-0.5 shrink-0">
                <ChevronRight className="h-3 w-3" />
              </span>
              <div>
                <span className="font-bold text-slate-200">Supervisor & Admin Field Panels</span>
                <p className="text-slate-450 text-[11px] mt-0.5">Added Received Date, Customer, BG/Market, Stage fields to teams. Added a Project Details modal for advanced tracking.</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="mt-1 rounded bg-brand-500/20 text-brand-400 p-0.5 shrink-0">
                <ChevronRight className="h-3 w-3" />
              </span>
              <div>
                <span className="font-bold text-slate-200">Dynamic User Skill Levels</span>
                <p className="text-slate-450 text-[11px] mt-0.5">Users are assigned a default level (Foundation). Supervisors can adjust skill levels (Foundation, Intermediate, Advanced) from user profiles.</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="mt-1 rounded bg-brand-500/20 text-brand-400 p-0.5 shrink-0">
                <ChevronRight className="h-3 w-3" />
              </span>
              <div>
                <span className="font-bold text-slate-200">Dashboard Task Filtering</span>
                <p className="text-slate-450 text-[11px] mt-0.5">Filter team tasks on the fly! Members can toggle 'My Tasks', while supervisors/admins can filter by any specific member's workflow.</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="mt-1 rounded bg-brand-500/20 text-brand-400 p-0.5 shrink-0">
                <ChevronRight className="h-3 w-3" />
              </span>
              <div>
                <span className="font-bold text-slate-200">Space Activation / Deactivation</span>
                <p className="text-slate-450 text-[11px] mt-0.5">Toggle active status in settings. Deactivated teams are set to read-only (blocking task, leave, or sticky edits) and grouped under a new collapsed section.</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="mt-1 rounded bg-brand-500/20 text-brand-400 p-0.5 shrink-0">
                <ChevronRight className="h-3 w-3" />
              </span>
              <div>
                <span className="font-bold text-slate-200">Theme Toggle on Team Selection</span>
                <p className="text-slate-450 text-[11px] mt-0.5">A clean dark/light mode toggle button has been added to the member select team page with corrected card padding layouts.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleDismiss}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-brand-500 hover:bg-brand-650 text-white font-semibold text-xs py-2.5 transition shadow-glow-brand"
        >
          <Check className="h-3.5 w-3.5" />
          Got it, thanks!
        </button>
      </div>
    </div>
  )
}
export default UpdatePopup
