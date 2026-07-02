import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/Navbar'
import {
  FlaskConical, Plus, ArrowRight, Users, LayoutGrid,
  CheckCircle2, Loader, X, AlertCircle, Building2, ShieldCheck
} from 'lucide-react'

const SupervisorDashboard = () => {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [labs, setLabs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Create lab modal
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newLabName, setNewLabName] = useState('')
  const [newLabDesc, setNewLabDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)

  const fetchLabs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch all labs with nested team and member counts
      const { data, error: labErr } = await supabase
        .from('labs')
        .select(`
          id, name, description, created_at,
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

  const handleCreateLab = async () => {
    if (!newLabName.trim()) return
    setCreating(true)
    setCreateError(null)
    try {
      const { error: insertErr } = await supabase
        .from('labs')
        .insert({ name: newLabName.trim(), description: newLabDesc.trim() || null, created_by: profile?.id })
      if (insertErr) throw insertErr
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

  // Compute stats per lab — unique member count deduplicates users across teams
  const getLabStats = (lab) => {
    const teamCount = lab.teams?.length || 0
    // Collect all user_ids across every team in this lab, then deduplicate
    const allUserIds = (lab.teams || []).flatMap(t =>
      (t.team_members || []).map(m => m.user_id).filter(Boolean)
    )
    const memberCount = new Set(allUserIds).size
    const adminCount = lab.lab_admins?.length || 0
    return { teamCount, memberCount, adminCount }
  }

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
            <h1 className="text-2xl font-extrabold tracking-tight text-white">All Labs</h1>
            <p className="text-sm text-slate-400 mt-1">
              Select a lab to manage its teams, tasks, and members.
            </p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm px-4 py-2.5 transition shadow-[0_0_16px_rgba(99,102,241,0.3)] hover:shadow-[0_0_24px_rgba(99,102,241,0.45)]"
          >
            <Plus className="h-4 w-4" />
            Create New Lab
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <Loader className="h-8 w-8 text-brand-500 animate-spin" />
          </div>
        ) : labs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
            <FlaskConical className="h-12 w-12 text-slate-600" />
            <p className="text-slate-400 text-sm">No labs yet. Create your first lab to get started.</p>
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
                  {/* Top accent bar */}
                  <div className="h-1 w-full bg-gradient-to-r from-brand-500 to-violet-500 opacity-60 group-hover:opacity-100 transition-opacity" />

                  <div className="flex flex-col flex-1 p-5 space-y-4">
                    {/* Lab name */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-500/20 bg-brand-500/10">
                          <FlaskConical className="h-5 w-5 text-brand-400" />
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

                    {/* Enter Lab CTA */}
                    <button
                      onClick={() => navigate(`/supervisor/lab/${lab.id}`)}
                      className="mt-auto w-full flex items-center justify-center gap-2 rounded-xl border border-brand-500/20 bg-brand-500/5 hover:bg-brand-500/15 text-brand-400 hover:text-brand-300 font-semibold text-xs py-2.5 transition-all group/btn"
                    >
                      Enter Lab
                      <ArrowRight className="h-3.5 w-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Create Lab Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsCreateOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-dark-800 bg-dark-900 shadow-2xl overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between border-b border-dark-800 px-5 py-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-brand-400" />
                <h3 className="font-bold text-white text-sm">Create New Lab</h3>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Lab Name <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  value={newLabName}
                  onChange={(e) => setNewLabName(e.target.value)}
                  placeholder="e.g. Lab 1, Lab 3..."
                  className="w-full rounded-xl border border-dark-700 bg-dark-800 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500/60 transition"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateLab()}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Description <span className="text-slate-600">(optional)</span></label>
                <textarea
                  value={newLabDesc}
                  onChange={(e) => setNewLabDesc(e.target.value)}
                  placeholder="Brief description of this lab's focus..."
                  rows={2}
                  className="w-full rounded-xl border border-dark-700 bg-dark-800 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500/60 transition resize-none"
                />
              </div>

              {createError && (
                <p className="text-xs text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {createError}
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
                  {creating ? 'Creating...' : 'Create Lab'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SupervisorDashboard
