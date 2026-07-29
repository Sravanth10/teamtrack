import React from 'react'
import { Star, Trash2, Loader } from 'lucide-react'

export const MilestonesTab = ({ milestones, milestonesLoading, onDeleteMilestone }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-dark-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-400 fill-current" />
            Remarkable Milestones
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Consolidated view of achievements and progress milestones marked by team administrators.
          </p>
        </div>
        <div className="text-xs text-slate-450 bg-dark-900 border border-dark-800 px-3 py-1.5 rounded-xl font-bold shrink-0">
          Total: {milestones.length}
        </div>
      </div>

      {milestonesLoading ? (
        <div className="flex justify-center py-12">
          <Loader className="h-8 w-8 text-brand-500 animate-spin" />
        </div>
      ) : milestones.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-dark-800 p-12 text-center max-w-md mx-auto mt-8 bg-dark-900/30">
          <Star className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-base font-bold text-white mb-1">No Milestones Recorded</h3>
          <p className="text-sm text-slate-550">
            Admins can mark developer progress notes as milestones inside task details modals.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
          {milestones.map((milestone) => {
            const rawTask = milestone.tasks
            const task = Array.isArray(rawTask) ? (rawTask[0] || {}) : (rawTask || {})
            const rawNote = milestone.task_updates
            const note = Array.isArray(rawNote) ? (rawNote[0] || {}) : (rawNote || {})

            // Slicing statuses styles
            const statusStyles = {
              'To Do': 'bg-slate-500/10 text-slate-400 border-slate-500/20 border-l-slate-500',
              'In Progress': 'bg-amber-500/10 text-amber-400 border-amber-500/20 border-l-amber-500',
              'Blocked': 'bg-rose-500/10 text-rose-400 border-rose-500/20 border-l-rose-500',
              'Done': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 border-l-emerald-500'
            }
            const taskStyle = statusStyles[task.status] || statusStyles['To Do']

            const formattedTaskDate = task.created_at ? new Date(task.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            }) : 'N/A'

            return (
              <div
                key={milestone.id}
                className="rounded-2xl border border-dark-800 bg-dark-900 p-6 flex flex-col justify-between gap-5 hover:border-brand-500/10 transition-colors shadow-glass relative"
              >
                {/* Remove button */}
                <button
                  onClick={() => onDeleteMilestone(milestone.id)}
                  className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/15 hover:text-rose-400 transition"
                  title="Delete Milestone"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <div className="space-y-4 flex-1">
                  {/* Developer Name */}
                  <div className="pr-10">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 block">Developer</span>
                    <span className="text-sm font-bold text-brand-400">
                      {note.users?.name || note.users?.email || 'N/A'}
                    </span>
                  </div>

                  {/* Title Block */}
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Associated Task Card</span>
                    <div className={`rounded-xl border border-l-4 bg-dark-950/40 p-4 space-y-2 text-xs ${taskStyle}`}>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-sans font-bold text-white text-sm line-clamp-1">{task.title || 'Untitled Task'}</h4>
                        <span className="px-1.5 py-0.25 text-[9px] uppercase font-bold tracking-wide rounded border shrink-0">
                          {task.status}
                        </span>
                      </div>
                      {task.description ? (
                        <p className="text-slate-400 leading-relaxed line-clamp-2 text-[11px]">
                          {task.description}
                        </p>
                      ) : (
                        <p className="text-slate-600 italic text-[11px]">No description.</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-500 pt-1.5 border-t border-dark-800/40">
                        <span>Created: {formattedTaskDate}</span>
                        {task.deadline && (
                          <span className="text-slate-400 font-medium">
                            Deadline: {new Date(task.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Original Developer Progress Note */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-505 block">Progress Note Update</span>
                    <div className="bg-dark-950/20 border border-dark-850 p-3 rounded-xl text-xs text-slate-300 leading-relaxed font-sans italic">
                      "{note.note || 'Progress note deleted/unavailable'}"
                      <span className="text-[9px] text-slate-550 block mt-1.5 not-italic">
                        Posted on {note.created_at ? new Date(note.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Admin's Milestone Summary */}
                  <div className="space-y-1.5 bg-brand-500/5 border border-brand-500/10 p-3 rounded-xl">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-brand-400 block">Milestone Description (Admin Summary)</span>
                    <p className="text-xs text-slate-200 leading-relaxed font-medium">
                      {milestone.milestone_description}
                    </p>
                    <span className="text-[9px] text-slate-500 block">
                      Marked on {new Date(milestone.created_at).toLocaleDateString()}
                    </span>
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

export default MilestonesTab
