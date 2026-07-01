import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/Navbar'
import TaskCard from '../components/TaskCard'
import TaskDetailsModal from '../components/TaskDetailsModal'
import { Loader, ArrowLeft, Archive, AlertCircle, Play, Pause, CircleAlert, CheckCircle2 } from 'lucide-react'

export const TasksArchive = () => {
  const { teamId, category } = useParams()
  const navigate = useNavigate()
  const { profile, loading: authLoading } = useAuth()

  const [team, setTeam] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [accessDenied, setAccessDenied] = useState(false)

  // Details Modal States
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [activeTask, setActiveTask] = useState(null)

  // Mapping from category URL parameter to database status
  const categoryMap = {
    'to-do': 'To Do',
    'in-progress': 'In Progress',
    'blocked': 'Blocked',
    'done': 'Done'
  }

  const dbStatus = categoryMap[category] || 'To Do'

  // Dynamic Styles based on category
  const themeStyles = {
    'To Do': {
      text: 'text-slate-400',
      border: 'border-slate-500/20',
      bg: 'bg-slate-500/10',
      icon: <Pause className="h-5 w-5 text-slate-400" />
    },
    'In Progress': {
      text: 'text-amber-400',
      border: 'border-amber-500/20',
      bg: 'bg-amber-500/10',
      icon: <Play className="h-5 w-5 text-amber-400" />
    },
    'Blocked': {
      text: 'text-rose-400',
      border: 'border-rose-500/20',
      bg: 'bg-rose-500/10',
      icon: <CircleAlert className="h-5 w-5 text-rose-400" />
    },
    'Done': {
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      bg: 'bg-emerald-500/10',
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-400" />
    }
  }

  const currentTheme = themeStyles[dbStatus] || themeStyles['To Do']

  const fetchData = useCallback(async () => {
    if (!teamId || !profile) return
    setLoading(true)
    setError(null)
    setAccessDenied(false)

    try {
      // 1. Verify access permissions
      if (profile.role !== 'admin') {
        const { data: membership, error: memberErr } = await supabase
          .from('team_members')
          .select('id')
          .eq('team_id', teamId)
          .eq('user_id', profile.id)
          .maybeSingle()

        if (memberErr || !membership) {
          setAccessDenied(true)
          setLoading(false)
          return
        }
      }

      // 2. Fetch Team Details
      const { data: teamData, error: teamErr } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single()

      if (teamErr) throw teamErr
      setTeam(teamData)

      // 3. Fetch category tasks (excluding Leave records)
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
        .eq('status', dbStatus)
        .neq('title', 'Leave')
        .order('created_at', { ascending: false })

      if (tasksErr) throw tasksErr
      setTasks(tasksData || [])

    } catch (err) {
      console.error('Error fetching tasks archive:', err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [teamId, profile, dbStatus])

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
      
      // Since status changed, it's no longer in this archive category, remove it
      setTasks(prev => prev.filter(t => t.id !== taskId))
      setIsTaskModalOpen(false)
      setActiveTask(null)
    } catch (err) {
      alert(`Failed to update task status: ${err.message}`)
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
            You do not have permission to view tasks for this team.
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-655 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col text-slate-200">
      <Navbar />

      <main className="flex-1 flex flex-col mx-auto max-w-[1400px] w-full px-4 py-6 sm:px-6 lg:px-8 gap-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-800 pb-5">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => navigate(`/team/${teamId}`)}
              className="rounded-xl border border-dark-800 bg-dark-900 p-2.5 text-slate-400 hover:bg-dark-800 hover:text-white transition"
              title="Back to Team Space"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            
            <div>
              <div className="flex items-center gap-2">
                <Archive className={`h-5 w-5 ${currentTheme.text}`} />
                <h1 className="font-sans text-2xl font-extrabold text-white tracking-tight leading-tight">
                  {dbStatus} Tasks Archive
                </h1>
              </div>
              <p className="text-xs text-slate-450 mt-1">
                Viewing all archived tasks under category **{dbStatus}** for **{team?.name || 'Loading...'}**
              </p>
            </div>
          </div>

          <div className={`flex items-center gap-2 rounded-xl border px-4 py-2 ${currentTheme.bg} ${currentTheme.border} ${currentTheme.text} text-xs font-bold shrink-0 self-start sm:self-auto`}>
            {currentTheme.icon}
            <span>Total Tasks: {tasks.length}</span>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-400">
            {error}
          </div>
        )}

        {/* Scrollable grid of task cards */}
        <div className="flex-1 w-full min-h-[400px]">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border border-dashed border-dark-800 rounded-2xl p-6 text-center max-w-md mx-auto">
              <Archive className="h-10 w-10 text-dark-700 mb-2" />
              <h3 className="text-base font-bold text-white font-sans">Archive is Empty</h3>
              <p className="text-xs text-slate-550 mt-1">
                No tasks are currently listed under "{dbStatus}" in this team space.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start pb-10">
              {tasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onUpdateStatus={handleUpdateStatus}
                  onClick={() => handleTaskClick(task)}
                  canMove={profile?.role === 'admin' || task.created_by === profile?.id}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Details modal */}
      {isTaskModalOpen && activeTask && (
        <TaskDetailsModal
          task={activeTask}
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false)
            setActiveTask(null)
          }}
          onTaskUpdated={fetchData}
          onTaskDeleted={handleTaskDeleted}
          isReadOnly={false}
        />
      )}
    </div>
  )
}

export default TasksArchive
