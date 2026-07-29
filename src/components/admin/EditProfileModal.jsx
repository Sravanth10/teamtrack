import React, { useState, useEffect } from 'react'
import { X, Loader } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

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

const INDIVIDUAL_CATEGORIES = ['Billable', 'Core', 'Future Ready', 'GTM', 'Training']

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

// Self-contained edit-profile form (same pattern as TeamModal): owns its own
// form state, populated from the `user` prop whenever it opens, and reports
// back via onSaved/onClose rather than the parent tracking 20+ form fields.
export const EditProfileModal = ({ isOpen, user, profile, isSupervisor, onClose, onSaved }) => {
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
  const [editSkillLevel, setEditSkillLevel] = useState('foundation')
  const [editNotificationsAccess, setEditNotificationsAccess] = useState(false)
  const [editIndividualCategory, setEditIndividualCategory] = useState('Training')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen && user) {
      setEditName(user.name || '')
      setEditRole(user.role || 'member')
      setEditEmployeeId(user.employee_id || '')
      setEditWorkLocation(user.work_location || '')
      const parsedPhone = parsePhone(user.phone_number)
      setEditPhoneRegion(parsedPhone.region)
      setEditPhoneNo(parsedPhone.number)
      setEditRapidJoiningDate(user.rapid_joining_date || '')
      setEditSkills(user.skills || [])
      setEditSkillLevel(user.skill_level || 'foundation')
      setEditNotificationsAccess(user.notifications_access === true)
      setSkillsInput('')
      setIsSkillsDropdownOpen(false)

      // Individual Category lives in employee_skills_data, soft-linked via employee_id
      setEditIndividualCategory(user.individualCategory || 'Training')
      if (user.employee_id) {
        supabase
          .from('employee_skills_data')
          .select('individual_category')
          .eq('employee_id', user.employee_id)
          .maybeSingle()
          .then(({ data }) => {
            if (data?.individual_category) {
              setEditIndividualCategory(data.individual_category)
            }
          })
      }
    }
  }, [isOpen, user])

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
    if (!user) return

    const currentRegion = REGIONS.find(r => r.code === editPhoneRegion)
    if (editPhoneNo.trim() && editPhoneNo.trim().length !== currentRegion.digits) {
      alert(`Phone number for ${currentRegion.country} must be exactly ${currentRegion.digits} digits long`)
      return
    }

    setIsSaving(true)
    try {
      const rapidExp = calculateExperience(editRapidJoiningDate)

      const updatePayload = {
        name: editName.trim(),
        role: editRole,
        employee_id: editEmployeeId.trim(),
        work_location: editWorkLocation.trim(),
        rapid_joining_date: editRapidJoiningDate || null,
        rapid_experience: rapidExp,
        skills: editSkills,
        phone_number: editPhoneNo.trim() ? `${editPhoneRegion} ${editPhoneNo.trim()}` : null
      }

      // Only supervisors can modify the skill level of admins and members
      if (profile?.role === 'supervisor') {
        updatePayload.skill_level = editSkillLevel
      }

      // Only supervisors can grant/revoke the notifications feature, and only for Lead Admins
      if (profile?.role === 'supervisor' && editRole === 'admin') {
        updatePayload.notifications_access = editNotificationsAccess
      }

      const { error: updateErr } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', user.id)

      if (updateErr) throw updateErr

      // Individual Category lives in employee_skills_data, soft-linked via employee_id
      const savedEmployeeId = editEmployeeId.trim()
      if (savedEmployeeId) {
        const { error: catErr } = await supabase
          .from('employee_skills_data')
          .upsert(
            { employee_id: savedEmployeeId, individual_category: editIndividualCategory, status: 'registered' },
            { onConflict: 'employee_id' }
          )
        if (catErr) throw catErr
      }

      onClose()
      await onSaved()
    } catch (err) {
      alert(`Failed to save profile: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen || !user) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg transform overflow-hidden rounded-2xl border border-dark-800 bg-dark-900 p-6 shadow-2xl transition-all max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-dark-800 pb-3 mb-4">
          <h3 className="font-sans text-lg font-bold text-white flex items-center gap-2">
            Edit User Profile
          </h3>
          <button
            onClick={onClose}
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

          {/* Individual Category (Admin & Supervisor only — this modal itself is unreachable by members) */}
          {(profile?.role === 'admin' || profile?.role === 'supervisor') && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Individual Category
              </label>
              <select
                value={editIndividualCategory}
                onChange={(e) => setEditIndividualCategory(e.target.value)}
                className="w-full rounded-lg border border-dark-700 bg-dark-950 px-4 py-2.5 text-white focus:border-brand-500 focus:outline-none text-sm"
              >
                {INDIVIDUAL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}

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

          {/* Skill Level Selection (Supervisors only, admins/members read-only) */}
          {profile?.role === 'supervisor' && editRole !== 'supervisor' ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Skill Level
              </label>
              <select
                value={editSkillLevel}
                onChange={(e) => setEditSkillLevel(e.target.value)}
                className="w-full rounded-lg border border-dark-700 bg-dark-950 px-4 py-2.5 text-white focus:border-brand-500 focus:outline-none text-sm capitalize"
              >
                <option value="foundation">Foundation</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Skill Level (Read Only)
              </label>
              <div className="w-full rounded-lg border border-dark-800 bg-dark-950/50 px-4 py-2.5 text-slate-400 text-sm capitalize select-none">
                {editRole === 'supervisor' ? 'management' : editSkillLevel}
              </div>
            </div>
          )}

          {/* Notifications Feature Access (Supervisors granting access to Lead Admins only) */}
          {profile?.role === 'supervisor' && editRole === 'admin' && (
            <div className="flex items-center justify-between rounded-lg border border-dark-700 bg-dark-950 px-4 py-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Notifications Access
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Lets this admin see missed-progress alerts for members in their Build Team.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditNotificationsAccess(!editNotificationsAccess)}
                className={`relative shrink-0 h-6 w-11 rounded-full transition-colors ${
                  editNotificationsAccess ? 'bg-brand-500' : 'bg-dark-700'
                }`}
                title={editNotificationsAccess ? 'Disable notifications access' : 'Enable notifications access'}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    editNotificationsAccess ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          )}

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
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-dark-800 text-slate-350 hover:bg-dark-750"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-lg bg-brand-500 text-white hover:bg-brand-650 transition disabled:opacity-50"
            >
              {isSaving && <Loader className="h-3.5 w-3.5 animate-spin" />}
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditProfileModal
