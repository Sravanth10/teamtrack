import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/Navbar'
import {
  FlaskConical, Plus, ArrowRight, Users, LayoutGrid,
  CheckCircle2, Loader, X, AlertCircle, Building2, ShieldCheck,
  UserPlus, Trash2, Search, UserMinus, BarChart3, Lightbulb, Filter, Target
} from 'lucide-react'
import swiftLogo from '../assets/swift_logo.png'
import strideLogo from '../assets/stride_logo.png'

// Ordinal skill ladder (Foundation → Management); Operation sits outside the ladder
// as its own track. Sequential single-hue ramp, light → dark, per skill level.
const SKILL_LEVEL_ORDER = ['Foundation', 'Intermediate', 'Advanced', 'Management', 'Operation']
const SKILL_LEVEL_BAR_COLOR = {
  'Foundation': 'bg-brand-300',
  'Intermediate': 'bg-brand-500',
  'Advanced': 'bg-brand-700',
  'Management': 'bg-brand-900',
  'Operation': 'bg-slate-500',
  'Unspecified': 'bg-slate-700'
}

// ── KPIs tab (static preview data for now) ──────────────────────────────────
// TODO: replace with live-computed values once the calculation logic is defined.
// Only showing the months with data through Jun-26 per current request.
const KPI_MONTHS = ['Mar-26', 'Apr-26', 'May-26', 'Jun-26']
const KPI_DEPARTMENT_COUNTS = [44, 43, 72, 74]
const KPI_ROWS = [
  {
    kpi: '% Billability (Customer Engagements)',
    definition: 'Total number of allocation days on WON/ (Total WON+ SWON days of allocation)',
    values: [32, 32, 19, 24]
  },
  {
    kpi: '% on GTM Rapid Prototype',
    definition: 'Total number of allocation days spent on actual Prototypes/ (Total WON+ SWON days of allocation)',
    values: [14, 12, 14, 13]
  },
  {
    kpi: '% Core Team',
    definition: 'Team / (Total WON+ SWON days of allocation)',
    values: [16, 14, 10, 13]
  },
  {
    kpi: '% Future Ready',
    definition: 'Total number of allocation in Future Ready state / (Total WON+ SWON days of allocation)',
    values: [20, 26, 26, 23]
  },
  {
    kpi: '% moving to Future Ready',
    definition: 'Total number of allocation days on Training / (Total WON+ SWON days of allocation)',
    values: [9, 16, 31, 27]
  },
  {
    kpi: '% on CE',
    definition: 'Total number of allocation days on CE / (Total WON+ SWON days of allocation)',
    values: [10, 0, 0, 0]
  }
]

