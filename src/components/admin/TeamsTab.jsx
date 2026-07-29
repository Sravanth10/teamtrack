import React from 'react'
import {
  Users, FolderPlus, Settings, Trash2, ChevronRight, ChevronDown,
  CheckCircle, Clock, AlertOctagon, CircleDot
} from 'lucide-react'

const TeamCard = ({ team, profile, onCardClick, onEditClick, onDeleteClick }) => {
  const memberCount = team.team_members?.length || 0
  const tasksList = team.tasks || []

  const todoCount = tasksList.filter(t => t.status === 'To Do').length
  const progressCount = tasksList.filter(t => t.status === 'In Progress').length
  const blockedCount = tasksList.filter(t => t.status === 'Blocked').length
  const doneCount = tasksList.filter(t => t.status === 'Done').length
  const totalTasks = tasksList.length

  const isInactive = team.is_active === false

  return (
    <div
      onClick={() => onCardClick(team.id)}
      className={`group relative flex flex-col justify-between rounded-2xl border p-6 shadow-glass hover:shadow-glass-hover hover:-translate-y-1 transition-all duration-300 cursor-pointer ${
        isInactive
          ? 'bg-dark-950/40 border-dark-850 opacity-65 hover:opacity-80'
          : 'border-dark-800 bg-dark-900 hover:border-brand-500/30'
      }`}
    >
      <div>
        {/* Title Block */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-sans text-lg font-bold text-white transition-colors group-hover:text-brand-300">
              {team.name}
            </h3>
            {isInactive && (
              <span className="text-[9px] uppercase font-bold px-1.5 py-0.25 rounded bg-amber-500/10 border border-amber-500/25 text-amber-400">
                Deactivated
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => onEditClick(e, team)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-dark-800 hover:text-white transition"
              title="Edit team & members"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => onDeleteClick(e, team.id)}
              className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-500/10 transition"
              title="Delete team"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Description */}
        {team.description ? (
          <p className="font-sans text-sm text-slate-400 mt-2 line-clamp-2 leading-relaxed">
            {team.description}
          </p>
        ) : (
          <p className="font-sans text-sm text-slate-605 italic mt-2">
            No description provided.
          </p>
        )}
      </div>

      {/* Stats & KPI Grid */}
      <div className="mt-6 pt-5 border-t border-dark-800/80 space-y-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Users className="h-4 w-4 text-brand-400" />
            Membership
          </span>
          <span className="font-bold text-white bg-dark-950 px-2 py-0.5 rounded-full border border-dark-850">
            {memberCount} {memberCount === 1 ? 'member' : 'members'}
          </span>
        </div>

        {/* Task metrics breakdown */}
        <div className="space-y-2">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
            Tasks ({totalTasks})
          </span>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between bg-dark-950 p-2 rounded-lg border border-dark-850">
              <span className="text-slate-400 flex items-center gap-1">
                <CircleDot className="h-3 w-3 text-slate-400" />
                To Do
              </span>
              <span className="font-bold text-white">{todoCount}</span>
            </div>
            <div className="flex items-center justify-between bg-dark-950 p-2 rounded-lg border border-dark-850">
              <span className="text-amber-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                In Progress
              </span>
              <span className="font-bold text-white">{progressCount}</span>
            </div>
            <div className="flex items-center justify-between bg-dark-950 p-2 rounded-lg border border-dark-850">
              <span className="text-rose-400 flex items-center gap-1">
                <AlertOctagon className="h-3 w-3" />
                Blocked
              </span>
              <span className="font-bold text-white">{blockedCount}</span>
            </div>
            <div className="flex items-center justify-between bg-dark-950 p-2 rounded-lg border border-dark-850">
              <span className="text-emerald-405 flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-emerald-400" />
                Done
              </span>
              <span className="font-bold text-white">{doneCount}</span>
            </div>
          </div>
        </div>

        {/* View Arrow */}
        <div className="flex justify-end text-xs font-bold text-brand-400 group-hover:text-brand-300 transition-colors items-center gap-0.5">
          <span>Enter Team Space</span>
          <ChevronRight className="h-4 w-4" />
        </div>

        {/* Supervisor-Only Meta Data */}
        {profile?.role === 'supervisor' && (team.customer || team.received_date || team.bg_market || team.stage) && (
          <div className="mt-4 pt-4 border-t border-dark-800/60 grid grid-cols-2 gap-x-3 gap-y-3 text-[11px] text-slate-400">
            {team.customer && (
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Customer</span>
                <span className="text-white truncate block font-medium">{team.customer}</span>
              </div>
            )}
            {team.received_date && (
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Received Date</span>
                <span className="text-white block font-medium">{new Date(team.received_date).toLocaleDateString()}</span>
              </div>
            )}
            {team.bg_market && (
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">BG/Market</span>
                <span className="text-white truncate block font-medium capitalize">{team.bg_market}</span>
              </div>
            )}
            {team.stage && (
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Stage</span>
                <span className="text-white truncate block font-medium capitalize">{team.stage}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export const TeamsTab = ({
  teams,
  generalTeams,
  specificTeams,
  inactiveTeams,
  profile,
  isGeneralTeamsCollapsed,
  onToggleGeneralTeamsCollapsed,
  isSpecificTeamsCollapsed,
  onToggleSpecificTeamsCollapsed,
  isInactiveTeamsCollapsed,
  onToggleInactiveTeamsCollapsed,
  onCreateClick,
  onCardClick,
  onEditClick,
  onDeleteClick
}) => {
  if (teams.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-dark-800 p-12 text-center max-w-md mx-auto mt-8">
        <Users className="h-12 w-12 text-slate-600 mx-auto mb-4" />
        <h3 className="text-base font-bold text-white mb-1">No Team Spaces</h3>
        <p className="text-sm text-slate-505 mb-6">
          Get started by creating your very first team space for your company or project.
        </p>
        <button
          onClick={onCreateClick}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-650 transition"
        >
          <FolderPlus className="h-4.5 w-4.5" />
          Create Team
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* General Teams Section */}
      {generalTeams.length > 0 && (
        <div className="space-y-4">
          <button
            onClick={onToggleGeneralTeamsCollapsed}
            className="flex items-center justify-between w-full text-left py-2 px-3 rounded-xl hover:bg-dark-900 border border-transparent hover:border-dark-800 transition"
          >
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-400" />
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                General Team Spaces ({generalTeams.length})
              </h3>
            </div>
            {isGeneralTeamsCollapsed ? (
              <ChevronRight className="h-5 w-5 text-slate-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-500" />
            )}
          </button>
          {!isGeneralTeamsCollapsed && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 pl-3">
              {generalTeams.map((team) => (
                <TeamCard key={team.id} team={team} profile={profile} onCardClick={onCardClick} onEditClick={onEditClick} onDeleteClick={onDeleteClick} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Specific Teams Section */}
      {specificTeams.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-dark-800/40">
          <button
            onClick={onToggleSpecificTeamsCollapsed}
            className="flex items-center justify-between w-full text-left py-2 px-3 rounded-xl hover:bg-dark-900 border border-transparent hover:border-dark-800 transition"
          >
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-400" />
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                Team Specific Spaces ({specificTeams.length})
              </h3>
            </div>
            {isSpecificTeamsCollapsed ? (
              <ChevronRight className="h-5 w-5 text-slate-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-500" />
            )}
          </button>
          {!isSpecificTeamsCollapsed && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 pl-3">
              {specificTeams.map((team) => (
                <TeamCard key={team.id} team={team} profile={profile} onCardClick={onCardClick} onEditClick={onEditClick} onDeleteClick={onDeleteClick} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Inactive Teams Section */}
      {inactiveTeams.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-dark-800/40">
          <button
            onClick={onToggleInactiveTeamsCollapsed}
            className="flex items-center justify-between w-full text-left py-2 px-3 rounded-xl hover:bg-dark-900 border border-transparent hover:border-dark-800 transition"
          >
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                Inactive Teams ({inactiveTeams.length})
              </h3>
            </div>
            {isInactiveTeamsCollapsed ? (
              <ChevronRight className="h-5 w-5 text-slate-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-500" />
            )}
          </button>
          {!isInactiveTeamsCollapsed && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 pl-3">
              {inactiveTeams.map((team) => (
                <TeamCard key={team.id} team={team} profile={profile} onCardClick={onCardClick} onEditClick={onEditClick} onDeleteClick={onDeleteClick} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TeamsTab
