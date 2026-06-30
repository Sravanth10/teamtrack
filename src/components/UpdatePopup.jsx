import React, { useState, useEffect } from 'react'
import { Sparkles, X, ChevronRight, Check } from 'lucide-react'

export const UpdatePopup = () => {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Release Date: June 30, 2026, 11:00:00 UTC (16:30:00 IST)
    const RELEASE_TIME = new Date('2026-06-30T11:00:00Z').getTime()
    const EXPIRATION_TIME = RELEASE_TIME + (48 * 60 * 60 * 1000) // 48 Hours
    const currentTime = Date.now()

    const isWithinActiveWindow = currentTime < EXPIRATION_TIME
    const isDismissed = localStorage.getItem('teamtrack_v3_dismissed') === 'true'

    if (isWithinActiveWindow && !isDismissed) {
      // Delay showing the popup slightly for a smoother entry feel
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem('teamtrack_v3_dismissed', 'true')
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
            <h4 className="font-sans text-sm font-extrabold text-white">What's New in v3.0</h4>
          </div>
        </div>

        {/* Content List */}
        <div className="space-y-3 my-4 pr-2 max-h-[40vh] overflow-y-auto custom-scrollbar">
          <p className="text-xs text-slate-400 leading-relaxed">
            We've rolled out a major update with new features and UX enhancements to optimize your workspaces:
          </p>

          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <span className="mt-1 rounded bg-brand-500/20 text-brand-400 p-0.5 shrink-0">
                <ChevronRight className="h-3 w-3" />
              </span>
              <div>
                <span className="font-bold text-slate-200">Multi-Workspace Support</span>
                <p className="text-slate-450 text-[11px] mt-0.5">Members can now belong to and toggle between multiple workspaces.</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="mt-1 rounded bg-brand-500/20 text-brand-400 p-0.5 shrink-0">
                <ChevronRight className="h-3 w-3" />
              </span>
              <div>
                <span className="font-bold text-slate-200">Task Types & Mandatory Deadlines</span>
                <p className="text-slate-450 text-[11px] mt-0.5">Choose Assignment (mandatory deadline) or Exploration/Other. Creator names are now visible on cards.</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="mt-1 rounded bg-brand-500/20 text-brand-400 p-0.5 shrink-0">
                <ChevronRight className="h-3 w-3" />
              </span>
              <div>
                <span className="font-bold text-slate-200">Self-Service Profiles</span>
                <p className="text-slate-450 text-[11px] mt-0.5">Members can directly edit their skills set, phone number, and location.</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="mt-1 rounded bg-brand-500/20 text-brand-400 p-0.5 shrink-0">
                <ChevronRight className="h-3 w-3" />
              </span>
              <div>
                <span className="font-bold text-slate-200">Dynamic User Invites</span>
                <p className="text-slate-450 text-[11px] mt-0.5">Real-time user search when adding team members, with instant recovery for rejected users.</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="mt-1 rounded bg-brand-500/20 text-brand-400 p-0.5 shrink-0">
                <ChevronRight className="h-3 w-3" />
              </span>
              <div>
                <span className="font-bold text-slate-200">Engaged Overview & Milestones</span>
                <p className="text-slate-450 text-[11px] mt-0.5">Classify non-engaged users in general-only teams, and track milestones with team and developer details.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleDismiss}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs py-2.5 transition shadow-glow-brand"
        >
          <Check className="h-3.5 w-3.5" />
          Got it, thanks!
        </button>
      </div>
    </div>
  )
}
export default UpdatePopup
