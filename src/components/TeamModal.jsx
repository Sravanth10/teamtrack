import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { X, Plus, UserMinus, UserPlus, Users, Loader } from 'lucide-react'

export const TeamModal = ({ team, isOpen, onClose, onSaved }) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [members, setMembers] = useState([])
  const [memberEmail, setMemberEmail] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const isEditMode = !!team

  useEffect(() => {
    if (isOpen) {
      if (team) {
        setName(team.name)
        setDescription(team.description || '')
        fetchMembers()
      } else {
        setName('')
        setDescription('')
        setMembers([])
      }
      setMemberEmail('')
      setError(null)
      setSuccessMsg(null)
    }
  }, [isOpen, team])

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
            description: description.trim()
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
            created_by: user.id
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

  const handleAddMember = async (e) => {
    e.preventDefault()
    if (!memberEmail.trim()) return

    setIsAddingMember(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const targetEmail = memberEmail.trim().toLowerCase()

      // 1. Look up user by email in public.users
      const { data: userProfile, error: userErr } = await supabase
        .from('users')
        .select('id, email, name')
        .eq('email', targetEmail)
        .maybeSingle()

      if (userErr) throw userErr

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
      setMemberEmail('')
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-xl transform overflow-hidden rounded-2xl border border-dark-800 bg-dark-900 shadow-2xl transition-all flex flex-col max-h-[85vh]">
        
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
              <form onSubmit={handleAddMember} className="flex gap-2 mb-4">
                <input
                  type="email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="Invite member by registered email..."
                  className="flex-1 rounded-lg border border-dark-700 bg-dark-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  disabled={isAddingMember || !memberEmail.trim()}
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
