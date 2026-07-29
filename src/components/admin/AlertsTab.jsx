import React from 'react'
import { BellRing, Calendar, Loader } from 'lucide-react'
import { toDateKey } from '../../lib/utils'

export const AlertsTab = ({
  filteredAlerts,
  alertsLoading,
  alertsMembers,
  alertsDateFrom,
  onAlertsDateFromChange,
  alertsDateTo,
  onAlertsDateToChange,
  alertsMemberFilter,
  onAlertsMemberFilterChange
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-dark-800 pb-4 flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BellRing className="h-5 w-5 text-brand-400" />
            Missed Progress Alerts
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Weekdays where a member neither logged task activity nor applied leave, across your Build Team.
          </p>
        </div>
        <div className="text-xs text-slate-450 bg-dark-900 border border-dark-800 px-3 py-1.5 rounded-xl font-bold shrink-0">
          Total: {filteredAlerts.length}
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">From</label>
          <input
            type="date"
            value={alertsDateFrom}
            onChange={(e) => onAlertsDateFromChange(e.target.value)}
            max={alertsDateTo}
            className="rounded-lg border border-dark-700 bg-dark-950 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">To</label>
          <input
            type="date"
            value={alertsDateTo}
            onChange={(e) => onAlertsDateToChange(e.target.value)}
            min={alertsDateFrom}
            max={toDateKey(new Date(Date.now() - 86400000))}
            className="rounded-lg border border-dark-700 bg-dark-950 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Member</label>
          <select
            value={alertsMemberFilter}
            onChange={(e) => onAlertsMemberFilterChange(e.target.value)}
            className="rounded-lg border border-dark-700 bg-dark-950 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none min-w-[180px]"
          >
            <option value="all">All Members</option>
            {alertsMembers.map((m) => (
              <option key={m.id} value={m.id}>{m.name || m.email}</option>
            ))}
          </select>
        </div>
      </div>

      {alertsLoading ? (
        <div className="flex justify-center py-12">
          <Loader className="h-8 w-8 text-brand-500 animate-spin" />
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-dark-800 p-12 text-center max-w-md mx-auto mt-8 bg-dark-900/30">
          <BellRing className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-base font-bold text-white mb-1">No Missed Progress</h3>
          <p className="text-sm text-slate-550">
            No members missed logging progress in the selected date range.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className="rounded-2xl border border-dark-800 bg-dark-900 p-5 flex flex-col gap-2 hover:border-rose-500/20 transition-colors shadow-glass"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-sans font-bold text-white text-sm truncate">{alert.memberName}</h4>
                <span className="px-2 py-0.5 text-[9px] uppercase font-bold tracking-wide rounded border shrink-0 bg-rose-500/10 text-rose-400 border-rose-500/20">
                  Missed
                </span>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <Calendar className="h-3.5 w-3.5 text-brand-400" />
                {alert.dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AlertsTab
