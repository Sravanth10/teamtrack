import React from 'react'
import { Calendar, Briefcase, Loader } from 'lucide-react'

const parseLeaveInfo = (description) => {
  if (!description) return { type: 'Leave', leaveId: null, reason: '' }
  const typeMatch = description.match(/\[Type:\s*([^\]]+)\]/i)
  const leaveIdMatch = description.match(/\[Leave ID:\s*([^\]]+)\]/i)
  const reasonMatch = description.match(/Reason:\s*(.*)$/i)
  return {
    type: typeMatch ? typeMatch[1].trim() : 'Leave',
    leaveId: leaveIdMatch ? leaveIdMatch[1].trim() : null,
    reason: reasonMatch ? reasonMatch[1].trim() : description
  }
}

export const LeavesTab = ({ groupedLeaves, leavesLoading }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-dark-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-brand-400" />
            Reported Leaves
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Leave, WFO exception, and holiday reports from members across your Build Team's workspaces.
          </p>
        </div>
        <div className="text-xs text-slate-450 bg-dark-900 border border-dark-800 px-3 py-1.5 rounded-xl font-bold shrink-0">
          Total: {groupedLeaves.length}
        </div>
      </div>

      {leavesLoading ? (
        <div className="flex justify-center py-12">
          <Loader className="h-8 w-8 text-brand-500 animate-spin" />
        </div>
      ) : groupedLeaves.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-dark-800 p-12 text-center max-w-md mx-auto mt-8 bg-dark-900/30">
          <Calendar className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-base font-bold text-white mb-1">No Leaves Reported</h3>
          <p className="text-sm text-slate-550">
            When members report a leave, WFO exception, or holiday, it will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {groupedLeaves.map((leave) => {
            const { type, leaveId, reason } = parseLeaveInfo(leave.description)
            const formattedFrom = leave.fromDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            const formattedTo = leave.toDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            const dateDisplay = formattedFrom === formattedTo ? formattedFrom : `${formattedFrom} - ${formattedTo}`
            const typeStyles = {
              'LEAVE': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
              'WFO EXCEPTION': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
              'HOLIDAY': 'bg-brand-500/10 text-brand-400 border-brand-500/20'
            }
            const typeStyle = typeStyles[type.toUpperCase()] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'

            return (
              <div
                key={leave.key}
                className="rounded-2xl border border-dark-800 bg-dark-900 p-5 flex flex-col gap-3 hover:border-brand-500/10 transition-colors shadow-glass"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-sans font-bold text-white text-sm truncate">
                      {leave.user?.name || leave.user?.email || 'Unknown Member'}
                    </h4>
                    <span className="text-[10px] text-slate-505 font-mono select-all">{leave.user?.email}</span>
                  </div>
                  <span className={`px-2 py-0.5 text-[9px] uppercase font-bold tracking-wide rounded border shrink-0 ${typeStyle}`}>
                    {type}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-brand-400" />
                    {leave.team?.name || 'N/A'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-brand-400" />
                    {dateDisplay}
                  </span>
                  {leaveId && (
                    <span className="text-slate-500 font-mono text-[11px]">ID: {leaveId}</span>
                  )}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed bg-dark-950/40 border border-dark-850/40 p-2.5 rounded-lg">
                  {reason || 'No reason provided.'}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default LeavesTab
