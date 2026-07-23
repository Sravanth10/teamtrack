import React, { useState, useEffect } from 'react'
import { Sparkles, X, ChevronRight, Check } from 'lucide-react'

export const UpdatePopup = () => {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const isDismissed = sessionStorage.getItem('teamtrack_activity_calendar_update_dismissed') === 'true'

    if (!isDismissed) {
      // Delay showing the popup slightly for a smoother entry feel
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleDismiss = () => {
    sessionStorage.setItem('teamtrack_activity_calendar_update_dismissed', 'true')
    setIsOpen(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed bottom-6 right-6 z-[100] w-full max-w-md transform animate-fade-in transition-all duration-500">
      <div className="relative overflow-hidden rounded-2xl border border-brand-500/20 bg-dark-900/95 p-6 shadow-2xl backdrop-blur-md shadow-brand-500/5">
        {/* Glow effect */}
        <div className="absolute -right-12 -top-12 h-24 w-24 rounded-full bg-brand-500/10 blur-xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-dark-800 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="rounded-lg bg-brand-500/10 p-2 border border-brand-500/20">
            <Sparkles className="h-5 w-5 text-brand-400" />
          </div>
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-brand-400">Release Update</span>
            <h4 className="font-sans text-xl font-extrabold text-white">New: Activity Calendar</h4>
          </div>
        </div>

        {/* Content List */}
        <div className="space-y-4 my-4 pr-2 max-h-[45vh] overflow-y-auto custom-scrollbar">
          <p className="text-base text-slate-300 leading-relaxed">
            We've added a new way to track daily progress:
          </p>

          <div className="space-y-4 text-base">
            <div className="flex items-start gap-2.5">
              <span className="mt-1 rounded bg-brand-500/20 text-brand-400 p-1 shrink-0">
                <ChevronRight className="h-4 w-4" />
              </span>
              <div>
                <span className="font-bold text-white text-base">Personal Activity Calendar</span>
                <p className="text-slate-300 text-sm mt-1 leading-relaxed">
                  Members now have a personal Activity Calendar (open it from the calendar icon in the navbar). Each day
                  is color-coded: <span className="text-emerald-400 font-semibold">green</span> for a day you logged
                  a task or progress note, <span className="text-sky-400 font-semibold">blue</span> for an applied
                  leave, and <span className="text-rose-400 font-semibold">red</span> for a weekday you missed.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="mt-1 rounded bg-brand-500/20 text-brand-400 p-1 shrink-0">
                <ChevronRight className="h-4 w-4" />
              </span>
              <div>
                <span className="font-bold text-white text-base">Visible to Your Admin Too</span>
                <p className="text-slate-300 text-sm mt-1 leading-relaxed">
                  Missed days are also visible to your Team Lead Admin, who can review them by member and date range
                  to follow up on missed daily progress.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleDismiss}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-650 text-white font-semibold text-sm py-3 transition shadow-glow-brand"
        >
          <Check className="h-4 w-4" />
          Got it, thanks!
        </button>
      </div>
    </div>
  )
}
export default UpdatePopup