const SupervisorDashboard = () => {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const renderLabLogo = (lab, className = "h-5 w-5") => {
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

  const [labs, setLabs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)
  const uploadingLabIdRef = useRef(null)

  // 'teams' (default) or 'skills' — the Skill Distribution tab is supervisor-only,
  // which this whole page already is (gated by SupervisorRoute in App.jsx)
  const [activeTab, setActiveTab] = useState('teams')

  // Skill Distribution tab states
  const [skillsData, setSkillsData] = useState([])       // employee_skills_data rows
  const [employeeLabMap, setEmployeeLabMap] = useState({}) // employee_id -> Set(lab_id) via users/team_members
  const [skillsLoading, setSkillsLoading] = useState(false)
  const [skillsError, setSkillsError] = useState(null)
  const [skillsLoaded, setSkillsLoaded] = useState(false)
  const [selectedLabFilter, setSelectedLabFilter] = useState('all')

  const triggerLogoUpload = (labId) => {
    uploadingLabIdRef.current = labId
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    const labId = uploadingLabIdRef.current
    if (!file || !labId) return

    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64String = reader.result
      try {
        const { error: uploadErr } = await supabase
          .from('labs')
          .update({ logo_url: base64String })
          .eq('id', labId)

        if (uploadErr) throw uploadErr

        fetchLabs()
      } catch (err) {
        alert('Failed to update lab logo: ' + err.message)
      } finally {
        uploadingLabIdRef.current = null
        e.target.value = ''
      }
    }
    reader.readAsDataURL(file)
  }

  // Create lab modal
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newLabName, setNewLabName] = useState('')
  const [newLabDesc, setNewLabDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)

  // Manage Lead Admins modal
  const [managingLab, setManagingLab] = useState(null)   // the lab object being managed
  const [adminSearch, setAdminSearch] = useState('')
  const [adminSearchResults, setAdminSearchResults] = useState([])
  const [adminSearchLoading, setAdminSearchLoading] = useState(false)
  const [assignedAdmins, setAssignedAdmins] = useState([]) // lab_admins rows for current lab
  const [adminActionLoading, setAdminActionLoading] = useState(null) // user_id being actioned

  const fetchLabs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: labErr } = await supabase
        .from('labs')
        .select(`
          id, name, description, logo_url, created_at,
          teams (
            id,
            team_members ( id, user_id )
          ),
          lab_admins (
            user_id,
            users ( id, name, email )
          )
        `)
        .order('created_at', { ascending: true })

      if (labErr) throw labErr
      setLabs(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLabs()
  }, [fetchLabs])

  // ── Skill Distribution ──────────────────────────────────────────────────────
  // employee_skills_data is only soft-linked to users on employee_id (no FK), so
  // Build-Team filtering is done client-side: fetch every registered user's
  // employee_id alongside their team memberships' lab_id, then match employee_id
  // -> lab_id(s) against the skills rows.
  const fetchSkillsDistribution = useCallback(async () => {
    setSkillsLoading(true)
    setSkillsError(null)
    try {
      const [{ data: skillsRows, error: skillsErr }, { data: usersRows, error: usersErr }] = await Promise.all([
        supabase.from('employee_skills_data').select('employee_id, skill_level, sub_team, status'),
        supabase
          .from('users')
          .select(`
            employee_id,
            team_members (
              teams ( lab_id )
            )
          `)
          .not('employee_id', 'is', null)
      ])

      if (skillsErr) throw skillsErr
      if (usersErr) throw usersErr

      setSkillsData(skillsRows || [])

      const map = {}
      ;(usersRows || []).forEach(u => {
        if (!u.employee_id) return
        const labIds = (u.team_members || []).map(tm => tm.teams?.lab_id).filter(Boolean)
        if (labIds.length > 0) {
          map[u.employee_id] = new Set(labIds)
        }
      })
      setEmployeeLabMap(map)
      setSkillsLoaded(true)
    } catch (err) {
      setSkillsError(err.message)
    } finally {
      setSkillsLoading(false)
    }
  }, [])

  // ── Create Lab ──────────────────────────────────────────────────────────────
  const handleCreateLab = async () => {
    if (!newLabName.trim()) return
    setCreating(true)
    setCreateError(null)
    try {
      const { data: newLab, error: insertErr } = await supabase
        .from('labs')
        .insert({ name: newLabName.trim(), description: newLabDesc.trim() || null, created_by: profile?.id })
        .select()
        .single()
      
      if (insertErr) throw insertErr

      // Auto create general team for this new lab
      const { error: teamErr } = await supabase
        .from('teams')
        .insert({
          name: 'General',
          description: `General team space for ${newLabName.trim()} non project specific tasks`,
          category: 'general',
          created_by: profile?.id,
          lab_id: newLab.id
        })

      if (teamErr) throw teamErr

      setNewLabName('')
      setNewLabDesc('')
      setIsCreateOpen(false)
      await fetchLabs()
    } catch (err) {
      setCreateError(err.message)
    } finally {
      setCreating(false)
    }
  }

  // ── Delete Lab ──────────────────────────────────────────────────────────────
  const handleDeleteLab = async (labId, labName) => {
    if (!window.confirm(`Are you sure you want to delete the build team category "${labName}" permanently? This will delete all teams, tasks, and historical details inside this category.`)) {
      return
    }

    setLoading(true)
    setError(null)
    try {
      // 1. Delete all teams in this lab first to trigger cascades
      const { error: teamDeleteErr } = await supabase
        .from('teams')
        .delete()
        .eq('lab_id', labId)

      if (teamDeleteErr) throw teamDeleteErr

      // 2. Delete the lab itself
      const { error: labDeleteErr } = await supabase
        .from('labs')
        .delete()
        .eq('id', labId)

      if (labDeleteErr) throw labDeleteErr

      await fetchLabs()
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  // ── Manage Lead Admins modal ────────────────────────────────────────────────
  const openManageAdmins = async (lab) => {
    setManagingLab(lab)
    setAdminSearch('')
    setAdminSearchResults([])
    // Load currently assigned admins for this lab
    const { data } = await supabase
      .from('lab_admins')
      .select('user_id, users ( id, name, email )')
      .eq('lab_id', lab.id)
    setAssignedAdmins(data || [])
  }

  const closeManageAdmins = () => {
    setManagingLab(null)
    setAdminSearch('')
    setAdminSearchResults([])
    setAssignedAdmins([])
  }

  // Search users with role = admin
  useEffect(() => {
    if (!managingLab || !adminSearch.trim()) {
      setAdminSearchResults([])
      return
    }
    const t = setTimeout(async () => {
      setAdminSearchLoading(true)
      const { data } = await supabase
        .from('users')
        .select('id, name, email, role')
        .eq('approved_status', 'approved')
        .eq('role', 'admin')
        .or(`name.ilike.%${adminSearch}%,email.ilike.%${adminSearch}%`)
        .limit(8)
      setAdminSearchResults(data || [])
      setAdminSearchLoading(false)
    }, 300)
    return () => clearTimeout(t)
  }, [adminSearch, managingLab])

  const handleAssignAdmin = async (user) => {
    setAdminActionLoading(user.id)
    try {
      const { error } = await supabase
        .from('lab_admins')
        .insert({ lab_id: managingLab.id, user_id: user.id })
      if (error) throw error
      // Refresh assigned list
      const { data } = await supabase
        .from('lab_admins')
        .select('user_id, users ( id, name, email )')
        .eq('lab_id', managingLab.id)
      setAssignedAdmins(data || [])
      await fetchLabs()
    } catch (err) {
      alert(err.message)
    } finally {
      setAdminActionLoading(null)
    }
  }

  const handleRemoveAdmin = async (userId) => {
    setAdminActionLoading(userId)
    try {
      const { error } = await supabase
        .from('lab_admins')
        .delete()
        .eq('lab_id', managingLab.id)
        .eq('user_id', userId)
      if (error) throw error
      setAssignedAdmins(prev => prev.filter(a => a.user_id !== userId))
      await fetchLabs()
    } catch (err) {
      alert(err.message)
    } finally {
      setAdminActionLoading(null)
    }
  }

  // ── Stats helper ────────────────────────────────────────────────────────────
  const getLabStats = (lab) => {
    const teamCount = lab.teams?.length || 0
    const allUserIds = (lab.teams || []).flatMap(t =>
      (t.team_members || []).map(m => m.user_id).filter(Boolean)
    )
    const memberCount = new Set(allUserIds).size
    const adminCount = lab.lab_admins?.length || 0
    return { teamCount, memberCount, adminCount }
  }

  const isAssigned = (userId) => assignedAdmins.some(a => a.user_id === userId)

  // ── Skill Distribution derived data ─────────────────────────────────────────
  // A row matches the selected Build Team if EITHER the (registered) employee's
  // actual team membership is in that lab, OR their sub_team (present on every
  // row, registered or not) names that lab — the latter is what lets allocated
  // (not-yet-registered) candidates show up under a Build Team filter at all,
  // since they have no team_members row to join through yet.
  const selectedLab = selectedLabFilter === 'all' ? null : labs.find(l => l.id === selectedLabFilter)
  const filteredSkillsRows = selectedLabFilter === 'all'
    ? skillsData
    : skillsData.filter(row => {
        const matchesTeamMembership = employeeLabMap[row.employee_id]?.has(selectedLabFilter)
        const matchesSubTeam = !!(selectedLab && row.sub_team &&
          row.sub_team.trim().toLowerCase() === selectedLab.name.trim().toLowerCase())
        return matchesTeamMembership || matchesSubTeam
      })

  const skillCounts = SKILL_LEVEL_ORDER.map(level => ({
    level,
    count: filteredSkillsRows.filter(r => (r.skill_level || '').trim() === level).length
  }))
  const unspecifiedCount = filteredSkillsRows.filter(r => {
    const lvl = (r.skill_level || '').trim()
    return !lvl || !SKILL_LEVEL_ORDER.includes(lvl)
  }).length
  if (unspecifiedCount > 0) {
    skillCounts.push({ level: 'Unspecified', count: unspecifiedCount })
  }

  const totalSkillsCount = filteredSkillsRows.length
  const maxSkillCount = Math.max(1, ...skillCounts.map(s => s.count))

  const getSkillInsights = () => {
    if (totalSkillsCount === 0) return []

    const present = skillCounts.filter(s => s.count > 0).sort((a, b) => b.count - a.count)
    const top = present[0]
    const bottom = present[present.length - 1]
    const topPct = ((top.count / totalSkillsCount) * 100).toFixed(1)

    const seniorCount = filteredSkillsRows.filter(r => ['Advanced', 'Management'].includes((r.skill_level || '').trim())).length
    const developingCount = filteredSkillsRows.filter(r => ['Foundation', 'Intermediate'].includes((r.skill_level || '').trim())).length
    const seniorPct = ((seniorCount / totalSkillsCount) * 100).toFixed(1)
    const developingPct = ((developingCount / totalSkillsCount) * 100).toFixed(1)

    const registeredCount = filteredSkillsRows.filter(r => r.status === 'registered').length
    const allocatedCount = totalSkillsCount - registeredCount

    const insights = [
      `${top.level} is the largest group at ${topPct}% (${top.count} of ${totalSkillsCount} ${totalSkillsCount === 1 ? 'employee' : 'employees'}).`,
      present.length > 1 && bottom.count !== top.count
        ? `${bottom.level} has the smallest share at ${((bottom.count / totalSkillsCount) * 100).toFixed(1)}% (${bottom.count} ${bottom.count === 1 ? 'employee' : 'employees'}).`
        : null,
      seniorCount > 0 || developingCount > 0
        ? `${developingPct}% are at developing levels (Foundation/Intermediate) versus ${seniorPct}% at senior levels (Advanced/Management).`
        : null,
      allocatedCount > 0
        ? `${allocatedCount} of ${totalSkillsCount} employees in this data haven't registered in TeamTrack yet (status: allocated).`
        : `All ${totalSkillsCount} employees in this data have registered in TeamTrack.`
    ].filter(Boolean)

    return insights
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-dark-950 text-slate-200 flex flex-col">
      <Navbar />

      <main className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-widest font-bold text-brand-400">Supervisor View</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">All Build Teams</h1>
            <p className="text-sm text-slate-400 mt-1">
              Select a build team category to manage its teams, tasks, and members.
            </p>
          </div>
          {activeTab === 'teams' && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm px-4 py-2.5 transition shadow-[0_0_16px_rgba(99,102,241,0.3)] hover:shadow-[0_0_24px_rgba(99,102,241,0.45)]"
            >
              <Plus className="h-4 w-4" />
              Create New Build Team
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-dark-800">
          <button
            onClick={() => setActiveTab('teams')}
            className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'teams'
                ? 'border-brand-500 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            Build Teams
          </button>
          <button
            onClick={() => {
              setActiveTab('skills')
              if (!skillsLoaded) fetchSkillsDistribution()
            }}
            className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'skills'
                ? 'border-brand-500 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Skill Distribution
          </button>
          <button
            onClick={() => setActiveTab('kpis')}
            className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'kpis'
                ? 'border-brand-500 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Target className="h-4 w-4" />
            KPIs
          </button>
        </div>

        {error && activeTab === 'teams' && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {activeTab === 'teams' && (loading ? (
          <div className="flex justify-center items-center py-24">
            <Loader className="h-8 w-8 text-brand-500 animate-spin" />
          </div>
        ) : labs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
            <FlaskConical className="h-12 w-12 text-slate-600" />
            <p className="text-slate-400 text-sm">No build teams yet. Create your first build team to get started.</p>
          </div>
        ) : (
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {labs.map((lab) => {
              const { teamCount, memberCount, adminCount } = getLabStats(lab)
              return (
                <div
                  key={lab.id}
                  className="group relative flex flex-col rounded-2xl border border-dark-800 bg-dark-900 overflow-hidden hover:border-brand-500/30 transition-all duration-300 shadow-glass hover:shadow-[0_0_30px_rgba(99,102,241,0.08)]"
                >
                  <div className="h-1 w-full bg-gradient-to-r from-brand-500 to-violet-500 opacity-60 group-hover:opacity-100 transition-opacity" />

                  <div className="flex flex-col flex-1 p-5 space-y-4">
                    {/* Lab name */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div 
                          onClick={() => triggerLogoUpload(lab.id)}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-500/20 bg-brand-500/10 overflow-hidden cursor-pointer hover:opacity-80 hover:border-brand-400 transition-all duration-200"
                          title="Click to change build team logo"
                        >
                          {renderLabLogo(lab, "h-8 w-8")}
                        </div>
                        <div>
                          <h2 className="text-base font-extrabold text-white tracking-tight group-hover:text-brand-300 transition-colors">
                            {lab.name}
                          </h2>
                          {lab.description && (
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{lab.description}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteLab(lab.id, lab.name)}
                        className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-500/10 transition shrink-0"
                        title="Delete Build Team"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { icon: LayoutGrid, label: 'Teams', value: teamCount, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/15' },
                        { icon: Users, label: 'Members', value: memberCount, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/15' },
                        { icon: ShieldCheck, label: 'Lead Admins', value: adminCount, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/15' },
                      ].map(({ icon: Icon, label, value, color, bg }) => (
                        <div key={label} className={`flex flex-col items-center justify-center rounded-xl border ${bg} py-2.5 px-1`}>
                          <Icon className={`h-4 w-4 ${color} mb-1`} />
                          <span className="text-base font-extrabold text-white leading-none">{value}</span>
                          <span className="text-[9px] text-slate-500 mt-0.5 uppercase tracking-wide">{label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Assigned admins preview */}
                    {lab.lab_admins && lab.lab_admins.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Lead Admins</p>
                        <div className="flex flex-wrap gap-1.5">
                          {lab.lab_admins.slice(0, 3).map((la) => (
                            <span
                              key={la.user_id}
                              className="text-[10px] font-medium bg-dark-800 border border-dark-700 text-slate-300 rounded-full px-2.5 py-0.5"
                            >
                              {la.users?.name || la.users?.email || 'Unknown'}
                            </span>
                          ))}
                          {lab.lab_admins.length > 3 && (
                            <span className="text-[10px] text-slate-500 py-0.5">+{lab.lab_admins.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="mt-auto flex gap-2">
                      {/* Manage Lead Admins */}
                      <button
                        onClick={() => openManageAdmins(lab)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/15 text-violet-400 hover:text-violet-300 font-semibold text-xs py-2.5 transition-all"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Lead Admins
                      </button>

                      {/* Enter Build Team */}
                      <button
                        onClick={() => navigate(`/supervisor/lab/${lab.id}`)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-brand-500/20 bg-brand-500/5 hover:bg-brand-500/15 text-brand-400 hover:text-brand-300 font-semibold text-xs py-2.5 transition-all group/btn"
                      >
                        Enter Build Team
                        <ArrowRight className="h-3.5 w-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        {/* Active Tab: Skill Distribution */}
        {activeTab === 'skills' && (
          <div className="space-y-6">
            {/* Header + Filter row */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-brand-400" />
                  Skill Level Distribution
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Based on the employee_skills_data table. Defaults to all build teams.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-slate-500" />
                <label className="text-xs font-semibold text-slate-400 shrink-0">Build Team:</label>
                <select
                  value={selectedLabFilter}
                  onChange={(e) => setSelectedLabFilter(e.target.value)}
                  className="rounded-xl border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/60 transition"
                >
                  <option value="all">All Build Teams</option>
                  {labs.map((lab) => (
                    <option key={lab.id} value={lab.id}>{lab.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {skillsError && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {skillsError}
              </div>
            )}

            {skillsLoading ? (
              <div className="flex justify-center items-center py-24">
                <Loader className="h-8 w-8 text-brand-500 animate-spin" />
              </div>
            ) : totalSkillsCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
                <BarChart3 className="h-12 w-12 text-slate-600" />
                <p className="text-slate-400 text-sm">
                  No employee skills data found{selectedLabFilter !== 'all' ? ' for this build team' : ''}.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 grid-cols-1 lg:grid-cols-3">
                {/* Bar Chart Card */}
                <div className="lg:col-span-2 rounded-2xl border border-dark-800 bg-dark-900 p-6 shadow-glass">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {selectedLabFilter === 'all' ? 'All Build Teams' : labs.find(l => l.id === selectedLabFilter)?.name || 'Build Team'}
                    </span>
                    <span className="text-xs text-slate-500 bg-dark-800 border border-dark-700 px-2.5 py-1 rounded-full font-semibold">
                      Total: {totalSkillsCount}
                    </span>
                  </div>

                  <div className="flex items-end justify-around gap-3 h-56 px-2">
                    {skillCounts.map(({ level, count }) => {
                      const pct = totalSkillsCount > 0 ? (count / totalSkillsCount) * 100 : 0
                      const barHeightPct = (count / maxSkillCount) * 100
                      return (
                        <div key={level} className="flex flex-col items-center justify-end h-full flex-1 group">
                          <span className="text-sm font-extrabold text-white mb-1.5">{count}</span>
                          <div className="w-full flex items-end justify-center h-full">
                            <div
                              className={`w-full max-w-[48px] rounded-t-[4px] ${SKILL_LEVEL_BAR_COLOR[level] || 'bg-slate-600'} transition-all duration-300 group-hover:brightness-110`}
                              style={{ height: count > 0 ? `${Math.max(barHeightPct, 3)}%` : '2px' }}
                              title={`${level}: ${count} (${pct.toFixed(1)}%)`}
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-slate-300 mt-2 text-center leading-tight">{level}</span>
                          <span className="text-[10px] text-slate-500">{pct.toFixed(1)}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Insights Card */}
                <div className="rounded-2xl border border-dark-800 bg-dark-900 p-6 shadow-glass space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-400" />
                    Insights
                  </h3>
                  <ul className="space-y-3">
                    {getSkillInsights().map((insight, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Active Tab: KPIs */}
        {activeTab === 'kpis' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Target className="h-5 w-5 text-brand-400" />
                Department KPIs
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Monthly allocation KPIs across all build teams, Mar-26 through Jun-26.
              </p>
            </div>

            <div className="rounded-2xl border border-dark-800 bg-dark-900 shadow-glass overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-dark-800 bg-dark-950/60">
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 min-w-[220px]">KPI</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 min-w-[320px]">Definition</th>
                      {KPI_MONTHS.map((month) => (
                        <th key={month} className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                          {month}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-800">
                    {/* Total Department Count — the top row */}
                    <tr className="bg-brand-500/5">
                      <td className="px-4 py-3 text-sm font-bold text-white align-top">Total Department Count</td>
                      <td className="px-4 py-3 text-xs text-slate-500 italic align-top">Total headcount for the month</td>
                      {KPI_DEPARTMENT_COUNTS.map((count, idx) => (
                        <td key={idx} className="px-4 py-3 text-center text-sm font-extrabold text-brand-400 tabular-nums">
                          {count}
                        </td>
                      ))}
                    </tr>

                    {KPI_ROWS.map((row) => (
                      <tr key={row.kpi} className="hover:bg-dark-800/40 transition-colors">
                        <td className="px-4 py-3 text-sm font-semibold text-slate-200 align-top">{row.kpi}</td>
                        <td className="px-4 py-3 text-xs text-slate-400 leading-relaxed align-top">{row.definition}</td>
                        {row.values.map((val, idx) => (
                          <td key={idx} className="px-4 py-3 text-center text-sm font-bold text-white tabular-nums">
                            {val}%
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Create Lab Modal ─────────────────────────────────────────────────── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsCreateOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-dark-800 bg-dark-900 shadow-2xl overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between border-b border-dark-800 px-5 py-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-brand-400" />
                <h3 className="font-bold text-white text-sm">Create New Build Team</h3>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Build Team Name <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  value={newLabName}
                  onChange={(e) => setNewLabName(e.target.value)}
                  placeholder="e.g. swift, stride..."
                  className="w-full rounded-xl border border-dark-700 bg-dark-800 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500/60 transition"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateLab()}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Description <span className="text-slate-600">(optional)</span></label>
                <textarea
                  value={newLabDesc}
                  onChange={(e) => setNewLabDesc(e.target.value)}
                  placeholder="Brief description of this build team's focus..."
                  rows={2}
                  className="w-full rounded-xl border border-dark-700 bg-dark-800 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500/60 transition resize-none"
                />
              </div>
              {createError && (
                <p className="text-xs text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />{createError}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 rounded-xl border border-dark-700 bg-dark-800 text-slate-300 hover:text-white text-sm font-semibold py-2.5 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateLab}
                  disabled={creating || !newLabName.trim()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-400 disabled:bg-dark-800 disabled:text-slate-600 disabled:border disabled:border-dark-700 text-white text-sm font-semibold py-2.5 transition"
                >
                  {creating ? <Loader className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {creating ? 'Creating...' : 'Create Build Team'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Manage Lead Admins Modal ──────────────────────────────────────────── */}
      {managingLab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeManageAdmins} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-dark-800 bg-dark-900 shadow-2xl overflow-hidden animate-fade-in">

            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-dark-800 px-5 py-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-violet-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">Manage Lead Admins</h3>
                  <p className="text-[10px] text-slate-500">{managingLab.name}</p>
                </div>
              </div>
              <button onClick={closeManageAdmins} className="text-slate-400 hover:text-white transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">

              {/* Currently assigned */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Currently Assigned ({assignedAdmins.length})
                </p>
                {assignedAdmins.length === 0 ? (
                  <p className="text-xs text-slate-600 italic">No lead admins assigned yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {assignedAdmins.map((a) => (
                      <div
                        key={a.user_id}
                        className="flex items-center justify-between rounded-xl border border-dark-700 bg-dark-800 px-3 py-2.5"
                      >
                        <div>
                          <p className="text-xs font-semibold text-white">{a.users?.name || 'Unknown'}</p>
                          <p className="text-[10px] text-slate-500">{a.users?.email}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveAdmin(a.user_id)}
                          disabled={adminActionLoading === a.user_id}
                          className="flex items-center gap-1 text-[10px] font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg px-2 py-1 transition disabled:opacity-50"
                        >
                          {adminActionLoading === a.user_id
                            ? <Loader className="h-3 w-3 animate-spin" />
                            : <UserMinus className="h-3 w-3" />}
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-dark-800" />

              {/* Search & add */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Add Lead Admin
                </p>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full rounded-xl border border-dark-700 bg-dark-800 pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500/60 transition"
                  />
                  {adminSearchLoading && (
                    <Loader className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 animate-spin" />
                  )}
                </div>

                {adminSearch.trim() && !adminSearchLoading && adminSearchResults.length === 0 && (
                  <p className="text-xs text-slate-600 italic">No lead admins found matching "{adminSearch}".</p>
                )}

                <div className="space-y-1.5">
                  {adminSearchResults.map((user) => {
                    const already = isAssigned(user.id)
                    return (
                      <div
                        key={user.id}
                        className="flex items-center justify-between rounded-xl border border-dark-700 bg-dark-800 px-3 py-2.5"
                      >
                        <div>
                          <p className="text-xs font-semibold text-white">{user.name || 'Unnamed'}</p>
                          <p className="text-[10px] text-slate-500">{user.email}</p>
                        </div>
                        {already ? (
                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2 py-1 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Assigned
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAssignAdmin(user)}
                            disabled={adminActionLoading === user.id}
                            className="flex items-center gap-1 text-[10px] font-semibold text-brand-400 hover:text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 rounded-lg px-2 py-1 transition disabled:opacity-50"
                          >
                            {adminActionLoading === user.id
                              ? <Loader className="h-3 w-3 animate-spin" />
                              : <UserPlus className="h-3 w-3" />}
                            Assign
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-dark-800 px-5 py-3">
              <button
                onClick={closeManageAdmins}
                className="w-full rounded-xl border border-dark-700 bg-dark-800 text-slate-300 hover:text-white text-sm font-semibold py-2.5 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input for Logo Upload */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleLogoUpload}
      />
    </div>
  )
}

export default SupervisorDashboard
