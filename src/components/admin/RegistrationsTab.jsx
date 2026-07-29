import React from 'react'
import { UserCheck, Sparkles, Check, X } from 'lucide-react'
import { calculateDynamicExperience } from '../../lib/utils'

export const RegistrationsTab = ({
  pendingUsers,
  approvingUserId,
  selectedRole,
  onApproveClick,
  onCancelApprove,
  onSelectedRoleChange,
  onConfirmApproval,
  onRejectClick
}) => {
  if (pendingUsers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-dark-800 p-12 text-center max-w-md mx-auto mt-8">
        <UserCheck className="h-12 w-12 text-slate-600 mx-auto mb-4" />
        <h3 className="text-base font-bold text-white mb-1 font-sans">No Pending Registrations</h3>
        <p className="text-sm text-slate-500">
          All user registration requests have been processed. New requests will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {pendingUsers.map((u) => (
        <div
          key={u.id}
          className="rounded-2xl border border-dark-800 bg-dark-900 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-glass hover:border-brand-500/10 transition-colors"
        >
          {/* User Details */}
          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex flex-wrap items-baseline gap-2">
              <h3 className="font-sans text-lg font-bold text-white truncate">{u.name}</h3>
              <span className="text-xs text-slate-500 font-mono select-all">{u.email}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-450">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Emp ID:</span>
                <span className="text-slate-200">{u.employee_id || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Location:</span>
                <span className="text-slate-200">{u.work_location || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Phone Number:</span>
                <span className="text-slate-200">{u.phone_number || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Rapid Exp:</span>
                <span className="text-slate-200">{calculateDynamicExperience(u.rapid_joining_date)} <span className="text-slate-500 text-[10px]">({u.rapid_joining_date || 'N/A'})</span></span>
              </div>
              <div className="flex items-center gap-1.5">
                 <span className="font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Skill Level:</span>
                 <span className="text-slate-200 capitalize">{u.skill_level || 'foundation'}</span>
               </div>
            </div>

            {/* Skills tags */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-brand-400" />
                Technical Skills
              </span>
              <div className="flex flex-wrap gap-1.5">
                {u.skills && u.skills.length > 0 ? (
                  u.skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex rounded bg-dark-950 border border-dark-800 px-2 py-0.5 text-xs text-slate-350 font-medium"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-600 italic">No skills listed.</span>
                )}
              </div>
            </div>
          </div>

          {/* Approval Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {approvingUserId === u.id ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-dark-950 border border-dark-850 p-2.5 rounded-xl">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-450 uppercase shrink-0">Assign Role:</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => onSelectedRoleChange(e.target.value)}
                    className="rounded-lg border border-dark-700 bg-dark-900 px-2.5 py-1 text-xs text-white focus:border-brand-500 focus:outline-none"
                  >
                    <option value="member">Team Member</option>
                    <option value="admin">Lead Admin</option>
                  </select>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onConfirmApproval(u.id)}
                    className="flex items-center justify-center gap-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs px-3 py-1.5 transition"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Confirm
                  </button>
                  <button
                    onClick={onCancelApprove}
                    className="flex items-center justify-center rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-400 hover:text-white px-2 py-1.5 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => onApproveClick(u.id)}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-5 py-2.5 transition"
                >
                  <Check className="h-4.5 w-4.5" />
                  Approve User
                </button>
                <button
                  onClick={() => onRejectClick(u.id)}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-dark-900 border border-rose-500/20 hover:bg-rose-500/10 text-rose-400 hover:text-rose-200 font-semibold text-sm px-5 py-2.5 transition"
                >
                  <X className="h-4.5 w-4.5" />
                  Reject
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default RegistrationsTab
