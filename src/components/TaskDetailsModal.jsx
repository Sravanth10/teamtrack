import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { X, Trash2, Edit2, Check, MessageSquare, Clock, Plus, Calendar, Star } from 'lucide-react'

export const TaskDetailsModal = ({ task, isOpen, onClose, onTaskUpdated, onTaskDeleted, isReadOnly }) => {
  const { profile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')
  const [status, setStatus] = useState(task.status)
  const [notes, setNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [taskDate, setTaskDate] = useState(new Date().toISOString().split('T')[0])
  const [deadline, setDeadline] = useState(task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '')
  const [isSubmittingNote, setIsSubmittingNote] = useState(false)
  const [isSavingTask, setIsSavingTask] = useState(false)
  const [error, setError] = useState(null)
  const [milestones, setMilestones] = useState([])

  const isOverdue = () => {
    if (!task.deadline || status === 'Done') return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const deadlineDate = new Date(task.deadline)
    deadlineDate.setHours(0, 0, 0, 0)
    return today > deadlineDate
  }

  useEffect(() => {
    if (isOpen && task.id) {
      setTitle(task.title)
      setDescription(task.description || '')
      setStatus(task.status)
      setTaskDate(task.created_at ? new Date(task.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
      setDeadline(task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '')
      setIsEditing(false)
      setError(null)
      fetchNotes()
      fetchMilestones()
    }
  }, [isOpen, task])

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('task_updates')
        .select(`
          id,
          note,
          created_at,
          user_id,
          users (
            name,
            email,
            role
          )
        `)
        .eq('task_id', task.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setNotes(data || [])
    } catch (err) {
      console.error('Error fetching task updates:', err.message)
    }
  }

  const fetchMilestones = async () => {
    try {
      const { data, error } = await supabase
        .from('milestones')
        .select('task_update_id, milestone_description')
        .eq('task_id', task.id)

      if (error) throw error
      setMilestones(data || [])
    } catch (err) {
      console.error('Error fetching milestones:', err.message)
    }
  }

  const handleMarkMilestone = async (noteId, currentMilestoneText) => {
    if (currentMilestoneText) {
      alert(`Milestone summary: "${currentMilestoneText}"`)
      return
    }

    const desc = window.prompt("Identify this progress note as a milestone. Enter a milestone description:")
    if (desc === null) return
    if (!desc.trim()) {
      alert("Milestone description is required.")
      return
    }

    try {
      const { error: insertErr } = await supabase
        .from('milestones')
        .insert({
          task_id: task.id,
          task_update_id: noteId,
          milestone_description: desc.trim(),
          created_by: profile.id
        })

      if (insertErr) throw insertErr
      fetchMilestones()
    } catch (err) {
      alert(`Failed to save milestone: ${err.message}`)
    }
  }

  const handleSaveTask = async (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setIsSavingTask(true)
    setError(null)
    try {
      // Validate: Member cannot choose a futuristic date
      const todayStr = new Date().toISOString().split('T')[0]
      if (profile.role === 'member' && taskDate > todayStr) {
        throw new Error('Team members cannot record tasks for future dates.')
      }

      // Check for leave on the selected date
      if (profile.role === 'member') {
        const taskDateObj = new Date(taskDate)
        taskDateObj.setHours(12, 0, 0, 0)
        const taskDateStr = taskDateObj.toDateString()

        const { data: leaves, error: leaveErr } = await supabase
          .from('tasks')
          .select('created_at')
          .eq('title', 'Leave')
          .eq('created_by', profile.id)
        
        if (leaveErr) throw leaveErr

        const hasLeaveOnSelectedDate = leaves && leaves.some(l => 
          new Date(l.created_at).toDateString() === taskDateStr
        )

        if (hasLeaveOnSelectedDate) {
          throw new Error(`You cannot set the task date to ${taskDate} because you have a reported leave on that day.`)
        }
      }

      const taskDateObj = new Date(taskDate)
      taskDateObj.setHours(12, 0, 0, 0)

      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          title: title.trim(),
          description: description.trim(),
          status,
          created_at: taskDateObj.toISOString(),
          deadline: deadline ? new Date(deadline).toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id)

      if (updateError) throw updateError
      
      setIsEditing(false)
      onTaskUpdated()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSavingTask(false)
    }
  }

  const handleDeleteTask = async () => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return
    }

    try {
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id)

      if (deleteError) throw deleteError
      onTaskDeleted(task.id)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleAddNote = async (e) => {
    e.preventDefault()
    if (!newNote.trim()) return

    setIsSubmittingNote(true)
    setError(null)
    try {
      const { error: noteError } = await supabase
        .from('task_updates')
        .insert({
          task_id: task.id,
          user_id: profile.id,
          note: newNote.trim()
        })

      if (noteError) throw noteError
      setNewNote('')
      fetchNotes()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmittingNote(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-dark-800 bg-dark-900 shadow-2xl flex flex-col max-h-[90vh] my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dark-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${
              status === 'Done' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
              status === 'In Progress' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
              status === 'Blocked' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
              'bg-slate-500/10 text-slate-400 border-slate-500/30'
            }`}>
              {status}
            </span>
            <span className="text-xs text-slate-505 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Task Details
            </span>
          </div>
          <button 
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-dark-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {error && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">
              {error}
            </div>
          )}

          {/* Task Info Form */}
          {isEditing ? (
            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
                  placeholder="Task title"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full h-28 rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none resize-none"
                  placeholder="Describe the task details..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-lg border border-dark-700 bg-dark-950 px-3 py-2 text-white focus:border-brand-500 focus:outline-none text-sm"
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Blocked">Blocked</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Task Date
                  </label>
                  <input
                    type="date"
                    value={taskDate}
                    onChange={(e) => setTaskDate(e.target.value)}
                    max={profile?.role === 'member' ? new Date().toISOString().split('T')[0] : undefined}
                    className="w-full rounded-lg border border-dark-700 bg-dark-950 px-3 py-2 text-white focus:border-brand-500 focus:outline-none text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Deadline (Optional)
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    min={taskDate}
                    className="w-full rounded-lg border border-dark-700 bg-dark-950 px-3 py-2 text-white focus:border-brand-500 focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-dark-800 text-slate-300 hover:bg-dark-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingTask}
                  className="flex items-center gap-1 px-4 py-2 text-sm font-semibold rounded-lg bg-brand-500 text-white hover:bg-brand-650 disabled:opacity-50 transition shadow-glow-brand"
                >
                  <Check className="h-4 w-4" />
                  {isSavingTask ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-sans text-xl font-bold text-white leading-snug">
                    {task.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-y-1 mt-1 text-xs text-slate-500">
                    <span>
                      Created by {task.users?.name || task.users?.email || 'Unknown'} on {new Date(task.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                    {task.deadline && (
                      <span className={`ml-3 px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                        isOverdue()
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/25 animate-pulse'
                          : 'bg-dark-950 text-slate-350 border border-dark-850'
                      }`}>
                        <Calendar className="h-3 w-3" />
                        Deadline: {new Date(task.deadline).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })} {isOverdue() && '(Overdue)'}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Control Action Buttons */}
                {!isReadOnly && (
                   <div className="flex items-center gap-2">
                     <button
                       onClick={() => setIsEditing(true)}
                       className="flex items-center gap-1 rounded-lg border border-dark-700 bg-dark-950 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-dark-800 hover:text-white transition"
                     >
                       <Edit2 className="h-3.5 w-3.5" />
                       Edit
                     </button>
                     <button
                       onClick={handleDeleteTask}
                       className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 hover:text-rose-200 transition"
                     >
                       <Trash2 className="h-3.5 w-3.5" />
                       Delete
                     </button>
                   </div>
                )}
              </div>

              <div className="rounded-lg bg-dark-950 p-4 border border-dark-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Description</h4>
                {description ? (
                  <p className="font-sans text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {description}
                  </p>
                ) : (
                  <p className="font-sans text-sm text-slate-500 italic">
                    No description provided.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Daily Updates Section */}
          <div className="pt-4 border-t border-dark-800/80">
            <h4 className="font-sans text-sm font-bold text-white flex items-center gap-2 mb-4">
              <MessageSquare className="h-4 w-4 text-brand-400" />
              Daily Updates Notes
              <span className="text-xs font-normal text-slate-500 bg-dark-950 px-2 py-0.5 rounded-full border border-dark-800">
                {notes.length} {notes.length === 1 ? 'note' : 'notes'}
              </span>
            </h4>

            {/* Note Input */}
            {!isReadOnly ? (
              <form onSubmit={handleAddNote} className="mb-6">
                <div className="flex gap-2">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Share what you worked on today (append-only progress note)..."
                    className="flex-1 rounded-lg border border-dark-700 bg-dark-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none resize-none h-12"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingNote || !newNote.trim()}
                    className="flex items-center justify-center rounded-lg bg-brand-500 hover:bg-brand-650 text-white font-semibold text-xs px-4 h-12 transition-all disabled:opacity-50 disabled:hover:bg-brand-500"
                  >
                    {isSubmittingNote ? 'Adding...' : (
                      <>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Note
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5 italic">
                  * Note: Daily updates are immutable logs and cannot be edited or deleted once saved.
                </p>
              </form>
            ) : (
              <div className="rounded-xl border border-dark-800 bg-dark-950/40 p-4 text-center text-xs text-slate-400 mb-6 italic">
                🌴 Board Locked: You cannot append daily updates while marked as On Leave.
              </div>
            )}

            {/* Notes List */}
            <div className="space-y-3.5 max-h-60 overflow-y-auto pr-1">
              {notes.length === 0 ? (
                <div className="rounded-lg bg-dark-950 border border-dashed border-dark-800 p-6 text-center text-slate-500 text-sm">
                  No daily notes have been posted on this task yet.
                </div>
              ) : (
                notes.map((n) => {
                  const noteDate = new Date(n.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                                   const milestoneObj = milestones.find(m => m.task_update_id === n.id)
                   const isMilestone = !!milestoneObj

                   return (
                     <div key={n.id} className="rounded-xl border border-dark-800 bg-dark-950/40 p-3.5 space-y-1.5">
                       <div className="flex items-center justify-between text-xs">
                         <span className="font-semibold text-slate-300">
                           {n.users?.name || n.users?.email || 'Anonymous'}
                           <span className={`ml-2 text-[10px] uppercase tracking-wider px-1.5 py-0.25 rounded-md ${
                             n.users?.role === 'admin' 
                               ? 'bg-rose-500/10 text-rose-400' 
                               : 'bg-emerald-500/10 text-emerald-400'
                           }`}>
                             {n.users?.role}
                           </span>
                         </span>
                         
                         <div className="flex items-center gap-3">
                           {/* Milestone/Star button - visible to Admins only */}
                           {profile?.role === 'admin' && (
                             <button
                               onClick={() => handleMarkMilestone(n.id, milestoneObj?.milestone_description)}
                               className={`flex items-center gap-1 p-1 rounded-md transition-colors ${
                                 isMilestone 
                                   ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20' 
                                   : 'text-slate-500 hover:text-white bg-dark-900/50 hover:bg-dark-800'
                               }`}
                               title={isMilestone ? `Milestone: ${milestoneObj.milestone_description}` : "Mark as Milestone"}
                             >
                               <Star className={`h-3.5 w-3.5 ${isMilestone ? 'fill-current' : ''}`} />
                             </button>
                           )}
                           <span className="text-slate-505 flex items-center gap-1">
                             <Clock className="h-3 w-3" />
                             {noteDate}
                           </span>
                         </div>
                       </div>
                       <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                         {n.note}
                       </p>
                     </div>
                    )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
export default TaskDetailsModal
