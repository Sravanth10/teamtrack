import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import TeamModal from '../components/TeamModal'
import { 
  Users, 
  FolderPlus, 
  Settings, 
  Trash2, 
  ChevronRight, 
  CheckCircle, 
  Clock, 
  AlertOctagon, 
  CircleDot,
  Loader,
  Download,
  Check,
  X,
  UserCheck,
  Briefcase,
  Sparkles
} from 'lucide-react'

export const AdminDashboard = () => {
  const navigate = useNavigate()
  const [teams, setTeams] = useState([])
  const [pendingUsers, setPendingUsers] = useState([])
  const [activeTab, setActiveTab] = useState('teams') // 'teams' or 'registrations'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [exporting, setExporting] = useState(false)

  // Roles states for pending approvals
  const [approvingUserId, setApprovingUserId] = useState(null)
  const [selectedRole, setSelectedRole] = useState('member')

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const { data: tasksData, error: exportErr } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          status,
          created_at,
          users (
            name,
            email
          ),
          teams (
            name,
            description
          )
        `)
        .order('created_at', { ascending: false })

      if (exportErr) throw exportErr

      if (!tasksData || tasksData.length === 0) {
        alert('No tasks found to export.')
        return
      }

      const headers = [
        'Member Name',
        'Team Name',
        'Team Description',
        'Task Name',
        'Task Description',
        'Task Date',
        'Status of Task'
      ]

      const escapeCSV = (val) => {
        if (val === null || val === undefined) return ''
        let str = String(val)
        str = str.replace(/"/g, '""')
        if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
          return `"${str}"`
        }
        return str
      }

      const rows = tasksData.map(task => [
        escapeCSV(task.users?.name || task.users?.email || 'Unassigned'),
        escapeCSV(task.teams?.name || 'N/A'),
        escapeCSV(task.teams?.description || ''),
        escapeCSV(task.title),
        escapeCSV(task.description || ''),
        escapeCSV(new Date(task.created_at).toLocaleDateString()),
        escapeCSV(task.title === 'Leave' ? 'Leave' : task.status)
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map(e => e.join(','))
      ].join('\n')

      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `teamtrack_tasks_report_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

    } catch (err) {
      alert(`Export failed: ${err.message}`)
    } finally {
      setExporting(false)
    }
  }

  const fetchTeams = async () => {
    try {
      const { data, error: fetchErr } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          description,
          created_at,
          team_members (id),
          tasks (id, status)
        `)
        .order('created_at', { ascending: false })

      if (fetchErr) throw fetchErr
      setTeams(data || [])
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchPendingUsers = async () => {
    try {
      const { data, error: fetchErr } = await supabase
        .from('users')
        .select('*')
        .eq('approved_status', 'pending')
        .order('created_at', { ascending: false })

      if (fetchErr) throw fetchErr
      setPendingUsers(data || [])
    } catch (err) {
      setError(err.message)
    }
  }

  const loadData = async () => {
    setLoading(true)
    setError(null)
    await Promise.all([fetchTeams(), fetchPendingUsers()])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateClick = () => {
    setSelectedTeam(null)
    setIsModalOpen(true)
  }

  const handleEditClick = (e, team) => {
    e.stopPropagation()
    setSelectedTeam(team)
    setIsModalOpen(true)
  }

  const handleDeleteClick = async (e, teamId) => {
    e.stopPropagation()
    if (!window.confirm('Are you sure you want to delete this team? All associated tasks, daily notes, and memberships will be deleted permanently.')) {
      return
    }

    try {
      const { error: deleteErr } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId)

      if (deleteErr) throw deleteErr
      fetchTeams()
    } catch (err) {
      alert(`Failed to delete team: ${err.message}`)
    }
  }

  const handleCardClick = (teamId) => {
    navigate(`/team/${teamId}`)
  }

  // Pending Approvals Actions
  const handleApproveClick = (userId) => {
    setApprovingUserId(userId)
    setSelectedRole('member') // default
  }

  const handleConfirmApproval = async (userId) => {
    try {
      const { error: updateErr } = await supabase
        .from('users')
        .update({ 
          approved_status: 'approved',
          role: selectedRole
        })
        .eq('id', userId)

      if (updateErr) throw updateErr
      
      setApprovingUserId(null)
      loadData()
    } catch (err) {
      alert(`Approval failed: ${err.message}`)
    }
  }

  const handleRejectClick = async (userId) => {
    if (!window.confirm('Are you sure you want to reject this registration request?')) {
      return
    }

    try {
      const { error: updateErr } = await supabase
        .from('users')
        .update({ approved_status: 'rejected' })
        .eq('id', userId)

      if (updateErr) throw updateErr
      loadData()
    } catch (err) {
      alert(`Rejection failed: ${err.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-dark-800 pb-6">
          <div>
            <h1 className="font-sans text-3xl font-extrabold tracking-tight text-white">
              Global Dashboard
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Monitor team spaces, configure tasks, and allocate team memberships.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              className="flex items-center justify-center gap-2 rounded-xl bg-dark-900 border border-dark-700 hover:bg-dark-800 text-slate-350 hover:text-white font-semibold text-sm px-5 py-3 transition"
            >
              <Download className="h-5 w-5 text-brand-400" />
              {exporting ? 'Exporting...' : 'Export Report (Excel/CSV)'}
            </button>
            
            <button
              onClick={handleCreateClick}
              className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-5 py-3 transition shadow-glow-brand"
            >
              <FolderPlus className="h-5 w-5" />
              Create Team Space
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-400">
            {error}
          </div>
        )}

        {/* Tab Headers */}
        <div className="flex border-b border-dark-800">
          <button
            onClick={() => setActiveTab('teams')}
            className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'teams' 
                ? 'border-brand-500 text-white' 
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Team Spaces ({teams.length})
          </button>
          <button
            onClick={() => setActiveTab('registrations')}
            className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'registrations' 
                ? 'border-brand-500 text-white' 
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span>User Registrations</span>
            {pendingUsers.length > 0 && (
              <span className="bg-amber-500 text-dark-950 font-sans font-extrabold text-[10px] px-2 py-0.5 rounded-full border border-amber-600 animate-pulse">
                {pendingUsers.length}
              </span>
            )}
          </button>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader className="h-10 w-10 text-brand-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Active Tab: Teams spaces */}
            {activeTab === 'teams' && (
              <>
                {teams.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-dark-800 p-12 text-center max-w-md mx-auto mt-8">
                    <Users className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-base font-bold text-white mb-1">No Team Spaces</h3>
                    <p className="text-sm text-slate-505 mb-6">
                      Get started by creating your very first team space for your company or project.
                    </p>
                    <button
                      onClick={handleCreateClick}
                      className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-650 transition"
                    >
                      <FolderPlus className="h-4.5 w-4.5" />
                      Create Team
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {teams.map((team) => {
                      const memberCount = team.team_members?.length || 0
                      const tasksList = team.tasks || []
                      
                      const todoCount = tasksList.filter(t => t.status === 'To Do').length
                      const progressCount = tasksList.filter(t => t.status === 'In Progress').length
                      const blockedCount = tasksList.filter(t => t.status === 'Blocked').length
                      const doneCount = tasksList.filter(t => t.status === 'Done').length
                      const totalTasks = tasksList.length

                      return (
                        <div
                          key={team.id}
                          onClick={() => handleCardClick(team.id)}
                          className="group relative flex flex-col justify-between rounded-2xl border border-dark-800 bg-dark-900 p-6 shadow-glass hover:border-brand-500/30 hover:shadow-glass-hover hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                        >
                          <div>
                            {/* Title Block */}
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-sans text-lg font-bold text-white transition-colors group-hover:text-brand-300">
                                {team.name}
                              </h3>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => handleEditClick(e, team)}
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-dark-800 hover:text-white transition"
                                  title="Edit team & members"
                                >
                                  <Settings className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={(e) => handleDeleteClick(e, team.id)}
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
                                  <span className="text-emerald-400 flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" />
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
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {/* Active Tab: User approvals */}
            {activeTab === 'registrations' && (
              <>
                {pendingUsers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-dark-800 p-12 text-center max-w-md mx-auto mt-8">
                    <UserCheck className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-base font-bold text-white mb-1 font-sans">No Pending Registrations</h3>
                    <p className="text-sm text-slate-500">
                      All user registration requests have been processed. New requests will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingUsers.map((u) => (
                      <div 
                        key={u.id}
                        className="rounded-2xl border border-dark-800 bg-dark-900 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-glass hover:border-brand-500/10 transition-colors"
                      >
                        {/* User Details */}
                        <div className="space-y-3 flex-1 min-w-0">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <h3 className="font-sans text-lg font-bold text-white truncate">{u.name}</h3>
                            <span className="text-xs text-slate-500 font-mono select-all">{u.email}</span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Briefcase className="h-4 w-4 text-brand-400 shrink-0" />
                            <span className="font-medium">Experience:</span>
                            <span className="text-slate-200">{u.experience || 'Not specified'}</span>
                          </div>

                          {/* Skills tags */}
                          <div className="space-y-1.5">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1">
                              <Sparkles className="h-3.5 w-3.5 text-brand-400" />
                              Technical Skills
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {u.skills && u.skills.length > 0 ? (
                                u.skills.map((skill) => (
                                  <span 
                                    key={skill}
                                    className="inline-flex rounded bg-dark-950 border border-dark-800 px-2 py-0.5 text-xs text-slate-350 font-medium"
                                  >
                                    {skill}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-slate-600 italic">No skills listed.</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Approval Actions */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                          {approvingUserId === u.id ? (
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-dark-950 border border-dark-850 p-2.5 rounded-xl">
                              <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-slate-450 uppercase shrink-0">Assign Role:</label>
                                <select
                                  value={selectedRole}
                                  onChange={(e) => setSelectedRole(e.target.value)}
                                  className="rounded-lg border border-dark-700 bg-dark-900 px-2.5 py-1 text-xs text-white focus:border-brand-500 focus:outline-none"
                                >
                                  <option value="member">Team Member</option>
                                  <option value="admin">Lead Admin</option>
                                </select>
                              </div>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => handleConfirmApproval(u.id)}
                                  className="flex items-center justify-center gap-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs px-3 py-1.5 transition"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setApprovingUserId(null)}
                                  className="flex items-center justify-center rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-400 hover:text-white px-2 py-1.5 transition"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => handleApproveClick(u.id)}
                                className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-4.5 py-2.5 transition"
                              >
                                <Check className="h-4.5 w-4.5" />
                                Approve User
                              </button>
                              <button
                                onClick={() => handleRejectClick(u.id)}
                                className="flex items-center justify-center gap-1.5 rounded-xl bg-dark-900 border border-rose-500/20 hover:bg-rose-500/10 text-rose-400 hover:text-rose-200 font-semibold text-sm px-4.5 py-2.5 transition"
                              >
                                <X className="h-4.5 w-4.5" />
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Team configuration Modal */}
      <TeamModal
        team={selectedTeam}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={fetchTeams}
      />
    </div>
  )
}

export default AdminDashboard
