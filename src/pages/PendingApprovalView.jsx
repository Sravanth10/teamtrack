import React from 'react'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/Navbar'
import { Clock } from 'lucide-react'
import { calculateDynamicExperience } from '../lib/utils'

// Shown to a user whose registration is awaiting admin approval
export const PendingApprovalView = () => {
  const { profile } = useAuth()

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col text-slate-200">
      <Navbar />

      <main className="flex-1 flex flex-col justify-center items-center p-6 text-center max-w-2xl mx-auto space-y-6">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-500 shadow-glow-brand animate-pulse">
          <Clock className="h-10 w-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Registration Pending Approval</h2>
          <p className="text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
            Your profile details have been submitted. A system administrator must approve your account and assign your team workspace before you can access the application.
          </p>
        </div>

        {/* User Submitted Profile Details Card */}
        {profile && (
          <div className="w-full rounded-2xl border border-dark-800 bg-dark-900/60 p-6 text-left space-y-4 backdrop-blur-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-dark-800 pb-2">
              Submitted Profile Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">Name</span>
                <span className="text-slate-200 font-semibold">{profile.name}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Email Address</span>
                <span className="text-slate-200 font-semibold font-mono">{profile.email}</span>
              </div>
              <div>
                <span className="text-xs text-slate-505 block">Employee ID</span>
                <span className="text-slate-200 font-semibold">{profile.employee_id || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-505 block">Work Location</span>
                <span className="text-slate-200 font-semibold">{profile.work_location || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-505 block">Phone Number</span>
                <span className="text-slate-200 font-semibold">{profile.phone_number || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-505 block">Rapid Build Experience</span>
                 <span className="text-slate-250 font-medium">{calculateDynamicExperience(profile.rapid_joining_date)} <span className="text-slate-500 text-[10px]">({profile.rapid_joining_date || 'N/A'})</span></span>
              </div>
              <div>
                <span className="text-xs text-slate-505 block">Skill Level</span>
                <span className="text-slate-200 font-semibold capitalize">{profile.skill_level || 'foundation'}</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-dark-800/60">
              <span className="text-xs text-slate-505 block">Technical Skills</span>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills && profile.skills.length > 0 ? (
                  profile.skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex rounded bg-dark-950 border border-dark-800 px-2.5 py-0.75 text-xs text-slate-350 font-medium"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-600 italic">No skills selected.</span>
                )}
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-500 italic">
          Tip: You can refresh this page once your Admin approves you, or Sign Out from the navbar above.
        </p>
      </main>
    </div>
  )
}

export default PendingApprovalView
