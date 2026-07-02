import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { X, Loader, Plus, Phone, MapPin, Award, User } from 'lucide-react'

const REGION_CODES = [
  { code: '+91', country: 'India', length: 10, placeholder: '98765 43210' },
  { code: '+1', country: 'US/Canada', length: 10, placeholder: '201 555 0123' },
  { code: '+44', country: 'UK', length: 10, placeholder: '7700 900077' },
  { code: '+61', country: 'Australia', length: 9, placeholder: '412 345 678' },
  { code: '+65', country: 'Singapore', length: 8, placeholder: '8123 4567' },
  { code: '+971', country: 'UAE', length: 9, placeholder: '50 123 4567' }
]

const PRESET_SKILLS = ['React', 'Node.js', 'Python', 'Java', 'SQL', 'Docker', 'AWS', 'Tailwind CSS']

export const ProfileModal = ({ isOpen, onClose }) => {
  const { profile, refreshProfile } = useAuth()
  const [location, setLocation] = useState('')
  const [phoneRegion, setPhoneRegion] = useState('+91')
  const [phoneNo, setPhoneNo] = useState('')
  const [skills, setSkills] = useState([])
  const [newSkill, setNewSkill] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [rapidJoiningDate, setRapidJoiningDate] = useState('')
  
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (isOpen && profile) {
      setLocation(profile.work_location || '')
      setSkills(profile.skills || [])
      setEmployeeId(profile.employee_id || '')
      setRapidJoiningDate(profile.rapid_joining_date ? new Date(profile.rapid_joining_date).toISOString().split('T')[0] : '')
      
      // Parse phone number
      const fullPhone = profile.phone_number || ''
      const matchingRegion = REGION_CODES.find(r => fullPhone.startsWith(r.code + ' '))
      if (matchingRegion) {
        setPhoneRegion(matchingRegion.code)
        setPhoneNo(fullPhone.replace(matchingRegion.code + ' ', ''))
      } else {
        setPhoneRegion('+91')
        setPhoneNo(fullPhone)
      }
      setError(null)
      setSuccess(false)
    }
  }, [isOpen, profile])

  const handleAddSkill = (skillToAdd) => {
    const trimmed = skillToAdd.trim()
    if (!trimmed) return
    if (skills.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      setNewSkill('')
      return
    }
    setSkills([...skills, trimmed])
    setNewSkill('')
  }

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter(s => s !== skillToRemove))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // Validation
    const cleanPhone = phoneNo.replace(/\D/g, '')
    const selectedRegion = REGION_CODES.find(r => r.code === phoneRegion)
    
    if (cleanPhone.length !== selectedRegion.length) {
      setError(`Phone number for ${selectedRegion.country} must be exactly ${selectedRegion.length} digits.`)
      return
    }

    if (!employeeId.trim()) {
      setError('Employee ID is required.')
      return
    }

    if (!rapidJoiningDate) {
      setError('Rapid Build Joining Date is required.')
      return
    }

    if (skills.length === 0) {
      setError('At least one skill must be added to your profile.')
      return
    }

    setIsSaving(true)
    try {
      const formattedPhone = `${phoneRegion} ${cleanPhone}`
      const { error: updateErr } = await supabase
        .from('users')
        .update({
          phone_number: formattedPhone,
          work_location: location.trim(),
          skills: skills,
          employee_id: employeeId.trim(),
          rapid_joining_date: rapidJoiningDate || null
        })
        .eq('id', profile.id)

      if (updateErr) throw updateErr

      setSuccess(true)
      await refreshProfile()
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  const activeRegion = REGION_CODES.find(r => r.code === phoneRegion)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-dark-800 bg-dark-900 shadow-2xl flex flex-col my-auto max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dark-800 px-6 py-4">
          <h3 className="font-sans text-lg font-bold text-white flex items-center gap-2">
            <User className="h-5 w-5 text-brand-400" />
            My User Profile
          </h3>
          <button 
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-dark-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs text-rose-400">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3.5 text-xs text-emerald-400">
              Profile updated successfully! Closing...
            </div>
          )}

          {/* Read Only Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-dark-950/50 border border-dark-850 p-4 text-xs">
            <div>
              <span className="text-slate-505 block mb-0.5">Full Name</span>
              <span className="text-slate-300 font-semibold">{profile?.name || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-505 block mb-0.5">Email Address</span>
              <span className="text-slate-300 font-semibold font-mono">{profile?.email || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-550 block mb-0.5">Rapid Build Experience</span>
              <span className="text-slate-300 font-medium">
                {profile?.rapid_experience || 'N/A'}
              </span>
            </div>
            {profile && (profile.role === 'member' || profile.role === 'admin') && (
              <div>
                <span className="text-slate-550 block mb-0.5">Lab Assignment</span>
                <span className="text-brand-400 font-bold">
                  {(() => {
                    if (profile.role === 'member') {
                      const teams = profile.team_members?.map(m => m.teams).filter(Boolean) || []
                      const labNames = teams.map(t => t.labs?.name).filter(Boolean)
                      const uniqueNames = [...new Set(labNames)]
                      return uniqueNames.length > 0 ? uniqueNames.join(', ') : 'None'
                    } else {
                      const labNames = profile.lab_admins?.map(la => la.labs?.name).filter(Boolean) || []
                      return labNames.length > 0 ? labNames.join(', ') : 'None'
                    }
                  })()}
                </span>
              </div>
            )}
          </div>

          {/* Editable field: Employee ID & Rapid Build Joining Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Employee ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="Employee ID"
                className="w-full rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Rapid Build Joining Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={rapidJoiningDate}
                onChange={(e) => setRapidJoiningDate(e.target.value)}
                className="w-full rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Editable field: Phone Number */}
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-brand-400" />
              Phone Number <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-2">
              <select
                value={phoneRegion}
                onChange={(e) => setPhoneRegion(e.target.value)}
                className="rounded-lg border border-dark-700 bg-dark-950 px-2.5 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
              >
                {REGION_CODES.map(r => (
                  <option key={r.code} value={r.code} className="bg-dark-900">
                    {r.code} ({r.country})
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={phoneNo}
                onChange={(e) => setPhoneNo(e.target.value.replace(/\D/g, ''))}
                placeholder={activeRegion?.placeholder}
                className="flex-1 rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Editable field: Location */}
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-brand-400" />
              Work Location <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="eg. Hyderabad - Synergy park"
              className="w-full rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
              required
            />
          </div>

          {/* Editable field: Skills */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5 text-brand-400" />
              Technical Skills Set <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddSkill(newSkill)
                  }
                }}
                placeholder="Type skill & press enter..."
                className="flex-1 rounded-lg border border-dark-700 bg-dark-950 px-4 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleAddSkill(newSkill)}
                className="flex items-center gap-1 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400 hover:bg-brand-500/20 px-4 py-2 text-xs font-semibold transition"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {PRESET_SKILLS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleAddSkill(preset)}
                  className="rounded bg-dark-950 hover:bg-dark-800 border border-dark-850 px-2 py-0.75 text-[10px] text-slate-400 hover:text-slate-200 transition"
                >
                  +{preset}
                </button>
              ))}
            </div>

            {/* Active Tags */}
            <div className="flex flex-wrap gap-1.5 pt-2 max-h-24 overflow-y-auto">
              {skills.map(skill => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 rounded bg-brand-500/10 border border-brand-500/20 px-2.5 py-0.75 text-xs font-medium text-brand-400"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="text-brand-500 hover:text-brand-350 transition-colors ml-1 font-bold"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-dark-800 text-slate-350 hover:bg-dark-750 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition shadow-glow-brand"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

export default ProfileModal
