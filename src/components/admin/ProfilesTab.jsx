import React from 'react'
import { Search, Loader, Users, Edit } from 'lucide-react'
import { calculateDynamicExperience } from '../../lib/utils'

export const ProfilesTab = ({
  searchQuery,
  onSearchQueryChange,
  searchLoading,
  searchResults,
  onEditUser
}) => {
  return (
    <div className="space-y-6">
      {/* Search Bar Block */}
      <div className="relative max-w-xl mx-auto">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
            <Search className="h-5 w-5" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="block w-full rounded-xl border border-dark-700 bg-dark-900/60 py-3 pl-11 pr-4 text-white placeholder-slate-550 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition shadow-glass"
            placeholder="Search profiles by Name, Email, or Employee ID..."
          />
        </div>
      </div>

      {/* Search Results / Prompt Screen */}
      {!searchQuery.trim() ? (
        <div className="rounded-2xl border border-dashed border-dark-800 p-12 text-center max-w-md mx-auto mt-8 bg-dark-900/30">
          <Search className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-base font-bold text-white mb-1">Search User Profiles</h3>
          <p className="text-sm text-slate-550">
            Type name, email, or employee ID in the search box above to dynamically load user profile cards.
          </p>
        </div>
      ) : searchLoading ? (
        <div className="flex justify-center py-12">
          <Loader className="h-8 w-8 text-brand-500 animate-spin" />
        </div>
      ) : searchResults.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-dark-800 p-12 text-center max-w-md mx-auto mt-8 bg-dark-900/30">
          <Users className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-base font-bold text-white mb-1">No Matching Profiles</h3>
          <p className="text-sm text-slate-550">
            No registered profiles match "{searchQuery}". Try typing another name or employee ID.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {searchResults.map((user) => {
            const userTasks = user.tasks || []

            return (
              <div
                key={user.id}
                className="relative flex flex-col justify-between rounded-2xl border border-dark-800 bg-dark-900 p-6 shadow-glass hover:border-brand-500/20 transition-all duration-300"
              >
                {/* Edit Icon Button */}
                <button
                  onClick={() => onEditUser(user)}
                  className="absolute top-4 right-4 rounded-xl p-2 bg-dark-950 border border-dark-800 text-slate-450 hover:bg-dark-800 hover:text-white transition"
                  title="Edit Profile"
                >
                  <Edit className="h-4 w-4" />
                </button>

                <div className="space-y-5">
                  {/* Header Info */}
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-bold text-sm uppercase flex items-center justify-center shadow-glow-brand shrink-0">
                      {user.name ? user.name.slice(0, 2) : 'U'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-sans text-base font-extrabold text-white truncate max-w-[180px]">
                          {user.name}
                        </h3>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-dark-950 border border-dark-850 text-slate-450">
                          {user.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate select-all">{user.email}</p>
                    </div>
                  </div>

                  {/* Job Details Metadata Grid */}
                  <div className="grid grid-cols-2 gap-4 rounded-xl bg-dark-950/50 border border-dark-800/80 p-4 text-xs">
                    <div>
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-550 block mb-0.5">Employee ID</span>
                      <span className="font-semibold text-slate-205">{user.employee_id || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-550 block mb-0.5">Location</span>
                      <span className="font-semibold text-slate-205">{user.work_location || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-550 block mb-0.5">Phone Number</span>
                      <span className="font-semibold text-slate-205 block">{user.phone_number || 'N/A'}</span>
                    </div>
                                                 <div>
                                   <span className="text-[9px] uppercase font-bold tracking-wider text-slate-550 block mb-0.5">Rapid Build Exp</span>
                                   <span className="font-semibold text-slate-205 block">{calculateDynamicExperience(user.rapid_joining_date)}</span>
                                   <span className="text-[10px] text-slate-500">Joined: {user.rapid_joining_date || 'N/A'}</span>
                                 </div>
                                 <div>
                                   <span className="text-[9px] uppercase font-bold tracking-wider text-slate-550 block mb-0.5">Skill Level</span>
                                   <span className="font-semibold text-slate-205 block capitalize">{user.skill_level || 'foundation'}</span>
                                 </div>
                                 <div>
                                   <span className="text-[9px] uppercase font-bold tracking-wider text-slate-550 block mb-0.5">Individual Category</span>
                                   <span className="font-semibold text-slate-205 block">{user.individualCategory || 'Training'}</span>
                                 </div>
                    <div className="col-span-2 pt-2 border-t border-dark-800/60 flex items-center justify-between">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-550">Team Workspace</span>
                      <span className="font-bold text-brand-400 bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded text-[10px]">
                        {user.teamName}
                      </span>
                    </div>
                    {user.role !== 'supervisor' && (
                      <div className="col-span-2 pt-2 border-t border-dark-800/60 flex items-center justify-between">
                        <span className="text-[9px] uppercase font-bold tracking-wider text-slate-550">Build Team Assignment</span>
                        <span className="font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded text-[10px]">
                          {user.labName || 'None'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Skills Tags */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-550 block">Skills Set</span>
                    <div className="flex flex-wrap gap-1">
                      {user.skills && user.skills.length > 0 ? (
                        user.skills.map(s => (
                          <span
                            key={s}
                            className="inline-flex rounded-lg border border-dark-800 bg-dark-950 px-2 py-0.5 text-[10px] text-slate-350"
                          >
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-600 italic">No skills listed.</span>
                      )}
                    </div>
                  </div>

                  {/* Tasks & Note Updates Consolidation */}
                  <div className="space-y-2 border-t border-dark-800/80 pt-4">
                    <h4 className="font-sans text-xs font-bold text-white flex items-center justify-between">
                      <span>Recorded Tasks ({userTasks.length})</span>
                      <span className="text-[10px] text-slate-500 font-normal">Created by user</span>
                    </h4>

                    {userTasks.length === 0 ? (
                      <p className="text-xs text-slate-600 italic">No tasks recorded by this user.</p>
                    ) : (
                      <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                        {userTasks.map(t => {
                          const statusStyles = {
                            'To Do': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
                            'In Progress': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                            'Blocked': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                            'Done': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }
                          const isLeave = t.title === 'Leave'
                          const statusBadge = isLeave ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : (statusStyles[t.status] || 'bg-slate-550')

                          return (
                            <div key={t.id} className="rounded-xl border border-dark-800 bg-dark-950/40 p-3 space-y-2 text-xs">
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-bold text-slate-200 leading-tight">{t.title}</span>
                                <span className={`px-1.5 py-0.25 text-[9px] uppercase font-bold tracking-wide rounded border shrink-0 ${statusBadge}`}>
                                  {isLeave ? 'Leave' : t.status}
                                </span>
                              </div>
                              {t.description && (
                                <p className="text-slate-400 leading-relaxed text-[11px] bg-dark-950/20 p-1.5 rounded border border-dark-850/40">
                                  {t.description}
                                </p>
                              )}

                              {/* Show task updates/notes */}
                              {t.task_updates && t.task_updates.length > 0 && (
                                <div className="space-y-1.5 pt-1.5 border-t border-dark-800/40">
                                  <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 block">Note Updates</span>
                                  {t.task_updates.map(up => (
                                    <div key={up.id} className="text-[11px] text-slate-350 leading-normal pl-2 border-l border-brand-500/30 py-0.5">
                                      {up.note}
                                      <span className="text-[9px] text-slate-550 block mt-0.5">
                                        {new Date(up.created_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ProfilesTab
