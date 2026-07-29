import React from 'react'
import { Users, ChevronRight, ChevronDown, Loader } from 'lucide-react'

export const OverviewTab = ({
  engagedCandidates,
  nonEngagedCandidates,
  overviewLoading,
  isEngagedCollapsed,
  onToggleEngagedCollapsed,
  isNonEngagedCollapsed,
  onToggleNonEngagedCollapsed
}) => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-dark-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-brand-400" />
            Team Engagement Overview
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time lists of candidates classified as engaged or non-engaged based on their team categories.
          </p>
        </div>
      </div>

      {overviewLoading ? (
        <div className="flex justify-center py-12">
          <Loader className="h-8 w-8 text-brand-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">

          {/* Engaged Candidates List */}
          <div className="space-y-4">
            <button
              onClick={onToggleEngagedCollapsed}
              className="flex items-center justify-between w-full text-left py-2 px-3 rounded-xl hover:bg-dark-900 border border-transparent hover:border-dark-800 transition"
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <h3 className="text-lg font-bold text-white">
                  Engaged Candidates ({engagedCandidates.length})
                </h3>
              </div>
              {isEngagedCollapsed ? (
                <ChevronRight className="h-5 w-5 text-slate-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-slate-500" />
              )}
            </button>

            {!isEngagedCollapsed && (
              <>
                {engagedCandidates.length === 0 ? (
                  <p className="text-xs text-slate-505 italic py-2 pl-3">
                    No engaged candidates found. (Candidates who belong to at least one team with a category other than 'general').
                  </p>
                ) : (
                  <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 pl-3">
                    {engagedCandidates.map(user => (
                      <div
                        key={user.id}
                        className="rounded-2xl border border-dark-800 bg-dark-900 p-5 flex flex-col justify-between gap-3 hover:border-brand-500/10 transition-colors shadow-glass"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-sans font-bold text-white text-sm truncate max-w-[150px]">
                              {user.name || 'N/A'}
                            </h4>
                            <span className="text-[10px] text-slate-505 font-mono select-all">
                              Emp ID: {user.employee_id || 'N/A'}
                            </span>
                          </div>

                          <div className="space-y-1 text-xs text-slate-400">
                            <div>
                              <span className="font-semibold text-slate-500">Team: </span>
                              <span className="text-slate-205">{user.teamName}</span>
                            </div>
                            <div>
                              <span className="font-semibold text-slate-500">Category: </span>
                              <span className="text-brand-400 font-medium">{user.teamCategory}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2.5 border-t border-dark-800/40 text-[11px] text-slate-550 font-mono truncate select-all">
                          {user.email}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Non-Engaged Candidates List */}
          <div className="space-y-4 pt-4 border-t border-dark-800/40">
            <button
              onClick={onToggleNonEngagedCollapsed}
              className="flex items-center justify-between w-full text-left py-2 px-3 rounded-xl hover:bg-dark-900 border border-transparent hover:border-dark-800 transition"
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                <h3 className="text-lg font-bold text-white">
                  Non-Engaged Candidates ({nonEngagedCandidates.length})
                </h3>
              </div>
              {isNonEngagedCollapsed ? (
                <ChevronRight className="h-5 w-5 text-slate-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-slate-500" />
              )}
            </button>

            {!isNonEngagedCollapsed && (
              <>
                {nonEngagedCandidates.length === 0 ? (
                  <p className="text-xs text-slate-505 italic py-2 pl-3">
                    No non-engaged candidates found. (Candidates who belong only to teams categorized as 'general' and no other teams).
                  </p>
                ) : (
                  <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 pl-3">
                    {nonEngagedCandidates.map(user => (
                      <div
                        key={user.id}
                        className="rounded-2xl border border-dark-850 bg-dark-900 p-5 flex flex-col justify-between gap-3 hover:border-brand-500/10 transition-colors shadow-glass border-l-4 border-l-amber-500/60"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-sans font-bold text-white text-sm truncate max-w-[150px]">
                              {user.name || 'N/A'}
                            </h4>
                            <span className="text-[10px] text-slate-500 font-mono select-all">
                              Emp ID: {user.employee_id || 'N/A'}
                            </span>
                          </div>

                          <div className="space-y-1 text-xs text-slate-400">
                            <div>
                              <span className="font-semibold text-slate-500">Team: </span>
                              <span className="text-slate-200">{user.teamName}</span>
                            </div>
                            <div>
                              <span className="font-semibold text-slate-500">Category: </span>
                              <span className="text-amber-400 font-medium">{user.teamCategory}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2.5 border-t border-dark-800/40 text-[11px] text-slate-500 font-mono truncate select-all">
                          {user.email}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      )}
    </div>
  )
}

export default OverviewTab
