import React, { useState, useEffect } from 'react'
import { ShieldAlert, TriangleAlert, Building2, Users, ClipboardList, NotebookPen, Check } from 'lucide-react'

export const InstructionsPopup = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const isDismissed = sessionStorage.getItem('teamtrack_instructions_dismissed') === 'true'
    if (!isDismissed) {
      const timer = setTimeout(() => setIsOpen(true), 800)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleDismiss = () => {
    if (!checked) return
    sessionStorage.setItem('teamtrack_instructions_dismissed', 'true')
    setIsOpen(false)
  }

  if (!isOpen) return null

  const rules = [
    {
      icon: Building2,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10 border-sky-500/20',
      num: '01',
      numColor: 'text-sky-500/25',
      title: 'General Workspace',
      body: (
        <>
          All approved members are part of the <span className="font-bold text-sky-300">General</span> team space.
          Any tasks not specific to a team must be logged here.
        </>
      ),
    },
    {
      icon: Users,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10 border-violet-500/20',
      num: '02',
      numColor: 'text-violet-500/25',
      title: 'Team-Specific Workspaces',
      body: (
        <>
          Only log <span className="font-bold text-violet-300">team-specific tasks</span> inside their team board.
          Keep workspaces clean — it's your responsibility.
        </>
      ),
    },
    {
      icon: ClipboardList,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      num: '03',
      numColor: 'text-emerald-500/25',
      title: 'Task Types & Deadlines',
      body: (
        <>
          Use <span className="font-bold text-emerald-300">Exploration/Other</span> for research & learning.
          Use <span className="font-bold text-emerald-300">Assignment</span> for work-value tasks —{' '}
          <span className="underline decoration-emerald-400/60">deadline is mandatory</span>.
        </>
      ),
    },
    {
      icon: NotebookPen,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/30',
      num: '04',
      numColor: 'text-amber-500/35',
      title: 'Daily Progress Updates',
      critical: true,
      body: (
        <>
          For every <span className="font-bold text-amber-300">In-Progress</span> task spanning multiple days,
          you <span className="underline decoration-amber-400 font-bold text-amber-300">must</span> post a daily progress note.
          Undocumented progress = no progress.
        </>
      ),
    },
  ]

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md my-auto animate-fade-in">
        {/* Top alert strip */}
        <div className="flex items-center gap-2 rounded-t-2xl border border-b-0 border-amber-500/40 bg-amber-500/10 px-4 py-2.5">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-amber-400 animate-pulse" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
            Mandatory Read — Workspace Policies
          </p>
        </div>

        {/* Main card */}
        <div className="overflow-hidden rounded-b-2xl border border-t-0 border-amber-500/20 bg-dark-900 shadow-2xl">

          {/* Header */}
          <div className="relative overflow-hidden border-b border-dark-800 bg-gradient-to-br from-dark-900 via-dark-900 to-amber-950/20 px-5 pt-4 pb-4">
            <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
            <div className="relative flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 shadow-[0_0_16px_rgba(245,158,11,0.12)]">
                <ShieldAlert className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h2 className="font-sans text-base font-extrabold tracking-tight text-white">Before You Begin</h2>
                <p className="mt-0.5 text-[11px] text-slate-400 leading-relaxed">
                  Read and acknowledge the guidelines below. These apply to{' '}
                  <span className="text-white font-semibold">every member</span> without exception.
                </p>
              </div>
            </div>
          </div>

          {/* Rules */}
          <div className="divide-y divide-dark-800/60 px-5">
            {rules.map((rule) => {
              const Icon = rule.icon
              return (
                <div key={rule.num} className="flex items-start gap-3 py-3">
                  {/* Number + Icon */}
                  <div className="flex flex-col items-center gap-1 shrink-0 w-7 pt-0.5">
                    <span className={`text-xl font-black leading-none ${rule.numColor}`}>{rule.num}</span>
                    <div className={`flex h-6 w-6 items-center justify-center rounded-lg border ${rule.bg}`}>
                      <Icon className={`h-3 w-3 ${rule.color}`} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className={`text-xs font-bold ${rule.critical ? 'text-amber-300' : 'text-white'}`}>
                        {rule.title}
                      </h3>
                      {rule.critical && (
                        <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-widest text-amber-400">
                          Critical
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-400">{rule.body}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-dark-800 bg-dark-950/50 px-5 py-3.5 space-y-3">
            {/* Checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer group">
              <div
                onClick={() => setChecked(!checked)}
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all duration-200 ${
                  checked
                    ? 'border-brand-500 bg-brand-500'
                    : 'border-dark-700 bg-dark-800 group-hover:border-brand-500/60'
                }`}
              >
                {checked && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
              </div>
              <span className="text-[11px] text-slate-400 leading-relaxed select-none">
                I have read and understood all workspace guidelines and will follow them when logging tasks and updates.
              </span>
            </label>

            {/* CTA Button */}
            <button
              onClick={handleDismiss}
              disabled={!checked}
              className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-extrabold tracking-wide transition-all duration-300 ${
                checked
                  ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-[0_0_18px_rgba(99,102,241,0.35)] hover:shadow-[0_0_26px_rgba(99,102,241,0.5)] hover:from-brand-400 hover:to-brand-500'
                  : 'cursor-not-allowed bg-dark-800 text-slate-600 border border-dark-700'
              }`}
            >
              <Check className="h-3.5 w-3.5" />
              {checked ? 'I Acknowledge — Enter Workspace' : 'Check the box above to continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InstructionsPopup
