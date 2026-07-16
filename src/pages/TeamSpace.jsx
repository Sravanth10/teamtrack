import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/Navbar'
import TaskCard from '../components/TaskCard'
import TaskDetailsModal from '../components/TaskDetailsModal'
import ProjectDetailsModal from '../components/ProjectDetailsModal'
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
  Trash2,
  FlaskConical,
  Pin,
  Edit
} from 'lucide-react'
import swiftLogo from '../assets/swift_logo.png'
import strideLogo from '../assets/stride_logo.png'

export const TeamSpace = () => {
  const { teamId } = useParams()
  const navigate = useNavigate()
  const { profile, loading: authLoading } = useAuth()

  const renderLabLogo = (lab, className = "h-4 w-4") => {
    if (!lab) return <FlaskConical className={className} />
    const isObject = typeof lab === 'object' && lab !== null
    const name = isObject ? lab.name : lab
    const logoUrl = isObject ? lab.logo_url : null

    if (logoUrl) {
      return <img src={logoUrl} alt={name || "Build Team Logo"} className={`${className} rounded-full object-cover`} />
    }

    if (!name) return <FlaskConical className={className} />
    const lowerName = name.toLowerCase().trim()
    if (lowerName.includes('swift')) {
      return <img src={swiftLogo} alt="Swift Build Team" className={`${className} rounded-full object-cover`} />
    }
    if (lowerName.includes('stride')) {
      return <img src={strideLogo} alt="Stride Build Team" className={`${className} rounded-full object-cover`} />
    }
    return <FlaskConical className={className} />
  }

  const [team, setTeam] = useState(null)
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [accessDenied, setAccessDenied] = useState(false)
  const [taskFilter, setTaskFilter] = useState('all')

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)
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

  // Leave/Absence Form States
  const [leaveType, setLeaveType] = useState('leave') // 'leave', 'wfo exception', 'holiday'
  const [leaveId, setLeaveId] = useState('') // required only if type === 'leave'
  const [leaveStartDate, setLeaveStartDate] = useState(new Date().toISOString().split('T')[0])
  const [leaveEndDate, setLeaveEndDate] = useState(new Date().toISOString().split('T')[0])
  const [leaveReason, setLeaveReason] = useState('')
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false)

  // Track Pad States
  const [activeView, setActiveView] = useState('board')
  const [stickyNotes, setStickyNotes] = useState([])
  const [stickyNotesLoading, setStickyNotesLoading] = useState(false)
  const [isStickyModalOpen, setIsStickyModalOpen] = useState(false)
  const [editingSticky, setEditingSticky] = useState(null)
  const [newStickyContent, setNewStickyContent] = useState('')
  const [newStickyType, setNewStickyType] = useState('informational')
  const [isSavingSticky, setIsSavingSticky] = useState(false)

  const fetchStickyNotes = useCallback(async () => {
    if (!teamId) return
    setStickyNotesLoading(true)
    try {
      const { data, error } = await supabase
        .from('sticky_notes')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setStickyNotes(data || [])
    } catch (err) {
      console.error('Error fetching sticky notes:', err.message)
    } finally {
      setStickyNotesLoading(false)
    }
  }, [teamId])

  const fetchData = useCallback(async () => {
    if (!teamId) return
    setLoading(true)
    setError(null)
    setAccessDenied(false)

    try {
      // 1. Verify access permissions
      if (profile.role !== 'admin' && profile.role !== 'supervisor') {
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
        .select('*, labs ( id, name, logo_url )')
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

      if (teamData.category !== 'general') {
        fetchStickyNotes()
      }

    } catch (err) {
      console.error('Error fetching team space details:', err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [teamId, profile, fetchStickyNotes])

  useEffect(() => {
    if (profile) {
      fetchData()
    }
  }, [profile, fetchData])

  useEffect(() => {
    if (activeView === 'trackpad') {
      fetchStickyNotes()
    }
  }, [activeView, fetchStickyNotes])

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
    if (leaveType === 'leave' && !leaveId.trim()) {
      alert('Leave ID is required.')
      return
    }

    setIsSubmittingLeave(true)
    setError(null)
    try {
      const start = new Date(leaveStartDate)
      const end = new Date(leaveEndDate)
      
      if (start.getDay() === 0 || start.getDay() === 6) {
        throw new Error('From Date cannot be a weekend (Saturday or Sunday).')
      }
      
      if (end.getDay() === 0 || end.getDay() === 6) {
        throw new Error('To Date cannot be a weekend (Saturday or Sunday).')
      }
      
      if (end < start) {
        throw new Error('End date cannot be earlier than start date.')
      }

      // Generate range of dates (excluding Sat/Sun)
      const datesArray = []
      let current = new Date(start)
      while (current <= end) {
        const dateObj = new Date(current)
        const dayOfWeek = dateObj.getDay() // 0 = Sunday, 6 = Saturday
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          dateObj.setHours(12, 0, 0, 0)
          datesArray.push(dateObj.toISOString())
        }
        current.setDate(current.getDate() + 1)
      }

      if (datesArray.length === 0) {
        throw new Error('Please select at least one working day (Monday - Friday).')
      }

      // Construct description with formatted type & leave id info
      let formattedDescription = `[Type: ${leaveType.toUpperCase()}]`
      if (leaveType === 'leave') {
        formattedDescription += ` [Leave ID: ${leaveId.trim()}]`
      }
      formattedDescription += ` Reason: ${leaveReason.trim()}`

      // Perform bulk insert
      const rowsToInsert = datesArray.map(dateStr => ({
        team_id: teamId,
        title: 'Leave', // keep title as 'Leave' to match all existing query constraints!
        description: formattedDescription,
        status: 'Blocked',
        created_by: profile.id,
        created_at: dateStr
      }))

      const { error: insertErr } = await supabase
        .from('tasks')
        .insert(rowsToInsert)

      if (insertErr) throw insertErr

      // Reset states
      setLeaveReason('')
      setLeaveId('')
      setLeaveType('leave')
      setLeaveStartDate(new Date().toISOString().split('T')[0])
      setLeaveEndDate(new Date().toISOString().split('T')[0])
      setIsLeaveModalOpen(false)
      fetchData()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmittingLeave(false)
    }
  }

  const handleCancelLeave = async (leaveIds) => {
    if (!window.confirm('Are you sure you want to cancel this leave range?')) return
    try {
      const idsArray = Array.isArray(leaveIds) ? leaveIds : [leaveIds]
      const { error: deleteErr } = await supabase
        .from('tasks')
        .delete()
        .in('id', idsArray)

      if (deleteErr) throw deleteErr
      
      fetchData()
    } catch (err) {
      setError(err.message)
    }
  }
  const handleStartDateChange = (val) => {
    const d = new Date(val)
    if (d.getDay() === 0 || d.getDay() === 6) {
      alert('Weekends (Saturday/Sunday) are non-selectable. Please choose a weekday.')
      // reset to current date, or next Monday if current is weekend
      const today = new Date()
      if (today.getDay() === 0) today.setDate(today.getDate() + 1)
      else if (today.getDay() === 6) today.setDate(today.getDate() + 2)
      setLeaveStartDate(today.toISOString().split('T')[0])
    } else {
      setLeaveStartDate(val)
    }
  }

  const handleEndDateChange = (val) => {
    const d = new Date(val)
    if (d.getDay() === 0 || d.getDay() === 6) {
      alert('Weekends (Saturday/Sunday) are non-selectable. Please choose a weekday.')
      const today = new Date()
      if (today.getDay() === 0) today.setDate(today.getDate() + 1)
      else if (today.getDay() === 6) today.setDate(today.getDate() + 2)
      setLeaveEndDate(today.toISOString().split('T')[0])
    } else {
      setLeaveEndDate(val)
    }
  }

  // Group leaves by author and description so range is shown as one entry
  const getGroupedLeaves = () => {
    const leaveTasks = tasks.filter(t => t.title === 'Leave')
    
    // Group by key: created_by + description
    const groups = {}
    leaveTasks.forEach(task => {
      const key = `${task.created_by}_${task.description}`
      if (!groups[key]) {
        groups[key] = {
          user: task.users,
          created_by: task.created_by,
          description: task.description,
          dates: [],
          ids: []
        }
      }
      groups[key].dates.push(new Date(task.created_at))
      groups[key].ids.push(task.id)
    })

    // Map each group to an entry with min and max date
    return Object.values(groups).map(g => {
      g.dates.sort((a, b) => a - b)
      const fromDate = g.dates[0]
      const toDate = g.dates[g.dates.length - 1]
      return {
        id: g.ids[0],
        ids: g.ids,
        created_by: g.created_by,
        user: g.user,
        description: g.description,
        fromDate,
        toDate
      }
    }).sort((a, b) => b.fromDate - a.fromDate)
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

  // Sticky Notes Actions
  const handleSaveSticky = async (e) => {
    e.preventDefault()
    if (!newStickyContent.trim()) return

    setIsSavingSticky(true)
    try {
      if (editingSticky) {
        const { error } = await supabase
          .from('sticky_notes')
          .update({
            content: newStickyContent.trim(),
            note_type: newStickyType,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingSticky.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('sticky_notes')
          .insert({
            team_id: teamId,
            content: newStickyContent.trim(),
            note_type: newStickyType,
            created_by: profile.id
          })

        if (error) throw error
      }

      setIsStickyModalOpen(false)
      setNewStickyContent('')
      setEditingSticky(null)
      fetchStickyNotes()
    } catch (err) {
      alert(`Failed to save sticky note: ${err.message}`)
    } finally {
      setIsSavingSticky(false)
    }
  }


  const handleDeleteSticky = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this sticky note?')) return

    try {
      const { error } = await supabase
        .from('sticky_notes')
        .delete()
        .eq('id', noteId)

      if (error) throw error
      fetchStickyNotes()
    } catch (err) {
      alert(`Failed to delete sticky note: ${err.message}`)
    }
  }

  const handleOpenStickyModal = (note = null) => {
    if (note) {
      setEditingSticky(note)
      setNewStickyContent(note.content)
      setNewStickyType(note.note_type)
    } else {
      setEditingSticky(null)
      setNewStickyContent('')
      setNewStickyType('informational')
    }
    setIsStickyModalOpen(true)
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

  // Apply task filtering based on selection
  const filteredTasks = tasks.filter(t => {
    if (taskFilter === 'all') return true
    if (taskFilter === 'me') return t.created_by === profile?.id
    return t.created_by === taskFilter
  })

  // Filter tasks into columns (excluding Leave records)
  const columns = {
    'To Do': filteredTasks.filter(t => t.status === 'To Do' && t.title !== 'Leave'),
    'In Progress': filteredTasks.filter(t => t.status === 'In Progress' && t.title !== 'Leave'),
    'Blocked': filteredTasks.filter(t => t.status === 'Blocked' && t.title !== 'Leave'),
    'Done': filteredTasks.filter(t => t.status === 'Done' && t.title !== 'Leave')
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
          {profile.role === 'admin' || profile.role === 'supervisor' ? (
            <button
              onClick={() => navigate(profile.role === 'supervisor' ? -1 : '/admin')}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-655 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </button>
          ) : (
            <div className="text-xs text-slate-505 mt-6 italic">
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
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {(profile.role === 'admin' || profile.role === 'supervisor') && (
              <button
                onClick={() => navigate(profile.role === 'supervisor' ? -1 : '/admin')}
                className="rounded-xl border border-dark-800 bg-dark-900 p-2.5 text-slate-400 hover:bg-dark-800 hover:text-white transition"
                title="Back to Dashboard"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Bookmark className="h-5 w-5 text-brand-400 shrink-0" />
                <h1 className="font-sans text-2xl font-extrabold text-white leading-tight break-words">
                  {team?.name}
                </h1>
                {team?.labs?.name && (
                  <span className="inline-flex items-center gap-1 rounded bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 text-[10px] font-bold text-brand-400 shrink-0">
                    {renderLabLogo(team.labs, "h-4 w-4")}
                    {team.labs.name}
                  </span>
                )}
              </div>
              {team?.description && (
                <p className="text-xs text-slate-450 mt-1 max-w-xl">
                  {team.description}
                </p>
              )}
              {profile?.role === 'supervisor' && (team?.customer || team?.received_date || team?.bg_market || team?.stage) && (
                <div className="flex items-center gap-4 flex-wrap mt-2 text-[11px] text-slate-400">
                  {team.customer && (
                    <div className="flex items-center gap-1 bg-dark-900 border border-dark-800 px-2.5 py-1 rounded-lg">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Customer:</span>
                      <span className="text-white font-medium">{team.customer}</span>
                    </div>
                  )}
                  {team.received_date && (
                    <div className="flex items-center gap-1 bg-dark-900 border border-dark-800 px-2.5 py-1 rounded-lg">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Received:</span>
                      <span className="text-white font-medium">{new Date(team.received_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {team.bg_market && (
                    <div className="flex items-center gap-1 bg-dark-900 border border-dark-800 px-2.5 py-1 rounded-lg">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">BG/Market:</span>
                      <span className="text-white font-medium capitalize">{team.bg_market}</span>
                    </div>
                  )}
                  {team.stage && (
                    <div className="flex items-center gap-1 bg-dark-900 border border-dark-800 px-2.5 py-1 rounded-lg">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Stage:</span>
                      <span className="text-white font-medium capitalize">{team.stage}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {team?.category !== 'general' && (
              <div className="flex bg-dark-900 border border-dark-800 rounded-xl p-1 gap-1">
                <button
                  onClick={() => setActiveView('board')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeView === 'board'
                      ? 'bg-brand-500 text-white shadow-glow-brand'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📊 Board
                </button>
                <button
                  onClick={() => setActiveView('trackpad')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeView === 'trackpad'
                      ? 'bg-brand-500 text-white shadow-glow-brand'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📌 Track Pad
                </button>
              </div>
            )}


            {profile && (profile.role === 'admin' || profile.role === 'supervisor') && (
              <button
                onClick={() => setIsProjectModalOpen(true)}
                className="flex items-center justify-center gap-2 rounded-xl bg-dark-900 border border-dark-700 hover:bg-dark-850 text-slate-350 hover:text-white font-semibold text-sm px-4 py-2.5 transition"
              >
                <FileText className="h-4.5 w-4.5 text-brand-400" />
                Project Details
              </button>
            )}

            {activeView === 'board' ? (
              <>
                {/* Task Filter Dropdown */}
                <select
                  value={taskFilter}
                  onChange={(e) => setTaskFilter(e.target.value)}
                  className="rounded-xl border border-dark-700 bg-dark-900 px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500/60 font-semibold transition hover:bg-dark-800 focus:ring-1 focus:ring-brand-500 cursor-pointer"
                >
                  {profile && (profile.role === 'admin' || profile.role === 'supervisor') ? (
                    <>
                      <option value="all">🔍 All Members</option>
                      <option value="me">👤 My Tasks</option>
                      {members.map((m) => {
                        if (m.user_id === profile.id) return null
                        return (
                          <option key={m.user_id} value={m.user_id}>
                            👤 {m.users?.name || m.email}
                          </option>
                        )
                      })}
                    </>
                  ) : (
                    <>
                      <option value="all">🌐 All Tasks</option>
                      <option value="me">👤 My Tasks</option>
                    </>
                  )}
                </select>

                {profile && profile.role === 'member' && (
                  <button
                    onClick={() => setIsLeaveModalOpen(true)}
                    disabled={!team?.is_active}
                    className="flex items-center justify-center gap-2 rounded-xl bg-dark-900 border border-dark-700 hover:bg-dark-800 text-slate-350 hover:text-white font-semibold text-sm px-4 py-2.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Calendar className="h-4.5 w-4.5 text-brand-400" />
                    Report Leave
                  </button>
                )}
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  disabled={isTodayOnLeave || !team?.is_active}
                  className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-4 py-2.5 transition shadow-glow-brand disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4.5 w-4.5" />
                  Add Task
                </button>
              </>
            ) : (
              (profile?.role === 'admin' || profile?.role === 'supervisor') && (
                <button
                  onClick={() => handleOpenStickyModal()}
                  disabled={!team?.is_active}
                  className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-4 py-2.5 transition shadow-glow-brand disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4.5 w-4.5" />
                  Add Sticky Note
                </button>
              )
            )}
          </div>
        </div>

        {/* Archived Team Warning Banner */}
        {team && !team.is_active && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-glass">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-lg">📁</span>
              <div>
                <h4 className="font-sans text-sm font-bold text-white">This Team Space is Archived (Read-Only)</h4>
                <p className="text-xs text-slate-455 mt-0.5">
                  Admins or supervisors have set this team workspace to inactive. No new tasks or updates can be added.
                </p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 bg-amber-500/20 px-3 py-1 rounded-lg border border-amber-500/30">
              Space Locked
            </span>
          </div>
        )}

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
            {/* Kanban Board Columns / Track Pad */}
          {activeView === 'board' ? (
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
          ) : (
            <div className="flex-1 w-full flex flex-col space-y-6 self-stretch">
              {/* Sticky Notes Grid */}
              {stickyNotesLoading ? (
                <div className="flex justify-center items-center h-64 w-full">
                  <Loader className="h-8 w-8 text-brand-500 animate-spin" />
                </div>
              ) : stickyNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 border border-dashed border-dark-800 rounded-2xl p-8 text-center max-w-md mx-auto w-full my-12 bg-dark-900/10">
                  <Pin className="h-10 w-10 text-slate-650 mb-3 rotate-45" />
                  <h3 className="text-base font-bold text-white mb-1">Track Pad Empty</h3>
                  <p className="text-xs text-slate-500">
                    No sticky notes have been created for this team space yet.
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 w-full">
                  {stickyNotes.map((note) => {
                    const typeStyles = {
                      'informational': 'border-sky-500/20 bg-sky-500/5 text-sky-200 shadow-[0_0_15px_rgba(14,165,233,0.02)]',
                      'action items': 'border-amber-500/20 bg-amber-500/5 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.02)]',
                      'dependencies': 'border-rose-500/20 bg-rose-500/5 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.02)]'
                    }
                    const badgeStyles = {
                      'informational': 'bg-sky-500/10 text-sky-400 border-sky-500/20',
                      'action items': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                      'dependencies': 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }

                    const isAdminOrSupervisor = profile?.role === 'admin' || profile?.role === 'supervisor'

                    return (
                      <div
                        key={note.id}
                        className={`group relative flex flex-col justify-between rounded-2xl border p-5 transition-all duration-300 ${typeStyles[note.note_type]}`}
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${badgeStyles[note.note_type]}`}>
                              <Pin className="h-3 w-3 shrink-0 rotate-45" />
                              {note.note_type}
                            </span>
                            {isAdminOrSupervisor && team?.is_active && (
                              <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleOpenStickyModal(note)}
                                  className="rounded-lg p-1 text-slate-350 hover:bg-dark-800 hover:text-white transition"
                                  title="Edit sticky note"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSticky(note.id)}
                                  className="rounded-lg p-1 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition"
                                  title="Delete sticky note"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                          
                          <p className="text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">
                            {note.content}
                          </p>
                        </div>
                        
                        <div className="mt-4 pt-3 border-t border-dark-800/40 text-[10px] text-slate-500">
                          Last updated: {new Date(note.updated_at).toLocaleString()}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

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
                Team Leaves ({getGroupedLeaves().length})
              </h3>
              
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                {getGroupedLeaves().length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    No leaves reported in this space.
                  </p>
                ) : (
                  getGroupedLeaves().map((leave) => {
                    const canCancel = profile && (profile.role === 'admin' || profile.role === 'supervisor' || leave.created_by === profile.id);
                    const formattedFrom = leave.fromDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    const formattedTo = leave.toDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    const dateDisplay = formattedFrom === formattedTo ? formattedFrom : `${formattedFrom} - ${formattedTo}`
                    
                    return (
                      <div key={leave.id} className="rounded-xl border border-dark-800 bg-dark-950/40 p-3 space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-semibold text-slate-350 truncate max-w-[120px]">
                            {leave.user?.name || leave.user?.email || 'Unknown'}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-brand-400 font-medium">
                              {dateDisplay}
                            </span>
                            {canCancel && (
                              <button
                                onClick={() => handleCancelLeave(leave.ids)}
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
          isReadOnly={isTodayOnLeave || !team?.is_active}
        />
      )}

      {/* Project Details Modal */}
      {isProjectModalOpen && (
        <ProjectDetailsModal
          teamId={teamId}
          teamName={team?.name || ''}
          isOpen={isProjectModalOpen}
          onClose={() => setIsProjectModalOpen(false)}
          onSaved={fetchData}
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
                  Absence Type
                </label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-white focus:border-brand-500 focus:outline-none text-sm"
                >
                  <option value="leave">Leave</option>
                  <option value="wfo exception">WFO Exception</option>
                  <option value="holiday">Holiday</option>
                </select>
              </div>

              {leaveType === 'leave' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Leave ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={leaveId}
                    onChange={(e) => setLeaveId(e.target.value)}
                    placeholder="e.g. L12345"
                    className="w-full rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-white focus:border-brand-500 focus:outline-none text-sm"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={leaveStartDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-white focus:border-brand-500 focus:outline-none text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={leaveEndDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="w-full rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-white focus:border-brand-500 focus:outline-none text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Reason / Description
                </label>
                <textarea
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full h-20 rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none resize-none text-sm"
                  placeholder="Provide reason for absence..."
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
                  disabled={isSubmittingLeave || !leaveReason.trim() || (leaveType === 'leave' && !leaveId.trim())}
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition shadow-glow-brand"
                >
                  {isSubmittingLeave ? 'Submitting...' : 'Submit Leave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sticky Note Creation / Editing Modal */}
      {isStickyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm" 
            onClick={() => setIsStickyModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md transform overflow-hidden rounded-2xl border border-dark-800 bg-dark-900 p-6 shadow-2xl transition-all">
            <div className="flex items-center justify-between border-b border-dark-800 pb-3 mb-4">
              <h3 className="font-sans text-lg font-bold text-white flex items-center gap-2">
                <Pin className="h-5 w-5 text-brand-400 rotate-45" />
                {editingSticky ? 'Edit Sticky Note' : 'Add Sticky Note'}
              </h3>
              <button 
                onClick={() => setIsStickyModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-dark-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSticky} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Note Type
                </label>
                <select
                  value={newStickyType}
                  onChange={(e) => setNewStickyType(e.target.value)}
                  className="w-full rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-white focus:border-brand-500 focus:outline-none text-sm"
                  required
                >
                  <option value="informational">Informational</option>
                  <option value="action items">Action Items</option>
                  <option value="dependencies">Dependencies</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Content / Message *
                </label>
                <textarea
                  value={newStickyContent}
                  onChange={(e) => setNewStickyContent(e.target.value)}
                  placeholder="Write note description, action items, or dependency details..."
                  className="w-full h-32 rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-white placeholder-slate-505 focus:border-brand-500 focus:outline-none resize-none text-sm"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStickyModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-dark-800 text-slate-300 hover:bg-dark-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSticky || !newStickyContent.trim()}
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition shadow-glow-brand flex items-center gap-1.5"
                >
                  {isSavingSticky && <Loader className="h-4 w-4 animate-spin" />}
                  {editingSticky ? 'Save Changes' : 'Create Note'}
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
