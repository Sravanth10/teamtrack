import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { X, FileText, Loader, Check } from 'lucide-react'

export const ProjectDetailsModal = ({ teamId, teamName, isOpen, onClose, onSaved }) => {
  const [domain, setDomain] = useState('')
  const [aiValueChain, setAiValueChain] = useState('')
  const [brief, setBrief] = useState('')
  const [businessNeed, setBusinessNeed] = useState('')
  const [rapidBuildSolution, setRapidBuildSolution] = useState('')
  const [agentsDetails, setAgentsDetails] = useState('')
  const [techStack, setTechStack] = useState('')
  const [aiInterventions, setAiInterventions] = useState('')
  const [agents, setAgents] = useState('')
  const [rapidBuilds, setRapidBuilds] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (isOpen && teamId) {
      fetchProjectDetails()
    }
  }, [isOpen, teamId])

  const fetchProjectDetails = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const { data, error: fetchErr } = await supabase
        .from('teams')
        .select(`
          domain,
          ai_value_chain,
          brief,
          business_need,
          rapid_build_solution,
          agents_details,
          tech_stack,
          ai_interventions,
          agents,
          rapid_builds
        `)
        .eq('id', teamId)
        .single()

      if (fetchErr) throw fetchErr

      if (data) {
        setDomain(data.domain || '')
        setAiValueChain(data.ai_value_chain || '')
        setBrief(data.brief || '')
        setBusinessNeed(data.business_need || '')
        setRapidBuildSolution(data.rapid_build_solution || '')
        setAgentsDetails(data.agents_details || '')
        setTechStack(data.tech_stack || '')
        setAiInterventions(data.ai_interventions || '')
        setAgents(data.agents || '')
        setRapidBuilds(data.rapid_builds || '')
      }
    } catch (err) {
      setError('Failed to load project details: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const { error: saveErr } = await supabase
        .from('teams')
        .update({
          domain: domain.trim(),
          ai_value_chain: aiValueChain.trim(),
          brief: brief.trim(),
          business_need: businessNeed.trim(),
          rapid_build_solution: rapidBuildSolution.trim(),
          agents_details: agentsDetails.trim(),
          tech_stack: techStack.trim(),
          ai_interventions: aiInterventions.trim(),
          agents: agents.trim(),
          rapid_builds: rapidBuilds.trim()
        })
        .eq('id', teamId)

      if (saveErr) throw saveErr

      setSuccess(true)
      setTimeout(() => {
        if (onSaved) onSaved()
        onClose()
      }, 1000)
    } catch (err) {
      setError('Failed to save project details: ' + err.message)
    } finally {
      setSaving(false)
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
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-dark-800 bg-dark-900 shadow-2xl flex flex-col max-h-[90vh] my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dark-800 px-6 py-4">
          <h3 className="font-sans text-lg font-bold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand-400" />
            Project Details: <span className="text-brand-300 font-extrabold">{teamName}</span>
          </h3>
          <button 
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-dark-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader className="h-10 w-10 text-brand-500 animate-spin" />
              <span className="text-sm text-slate-400">Loading project details...</span>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              {error && (
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3.5 text-sm text-rose-400">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3.5 text-sm text-emerald-400 flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Project details saved successfully!
                </div>
              )}

              {/* Single Line Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Domain
                  </label>
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="e.g. Healthcare, Finance"
                    className="w-full rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-white placeholder-slate-650 focus:border-brand-500 focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    AI Value Chain
                  </label>
                  <input
                    type="text"
                    value={aiValueChain}
                    onChange={(e) => setAiValueChain(e.target.value)}
                    placeholder="e.g. Data Prep, LLM Tuning"
                    className="w-full rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-white placeholder-slate-655 focus:border-brand-500 focus:outline-none text-sm"
                  />
                </div>
              </div>

              {/* Large Textarea Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Brief
                  </label>
                  <textarea
                    value={brief}
                    onChange={(e) => setBrief(e.target.value)}
                    placeholder="Enter project summary or overview..."
                    className="w-full h-24 rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-white placeholder-slate-600 focus:border-brand-500 focus:outline-none text-sm resize-none custom-scrollbar"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Business Need
                  </label>
                  <textarea
                    value={businessNeed}
                    onChange={(e) => setBusinessNeed(e.target.value)}
                    placeholder="Specify target business problem, objectives, KPIs..."
                    className="w-full h-24 rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-white placeholder-slate-600 focus:border-brand-500 focus:outline-none text-sm resize-none custom-scrollbar"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Rapid Build Solution
                  </label>
                  <textarea
                    value={rapidBuildSolution}
                    onChange={(e) => setRapidBuildSolution(e.target.value)}
                    placeholder="Detail the rapid build approach, features, scope..."
                    className="w-full h-24 rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-white placeholder-slate-600 focus:border-brand-500 focus:outline-none text-sm resize-none custom-scrollbar"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Agents Details
                  </label>
                  <textarea
                    value={agentsDetails}
                    onChange={(e) => setAgentsDetails(e.target.value)}
                    placeholder="Describe specific agents roles, triggers, models used..."
                    className="w-full h-24 rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-white placeholder-slate-600 focus:border-brand-500 focus:outline-none text-sm resize-none custom-scrollbar"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Tech Stack
                  </label>
                  <textarea
                    value={techStack}
                    onChange={(e) => setTechStack(e.target.value)}
                    placeholder="List all technologies, frameworks, libraries, APIs..."
                    className="w-full h-24 rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-white placeholder-slate-600 focus:border-brand-500 focus:outline-none text-sm resize-none custom-scrollbar"
                  />
                </div>
              </div>

              {/* Single Line Inputs Row 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    AI Interventions
                  </label>
                  <input
                    type="text"
                    value={aiInterventions}
                    onChange={(e) => setAiInterventions(e.target.value)}
                    placeholder="e.g. Classification, Summarization"
                    className="w-full rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-white placeholder-slate-655 focus:border-brand-500 focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Agents
                  </label>
                  <input
                    type="text"
                    value={agents}
                    onChange={(e) => setAgents(e.target.value)}
                    placeholder="e.g. Planner, Critic, Writer"
                    className="w-full rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-white placeholder-slate-655 focus:border-brand-500 focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Rapid Builds
                  </label>
                  <input
                    type="text"
                    value={rapidBuilds}
                    onChange={(e) => setRapidBuilds(e.target.value)}
                    placeholder="e.g. Build 1, MVP 2"
                    className="w-full rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-white placeholder-slate-655 focus:border-brand-500 focus:outline-none text-sm"
                  />
                </div>
              </div>

              {/* Save & Close Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-dark-800/80">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-dark-800 text-slate-350 hover:bg-dark-750 transition"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition shadow-glow-brand"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Save Details
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
export default ProjectDetailsModal
