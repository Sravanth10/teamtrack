import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
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
  Sparkles,
  Edit,
  Search,
  MapPin,
  Calendar,
  User,
  Star,
  Phone,
  ArrowLeft,
  FlaskConical,
  ShieldCheck
} from 'lucide-react'

const PREDEFINED_SKILLS = [
  'Artificial Intelligence (AI)',
  'Generative AI',
  'Large Language Models (LLMs)',
  'Prompt Engineering',
  'Retrieval-Augmented Generation (RAG)',
  'LangChain',
  'LlamaIndex',
  'PyTorch',
  'TensorFlow',
  'Natural Language Processing (NLP)',
  'Computer Vision',
  'Vector Databases (Milvus, Pinecone, Chroma)',
  
  'Amazon Web Services (AWS)',
  'Microsoft Azure',
  'Google Cloud Platform (GCP)',
  'Terraform (Infrastructure as Code)',
  'Kubernetes (K8s)',
  'Docker & Containerization',
  'Cloud Security',
  'Serverless Architecture',
  'CI/CD Pipelines',
  
  'React.js',
  'Next.js',
  'Vue.js',
  'Angular',
  'Node.js',
  'Express.js',
  'FastAPI',
  'Django',
  'Flask',
  'Spring Boot',
  'Tailwind CSS',
  'Bootstrap',
  
  'Python',
  'JavaScript',
  'TypeScript',
  'Go (Golang)',
  'Rust',
  'SQL & Relational Databases',
  'NoSQL Databases (MongoDB, Redis)',
  'PostgreSQL'
]

const REGIONS = [
  { code: '+91', country: 'India', digits: 10, placeholder: '9876543210' },
  { code: '+1', country: 'US/Canada', digits: 10, placeholder: '2015550123' },
  { code: '+44', country: 'UK', digits: 10, placeholder: '7400123456' },
  { code: '+61', country: 'Australia', digits: 9, placeholder: '412345678' },
  { code: '+65', country: 'Singapore', digits: 8, placeholder: '81234567' },
  { code: '+971', country: 'UAE', digits: 9, placeholder: '501234567' }
]

const parsePhone = (fullPhone) => {
  if (!fullPhone) return { region: '+91', number: '' }
  const match = REGIONS.find(r => fullPhone.startsWith(r.code + ' ') || fullPhone.startsWith(r.code))
  if (match) {
    const number = fullPhone.slice(match.code.length).trim()
    return { region: match.code, number }
  }
  return { region: '+91', number: fullPhone }
}

const calculateExperience = (joiningDateStr) => {
  if (!joiningDateStr) return '0 months'
  const joinDate = new Date(joiningDateStr)
  const currentDate = new Date()
  
  let years = currentDate.getFullYear() - joinDate.getFullYear()
  let months = currentDate.getMonth() - joinDate.getMonth()
  let days = currentDate.getDate() - joinDate.getDate()
  
  if (days < 0) {
    months -= 1
  }
  if (months < 0) {
    years -= 1
    months += 12
  }
  
  const yearText = years > 0 ? `${years} yr${years > 1 ? 's' : ''}` : ''
  const monthText = months > 0 ? `${months} mo${months > 1 ? 's' : ''}` : ''
  
  if (yearText && monthText) {
    return `${yearText}, ${monthText}`
  }
  if (yearText) return yearText
  if (monthText) return monthText
  return '0 months'
}

