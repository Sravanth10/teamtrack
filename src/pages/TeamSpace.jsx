import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/Navbar'
import TaskCard from '../components/TaskCard'
import TaskDetailsModal from '../components/TaskDetailsModal'
import { 
  Plus, 
  ArrowLeft, 
  Users, 
  Compass, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Loader,
  X,
  Bookmark,
  Calendar,
  Trash2
} from 'lucide-react'

export const TeamSpace = () => {
  const { teamId } = useParams()
  const navigate = useNavigate()
  const { profile, loading: authLoading } = useAuth()

  const [team, setTeam] = useState(null)
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [accessDenied, setAccessDenied] = useState(false)

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [activeTask, setActiveTask] = useState(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false)

  // Create Task Form States
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().split('T')[0])
  const [newDeadline, setNewDeadline] = useState('')
  const [newTaskType, setNewTaskType] = useState('exploration/other') // 'assignment' or 'exploration/other'
  const [isSubmittingTask, setIsSubmittingTask] = useState(false)

  // Leave Form States
  const [leaveReason, setLeaveReason] = useState('')
  const [leaveDate, setLeaveDate] = useState(new Date().toISOString().split('T')[0])
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false)

  const fetchData = useCallback(async () => {
    if (!teamId) return
    setLoading(true)
    setError(null)
    setAccessDenied(false)

    try {
      // 1. Verify access permissions
      if (profile.role !== 'admin') {
        const { data: membership, error: memErr } = await supabase
          .from('team_members')
          .select('id')
          .eq('team_id', teamId)
          .eq('user_id', profile.id)
          .maybeSingle()

        if (memErr) throw memErr
        if (!membership) {
          setAccessDenied(true)
          setLoading(false)
          return
        }
      }

      // 2. Fetch Team Info
      const { data: teamData, error: teamErr } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single()

      if (teamErr) throw teamErr
      setTeam(teamData)

      // 3. Fetch Tasks
      const { data: tasksData, error: tasksErr } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          status,
          task_type,
          created_at,
          updated_at,
          created_by,
          deadline,
          users (
            name,
            email,
            role
          )
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })

      if (tasksErr) throw tasksErr
      setTasks(tasksData || [])

      // 4. Fetch Members
      const { data: membersData, error: membersErr } = await supabase
        .from('team_members')
        .select(`
          id,
          user_id,
          email,
          users (
            name,
            email,
            role
          )
        `)
        .eq('team_id', teamId)

      if (membersErr) throw membersErr
      setMembers(membersData || [])

    } catch (err) {
      console.error('Error fetching team space details:', err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [teamId, profile])

  useEffect(() => {
    if (profile) {
      fetchData()
    }
  }, [profile, fetchData])

  useEffect(() => {
    if (!authLoading && !profile) {
      navigate('/')
    }
  }, [profile, authLoading, navigate])

  const handleUpdateStatus = async (taskId, newStatus) => {
    // Prevent members from changing status of tasks they did not create
    const targetTask = tasks.find(t => t.id === taskId)
    if (targetTask && profile?.role === 'member' && targetTask.created_by !== profile.id) {
      alert('You are not authorized to update status on tasks created by other users.')
      return
    }

    try {
      const { error: updateErr } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)

      if (updateErr) throw updateErr
      
      // Update local state directly for speed
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
      
      // Also update active details modal if it matches
      if (activeTask && activeTask.id === taskId) {
        setActiveTask(prev => ({ ...prev, status: newStatus }))
      }
    } catch (err) {
      alert(`Failed to update task status: ${err.message}`)
    }
  }

  const handleCreateTask = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    // Validate deadline is mandatory for assignment task type
    if (newTaskType === 'assignment' && !newDeadline) {
      setError('Deadline is mandatory for assignment task type.')
      return
    }

    setIsSubmittingTask(true)
    setError(null)
    try {
      // Validate: Member cannot choose a futuristic date
      const todayStr = new Date().toISOString().split('T')[0]
      if (profile.role === 'member' && newTaskDate > todayStr) {
        throw new Error('Team members cannot record tasks for future dates.')
      }

      // Midnight adjustment to prevent timezone offsets
      const taskDateObj = new Date(newTaskDate)
      taskDateObj.setHours(12, 0, 0, 0)
      const taskDateStr = taskDateObj.toDateString()

      // Validate: Member cannot report tasks on a leave day
      const isLeaveOnSelectedDate = tasks.some(t => 
        t.title === 'Leave' && 
        new Date(t.created_at).toDateString() === taskDateStr &&
        t.created_by === profile.id
      )

      if (profile.role === 'member' && isLeaveOnSelectedDate) {
        throw new Error(`You cannot record tasks for ${newTaskDate} because you have a reported leave on that day.`)
      }

      const { error: insertErr } = await supabase
        .from('tasks')
        .insert({
          team_id: teamId,
          title: newTitle.trim(),
          description: newDescription.trim(),
          status: 'To Do',
          task_type: newTaskType,
          created_by: profile.id,
          created_at: taskDateObj.toISOString(),
          deadline: newDeadline ? new Date(newDeadline).toISOString() : null
        })

      if (insertErr) throw insertErr

      setNewTitle('')
      setNewDescription('')
      setNewTaskDate(new Date().toISOString().split('T')[0])
      setNewDeadline('')
      setNewTaskType('exploration/other')
      setIsCreateModalOpen(false)
      fetchData()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmittingTask(false)
    }
  }

  const handleReportLeave = async (e) => {
    e.preventDefault()
    if (!leaveReason.trim()) return

    setIsSubmittingLeave(true)
    setError(null)
    try {
      // Midnight adjustment to prevent timezone offsets
      const selectedDate = new Date(leaveDate)
      selectedDate.setHours(12, 0, 0, 0)

      const { error: insertErr } = await supabase
        .from('tasks')
        .insert({
          team_id: teamId,
          title: 'Leave',
          description: leaveReason.trim(),
          status: 'Blocked',
          created_by: profile.id,
          created_at: selectedDate.toISOString()
        })

      if (insertErr) throw insertErr

      setLeaveReason('')
      setLeaveDate(new Date().toISOString().split('T')[0])
      setIsLeaveModalOpen(false)
      fetchData()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmittingLeave(false)
    }
  }

  const handleCancelLeave = async (leaveId) => {
    if (!window.confirm('Are you sure you want to cancel this leave?')) return
    try {
      const { error: deleteErr } = await supabase
        .from('tasks')
        .delete()
        .eq('id', leaveId)

      if (deleteErr) throw deleteErr
      
      fetchData()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleTaskClick = (task) => {
    setActiveTask(task)
    setIsTaskModalOpen(true)
  }

  const handleTaskDeleted = (taskId) => {
    setIsTaskModalOpen(false)
    setActiveTask(null)
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  // Check if member is on leave today
  const isTodayOnLeave = !loading && profile && profile.role === 'member' && tasks.some(t => 
    t.title === 'Leave' && 
    new Date(t.created_at).toDateString() === new Date().toDateString() &&
    t.created_by === profile.id
  )

  const todayLeaveReason = isTodayOnLeave ? tasks.find(t => 
    t.title === 'Leave' && 
    new Date(t.created_at).toDateString() === new Date().toDateString() &&
    t.created_by === profile.id
  )?.description : ''

  // Filter tasks into columns (excluding Leave records)
  const columns = {
    'To Do': tasks.filter(t => t.status === 'To Do' && t.title !== 'Leave'),
    'In Progress': tasks.filter(t => t.status === 'In Progress' && t.title !== 'Leave'),
    'Blocked': tasks.filter(t => t.status === 'Blocked' && t.title !== 'Leave'),
    'Done': tasks.filter(t => t.status === 'Done' && t.title !== 'Leave')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col justify-center items-center">
        <Loader className="h-10 w-10 text-brand-500 animate-spin" />
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col justify-center items-center p-6 text-center">
          <AlertCircle className="h-16 w-16 text-rose-500 mb-4 animate-bounce" />
          <h2 className="text-2xl font-extrabold text-white">Access Denied</h2>
          <p className="text-sm text-slate-400 mt-2 max-w-md">
            You do not have permission to access this team space. If you think this is a mistake, contact your administrator.
          </p>
          {profile.role === 'admin' ? (
            <button
              onClick={() => navigate('/admin')}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-655 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </button>
          ) : (
            <div className="text-xs text-slate-500 mt-6 italic">
              Logged in as {profile.email}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      <Navbar />

      {/* Main Container */}
      <main className="flex-1 flex flex-col mx-auto max-w-[1600px] w-full px-4 py-6 sm:px-6 lg:px-8 gap-6">
        
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-dark-800 pb-4">
          <div className="flex items-center gap-3">
            {profile.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                className="rounded-xl border border-dark-800 bg-dark-900 p-2.5 text-slate-400 hover:bg-dark-800 hover:text-white transition"
                title="Back to Dashboard"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <Bookmark className="h-5 w-5 text-brand-400" />
                <h1 className="font-sans text-2xl font-extrabold text-white leading-tight">
                  {team?.name}
                </h1>
              </div>
              {team?.description && (
                <p className="text-xs text-slate-450 mt-1 max-w-xl">
                  {team.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {profile && profile.role === 'member' && (
              <button
                onClick={() => setIsLeaveModalOpen(true)}
                className="flex items-center justify-center gap-2 rounded-xl bg-dark-900 border border-dark-700 hover:bg-dark-800 text-slate-350 hover:text-white font-semibold text-sm px-4 py-2.5 transition"
              >
                <Calendar className="h-4.5 w-4.5 text-brand-400" />
                Report Leave
              </button>
            )}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              disabled={isTodayOnLeave}
              className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-4 py-2.5 transition shadow-glow-brand disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="h-4.5 w-4.5" />
              Add Task
            </button>
          </div>
        </div>

        {/* Leave Warning Banner */}
        {isTodayOnLeave && (
          <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-glass">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-lg">🌴</span>
              <div>
                <h4 className="font-sans text-sm font-bold text-white">You are marked as On Leave today</h4>
                <p className="text-xs text-slate-400 mt-0.5">Reason: {todayLeaveReason || 'No reason specified'}</p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400 bg-rose-500/20 px-3 py-1 rounded-lg border border-rose-500/30">
              Board Locked Today
            </span>
          </div>
        )}

        {/* Content Layout Grid (Sidebar on desktop) */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 items-start">
          
          {/* Kanban Board Columns */}
          <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
            {Object.entries(columns).map(([colName, colTasks]) => {
              
              // Styles for headers
              const headerStyles = {
                'To Do': 'text-slate-400 bg-slate-500/10 border-slate-500/20',
                'In Progress': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                'Blocked': 'text-rose-400 bg-rose-500/10 border-rose-500/20',
                'Done': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
              }

              return (
                <div key={colName} className="flex flex-col bg-dark-900/40 border border-dark-800 rounded-2xl p-4 min-h-[500px]">
                  
                  {/* Column Header */}
                  <div className={`flex items-center justify-between rounded-xl border px-3 py-2 mb-4 font-sans font-bold text-xs ${headerStyles[colName]}`}>
                    <span>{colName}</span>
                    <span className="bg-dark-950 px-2 py-0.5 rounded-full border border-dark-800">
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Tasks list */}
                  <div className="space-y-3.5 flex-1 overflow-y-auto">
                    {colTasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-48 border border-dashed border-dark-800 rounded-xl p-4 text-center">
                        <FileText className="h-7 w-7 text-dark-700 mb-1" />
                        <span className="text-xs text-slate-500">No tasks in {colName}</span>
                      </div>
                    ) : (
                      <>
                        {colTasks.slice(0, 3).map(task => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onUpdateStatus={isTodayOnLeave ? () => {} : handleUpdateStatus}
                            onClick={() => handleTaskClick(task)}
                            canMove={!isTodayOnLeave && (profile?.role === 'admin' || task.created_by === profile?.id)}
                          />
                        ))}

                        {colTasks.length > 3 && (
                          <button
                            onClick={() => {
                              const categorySlugMap = {
                                'To Do': 'to-do',
                                'In Progress': 'in-progress',
                                'Blocked': 'blocked',
                                'Done': 'done'
                              }
                              navigate(`/team/${teamId}/archive/${categorySlugMap[colName]}`)
                            }}
                            className="w-full py-2.5 mt-2 text-center text-xs font-bold text-brand-400 hover:text-brand-300 bg-dark-950 hover:bg-dark-800 border border-dark-850 hover:border-brand-500/20 rounded-xl transition"
                          >
                            See previous tasks ({colTasks.length - 3} more)
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Roster Sidebar */}
          <div className="w-full lg:w-80 shrink-0 bg-dark-900 border border-dark-800 rounded-2xl p-5 space-y-4">
            <h3 className="font-sans text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-dark-800">
              <Users className="h-4.5 w-4.5 text-brand-400" />
              Team Members ({members.length})
            </h3>
            
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {members.length === 0 ? (
                <p className="text-xs text-slate-500 italic">
                  No users assigned to this team space.
                </p>
              ) : (
                members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-dark-950 border border-dark-700 flex items-center justify-center font-bold text-[10px] text-brand-400 uppercase">
                      {m.users?.name ? m.users.name.slice(0, 2) : (m.email ? m.email.slice(0, 2) : 'M')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-slate-350 truncate">
                        {m.users?.name || 'Pending Invite'}
                      </h4>
                      <p className="text-[10px] text-slate-500 truncate">
                        {m.users?.email || m.email}
                      </p>
                    </div>
                    <span className="text-[9px] uppercase font-bold tracking-wide px-1 py-0.25 bg-dark-950 border border-dark-800 rounded text-slate-550">
                      {m.users?.role || 'Invited'}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Leaves List */}
            <div className="pt-4 border-t border-dark-800/80 space-y-4">
              <h3 className="font-sans text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="h-4.5 w-4.5 text-brand-400" />
                Team Leaves ({tasks.filter(t => t.title === 'Leave').length})
              </h3>
              
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                {tasks.filter(t => t.title === 'Leave').length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    No leaves reported in this space.
                  </p>
                ) : (
                  tasks.filter(t => t.title === 'Leave').map((leave) => {
                    const canCancel = profile && (profile.role === 'admin' || leave.created_by === profile.id);
                    return (
                      <div key={leave.id} className="rounded-xl border border-dark-800 bg-dark-950/40 p-3 space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-semibold text-slate-350 truncate max-w-[120px]">
                            {leave.users?.name || leave.users?.email || 'Unknown'}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-brand-400 font-medium">
                              {new Date(leave.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                            {canCancel && (
                              <button
                                onClick={() => handleCancelLeave(leave.id)}
                                className="text-slate-500 hover:text-rose-400 transition-colors p-0.5 rounded hover:bg-dark-900"
                                title="Cancel Leave"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {leave.description}
                        </p>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Task Details & Update notes Modal */}
      {activeTask && (
        <TaskDetailsModal
          task={activeTask}
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false)
            setActiveTask(null)
          }}
          onTaskUpdated={fetchData}
          onTaskDeleted={handleTaskDeleted}
          isReadOnly={isTodayOnLeave}
        />
      )}

      {/* Create Task Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm" 
            onClick={() => setIsCreateModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md transform overflow-hidden rounded-2xl border border-dark-800 bg-dark-900 p-6 shadow-2xl transition-all">
            <div className="flex items-center justify-between border-b border-dark-800 pb-3 mb-4">
              <h3 className="font-sans text-lg font-bold text-white flex items-center gap-2">
                Create New Task
              </h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-dark-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              {/* Task Type Radio Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Task Type *
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm text-slate-350 cursor-pointer">
                    <input
                      type="radio"
                      name="newTaskType"
                      value="assignment"
                      checked={newTaskType === 'assignment'}
                      onChange={() => setNewTaskType('assignment')}
                      className="accent-brand-500"
                    />
                    Assignment
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-350 cursor-pointer">
                    <input
                      type="radio"
                      name="newTaskType"
                      value="exploration/other"
                      checked={newTaskType === 'exploration/other'}
                      onChange={() => setNewTaskType('exploration/other')}
                      className="accent-brand-500"
                    />
                    Exploration/Other
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Task Date *
                  </label>
                  <input
                    type="date"
                    value={newTaskDate}
                    onChange={(e) => setNewTaskDate(e.target.value)}
                    max={profile?.role === 'member' ? new Date().toISOString().split('T')[0] : undefined}
                    className="w-full rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-white focus:border-brand-500 focus:outline-none text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Deadline {newTaskType === 'assignment' ? '*' : '(Optional)'}
                  </label>
                  <input
                    type="date"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    min={newTaskDate}
                    className="w-full rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-white focus:border-brand-500 focus:outline-none text-sm"
                    required={newTaskType === 'assignment'}
                  />
                </div>
              </div>
              <div className="text-[10px] text-slate-500 italic">
                {profile?.role === 'member' 
                  ? '* Future dates disabled for members.' 
                  : '* Leads can plan future tasks.'}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
                  placeholder="Summarize the action item..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Description
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full h-24 rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none resize-none"
                  placeholder="Provide supporting context or requirements..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-dark-800 text-slate-300 hover:bg-dark-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTask || !newTitle.trim()}
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition shadow-glow-brand"
                >
                  {isSubmittingTask ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Leave Modal */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm" 
            onClick={() => setIsLeaveModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md transform overflow-hidden rounded-2xl border border-dark-800 bg-dark-900 p-6 shadow-2xl transition-all">
            <div className="flex items-center justify-between border-b border-dark-800 pb-3 mb-4">
              <h3 className="font-sans text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-brand-400" />
                Report Leave
              </h3>
              <button 
                onClick={() => setIsLeaveModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-dark-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleReportLeave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Leave Date
                </label>
                <input
                  type="date"
                  value={leaveDate}
                  onChange={(e) => setLeaveDate(e.target.value)}
                  className="w-full rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-white focus:border-brand-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Reason for Leave
                </label>
                <textarea
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full h-24 rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none resize-none"
                  placeholder="e.g. Personal emergency, sick leave..."
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-dark-800 text-slate-300 hover:bg-dark-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLeave || !leaveReason.trim()}
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition shadow-glow-brand"
                >
                  {isSubmittingLeave ? 'Submitting...' : 'Submit Leave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
export default TeamSpace
