import React from 'react'
import { Calendar, ArrowRight, CheckCircle2, Play, CircleAlert, Pause } from 'lucide-react'

export const TaskCard = ({ task, onUpdateStatus, onClick }) => {
  const { title, description, status, created_at, deadline } = task

  // Determine if task is overdue
  const isOverdue = deadline && status !== 'Done' && (() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const deadlineDate = new Date(deadline)
    deadlineDate.setHours(0, 0, 0, 0)
    return today > deadlineDate
  })()

  // Status mapping for color coding
  const statusStyles = {
    'To Do': {
      border: 'border-l-slate-500',
      bg: 'bg-slate-500/10',
      text: 'text-slate-400',
      badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30'
    },
    'In Progress': {
      border: 'border-l-amber-500',
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    },
    'Done': {
      border: 'border-l-emerald-500',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    },
    'Blocked': {
      border: 'border-l-rose-500',
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
    }
  }

  const currentStyle = statusStyles[status] || statusStyles['To Do']

  const allStatuses = ['To Do', 'In Progress', 'Blocked', 'Done']

  const getStatusIcon = (st) => {
    switch (st) {
      case 'To Do': return <Pause className="h-3 w-3" />
      case 'In Progress': return <Play className="h-3 w-3" />
      case 'Blocked': return <CircleAlert className="h-3 w-3" />
      case 'Done': return <CheckCircle2 className="h-3 w-3" />
      default: return null
    }
  }

  const handleStatusClick = (e, newStatus) => {
    e.stopPropagation() // Prevent opening the details modal
    onUpdateStatus(task.id, newStatus)
  }

  const formattedDate = new Date(created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col justify-between rounded-xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/30 hover:shadow-glass-hover ${currentStyle.border} border-l-4 cursor-pointer ${
        isOverdue 
          ? 'border-red-500/40 bg-red-950/5 shadow-[0_0_12px_rgba(239,68,68,0.12)]' 
          : 'border-dark-800 bg-dark-900 shadow-glass'
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-sans text-base font-bold text-white transition-colors group-hover:text-brand-300 line-clamp-2">
            {title}
          </h4>
          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${currentStyle.badge}`}>
            {status}
          </span>
        </div>

        {description ? (
          <p className="font-sans text-sm text-slate-400 line-clamp-3 mb-4 leading-relaxed">
            {description}
          </p>
        ) : (
          <p className="font-sans text-sm text-slate-600 italic mb-4">
            No description provided.
          </p>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-dark-800/60 flex flex-col gap-3">
        {/* Date and Metadata */}
        <div className="flex flex-col gap-1.5 text-xs text-slate-500">
          <div className="flex items-center">
            <Calendar className="mr-1.5 h-3.5 w-3.5" />
            <span>Created on {formattedDate}</span>
          </div>
          {deadline && (
            <div className={`flex items-center font-medium ${isOverdue ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
              <Calendar className={`mr-1.5 h-3.5 w-3.5 ${isOverdue ? 'text-red-400' : 'text-slate-500'}`} />
              <span>
                Deadline: {new Date(deadline).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })} {isOverdue && '(Overdue)'}
              </span>
            </div>
          )}
        </div>

        {/* Quick status transition actions */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Move Status</span>
          <div className="flex flex-wrap gap-1.5">
            {allStatuses.map((st) => {
              if (st === status) return null
              
              const btnStyles = {
                'To Do': 'hover:bg-slate-500/20 hover:text-slate-200 text-slate-400 border-slate-700',
                'In Progress': 'hover:bg-amber-500/20 hover:text-amber-200 text-amber-400 border-slate-700',
                'Blocked': 'hover:bg-rose-500/20 hover:text-rose-200 text-rose-400 border-slate-700',
                'Done': 'hover:bg-emerald-500/20 hover:text-emerald-200 text-emerald-400 border-slate-700'
              }

              return (
                <button
                  key={st}
                  onClick={(e) => handleStatusClick(e, st)}
                  className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold border bg-dark-950 transition-all duration-200 ${btnStyles[st]}`}
                  title={`Move to ${st}`}
                >
                  {getStatusIcon(st)}
                  <span>{st}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
export default TaskCard
