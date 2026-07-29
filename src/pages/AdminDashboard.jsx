import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/Navbar'
import TeamModal from '../components/TeamModal'
import TeamsTab from '../components/admin/TeamsTab'
import RegistrationsTab from '../components/admin/RegistrationsTab'
import ProfilesTab from '../components/admin/ProfilesTab'
import MilestonesTab from '../components/admin/MilestonesTab'
import OverviewTab from '../components/admin/OverviewTab'
import LeavesTab from '../components/admin/LeavesTab'
import AlertsTab from '../components/admin/AlertsTab'
import EditProfileModal from '../components/admin/EditProfileModal'
import {
  FolderPlus,
  Loader,
  Download,
  ArrowLeft,
  FlaskConical
} from 'lucide-react'
import { getTeamCategoryLabel, toDateKey } from '../lib/utils'
import swiftLogo from '../assets/swift_logo.png'
import strideLogo from '../assets/stride_logo.png'

export const AdminDashboard = () => {
  const navigate = useNavigate()
  const { labId } = useParams()          // present when supervisor enters /supervisor/lab/:labId
  const { profile, isSupervisor } = useAuth()
  const isSupervisorView = !!labId       // true = supervisor entered a specific lab

  const renderLabLogo = (lab, className = "h-4 w-4") => {
    if (!lab) return <FlaskConical className={className} />
    const isObject = typeof lab === 'object'
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

  const [labName, setLabName] = useState(null)  // name of current lab (for header)
  const [labLogoUrl, setLabLogoUrl] = useState(null)

  const [teams, setTeams] = useState([])
  const [pendingUsers, setPendingUsers] = useState([])
  const [activeTab, setActiveTab] = useState('teams') // 'teams' or 'registrations'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [currentLabId, setCurrentLabId] = useState(null)

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [exporting, setExporting] = useState(false)

  // Roles states for pending approvals
  const [approvingUserId, setApprovingUserId] = useState(null)
  const [selectedRole, setSelectedRole] = useState('member')

  // User Profiles Tab States
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Milestones Tab States
  const [milestones, setMilestones] = useState([])
  const [milestonesLoading, setMilestonesLoading] = useState(false)

  // Leaves Tab States (Lead Admin only, not shown for supervisors)
  const [leaves, setLeaves] = useState([])
  const [leavesLoading, setLeavesLoading] = useState(false)
  // How many raw leave rows have been viewed, for the unread badge. Persisted to localStorage
  // (keyed per admin) so the badge stays de-highlighted across page reloads until a new leave is logged.
  const [leavesSeenCount, setLeavesSeenCount] = useState(() => {
    try {
      const stored = profile?.id ? localStorage.getItem(`teamtrack_leaves_seen_${profile.id}`) : null
      return stored ? parseInt(stored, 10) : 0
    } catch {
      return 0
    }
  })

  // Alerts Tab States (Lead Admin only, gated by supervisor-granted notifications_access)
  const [alerts, setAlerts] = useState([])
  const [alertsLoading, setAlertsLoading] = useState(false)
  const [alertsMembers, setAlertsMembers] = useState([]) // roster for the member filter dropdown
  const [alertsDateFrom, setAlertsDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 14)
    return toDateKey(d)
  })
  const [alertsDateTo, setAlertsDateTo] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return toDateKey(d)
  })
  const [alertsMemberFilter, setAlertsMemberFilter] = useState('all')

  // Team Overview States
  const [engagedCandidates, setEngagedCandidates] = useState([])
  const [nonEngagedCandidates, setNonEngagedCandidates] = useState([])
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [isEngagedCollapsed, setIsEngagedCollapsed] = useState(false)
  const [isNonEngagedCollapsed, setIsNonEngagedCollapsed] = useState(false)
  const [isGeneralTeamsCollapsed, setIsGeneralTeamsCollapsed] = useState(false)
  const [isSpecificTeamsCollapsed, setIsSpecificTeamsCollapsed] = useState(false)
  const [isInactiveTeamsCollapsed, setIsInactiveTeamsCollapsed] = useState(false)

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
          deadline,
          users (
            name,
            email
          ),
          teams (
            name,
            description
          ),
          task_updates (
            note,
            created_at
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
        'Deadline',
        'Status of Task',
        'Progress Note',
        'Note Date'
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

      const rows = []
      tasksData.forEach(task => {
        const notesList = task.task_updates || []
        if (notesList.length === 0) {
          rows.push([
            escapeCSV(task.users?.name || task.users?.email || 'Unassigned'),
            escapeCSV(task.teams?.name || 'N/A'),
            escapeCSV(task.teams?.description || ''),
            escapeCSV(task.title),
            escapeCSV(task.description || ''),
            escapeCSV(new Date(task.created_at).toLocaleDateString()),
            escapeCSV(task.deadline ? new Date(task.deadline).toLocaleDateString() : 'N/A'),
            escapeCSV(task.title === 'Leave' ? 'Leave' : task.status),
            escapeCSV(''),
            escapeCSV('')
          ])
        } else {
          // Sort chronologically ascending
          const sortedNotes = [...notesList].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
          sortedNotes.forEach(note => {
            rows.push([
              escapeCSV(task.users?.name || task.users?.email || 'Unassigned'),
              escapeCSV(task.teams?.name || 'N/A'),
              escapeCSV(task.teams?.description || ''),
              escapeCSV(task.title),
              escapeCSV(task.description || ''),
              escapeCSV(new Date(task.created_at).toLocaleDateString()),
              escapeCSV(task.deadline ? new Date(task.deadline).toLocaleDateString() : 'N/A'),
              escapeCSV(task.title === 'Leave' ? 'Leave' : task.status),
              escapeCSV(note.note),
              escapeCSV(new Date(note.created_at).toLocaleString())
            ])
          })
        }
      })

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
      let query = supabase
        .from('teams')
        .select(`
          id,
          name,
          description,
          category,
          created_at,
          lab_id,
          is_active,
          received_date,
          customer,
          bg_market,
          stage,
          team_members (id),
          tasks (id, status)
        `)
        .order('created_at', { ascending: false })

      if (isSupervisorView && labId) {
        // Supervisor entered a specific lab — filter by that lab
        query = query.eq('lab_id', labId)
      } else if (!isSupervisor) {
        // Lead Admin — only show teams from their assigned labs
        const { data: assignments } = await supabase
          .from('lab_admins')
          .select('lab_id')
          .eq('user_id', profile?.id)
        if (assignments && assignments.length > 0) {
          const assignedLabIds = assignments.map(a => a.lab_id)
          query = query.in('lab_id', assignedLabIds)
        }
      }
      // If isSupervisor but not isSupervisorView (landing on /admin somehow) — show all

      const { data, error: fetchErr } = await query
      if (fetchErr) throw fetchErr
      setTeams(data || [])
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchOverviewData = async () => {
    setOverviewLoading(true)
    setError(null)
    try {
      // 1. Fetch all approved users who are members
      const { data: allUsers, error: usersErr } = await supabase
        .from('users')
        .select('id, name, email, employee_id, approved_status, role')
        .eq('approved_status', 'approved')
        .eq('role', 'member')

      if (usersErr) throw usersErr

      // 2. Fetch all team memberships with their team category and lab
      const { data: allMemberships, error: memErr } = await supabase
        .from('team_members')
        .select(`
          id,
          user_id,
          email,
          team_id,
          teams (
            id,
            name,
            category,
            lab_id
          )
        `)

      if (memErr) throw memErr

      // Determine target lab filter
      let targetLabIds = null
      if (isSupervisorView && labId) {
        targetLabIds = [labId]
      } else if (!isSupervisor) {
        const { data: assignments } = await supabase
          .from('lab_admins')
          .select('lab_id')
          .eq('user_id', profile?.id)
        if (assignments && assignments.length > 0) {
          targetLabIds = assignments.map(a => a.lab_id)
        }
      }

      // 3. Process and classify candidates
      const engaged = []
      const nonEngaged = []

      if (allUsers && allUsers.length > 0) {
        allUsers.forEach(user => {
          const userMemberships = (allMemberships || []).filter(m => {
            const matchesUser = m.user_id === user.id || m.email.toLowerCase() === user.email.toLowerCase()
            if (!matchesUser) return false
            if (targetLabIds) {
              return targetLabIds.includes(m.teams?.lab_id)
            }
            return true
          })

          if (userMemberships.length === 0) {
            // Unassigned: not in any teams for this lab scope, exclude
            return
          }

          const hasNonGeneralTeam = userMemberships.some(m => {
            const cat = (m.teams?.category || '').toLowerCase().trim()
            return cat !== 'general'
          })

          const hasGeneralTeam = userMemberships.some(m => {
            const cat = (m.teams?.category || '').toLowerCase().trim()
            return cat === 'general'
          })

          if (hasNonGeneralTeam) {
            engaged.push({
              ...user,
              teamName: userMemberships.map(m => m.teams?.name || 'N/A').join(', '),
              teamCategory: userMemberships.map(m => m.teams?.category ? getTeamCategoryLabel(m.teams.category) : 'N/A').join(', ')
            })
          } else if (hasGeneralTeam) {
            nonEngaged.push({
              ...user,
              teamName: userMemberships.map(m => m.teams?.name || 'N/A').join(', '),
              teamCategory: userMemberships.map(m => m.teams?.category ? getTeamCategoryLabel(m.teams.category) : 'N/A').join(', ')
            })
          }
        })
      }

      setEngagedCandidates(engaged)
      setNonEngagedCandidates(nonEngaged)
    } catch (err) {
      console.error('Error fetching overview data:', err.message)
      setError(err.message)
    } finally {
      setOverviewLoading(false)
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

  const fetchMilestones = async () => {
    setMilestonesLoading(true)
    try {
      let query = supabase
        .from('milestones')
        .select(`
          id,
          milestone_description,
          created_at,
          tasks!inner (
            id,
            title,
            description,
            status,
            created_at,
            deadline,
            teams!inner (
              id,
              name,
              lab_id
            )
          ),
          task_updates (
            id,
            note,
            created_at,
            users (
              id,
              name,
              email
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (isSupervisorView && labId) {
        query = query.eq('tasks.teams.lab_id', labId)
      } else if (!isSupervisor) {
        const { data: assignments } = await supabase
          .from('lab_admins')
          .select('lab_id')
          .eq('user_id', profile?.id)
        if (assignments && assignments.length > 0) {
          const assignedLabIds = assignments.map(a => a.lab_id)
          query = query.in('tasks.teams.lab_id', assignedLabIds)
        }
      }

      const { data, error } = await query

      if (error) throw error
      setMilestones(data || [])
    } catch (err) {
      console.error('Error fetching milestones:', err.message)
    } finally {
      setMilestonesLoading(false)
    }
  }

  const fetchLeaves = async () => {
    // Leaves tab is exclusive to Lead Admins — supervisors don't need this view
    if (isSupervisor) {
      setLeaves([])
      return
    }

    setLeavesLoading(true)
    try {
      let query = supabase
        .from('tasks')
        .select(`
          id,
          description,
          created_at,
          created_by,
          users (
            id,
            name,
            email
          ),
          teams!inner (
            id,
            name,
            lab_id
          )
        `)
        .eq('title', 'Leave')
        .order('created_at', { ascending: false })

      const { data: assignments } = await supabase
        .from('lab_admins')
        .select('lab_id')
        .eq('user_id', profile?.id)
      if (assignments && assignments.length > 0) {
        const assignedLabIds = assignments.map(a => a.lab_id)
        query = query.in('teams.lab_id', assignedLabIds)
      }

      const { data, error } = await query
      if (error) throw error
      setLeaves(data || [])
    } catch (err) {
      console.error('Error fetching leaves:', err.message)
    } finally {
      setLeavesLoading(false)
    }
  }

  // Group individual per-date leave rows into a single ranged entry per member/team/description
  const getGroupedLeaves = () => {
    const groups = {}
    leaves.forEach(task => {
      const key = `${task.created_by}_${task.teams?.id}_${task.description}`
      if (!groups[key]) {
        groups[key] = {
          user: task.users,
          team: task.teams,
          description: task.description,
          dates: []
        }
      }
      groups[key].dates.push(new Date(task.created_at))
    })

    return Object.values(groups).map((g, idx) => {
      g.dates.sort((a, b) => a - b)
      return {
        key: idx,
        user: g.user,
        team: g.team,
        description: g.description,
        fromDate: g.dates[0],
        toDate: g.dates[g.dates.length - 1]
      }
    }).sort((a, b) => b.fromDate - a.fromDate)
  }

  // Computes "missed progress" alerts live, straight from tasks/task_updates — no
  // stored notifications table or backfill job to keep in sync. A day counts as
  // missed for a member if it's a weekday, on/after they joined, before today,
  // within the selected date range, and they neither created a task/progress
  // note nor applied a leave that day.
  const fetchAlerts = async () => {
    if (isSupervisor || profile?.notifications_access !== true) {
      setAlerts([])
      return
    }

    setAlertsLoading(true)
    try {
      const { data: assignments } = await supabase
        .from('lab_admins')
        .select('lab_id')
        .eq('user_id', profile?.id)
      const labIds = (assignments || []).map(a => a.lab_id)
      if (labIds.length === 0) {
        setAlerts([])
        setAlertsMembers([])
        return
      }

      const { data: teamRows } = await supabase.from('teams').select('id').in('lab_id', labIds)
      const teamIds = (teamRows || []).map(t => t.id)
      if (teamIds.length === 0) {
        setAlerts([])
        setAlertsMembers([])
        return
      }

      const { data: memberRows } = await supabase
        .from('team_members')
        .select('user_id, users ( id, name, email, role, created_at )')
        .in('team_id', teamIds)

      const membersById = {}
      ;(memberRows || []).forEach((m) => {
        if (m.users && m.users.role === 'member') {
          membersById[m.users.id] = m.users
        }
      })
      const memberIds = Object.keys(membersById)
      setAlertsMembers(
        Object.values(membersById).sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email))
      )

      if (memberIds.length === 0) {
        setAlerts([])
        return
      }

      const [y1, m1, d1] = alertsDateFrom.split('-').map(Number)
      const [y2, m2, d2] = alertsDateTo.split('-').map(Number)
      const rangeStart = new Date(y1, m1 - 1, d1)
      const rangeEnd = new Date(y2, m2 - 1, d2, 23, 59, 59, 999)

      const [{ data: tasksData }, { data: notesData }] = await Promise.all([
        supabase
          .from('tasks')
          .select('created_by, title, created_at')
          .in('created_by', memberIds)
          .gte('created_at', rangeStart.toISOString())
          .lte('created_at', rangeEnd.toISOString()),
        supabase
          .from('task_updates')
          .select('user_id, created_at')
          .in('user_id', memberIds)
          .gte('created_at', rangeStart.toISOString())
          .lte('created_at', rangeEnd.toISOString())
      ])

      const activityDays = new Set()
      const leaveDays = new Set()

      ;(tasksData || []).forEach((t) => {
        const key = `${t.created_by}_${toDateKey(new Date(t.created_at))}`
        if (t.title === 'Leave') {
          leaveDays.add(key)
        } else {
          activityDays.add(key)
        }
      })
      ;(notesData || []).forEach((n) => {
        activityDays.add(`${n.user_id}_${toDateKey(new Date(n.created_at))}`)
      })

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const result = []
      memberIds.forEach((memberId) => {
        const member = membersById[memberId]
        const joinDate = member.created_at ? new Date(member.created_at) : null
        if (joinDate) joinDate.setHours(0, 0, 0, 0)

        for (let d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
          if (d >= today) continue
          const dayOfWeek = d.getDay() // 0 = Sunday, 6 = Saturday
          if (dayOfWeek === 0 || dayOfWeek === 6) continue
          if (joinDate && d < joinDate) continue

          const dateKey = toDateKey(d)
          const key = `${memberId}_${dateKey}`
          if (leaveDays.has(key) || activityDays.has(key)) continue

          const memberName = member.name || member.email
          result.push({
            id: key,
            memberId,
            memberName,
            date: dateKey,
            dateObj: new Date(d),
            message: `${memberName} has failed to record the daily progress on ${new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.`
          })
        }
      })

      result.sort((a, b) => (a.date < b.date ? 1 : -1))
      setAlerts(result)
    } catch (err) {
      console.error('Error fetching missed progress alerts:', err.message)
    } finally {
      setAlertsLoading(false)
    }
  }

  const handleDeleteMilestone = async (milestoneId) => {
    if (!window.confirm('Are you sure you want to remove this milestone?')) return
    try {
      const { error } = await supabase
        .from('milestones')
        .delete()
        .eq('id', milestoneId)

      if (error) throw error
      fetchMilestones()
    } catch (err) {
      alert(`Failed to remove milestone: ${err.message}`)
    }
  }

  const loadData = async () => {
    setLoading(true)
    setError(null)
    // If in supervisor lab view, fetch the lab name for display
    if (isSupervisorView && labId) {
      const { data: labData } = await supabase
        .from('labs')
        .select('name, logo_url')
        .eq('id', labId)
        .single()
      if (labData) {
        setLabName(labData.name)
        setLabLogoUrl(labData.logo_url)
      }
      setCurrentLabId(labId)
    } else if (!isSupervisor) {
      // Fetch assigned lab for admin
      const { data: assignments } = await supabase
        .from('lab_admins')
        .select('lab_id')
        .eq('user_id', profile?.id)
      if (assignments && assignments.length > 0) {
        setCurrentLabId(assignments[0].lab_id)
      }
    }
    await Promise.all([fetchTeams(), fetchPendingUsers(), fetchMilestones(), fetchLeaves()])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labId])

  // Mark leaves as "seen" while the Leaves tab is actively open, so the unread badge de-highlights
  // on view and stays that way across reloads until a new leave row is logged.
  useEffect(() => {
    if (activeTab === 'leaves') {
      setLeavesSeenCount(leaves.length)
      try {
        if (profile?.id) {
          localStorage.setItem(`teamtrack_leaves_seen_${profile.id}`, String(leaves.length))
        }
      } catch {
        // localStorage unavailable — badge will simply re-highlight each reload, no functional impact
      }
    }
  }, [activeTab, leaves, profile?.id])

  // Fetch/refetch Alerts whenever that tab is open or its date filters change —
  // filters scope the underlying query, so results always match what's shown.
  useEffect(() => {
    if (activeTab === 'alerts') {
      fetchAlerts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, alertsDateFrom, alertsDateTo])

  // Manual non-debounced profile search query trigger for instant reloading after editing
  const triggerSearchQuery = async () => {
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    try {
      const { data: usersData, error: usersErr } = await supabase
        .from('users')
        .select(`
          *,
          team_members (
            team_id,
            teams (
              name,
              lab_id,
              labs ( name )
            )
          ),
          lab_admins (
            lab_id,
            labs ( name )
          )
        `)
        .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,employee_id.ilike.%${searchQuery}%`)
        .order('name', { ascending: true })

      if (usersErr) throw usersErr

      if (usersData && usersData.length > 0) {
        const userIds = usersData.map(u => u.id)
        const { data: tasksData, error: tasksErr } = await supabase
          .from('tasks')
          .select(`
            *,
            task_updates (
              id,
              note,
              created_at
            )
          `)
          .in('created_by', userIds)

        if (tasksErr) throw tasksErr

        const employeeIds = usersData.map(u => u.employee_id).filter(Boolean)
        let categoryMap = {}
        if (employeeIds.length > 0) {
          const { data: skillsData } = await supabase
            .from('employee_skills_data')
            .select('employee_id, individual_category')
            .in('employee_id', employeeIds)
          if (skillsData) {
            skillsData.forEach(s => { categoryMap[s.employee_id] = s.individual_category })
          }
        }

        const combined = usersData.map(user => {
          const userTasks = tasksData ? tasksData.filter(t => t.created_by === user.id) : []

          let labName = 'None'
          if (user.role === 'member') {
            const memberLabs = user.team_members?.map(tm => tm.teams?.labs?.name).filter(Boolean) || []
            const uniqueLabs = [...new Set(memberLabs)]
            if (uniqueLabs.length > 0) labName = uniqueLabs.join(', ')
          } else if (user.role === 'admin') {
            const adminLabs = user.lab_admins?.map(la => la.labs?.name).filter(Boolean) || []
            if (adminLabs.length > 0) labName = adminLabs.join(', ')
          }

          return {
            ...user,
            teamName: user.team_members && user.team_members.length > 0
              ? user.team_members.map(tm => tm.teams?.name).filter(Boolean).join(', ')
              : 'No Assigned Team',
            labName,
            tasks: userTasks,
            individualCategory: (user.employee_id && categoryMap[user.employee_id]) || 'Training'
          }
        })

        setSearchResults(combined)
      } else {
        setSearchResults([])
      }
    } catch (err) {
      console.error('Error fetching search profiles:', err.message)
    } finally {
      setSearchLoading(false)
    }
  }

  // Dynamic profile search effect with debounce
  useEffect(() => {
    if (activeTab !== 'profiles') return
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const delayDebounce = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const { data: usersData, error: usersErr } = await supabase
          .from('users')
          .select(`
            *,
            team_members (
              team_id,
              teams (
                name,
                lab_id,
                labs ( name )
              )
            ),
            lab_admins (
              lab_id,
              labs ( name )
            )
          `)
          .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,employee_id.ilike.%${searchQuery}%`)
          .order('name', { ascending: true })

        if (usersErr) throw usersErr

        if (usersData && usersData.length > 0) {
          const userIds = usersData.map(u => u.id)
          const { data: tasksData, error: tasksErr } = await supabase
            .from('tasks')
            .select(`
              *,
              task_updates (
                id,
                note,
                created_at
              )
            `)
            .in('created_by', userIds)

          if (tasksErr) throw tasksErr

          const employeeIds = usersData.map(u => u.employee_id).filter(Boolean)
          let categoryMap = {}
          if (employeeIds.length > 0) {
            const { data: skillsData } = await supabase
              .from('employee_skills_data')
              .select('employee_id, individual_category')
              .in('employee_id', employeeIds)
            if (skillsData) {
              skillsData.forEach(s => { categoryMap[s.employee_id] = s.individual_category })
            }
          }

          const combined = usersData.map(user => {
            const userTasks = tasksData ? tasksData.filter(t => t.created_by === user.id) : []

            let labName = 'None'
            if (user.role === 'member') {
              const memberLabs = user.team_members?.map(tm => tm.teams?.labs?.name).filter(Boolean) || []
              const uniqueLabs = [...new Set(memberLabs)]
              if (uniqueLabs.length > 0) labName = uniqueLabs.join(', ')
            } else if (user.role === 'admin') {
              const adminLabs = user.lab_admins?.map(la => la.labs?.name).filter(Boolean) || []
              if (adminLabs.length > 0) labName = adminLabs.join(', ')
            }

            return {
              ...user,
              teamName: user.team_members && user.team_members.length > 0
                ? user.team_members.map(tm => tm.teams?.name).filter(Boolean).join(', ')
                : 'No Assigned Team',
              labName,
              tasks: userTasks,
              individualCategory: (user.employee_id && categoryMap[user.employee_id]) || 'Training'
            }
          })

          setSearchResults(combined)
        } else {
          setSearchResults([])
        }
      } catch (err) {
        console.error('Error searching profiles:', err.message)
      } finally {
        setSearchLoading(false)
      }
    }, 300)

    return () => clearTimeout(delayDebounce)
  }, [searchQuery, activeTab])

  const handleOpenEditModal = (user) => {
    setEditingUser(user)
    setIsEditModalOpen(true)
  }

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

  const groupedLeavesList = getGroupedLeaves()

  const filteredAlerts = alertsMemberFilter === 'all'
    ? alerts
    : alerts.filter(a => a.memberId === alertsMemberFilter)

  const generalTeams = teams.filter(t => t.is_active !== false && (t.category || '').toLowerCase().trim() === 'general')
  const specificTeams = teams.filter(t => t.is_active !== false && (t.category || '').toLowerCase().trim() !== 'general')
  const inactiveTeams = teams.filter(t => t.is_active === false)

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-8 sm:px-6 lg:px-8 space-y-8">

        {/* Back to All Build Teams — shown when supervisor is inside a specific lab */}
        {isSupervisorView && (
          <button
            onClick={() => navigate('/supervisor')}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-white font-semibold transition mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to All Build Teams
          </button>
        )}

        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-dark-800 pb-6">
          <div className="flex items-center gap-3">
            {isSupervisorView && labName && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-500/20 bg-brand-500/10 overflow-hidden">
                {renderLabLogo({ id: labId, name: labName, logo_url: labLogoUrl }, "h-8 w-8")}
              </div>
            )}
            <div>
              {isSupervisorView && labName && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-400 block mb-0.5">{labName}</span>
              )}
              <h1 className="font-sans text-3xl font-extrabold tracking-tight text-white">
                {isSupervisorView ? 'Build Team Dashboard' : 'Global Dashboard'}
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Monitor team spaces, configure tasks, and allocate team memberships.
              </p>
            </div>
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
          <button
            onClick={() => setActiveTab('profiles')}
            className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'profiles'
                ? 'border-brand-500 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            User Profiles
          </button>
          <button
            onClick={() => {
              setActiveTab('milestones')
              fetchMilestones()
            }}
            className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'milestones'
                ? 'border-brand-500 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span>Milestones</span>
            {milestones.length > 0 && (
              <span className="bg-amber-500 text-dark-950 font-sans font-extrabold text-[10px] px-2 py-0.5 rounded-full border border-amber-600">
                {milestones.length}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('overview')
              fetchOverviewData()
            }}
            className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'border-brand-500 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span>Team Overview</span>
          </button>
          {!isSupervisor && (
            <button
              onClick={() => {
                setActiveTab('leaves')
                fetchLeaves()
              }}
              className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'leaves'
                  ? 'border-brand-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <span>Leaves</span>
              {groupedLeavesList.length > 0 && (
                <span className={`font-sans font-extrabold text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                  activeTab === 'leaves' || leaves.length <= leavesSeenCount
                    ? 'bg-dark-800 text-slate-400 border-dark-700'
                    : 'bg-amber-500 text-dark-950 border-amber-600 animate-pulse'
                }`}>
                  {groupedLeavesList.length}
                </span>
              )}
            </button>
          )}
          {!isSupervisor && profile?.notifications_access === true && (
            <button
              onClick={() => setActiveTab('alerts')}
              className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'alerts'
                  ? 'border-brand-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <span>Alerts</span>
              {alerts.length > 0 && (
                <span className="bg-amber-500 text-dark-950 font-sans font-extrabold text-[10px] px-2 py-0.5 rounded-full border border-amber-600">
                  {alerts.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader className="h-10 w-10 text-brand-500 animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === 'teams' && (
              <TeamsTab
                teams={teams}
                generalTeams={generalTeams}
                specificTeams={specificTeams}
                inactiveTeams={inactiveTeams}
                profile={profile}
                isGeneralTeamsCollapsed={isGeneralTeamsCollapsed}
                onToggleGeneralTeamsCollapsed={() => setIsGeneralTeamsCollapsed(!isGeneralTeamsCollapsed)}
                isSpecificTeamsCollapsed={isSpecificTeamsCollapsed}
                onToggleSpecificTeamsCollapsed={() => setIsSpecificTeamsCollapsed(!isSpecificTeamsCollapsed)}
                isInactiveTeamsCollapsed={isInactiveTeamsCollapsed}
                onToggleInactiveTeamsCollapsed={() => setIsInactiveTeamsCollapsed(!isInactiveTeamsCollapsed)}
                onCreateClick={handleCreateClick}
                onCardClick={handleCardClick}
                onEditClick={handleEditClick}
                onDeleteClick={handleDeleteClick}
              />
            )}

            {activeTab === 'registrations' && (
              <RegistrationsTab
                pendingUsers={pendingUsers}
                approvingUserId={approvingUserId}
                selectedRole={selectedRole}
                onApproveClick={handleApproveClick}
                onCancelApprove={() => setApprovingUserId(null)}
                onSelectedRoleChange={setSelectedRole}
                onConfirmApproval={handleConfirmApproval}
                onRejectClick={handleRejectClick}
              />
            )}

            {activeTab === 'profiles' && (
              <ProfilesTab
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                searchLoading={searchLoading}
                searchResults={searchResults}
                onEditUser={handleOpenEditModal}
              />
            )}

            {activeTab === 'milestones' && (
              <MilestonesTab
                milestones={milestones}
                milestonesLoading={milestonesLoading}
                onDeleteMilestone={handleDeleteMilestone}
              />
            )}

            {activeTab === 'overview' && (
              <OverviewTab
                engagedCandidates={engagedCandidates}
                nonEngagedCandidates={nonEngagedCandidates}
                overviewLoading={overviewLoading}
                isEngagedCollapsed={isEngagedCollapsed}
                onToggleEngagedCollapsed={() => setIsEngagedCollapsed(!isEngagedCollapsed)}
                isNonEngagedCollapsed={isNonEngagedCollapsed}
                onToggleNonEngagedCollapsed={() => setIsNonEngagedCollapsed(!isNonEngagedCollapsed)}
              />
            )}

            {activeTab === 'leaves' && !isSupervisor && (
              <LeavesTab groupedLeaves={groupedLeavesList} leavesLoading={leavesLoading} />
            )}

            {activeTab === 'alerts' && !isSupervisor && profile?.notifications_access === true && (
              <AlertsTab
                filteredAlerts={filteredAlerts}
                alertsLoading={alertsLoading}
                alertsMembers={alertsMembers}
                alertsDateFrom={alertsDateFrom}
                onAlertsDateFromChange={setAlertsDateFrom}
                alertsDateTo={alertsDateTo}
                onAlertsDateToChange={setAlertsDateTo}
                alertsMemberFilter={alertsMemberFilter}
                onAlertsMemberFilterChange={setAlertsMemberFilter}
              />
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
        labId={currentLabId}
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        user={editingUser}
        profile={profile}
        isSupervisor={isSupervisor}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingUser(null)
        }}
        onSaved={triggerSearchQuery}
      />
    </div>
  )
}

export default AdminDashboard
