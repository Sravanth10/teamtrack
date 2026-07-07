import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { X, Plus, UserMinus, UserPlus, Users, Loader } from 'lucide-react'

export const TeamModal = ({ team, isOpen, onClose, onSaved, labId }) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('general')
  const [members, setMembers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [isActive, setIsActive] = useState(true)

  const isEditMode = !!team

  useEffect(() => {
    if (isOpen) {
      if (team) {
        setName(team.name)
        setDescription(team.description || '')
        setCategory(team.category || 'general')
        setIsActive(team.is_active !== false)
        fetchMembers()
      } else {
        setName('')
        setDescription('')
        setCategory('general')
        setMembers([])
        setIsActive(true)
      }
      setSearchQuery('')
      setSearchResults([])
      setError(null)
      setSuccessMsg(null)
    }
  }, [isOpen, team])

  // Dynamic User Search effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true)
      try {
        const { data, error: searchErr } = await supabase
          .from('users')
          .select('id, email, name, employee_id, approved_status')
          .or(`name.ilike.%${searchQuery.trim()}%,email.ilike.%${searchQuery.trim()}%`)
          .limit(5)

        if (searchErr) throw searchErr
        
        // Filter out users already in the team
        const filtered = (data || []).filter(u => 
          !members.some(m => m.user_id === u.id || m.email.toLowerCase() === u.email.toLowerCase())
        )
        setSearchResults(filtered)
      } catch (err) {
        console.error('Error searching users:', err.message)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(delayDebounce)
  }, [searchQuery, members])

  const fetchMembers = async () => {
    try {
      const { data, error: fetchErr } = await supabase
        .from('team_members')
        .select(`
          id,
          user_id,
          email,
          users (
            id,
            email,
            name,
            role
          )
        `)
        .eq('team_id', team.id)

      if (fetchErr) throw fetchErr
      setMembers(data || [])
    } catch (err) {
      console.error('Error fetching team members:', err.message)
    }
  }

  const handleSaveTeam = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Team name is required')
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      if (isEditMode) {
        // Update existing team
        const { error: updateErr } = await supabase
          .from('teams')
          .update({
            name: name.trim(),
            description: description.trim(),
            category: category.toLowerCase().trim(),
            is_active: isActive
          })
          .eq('id', team.id)

        if (updateErr) throw updateErr
      } else {
        // Create new team
        const { data: { user } } = await supabase.auth.getUser()
        const { error: insertErr } = await supabase
          .from('teams')
          .insert({
            name: name.trim(),
            description: description.trim(),
            category: category.toLowerCase().trim(),
            created_by: user.id,
            lab_id: labId
          })

        if (insertErr) throw insertErr
      }

      onSaved()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSelectUser = async (user) => {
    setIsAddingMember(true)
    setError(null)
    setSuccessMsg(null)
    setSearchResults([])
    setSearchQuery('')

    try {
      let activeUser = { ...user }

      // Check if previously rejected
      if (activeUser.approved_status === 'rejected') {
        const confirmApprove = window.confirm(`This user (${activeUser.name || activeUser.email}) was previously rejected by the admin. Do you want to approve this user and add them to the team?`)
        if (!confirmApprove) {
          setIsAddingMember(false)
          return
        }

        // Approve the user
        const { error: approveErr } = await supabase
          .from('users')
          .update({ approved_status: 'approved' })
          .eq('id', activeUser.id)

        if (approveErr) throw approveErr
        
        activeUser.approved_status = 'approved'
      }

      // Check if already a member/invited (double check)
      const { data: existingMember, error: memberCheckErr } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', team.id)
        .eq('email', activeUser.email.toLowerCase())
        .maybeSingle()

      if (memberCheckErr) throw memberCheckErr

      if (existingMember) {
        throw new Error('This user is already added or invited to this team.')
      }

      // Add to team_members
      const { error: addErr } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: activeUser.id,
          email: activeUser.email.toLowerCase()
        })

      if (addErr) throw addErr

      setSuccessMsg(`Successfully added ${activeUser.name || activeUser.email} to the team!`)
      fetchMembers()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsAddingMember(false)
    }
  }

  const handleAddMember = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsAddingMember(true)
    setError(null)
    setSuccessMsg(null)
    setSearchResults([])

    try {
      const targetEmail = searchQuery.trim().toLowerCase()

      // 1. Look up user by email in public.users
      const { data: userProfile, error: userErr } = await supabase
        .from('users')
        .select('id, email, name, approved_status')
        .eq('email', targetEmail)
        .maybeSingle()

      if (userErr) throw userErr

      // If user exists and is rejected, prompt admin
      if (userProfile && userProfile.approved_status === 'rejected') {
        const confirmApprove = window.confirm(`This user (${userProfile.name || targetEmail}) was previously rejected by the admin. Do you want to approve this user and add them to the team?`)
        if (!confirmApprove) {
          setIsAddingMember(false)
          return
        }

        // Approve the user
        const { error: approveErr } = await supabase
          .from('users')
          .update({ approved_status: 'approved' })
          .eq('id', userProfile.id)

        if (approveErr) throw approveErr
        
        userProfile.approved_status = 'approved'
      }

      // 2. Check if this email is already a member or invited to this team
      const { data: existingMember, error: memberCheckErr } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', team.id)
        .eq('email', targetEmail)
        .maybeSingle()

      if (memberCheckErr) throw memberCheckErr

      if (existingMember) {
        throw new Error('This email is already added or invited to this team.')
      }

      // 3. Add user or register pending invitation to team
      const { error: addErr } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: userProfile ? userProfile.id : null,
          email: targetEmail
        })

      if (addErr) throw addErr

      if (userProfile) {
        setSuccessMsg(`Successfully added ${userProfile.name || userProfile.email} to the team!`)
      } else {
        setSuccessMsg(`Invitation saved for pending user "${targetEmail}". They will be added to the team automatically upon registration.`)
      }

      setSearchQuery('')
      fetchMembers()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsAddingMember(false)
    }
  }

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member from the team?')) {
      return
    }

    setError(null)
    setSuccessMsg(null)
    try {
      const { error: removeErr } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId)

      if (removeErr) throw removeErr
      fetchMembers()
    } catch (err) {
      setError(err.message)
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

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-xl rounded-2xl border border-dark-800 bg-dark-900 shadow-2xl flex flex-col max-h-[90vh] my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dark-800 px-6 py-4">
          <h3 className="font-sans text-lg font-bold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-brand-400" />
            {isEditMode ? `Manage Team: ${team.name}` : 'Create New Team'}
          </h3>
          <button 
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-dark-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {error && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3.5 text-sm text-rose-400">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3.5 text-sm text-emerald-400">
              {successMsg}
            </div>
          )}

          {/* Team Basic Config Form */}
          <form onSubmit={handleSaveTeam} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Team Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
                placeholder="Marketing, Engineering, Devops etc."
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-20 rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none resize-none"
                placeholder="Specify the team's objective or scope..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Team Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-white placeholder-slate-505 focus:border-brand-500 focus:outline-none text-sm"
                placeholder="e.g. general, development, qa..."
                required
              />
            </div>

            {isEditMode && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Team Workspace Status
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsActive(true)}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border text-xs font-bold py-2.5 transition-all ${
                      isActive
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-extrabold shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                        : 'border-dark-700 bg-dark-950 text-slate-500 hover:text-slate-350'
                    }`}
                  >
                    🟢 Active Space
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsActive(false)}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border text-xs font-bold py-2.5 transition-all ${
                      !isActive
                        ? 'border-amber-500/20 bg-amber-500/10 text-amber-400 font-extrabold shadow-[0_0_15px_rgba(245,158,11,0.05)]'
                        : 'border-dark-700 bg-dark-950 text-slate-500 hover:text-slate-355'
                    }`}
                  >
                    🔴 Deactivated Space
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5 leading-normal">
                  Deactivating a team space locks task updates, leave logs, and sticky note changes in read-only mode for members.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-dark-800 text-slate-350 hover:bg-dark-750 transition"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition shadow-glow-brand"
              >
                {isSaving ? 'Saving...' : (isEditMode ? 'Save Details' : 'Create Team')}
              </button>
            </div>
          </form>

          {/* Members Admin Form - Only visible in EDIT mode */}
          {isEditMode && (
            <div className="border-t border-dark-800/80 pt-6">
              <h4 className="font-sans text-sm font-bold text-white mb-4">
                Team Members ({members.length})
              </h4>

              {/* Add Member form */}
              <div className="relative mb-4">
                <form onSubmit={handleAddMember} className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search user by name/email or enter new email..."
                    className="flex-1 rounded-lg border border-dark-700 bg-dark-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isAddingMember || !searchQuery.trim()}
                    className="flex items-center gap-1 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400 hover:bg-brand-500/20 px-4 py-2 text-xs font-semibold transition disabled:opacity-50"
                  >
                    {isAddingMember ? (
                      <Loader className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5" />
                        Add Member
                      </>
                    )}
                  </button>
                </form>

                {/* Dynamic search results dropdown */}
                {searchQuery.trim() && (searchResults.length > 0 || isSearching) && (
                  <div className="absolute z-30 mt-1 w-full rounded-lg border border-dark-700 bg-dark-900 p-2 shadow-xl max-h-56 overflow-y-auto space-y-1">
                    {isSearching ? (
                      <div className="flex items-center justify-center p-3 text-xs text-slate-500 gap-2">
                        <Loader className="h-3.5 w-3.5 animate-spin" />
                        Searching...
                      </div>
                    ) : (
                      searchResults.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => handleSelectUser(user)}
                          className="flex flex-col rounded-lg border border-dark-800 bg-dark-950/40 p-2.5 hover:bg-dark-850 cursor-pointer transition text-left"
                        >
                          <div className="flex items-baseline justify-between">
                            <span className="text-sm font-semibold text-white truncate max-w-[200px]">
                              {user.name || 'N/A'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              Emp ID: {user.employee_id || 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-slate-400 truncate max-w-[250px]">
                              {user.email}
                            </span>
                            {user.approved_status === 'rejected' && (
                              <span className="text-[9px] font-bold uppercase bg-rose-500/10 text-rose-400 px-1.5 py-0.25 rounded border border-rose-500/20">
                                Rejected
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Member list */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {members.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">
                    No members added to this team yet. Invite users by entering their email address above.
                  </p>
                ) : (
                  members.map((m) => (
                    <div 
                      key={m.id} 
                      className="flex items-center justify-between rounded-lg border border-dark-800 bg-dark-950/50 p-2.5"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-350 flex items-center gap-1.5">
                          {m.users?.name || 'Pending Invite'}
                          {!m.user_id && (
                            <span className="text-[9px] font-bold uppercase bg-amber-500/10 text-amber-400 px-1.5 py-0.25 rounded border border-amber-500/20">
                              Invited
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-slate-500">
                          {m.users?.email || m.email}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveMember(m.id)}
                        className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-500/10 transition"
                        title="Remove from team"
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
export default TeamModal