export const AdminDashboard = () => {
  const navigate = useNavigate()
  const { labId } = useParams()          // present when supervisor enters /supervisor/lab/:labId
  const { profile, isSupervisor } = useAuth()
  const isSupervisorView = !!labId       // true = supervisor entered a specific lab
  const [labName, setLabName] = useState(null)  // name of current lab (for header)
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

  // User Profiles Tab States
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Edit Modal form states
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState('member')
  const [editEmployeeId, setEditEmployeeId] = useState('')
  const [editWorkLocation, setEditWorkLocation] = useState('')
  const [editPhoneRegion, setEditPhoneRegion] = useState('+91')
  const [editPhoneNo, setEditPhoneNo] = useState('')
  const [editRapidJoiningDate, setEditRapidJoiningDate] = useState('')
  const [editSkills, setEditSkills] = useState([])
  const [skillsInput, setSkillsInput] = useState('')
  const [isSkillsDropdownOpen, setIsSkillsDropdownOpen] = useState(false)

  // Milestones Tab States
  const [milestones, setMilestones] = useState([])
  const [milestonesLoading, setMilestonesLoading] = useState(false)

  // Team Overview States
  const [engagedCandidates, setEngagedCandidates] = useState([])
  const [nonEngagedCandidates, setNonEngagedCandidates] = useState([])
  const [overviewLoading, setOverviewLoading] = useState(false)

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

      // 2. Fetch all team memberships with their team category
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
            category
          )
        `)

      if (memErr) throw memErr

      // 3. Process and classify candidates
      const engaged = []
      const nonEngaged = []

      if (allUsers && allUsers.length > 0) {
        allUsers.forEach(user => {
          const userMemberships = (allMemberships || []).filter(m => 
            m.user_id === user.id || m.email.toLowerCase() === user.email.toLowerCase()
          )

          if (userMemberships.length === 0) {
            // Unassigned: not in any teams, exclude
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
              teamCategory: userMemberships.map(m => m.teams?.category || 'N/A').join(', ')
            })
          } else if (hasGeneralTeam) {
            nonEngaged.push({
              ...user,
              teamName: userMemberships.map(m => m.teams?.name || 'N/A').join(', '),
              teamCategory: userMemberships.map(m => m.teams?.category || 'N/A').join(', ')
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
      const { data, error } = await supabase
        .from('milestones')
        .select(`
          id,
          milestone_description,
          created_at,
          tasks (
            id,
            title,
            description,
            status,
            created_at,
            deadline,
            teams (
              id,
              name
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

      if (error) throw error
      setMilestones(data || [])
    } catch (err) {
      console.error('Error fetching milestones:', err.message)
    } finally {
      setMilestonesLoading(false)
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
        .select('name')
        .eq('id', labId)
        .single()
      if (labData) setLabName(labData.name)
    }
    await Promise.all([fetchTeams(), fetchPendingUsers(), fetchMilestones()])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [labId])

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
            tasks: userTasks
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
              tasks: userTasks
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
    setEditName(user.name || '')
    setEditRole(user.role || 'member')
    setEditEmployeeId(user.employee_id || '')
    setEditWorkLocation(user.work_location || '')
    const parsedPhone = parsePhone(user.phone_number)
    setEditPhoneRegion(parsedPhone.region)
    setEditPhoneNo(parsedPhone.number)
    setEditRapidJoiningDate(user.rapid_joining_date || '')
    setEditSkills(user.skills || [])
    setSkillsInput('')
    setIsSkillsDropdownOpen(false)
    setIsEditModalOpen(true)
  }

  const handleAddSkill = (skill) => {
    if (!editSkills.includes(skill)) {
      setEditSkills([...editSkills, skill])
    }
    setSkillsInput('')
    setIsSkillsDropdownOpen(false)
  }

  const handleRemoveSkill = (skillToRemove) => {
    setEditSkills(editSkills.filter(s => s !== skillToRemove))
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!editingUser) return

    const currentRegion = REGIONS.find(r => r.code === editPhoneRegion)
    if (editPhoneNo.trim() && editPhoneNo.trim().length !== currentRegion.digits) {
      alert(`Phone number for ${currentRegion.country} must be exactly ${currentRegion.digits} digits long`)
      return
    }

    setLoading(true)
    try {
      const rapidExp = calculateExperience(editRapidJoiningDate)

      const { error: updateErr } = await supabase
        .from('users')
        .update({
          name: editName.trim(),
          role: editRole,
          employee_id: editEmployeeId.trim(),
          work_location: editWorkLocation.trim(),
          rapid_joining_date: editRapidJoiningDate || null,
          rapid_experience: rapidExp,
          skills: editSkills,
          phone_number: editPhoneNo.trim() ? `${editPhoneRegion} ${editPhoneNo.trim()}` : null
        })
        .eq('id', editingUser.id)

      if (updateErr) throw updateErr

      // Close modal and reload
      setIsEditModalOpen(false)
      setEditingUser(null)
      await triggerSearchQuery()
    } catch (err) {
      alert(`Failed to save profile: ${err.message}`)
    } finally {
      setLoading(false)
    }
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

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        
        {/* Back to All Labs — shown when supervisor is inside a specific lab */}
        {isSupervisorView && (
          <button
            onClick={() => navigate('/supervisor')}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-white font-semibold transition mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to All Labs
          </button>
        )}

        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-dark-800 pb-6">
          <div>
            {isSupervisorView && labName && (
              <div className="flex items-center gap-1.5 mb-1">
                <FlaskConical className="h-3.5 w-3.5 text-brand-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-400">{labName}</span>
              </div>
            )}
            <h1 className="font-sans text-3xl font-extrabold tracking-tight text-white">
              {isSupervisorView ? 'Lab Dashboard' : 'Global Dashboard'}
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

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-450">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Emp ID:</span>
                              <span className="text-slate-200">{u.employee_id || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Location:</span>
                              <span className="text-slate-200">{u.work_location || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Phone Number:</span>
                              <span className="text-slate-200">{u.phone_number || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Rapid Exp:</span>
                              <span className="text-slate-200">{u.rapid_experience || 'N/A'} <span className="text-slate-500 text-[10px]">({u.rapid_joining_date || 'N/A'})</span></span>
                            </div>
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
                                className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-5 py-2.5 transition"
                              >
                                <Check className="h-4.5 w-4.5" />
                                Approve User
                              </button>
                              <button
                                onClick={() => handleRejectClick(u.id)}
                                className="flex items-center justify-center gap-1.5 rounded-xl bg-dark-900 border border-rose-500/20 hover:bg-rose-500/10 text-rose-400 hover:text-rose-200 font-semibold text-sm px-5 py-2.5 transition"
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

            {/* Active Tab: User Profiles */}
            {activeTab === 'profiles' && (
              <div className="space-y-6">
                {/* Search Bar Block */}
                <div className="relative max-w-xl mx-auto">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                      <Search className="h-5 w-5" />
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="block w-full rounded-xl border border-dark-700 bg-dark-900/60 py-3 pl-11 pr-4 text-white placeholder-slate-550 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition shadow-glass"
                      placeholder="Search profiles by Name, Email, or Employee ID..."
                    />
                  </div>
                </div>

                {/* Search Results / Prompt Screen */}
                {!searchQuery.trim() ? (
                  <div className="rounded-2xl border border-dashed border-dark-800 p-12 text-center max-w-md mx-auto mt-8 bg-dark-900/30">
                    <Search className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-base font-bold text-white mb-1">Search User Profiles</h3>
                    <p className="text-sm text-slate-550">
                      Type name, email, or employee ID in the search box above to dynamically load user profile cards.
                    </p>
                  </div>
                ) : searchLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader className="h-8 w-8 text-brand-500 animate-spin" />
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-dark-800 p-12 text-center max-w-md mx-auto mt-8 bg-dark-900/30">
                    <Users className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-base font-bold text-white mb-1">No Matching Profiles</h3>
                    <p className="text-sm text-slate-550">
                      No registered profiles match "{searchQuery}". Try typing another name or employee ID.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                    {searchResults.map((user) => {
                      const userTasks = user.tasks || []
                      const todoTasks = userTasks.filter(t => t.status === 'To Do' && t.title !== 'Leave')
                      const progressTasks = userTasks.filter(t => t.status === 'In Progress' && t.title !== 'Leave')
                      const blockedTasks = userTasks.filter(t => t.status === 'Blocked' && t.title !== 'Leave')
                      const doneTasks = userTasks.filter(t => t.status === 'Done' && t.title !== 'Leave')
                      const leaveTasks = userTasks.filter(t => t.title === 'Leave')

                      return (
                        <div
                          key={user.id}
                          className="relative flex flex-col justify-between rounded-2xl border border-dark-800 bg-dark-900 p-6 shadow-glass hover:border-brand-500/20 transition-all duration-300"
                        >
                          {/* Edit Icon Button */}
                          <button
                            onClick={() => handleOpenEditModal(user)}
                            className="absolute top-4 right-4 rounded-xl p-2 bg-dark-950 border border-dark-800 text-slate-450 hover:bg-dark-800 hover:text-white transition"
                            title="Edit Profile"
                          >
                            <Edit className="h-4 w-4" />
                          </button>

                          <div className="space-y-5">
                            {/* Header Info */}
                            <div className="flex items-center gap-3">
                              <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-bold text-sm uppercase flex items-center justify-center shadow-glow-brand shrink-0">
                                {user.name ? user.name.slice(0, 2) : 'U'}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-sans text-base font-extrabold text-white truncate max-w-[180px]">
                                    {user.name}
                                  </h3>
                                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-dark-950 border border-dark-850 text-slate-450">
                                    {user.role}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 truncate select-all">{user.email}</p>
                              </div>
                            </div>

                            {/* Job Details Metadata Grid */}
                            <div className="grid grid-cols-2 gap-4 rounded-xl bg-dark-950/50 border border-dark-800/80 p-4 text-xs">
                              <div>
                                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-550 block mb-0.5">Employee ID</span>
                                <span className="font-semibold text-slate-205">{user.employee_id || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-550 block mb-0.5">Location</span>
                                <span className="font-semibold text-slate-205">{user.work_location || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-550 block mb-0.5">Phone Number</span>
                                <span className="font-semibold text-slate-205 block">{user.phone_number || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-550 block mb-0.5">Rapid Build Exp</span>
                                <span className="font-semibold text-slate-205 block">{user.rapid_experience || 'N/A'}</span>
                                <span className="text-[10px] text-slate-500">Joined: {user.rapid_joining_date || 'N/A'}</span>
                              </div>
                              <div className="col-span-2 pt-2 border-t border-dark-800/60 flex items-center justify-between">
                                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-550">Team Workspace</span>
                                <span className="font-bold text-brand-400 bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded text-[10px]">
                                  {user.teamName}
                                </span>
                              </div>
                              {user.role !== 'supervisor' && (
                                <div className="col-span-2 pt-2 border-t border-dark-800/60 flex items-center justify-between">
                                  <span className="text-[9px] uppercase font-bold tracking-wider text-slate-550">Lab Assignment</span>
                                  <span className="font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded text-[10px]">
                                    {user.labName || 'None'}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Skills Tags */}
                            <div className="space-y-1.5">
                              <span className="text-[9px] uppercase font-bold tracking-wider text-slate-550 block">Skills Set</span>
                              <div className="flex flex-wrap gap-1">
                                {user.skills && user.skills.length > 0 ? (
                                  user.skills.map(s => (
                                    <span
                                      key={s}
                                      className="inline-flex rounded-lg border border-dark-800 bg-dark-950 px-2 py-0.5 text-[10px] text-slate-350"
                                    >
                                      {s}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-slate-600 italic">No skills listed.</span>
                                )}
                              </div>
                            </div>

                            {/* Tasks & Note Updates Consolidation */}
                            <div className="space-y-2 border-t border-dark-800/80 pt-4">
                              <h4 className="font-sans text-xs font-bold text-white flex items-center justify-between">
                                <span>Recorded Tasks ({userTasks.length})</span>
                                <span className="text-[10px] text-slate-500 font-normal">Created by user</span>
                              </h4>

                              {userTasks.length === 0 ? (
                                <p className="text-xs text-slate-600 italic">No tasks recorded by this user.</p>
                              ) : (
                                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                                  {userTasks.map(t => {
                                    const statusStyles = {
                                      'To Do': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
                                      'In Progress': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                                      'Blocked': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                                      'Done': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    }
                                    const isLeave = t.title === 'Leave'
                                    const statusBadge = isLeave ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : (statusStyles[t.status] || 'bg-slate-550')

                                    return (
                                      <div key={t.id} className="rounded-xl border border-dark-800 bg-dark-950/40 p-3 space-y-2 text-xs">
                                        <div className="flex items-start justify-between gap-2">
                                          <span className="font-bold text-slate-200 leading-tight">{t.title}</span>
                                          <span className={`px-1.5 py-0.25 text-[9px] uppercase font-bold tracking-wide rounded border shrink-0 ${statusBadge}`}>
                                            {isLeave ? 'Leave' : t.status}
                                          </span>
                                        </div>
                                        {t.description && (
                                          <p className="text-slate-400 leading-relaxed text-[11px] bg-dark-950/20 p-1.5 rounded border border-dark-850/40">
                                            {t.description}
                                          </p>
                                        )}
                                        
                                        {/* Show task updates/notes */}
                                        {t.task_updates && t.task_updates.length > 0 && (
                                          <div className="space-y-1.5 pt-1.5 border-t border-dark-800/40">
                                            <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 block">Note Updates</span>
                                            {t.task_updates.map(up => (
                                              <div key={up.id} className="text-[11px] text-slate-350 leading-normal pl-2 border-l border-brand-500/30 py-0.5">
                                                {up.note}
                                                <span className="text-[9px] text-slate-550 block mt-0.5">
                                                  {new Date(up.created_at).toLocaleDateString()}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Active Tab: Milestones */}
            {activeTab === 'milestones' && (
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
                            onClick={() => handleDeleteMilestone(milestone.id)}
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
            )}

            {/* Active Tab: Team Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-dark-800 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Users className="h-5 w-5 text-brand-400" />
                      Team Engagement Overview
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Real-time lists of candidates classified as engaged or non-engaged based on their team categories.
                    </p>
                  </div>
                </div>

                {overviewLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader className="h-8 w-8 text-brand-500 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-8">
                    
                    {/* Engaged Candidates List */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                        <h3 className="text-lg font-bold text-white">
                          Engaged Candidates ({engagedCandidates.length})
                        </h3>
                      </div>
                      
                      {engagedCandidates.length === 0 ? (
                        <p className="text-xs text-slate-505 italic py-2">
                          No engaged candidates found. (Candidates who belong to at least one team with a category other than 'general').
                        </p>
                      ) : (
                        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                          {engagedCandidates.map(user => (
                            <div 
                              key={user.id}
                              className="rounded-2xl border border-dark-800 bg-dark-900 p-5 flex flex-col justify-between gap-3 hover:border-brand-500/10 transition-colors shadow-glass"
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-sans font-bold text-white text-sm truncate max-w-[150px]">
                                    {user.name || 'N/A'}
                                  </h4>
                                  <span className="text-[10px] text-slate-500 font-mono select-all">
                                    Emp ID: {user.employee_id || 'N/A'}
                                  </span>
                                </div>
                                
                                <div className="space-y-1 text-xs text-slate-400">
                                  <div>
                                    <span className="font-semibold text-slate-500">Team: </span>
                                    <span className="text-slate-200">{user.teamName}</span>
                                  </div>
                                  <div>
                                    <span className="font-semibold text-slate-500">Category: </span>
                                    <span className="text-brand-400 font-medium capitalize">{user.teamCategory}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="pt-2.5 border-t border-dark-800/40 text-[11px] text-slate-500 font-mono truncate select-all">
                                {user.email}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Non-Engaged Candidates List */}
                    <div className="space-y-4 pt-4 border-t border-dark-800/40">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                        <h3 className="text-lg font-bold text-white">
                          Non-Engaged Candidates ({nonEngagedCandidates.length})
                        </h3>
                      </div>
                      
                      {nonEngagedCandidates.length === 0 ? (
                        <p className="text-xs text-slate-505 italic py-2">
                          No non-engaged candidates found. (Candidates who belong only to teams categorized as 'general' and no other teams).
                        </p>
                      ) : (
                        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                          {nonEngagedCandidates.map(user => (
                            <div 
                              key={user.id}
                              className="rounded-2xl border border-dark-850 bg-dark-900 p-5 flex flex-col justify-between gap-3 hover:border-brand-500/10 transition-colors shadow-glass border-l-4 border-l-amber-500/60"
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-sans font-bold text-white text-sm truncate max-w-[150px]">
                                    {user.name || 'N/A'}
                                  </h4>
                                  <span className="text-[10px] text-slate-500 font-mono select-all">
                                    Emp ID: {user.employee_id || 'N/A'}
                                  </span>
                                </div>
                                
                                <div className="space-y-1 text-xs text-slate-400">
                                  <div>
                                    <span className="font-semibold text-slate-500">Team: </span>
                                    <span className="text-slate-200">{user.teamName}</span>
                                  </div>
                                  <div>
                                    <span className="font-semibold text-slate-500">Category: </span>
                                    <span className="text-amber-400 font-medium capitalize">{user.teamCategory}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="pt-2.5 border-t border-dark-800/40 text-[11px] text-slate-500 font-mono truncate select-all">
                                {user.email}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
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

      {/* Edit Profile Modal */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm" 
            onClick={() => {
              setIsEditModalOpen(false)
              setEditingUser(null)
            }}
          />
          <div className="relative z-10 w-full max-w-lg transform overflow-hidden rounded-2xl border border-dark-800 bg-dark-900 p-6 shadow-2xl transition-all max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-dark-800 pb-3 mb-4">
              <h3 className="font-sans text-lg font-bold text-white flex items-center gap-2">
                Edit User Profile
              </h3>
              <button 
                onClick={() => {
                  setIsEditModalOpen(false)
                  setEditingUser(null)
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-dark-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-dark-700 bg-dark-950 px-4 py-2.5 text-white focus:border-brand-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Assign Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full rounded-lg border border-dark-700 bg-dark-950 px-4 py-2.5 text-white focus:border-brand-500 focus:outline-none text-sm"
                >
                  <option value="member">Team Member</option>
                  <option value="admin">Lead Admin</option>
                  {isSupervisor && (
                    <option value="supervisor">Supervisor</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={editEmployeeId}
                    onChange={(e) => setEditEmployeeId(e.target.value)}
                    className="w-full rounded-lg border border-dark-700 bg-dark-950 px-4 py-2.5 text-white focus:border-brand-500 focus:outline-none text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Work Location
                  </label>
                  <input
                    type="text"
                    value={editWorkLocation}
                    onChange={(e) => setEditWorkLocation(e.target.value)}
                    className="w-full rounded-lg border border-dark-700 bg-dark-950 px-4 py-2.5 text-white focus:border-brand-500 focus:outline-none text-sm"
                    placeholder="eg. Hyderabad - Synergy park"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Phone Number
                </label>
                <div className="flex gap-2">
                  <select
                    value={editPhoneRegion}
                    onChange={(e) => {
                      setEditPhoneRegion(e.target.value)
                      setEditPhoneNo('')
                    }}
                    className="rounded-lg border border-dark-700 bg-dark-950 px-3 py-2.5 text-white focus:border-brand-500 focus:outline-none text-sm w-24"
                  >
                    {REGIONS.map((r) => (
                      <option key={r.code} value={r.code} className="bg-dark-900 text-white">
                        {r.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    value={editPhoneNo}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '')
                      const currentRegion = REGIONS.find(r => r.code === editPhoneRegion)
                      if (val.length <= (currentRegion?.digits || 15)) {
                        setEditPhoneNo(val)
                      }
                    }}
                    placeholder={REGIONS.find(r => r.code === editPhoneRegion)?.placeholder || 'Phone number'}
                    className="flex-1 rounded-lg border border-dark-700 bg-dark-950 px-4 py-2.5 text-white focus:border-brand-500 focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Rapid Build Joining Date
                </label>
                <input
                  type="date"
                  value={editRapidJoiningDate}
                  onChange={(e) => setEditRapidJoiningDate(e.target.value)}
                  className="w-full rounded-lg border border-dark-700 bg-dark-950 px-4 py-2.5 text-white focus:border-brand-500 focus:outline-none text-sm"
                />
              </div>

              {/* Edit Skills tags search and select */}
              <div className="relative">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Skills Set
                </label>
                <input
                  type="text"
                  value={skillsInput}
                  onChange={(e) => {
                    setSkillsInput(e.target.value)
                    setIsSkillsDropdownOpen(true)
                  }}
                  onFocus={() => setIsSkillsDropdownOpen(true)}
                  className="w-full rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none text-sm"
                  placeholder="Search and select skills..."
                />
                
                {isSkillsDropdownOpen && skillsInput && (
                  <div className="absolute z-30 mt-1 max-h-40 w-full overflow-y-auto rounded-xl border border-dark-700 bg-dark-900 p-2 shadow-xl">
                    {PREDEFINED_SKILLS.filter(s => s.toLowerCase().includes(skillsInput.toLowerCase()) && !editSkills.includes(s)).length === 0 ? (
                      <p className="text-xs text-slate-505 p-2">No matching skills found.</p>
                    ) : (
                      PREDEFINED_SKILLS.filter(s => s.toLowerCase().includes(skillsInput.toLowerCase()) && !editSkills.includes(s)).map(skill => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => handleAddSkill(skill)}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-dark-800 transition"
                        >
                          {skill}
                        </button>
                      ))
                    )}
                  </div>
                )}

                {editSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5 p-2 rounded-xl border border-dark-800 bg-dark-950/40 max-h-24 overflow-y-auto">
                    {editSkills.map(skill => (
                      <span 
                        key={skill}
                        className="inline-flex items-center gap-1 rounded bg-brand-500/10 border border-brand-500/25 px-2 py-0.5 text-xs text-brand-400"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="text-slate-400 hover:text-rose-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-dark-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false)
                    setEditingUser(null)
                  }}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-dark-800 text-slate-350 hover:bg-dark-750"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-brand-500 text-white hover:bg-brand-650 transition"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
