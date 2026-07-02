import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { LogOut, User, Compass, Sun, Moon, QrCode, ShieldCheck, X, Loader, Users, ChevronDown, FlaskConical } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import * as OTPAuth from 'otpauth'
import { ProfileModal } from './ProfileModal'

export const Navbar = () => {
  const { profile, logout, refreshProfile, isSupervisor } = useAuth()
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')
  
  // Allocated teams switcher states
  const [userTeams, setUserTeams] = useState([])
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [isTeamsDropdownOpen, setIsTeamsDropdownOpen] = useState(false)
  const [memberLabName, setMemberLabName] = useState(null)  // lab name for members
  
  // User profile modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)

  useEffect(() => {
    if (profile && profile.role === 'member') {
      setLoadingTeams(true)
      supabase
        .from('team_members')
        .select(`
          team_id,
          teams (
            id,
            name,
            category,
            lab_id,
            labs ( name )
          )
        `)
        .eq('user_id', profile.id)
        .then(({ data, error }) => {
          if (!error && data) {
            const teams = data.map(m => m.teams).filter(Boolean)
            setUserTeams(teams)
            // Pick the lab name from the first team that has one
            const labEntry = teams.find(t => t.labs?.name)
            if (labEntry) setMemberLabName(labEntry.labs.name)
          }
          setLoadingTeams(false)
        })
    }
  }, [profile])
  
  // MFA Enrollment Modal states
  const [isMfaModalOpen, setIsMfaModalOpen] = useState(false)
  const [totpSecretObj, setTotpSecretObj] = useState(null)
  const [totpCode, setTotpCode] = useState('')
  const [mfaLoading, setMfaLoading] = useState(false)
  const [mfaError, setMfaError] = useState(null)
  const [mfaSuccess, setMfaSuccess] = useState(false)

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

  const handleLogoutClick = async () => {
    if (profile) {
      sessionStorage.removeItem('totp_verified_' + profile.id)
    }
    await logout()
  }

  // Open modal and generate new TOTP secret keys
  const handleOpenMfaModal = () => {
    const secret = new OTPAuth.Secret({ size: 20 })
    const totp = new OTPAuth.TOTP({
      issuer: 'TeamTrack',
      label: profile.email,
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
    setTotpCode('')
    setMfaError(null)
    setMfaSuccess(false)
    setIsMfaModalOpen(true)
  }

  const handleVerifyMfaSetup = async (e) => {
    e.preventDefault()
    setMfaError(null)

    if (!totpCode.trim() || totpCode.trim().length !== 6) {
      setMfaError('Please enter a 6-digit code.')
      return
    }

    setMfaLoading(true)
    try {
      // Validate code in JS to ensure they scanned it correctly
      const delta = totpSecretObj.totp.validate({
        token: totpCode.trim(),
        window: 1
      })

      if (delta === null) {
        throw new Error('Invalid verification code. Please check your authenticator and try again.')
      }

      // Save hex secret to profile in public.users
      const { error: updateErr } = await supabase
        .from('users')
        .update({ totp_secret: totpSecretObj.hex })
        .eq('id', profile.id)

      if (updateErr) throw updateErr

      // Verification and save succeeded!
      sessionStorage.setItem('totp_verified_' + profile.id, 'true')
      setMfaSuccess(true)
      await refreshProfile()
      
      setTimeout(() => {
        setIsMfaModalOpen(false)
        setTotpSecretObj(null)
        setTotpCode('')
      }, 1500)

    } catch (err) {
      setMfaError(err.message)
    } finally {
      setMfaLoading(false)
    }
  }

  const otpauthUrl = totpSecretObj ? totpSecretObj.totp.toString() : ''
  const qrCodeUrl = otpauthUrl 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(otpauthUrl)}`
    : ''

  return (
    <>
      <nav className="sticky top-0 z-40 w-full border-b border-dark-800 bg-dark-950/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo & Switcher */}
            <div className="flex items-center gap-4">
              <a href="/" className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white shadow-glow-brand animate-pulse">
                  <Compass className="h-6 w-6" />
                </div>
                <span className="font-sans text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-brand-300 bg-clip-text text-transparent">
                  TeamTrack
                </span>
              </a>

              {/* Team Workspace Switcher for Members */}
              {profile && profile.role === 'member' && userTeams.length > 0 && (
                <div className="flex items-center gap-2">
                  {/* Lab badge for members */}
                  {memberLabName && (
                    <span className="hidden sm:flex items-center gap-1 rounded-md bg-brand-500/10 border border-brand-500/20 px-2 py-1 text-[10px] font-bold text-brand-400">
                      <FlaskConical className="h-3 w-3" />
                      {memberLabName}
                    </span>
                  )}
                  <div className="relative">
                    <button
                      onClick={() => setIsTeamsDropdownOpen(!isTeamsDropdownOpen)}
                      className="flex items-center gap-1.5 rounded-lg bg-dark-900 border border-dark-700 px-3 py-1.5 text-xs font-semibold text-slate-350 hover:text-white transition-all duration-200 hover:border-slate-600"
                    >
                      <Users className="h-3.5 w-3.5 text-brand-400" />
                      <span>My Team Spaces ({userTeams.length})</span>
                      <ChevronDown className={`h-3 w-3 text-slate-500 transition-transform ${isTeamsDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isTeamsDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsTeamsDropdownOpen(false)} />
                        <div className="absolute left-0 z-50 mt-2 w-64 rounded-xl border border-dark-800 bg-dark-900 p-2 shadow-2xl space-y-1">
                          {userTeams.map(t => (
                            <a
                              key={t.id}
                              href={`/team/${t.id}`}
                              onClick={() => setIsTeamsDropdownOpen(false)}
                              className="block rounded-lg px-3 py-2 text-xs text-slate-200 hover:bg-dark-800 hover:text-white transition font-sans font-semibold text-left"
                            >
                              <span className="block truncate">{t.name}</span>
                              <span className="text-[9px] uppercase font-bold text-brand-400 mt-0.5 block">{t.category || 'General'}</span>
                            </a>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Section */}
            {profile && (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-semibold text-slate-200">
                    {profile.name || profile.email}
                  </span>
                  <span className="text-xs text-slate-405 capitalize flex items-center gap-1">
                    <User className="h-3 w-3 text-brand-400" />
                    {profile.role}
                  </span>
                </div>

                {/* Role Badge */}
                <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium ${
                  profile.role === 'supervisor'
                    ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                    : profile.role === 'admin' 
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {profile.role === 'supervisor' ? 'Supervisor' : profile.role === 'admin' ? 'Lead Admin' : 'Team Member'}
                </span>

                {/* MFA Status / Activation Action */}
                {profile.totp_secret ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    MFA Active
                  </span>
                ) : (
                  <button
                    onClick={handleOpenMfaModal}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-400 transition hover:bg-amber-500/20"
                    title="Enable Microsoft Authenticator"
                  >
                    <QrCode className="h-4 w-4" />
                    Enable MFA
                  </button>
                )}

                {/* Profile Button */}
                <button
                  onClick={() => setIsProfileModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-dark-900 border border-dark-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-dark-800 hover:text-white hover:border-slate-500 focus:outline-none"
                  title="My Profile"
                >
                  <User className="h-4 w-4 text-brand-400" />
                  <span className="hidden md:inline">My Profile</span>
                </button>

                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="flex items-center justify-center h-9 w-9 rounded-lg bg-dark-900 border border-dark-700 text-slate-350 transition-all duration-200 hover:bg-dark-800 hover:text-white hover:border-slate-500 focus:outline-none"
                  title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {theme === 'dark' ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5 text-indigo-400" />}
                </button>

                {/* Logout Button */}
                <button
                  onClick={handleLogoutClick}
                  className="flex items-center gap-2 rounded-lg bg-dark-900 border border-dark-700 px-3.5 py-1.5 text-sm font-semibold text-slate-300 transition-all duration-200 hover:bg-dark-800 hover:text-white hover:border-slate-500 focus:outline-none"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden md:inline">Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* MFA Setup Dialog / Modal */}
      {isMfaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm"
            onClick={() => !mfaLoading && setIsMfaModalOpen(false)}
          />

          {/* Modal Container */}
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-dark-800 bg-dark-900 p-5 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-dark-800 pb-3">
              <h3 className="font-sans text-lg font-bold text-white flex items-center gap-2">
                <QrCode className="h-5 w-5 text-brand-400" />
                Set up Authenticator
              </h3>
              <button 
                onClick={() => setIsMfaModalOpen(false)}
                disabled={mfaLoading}
                className="rounded-lg p-1 text-slate-400 hover:bg-dark-800 hover:text-white transition disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {mfaSuccess ? (
              <div className="text-center py-6 space-y-3">
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-xl font-bold">✓</div>
                <h4 className="text-lg font-bold text-white font-sans">MFA Enabled Successfully</h4>
                <p className="text-xs text-slate-450 leading-relaxed max-w-xs mx-auto">
                  Your account is now secure. You will be prompted to enter a rolling code on your next login.
                </p>
              </div>
            ) : (
              <form onSubmit={handleVerifyMfaSetup} className="space-y-5 text-center">
                <p className="text-xs text-slate-400 leading-relaxed text-left">
                  Scan this QR code using the **Microsoft Authenticator** app to add this profile to your authentication device.
                </p>

                {mfaError && (
                  <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-left text-rose-400">
                    {mfaError}
                  </div>
                )}

                {/* QR Code Container */}
                {qrCodeUrl && (
                  <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-xl border border-dark-800 bg-white p-2 shadow-md">
                    <img src={qrCodeUrl} alt="Setup QR Code" className="h-full w-full" />
                  </div>
                )}

                {/* Secret Key Backup */}
                <div className="space-y-1 text-left max-w-xs mx-auto">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-slate-550 block text-center">Or enter secret key manually</span>
                  <div className="rounded-lg border border-dark-850 bg-dark-950 px-3 py-1.5 font-mono text-[10px] text-brand-300 select-all text-center break-all">
                    {totpSecretObj?.base32}
                  </div>
                </div>

                {/* Verification Code */}
                <div className="text-left max-w-xs mx-auto space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 text-center">
                    Enter Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    className="block w-full text-center rounded-xl border border-dark-700 bg-dark-950/80 py-2.5 text-white placeholder-slate-650 focus:border-brand-500 focus:outline-none font-mono text-lg tracking-widest"
                    placeholder="000000"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 border-t border-dark-800 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsMfaModalOpen(false)}
                    disabled={mfaLoading}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-dark-800 text-slate-350 hover:bg-dark-750 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={mfaLoading || totpCode.length !== 6}
                    className="flex items-center gap-1 px-4.5 py-2 text-xs font-semibold rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition shadow-glow-brand"
                  >
                    {mfaLoading ? (
                      <Loader className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Verify & Activate
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
    </>
  )
}

export default Navbar
