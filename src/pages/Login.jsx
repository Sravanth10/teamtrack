import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import * as OTPAuth from 'otpauth'
import { 
  Compass, 
  Key, 
  Mail, 
  User, 
  ShieldAlert, 
  Loader, 
  Eye, 
  EyeOff, 
  Sun, 
  Moon, 
  Search, 
  X, 
  Check, 
  Sparkles, 
  Cloud, 
  Briefcase,
  Phone
} from 'lucide-react'

const PREDEFINED_SKILLS = [
  // AI & Generative AI
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
  
  // Cloud
  'Amazon Web Services (AWS)',
  'Microsoft Azure',
  'Google Cloud Platform (GCP)',
  'Terraform (Infrastructure as Code)',
  'Kubernetes (K8s)',
  'Docker & Containerization',
  'Cloud Security',
  'Serverless Architecture',
  'CI/CD Pipelines',
  
  // Frameworks & Libraries
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
  
  // Programming Languages & Databases
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

export const Login = () => {
  const { login, resetPassword, user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')

  // Custom Details States
  const [phoneRegion, setPhoneRegion] = useState('+91')
  const [phoneNo, setPhoneNo] = useState('')
  const [rapidJoiningDate, setRapidJoiningDate] = useState('')
  const [workLocation, setWorkLocation] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [selectedSkills, setSelectedSkills] = useState([])
  const [skillsQuery, setSkillsQuery] = useState('')
  const [isSkillsDropdownOpen, setIsSkillsDropdownOpen] = useState(false)

  // Authenticator Signup Setup States
  const [signupStep, setSignupStep] = useState(1) // 1 = details, 2 = authenticator setup
  const [totpSecretObj, setTotpSecretObj] = useState(null)
  const [totpVerificationCode, setTotpVerificationCode] = useState('')

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    if (newTheme === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
  }

  // Redirect to home if user session already exists
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/')
    }
  }, [user, authLoading, navigate])

  const handleSkillSelect = (skill) => {
    if (!selectedSkills.includes(skill)) {
      setSelectedSkills([...selectedSkills, skill])
    }
    setSkillsQuery('')
    setIsSkillsDropdownOpen(false)
  }

  const handleRemoveSkill = (skillToRemove) => {
    setSelectedSkills(selectedSkills.filter(s => s !== skillToRemove))
  }

  const filteredSkills = PREDEFINED_SKILLS.filter(skill => 
    skill.toLowerCase().includes(skillsQuery.toLowerCase()) &&
    !selectedSkills.includes(skill)
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (isForgotPassword) {
      if (!email.trim()) {
        setError('Please enter your email address')
        return
      }
      setLoading(true)
      try {
        const res = await resetPassword(email.trim())
        if (!res.success) throw new Error(res.error)
        setSuccess('Password reset link has been sent to your email!')
        setIsForgotPassword(false)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
      return
    }

    if (isSignUp) {
      if (signupStep === 1) {
        if (!name.trim() || !email.trim() || !password || !confirmPassword || !phoneNo.trim() || !rapidJoiningDate || !workLocation.trim() || !employeeId.trim()) {
          setError('Please fill in all fields')
          return
        }
        const currentRegion = REGIONS.find(r => r.code === phoneRegion)
        if (phoneNo.length !== currentRegion.digits) {
          setError(`Phone number for ${currentRegion.country} must be exactly ${currentRegion.digits} digits long`)
          return
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match')
          return
        }
        if (selectedSkills.length === 0) {
          setError('Please select at least one skill')
          return
        }

        // Move to Authenticator Setup step
        // Generate TOTP secret in JS
        const secret = new OTPAuth.Secret({ size: 20 })
        const totp = new OTPAuth.TOTP({
          issuer: 'TeamTrack',
          label: email.trim(),
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
          secret
        })

        setTotpSecretObj({
          totp,
          base32: secret.b32,
          hex: secret.hex
        })
        setSignupStep(2)
        return
      }

      if (signupStep === 2) {
        if (!totpVerificationCode.trim()) {
          setError('Please enter the 6-digit Authenticator code to verify')
          return
        }

        // Verify the code
        const delta = totpSecretObj.totp.validate({
          token: totpVerificationCode.trim(),
          window: 1 // Allow 30 seconds clock drift
        })

        if (delta === null) {
          setError('Invalid verification code. Please check Microsoft Authenticator and try again.')
          return
        }

        // Setup succeeded! Now send to Supabase signup
        setLoading(true)
        try {
          const { error: signUpError } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                name: name.trim() || email.split('@')[0],
                skills: selectedSkills.join(','), // CSV string parsed by DB trigger
                totp_secret: totpSecretObj.hex, // stored in metadata for DB trigger
                rapid_joining_date: rapidJoiningDate,
                work_location: workLocation.trim(),
                employee_id: employeeId.trim(),
                rapid_experience: calculateExperience(rapidJoiningDate),
                phone_number: `${phoneRegion} ${phoneNo}`
              }
            }
          })

          if (signUpError) throw signUpError
          
          setSuccess('Registration submitted successfully! Your account is pending administrator approval.')
          setIsSignUp(false)
          setSignupStep(1)
          setName('')
          setEmail('')
          setPassword('')
          setConfirmPassword('')
          setPhoneRegion('+91')
          setPhoneNo('')
          setRapidJoiningDate('')
          setWorkLocation('')
          setEmployeeId('')
          setSelectedSkills([])
          setTotpSecretObj(null)
          setTotpVerificationCode('')
        } catch (err) {
          setError(err.message)
        } finally {
          setLoading(false)
        }
      }
    } else {
      if (!email.trim() || !password) {
        setError('Please fill in all fields')
        return
      }

      setLoading(true)
      try {
        const res = await login(email.trim(), password)
        if (!res.success) {
          throw new Error(res.error)
        }
        
        // Success: Redirect to root where RootRedirector will route to /verify-otp if MFA is enabled
        navigate('/')
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
  }

  const otpauthUrl = totpSecretObj ? totpSecretObj.totp.toString() : ''
  const qrCodeUrl = otpauthUrl 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(otpauthUrl)}`
    : ''

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-dark-950 px-4 py-12 sm:px-6 lg:px-8">
      {/* Floating Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-dark-800 bg-dark-900/60 text-slate-350 backdrop-blur-md transition hover:bg-dark-800 hover:text-white"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-indigo-400" />}
        </button>
      </div>

      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 h-[300px] w-[300px] rounded-full bg-brand-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-lg space-y-8 rounded-2xl border border-dark-800 bg-dark-900/60 p-8 shadow-2xl backdrop-blur-xl max-h-[90vh] overflow-y-auto">
        
        {/* Brand Logo and Header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white shadow-glow-brand mb-4">
            <Compass className="h-7 w-7" />
          </div>
          <h2 className="font-sans text-3xl font-extrabold tracking-tight text-white">
            {isForgotPassword 
              ? 'Reset your Password' 
              : isSignUp 
                ? signupStep === 1 
                  ? 'Create your Account' 
                  : 'MFA Configuration'
                : 'Welcome to TeamTrack'}
          </h2>
          <p className="mt-2 text-sm text-slate-400 font-medium max-w-md text-center">
            {isForgotPassword
              ? 'Enter your email to receive a password reset link.'
              : isSignUp 
                ? signupStep === 1
                  ? 'Get started with task monitoring and daily logs.' 
                  : 'Scan the QR code to add a profile to Microsoft Authenticator.'
                : 'Sign in to access your team spaces and task boards.'
            }
          </p>
        </div>

        {/* Notifications */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-400 animate-shake">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-400">
            {success}
          </div>
        )}

        {/* Auth Form */}
        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          
          {/* Step 1: Account Details Form */}
          {(!isSignUp || signupStep === 1) && (
            <div className="space-y-4">
              
              {/* Name field (Sign Up only) */}
              {isSignUp && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                      <User className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full rounded-xl border border-dark-700 bg-dark-950/80 py-3 pl-11 pr-4 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition"
                      placeholder="John Doe"
                      required={isSignUp}
                    />
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Email Address {isSignUp && <span className="text-rose-500">*</span>}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-xl border border-dark-700 bg-dark-950/80 py-3 pl-11 pr-4 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition"
                    placeholder="name@company.com"
                    required
                  />
                </div>
              </div>

              {/* Experience and Skills (Sign Up only) */}
              {isSignUp && (
                <div className="space-y-4">
                  
                  {/* Employee ID & Work Location */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Employee ID <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        className="block w-full rounded-xl border border-dark-700 bg-dark-950/80 py-3 px-4 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition"
                        placeholder="e.g. 1234567"
                        required={isSignUp}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Work Location <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={workLocation}
                        onChange={(e) => setWorkLocation(e.target.value)}
                        className="block w-full rounded-xl border border-dark-700 bg-dark-950/80 py-3 px-4 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition"
                        placeholder="eg. Hyderabad - Synergy park"
                        required={isSignUp}
                      />
                    </div>
                  </div>

                  {/* Phone Number & Rapid Build Joining Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Phone Number <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={phoneRegion}
                          onChange={(e) => {
                            setPhoneRegion(e.target.value)
                            setPhoneNo('')
                          }}
                          className="rounded-xl border border-dark-700 bg-dark-950/80 py-3 px-2 text-white focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-xs transition"
                          required={isSignUp}
                        >
                          {REGIONS.map((r) => (
                            <option key={r.code} value={r.code} className="bg-dark-900 text-white">
                              {r.code}
                            </option>
                          ))}
                        </select>
                        <div className="relative flex-1">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                            <Phone className="h-3.5 w-3.5" />
                          </span>
                          <input
                            type="tel"
                            value={phoneNo}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '')
                              const currentRegion = REGIONS.find(r => r.code === phoneRegion)
                              if (val.length <= (currentRegion?.digits || 15)) {
                                setPhoneNo(val)
                              }
                            }}
                            placeholder={REGIONS.find(r => r.code === phoneRegion)?.placeholder || 'Phone number'}
                            className="block w-full rounded-xl border border-dark-700 bg-dark-950/80 py-3 pl-9 pr-3 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition"
                            required={isSignUp}
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Rapid Build Joining Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={rapidJoiningDate}
                        onChange={(e) => setRapidJoiningDate(e.target.value)}
                        className="block w-full rounded-xl border border-dark-700 bg-dark-950/80 py-3 px-4 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition"
                        required={isSignUp}
                      />
                    </div>
                  </div>

                  {/* Searchable Skills */}
                  <div className="relative">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Skills Set <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                        <Search className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        value={skillsQuery}
                        onChange={(e) => {
                          setSkillsQuery(e.target.value)
                          setIsSkillsDropdownOpen(true)
                        }}
                        onFocus={() => setIsSkillsDropdownOpen(true)}
                        className="block w-full rounded-xl border border-dark-700 bg-dark-950/80 py-3 pl-11 pr-4 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition"
                        placeholder="Search and select skills..."
                      />
                    </div>

                    {/* Predefined Skills Dropdown */}
                    {isSkillsDropdownOpen && skillsQuery && (
                      <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-dark-700 bg-dark-900 p-2 shadow-xl">
                        {filteredSkills.length === 0 ? (
                          <p className="text-xs text-slate-500 p-2">No matching skills found.</p>
                        ) : (
                          filteredSkills.map(skill => (
                            <button
                              key={skill}
                              type="button"
                              onClick={() => handleSkillSelect(skill)}
                              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs text-slate-200 hover:bg-dark-800 hover:text-white transition"
                            >
                              <span>{skill}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}

                    {/* Selected Skills Tags */}
                    {selectedSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3 p-3 rounded-xl border border-dark-800 bg-dark-950/40 max-h-36 overflow-y-auto">
                        {selectedSkills.map(skill => (
                          <span 
                            key={skill} 
                            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-500/25 bg-brand-500/10 px-2 py-0.5 text-xs font-semibold text-brand-400"
                          >
                            {skill}
                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(skill)}
                              className="text-slate-405 hover:text-rose-400 transition"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Password Field */}
              {!isForgotPassword && (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                        Password {isSignUp && <span className="text-rose-500">*</span>}
                      </label>
                      {!isSignUp && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsForgotPassword(true)
                            setError(null)
                            setSuccess(null)
                          }}
                          className="text-xs font-semibold text-brand-400 hover:text-brand-300 transition"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                        <Key className="h-4 w-4" />
                      </span>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full rounded-xl border border-dark-700 bg-dark-950/80 py-3 pl-11 pr-4 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>

                  {isSignUp && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Confirm Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                          <Key className="h-4 w-4" />
                        </span>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="block w-full rounded-xl border border-dark-700 bg-dark-950/80 py-3 pl-11 pr-4 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition"
                          placeholder="••••••••"
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Standard Step 1 Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative flex w-full justify-center rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white shadow-glow-brand transition-all duration-200 hover:bg-brand-655 focus:outline-none disabled:opacity-50"
                >
                  {loading ? (
                    <Loader className="h-5 w-5 animate-spin" />
                  ) : (
                    isForgotPassword
                      ? 'Send Reset Link'
                      : isSignUp ? 'Configure Authenticator' : 'Sign In'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Microsoft Authenticator QR Code Setup Screen */}
          {isSignUp && signupStep === 2 && (
            <div className="space-y-5 text-center">
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                Scan this QR code using the **Microsoft Authenticator** app to configure your Multi-Factor Authentication.
              </p>

              {/* QR Code Container (Slightly smaller for layout safety) */}
              {qrCodeUrl && (
                <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-2xl border border-dark-800 bg-white p-2.5 shadow-glow-brand">
                  <img src={qrCodeUrl} alt="Authenticator QR Code" className="h-full w-full" />
                </div>
              )}

              {/* Secret Key Backup (More compact) */}
              <div className="space-y-1 text-center">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 block">Or enter secret key manually</span>
                <div className="rounded-lg border border-dark-800 bg-dark-950 px-3 py-1.5 font-mono text-[10px] text-brand-350 select-all max-w-xs mx-auto break-all">
                  {totpSecretObj?.base32}
                </div>
              </div>

              {/* Verify input */}
              <div className="text-left max-w-xs mx-auto space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 text-center">
                  Enter 6-Digit Authenticator Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={totpVerificationCode}
                  onChange={(e) => setTotpVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="block w-full text-center rounded-xl border border-dark-700 bg-dark-950/80 py-2.5 text-white placeholder-slate-650 focus:border-brand-500 focus:outline-none font-mono text-lg tracking-widest"
                  placeholder="000000"
                  required
                />
              </div>

              {/* Step 2 Action Buttons (Verify + Back aligned logically) */}
              <div className="pt-2 flex flex-col gap-2 max-w-xs mx-auto">
                <button
                  type="submit"
                  disabled={loading || totpVerificationCode.length !== 6}
                  className="group relative flex w-full justify-center rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white shadow-glow-brand transition-all duration-200 hover:bg-brand-650 focus:outline-none disabled:opacity-50"
                >
                  {loading ? (
                    <Loader className="h-5 w-5 animate-spin" />
                  ) : (
                    'Verify & Register'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSignupStep(1)
                    setError(null)
                  }}
                  className="text-xs font-semibold text-slate-450 hover:text-white transition py-1"
                >
                  Go Back to Edit Info
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Toggle between Login and Register (Step 1 only) */}
        {(!isSignUp || signupStep === 1) && (
          <div className="text-center pt-2">
            {isForgotPassword ? (
              <button
                onClick={() => {
                  setIsForgotPassword(false)
                  setError(null)
                  setSuccess(null)
                }}
                className="text-xs font-semibold text-brand-400 hover:text-brand-300 transition"
              >
                Back to Sign In
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setConfirmPassword('')
                  setError(null)
                  setSuccess(null)
                  setPhoneRegion('+91')
                  setPhoneNo('')
                  setRapidJoiningDate('')
                  setWorkLocation('')
                  setEmployeeId('')
                  setSelectedSkills([])
                  setSignupStep(1)
                }}
                className="text-xs font-semibold text-brand-400 hover:text-brand-300 transition"
              >
                {isSignUp 
                  ? 'Already have an account? Sign In' 
                  : "Don't have an account? Sign Up"
                }
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
export default Login
