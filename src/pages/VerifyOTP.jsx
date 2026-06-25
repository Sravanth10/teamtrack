import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Compass, ShieldAlert, Loader, LogOut, Key } from 'lucide-react'

export const VerifyOTP = () => {
  const { user, profile, loading: authLoading, logout } = useAuth()
  const navigate = useNavigate()
  
  const [otpCode, setOtpCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Redirect logic
  useEffect(() => {
    if (authLoading) return
    
    // If not authenticated via password, send to login
    if (!user) {
      navigate('/login')
      return
    }

    // If profile is approved and has NO totp secret, they don't need verification
    if (profile && !profile.totp_secret && profile.approved_status === 'approved') {
      navigate('/')
      return
    }

    // If already verified for this session, send to root (dashboard redirection)
    if (user && sessionStorage.getItem('totp_verified_' + user.id) === 'true') {
      navigate('/')
    }
  }, [user, profile, authLoading, navigate])

  const handleVerify = async (e) => {
    e.preventDefault()
    setError(null)

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setError('Please enter a 6-digit verification code.')
      return
    }

    setLoading(true)
    try {
      const { data: verified, error: rpcErr } = await supabase.rpc('verify_totp_code', {
        user_uuid: user.id,
        code: otpCode.trim()
      })

      if (rpcErr) throw rpcErr

      if (verified) {
        // Verification succeeded!
        sessionStorage.setItem('totp_verified_' + user.id, 'true')
        navigate('/')
      } else {
        setError('Invalid verification code. Please check your Microsoft Authenticator and try again.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-dark-950 flex justify-center items-center">
        <Loader className="h-10 w-10 text-brand-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-dark-950 px-4 py-12 sm:px-6 lg:px-8">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 h-[300px] w-[300px] rounded-full bg-brand-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md space-y-8 rounded-2xl border border-dark-800 bg-dark-900/60 p-8 shadow-2xl backdrop-blur-xl">
        
        {/* Brand Logo and Header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white shadow-glow-brand mb-4">
            <Compass className="h-7 w-7" />
          </div>
          <h2 className="font-sans text-3xl font-extrabold tracking-tight text-white">
            Security Verification
          </h2>
          <p className="mt-2 text-sm text-slate-400 font-medium text-center">
            Enter the 6-digit code from your **Microsoft Authenticator** app to continue.
          </p>
        </div>

        {/* Notifications */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-400 animate-shake">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleVerify}>
          <div className="space-y-4 rounded-md">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 text-center">
                Authenticator Code
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <Key className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="block w-full text-center rounded-xl border border-dark-700 bg-dark-950/80 py-3 pl-11 pr-4 text-white placeholder-slate-650 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono text-lg tracking-widest"
                  placeholder="000000"
                  required
                  autoFocus
                />
              </div>
            </div>
          </div>

          {/* Action button */}
          <div>
            <button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              className="group relative flex w-full justify-center rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white shadow-glow-brand transition-all duration-200 hover:bg-brand-650 focus:outline-none disabled:opacity-50"
            >
              {loading ? (
                <Loader className="h-5 w-5 animate-spin" />
              ) : (
                'Verify Identity'
              )}
            </button>
          </div>
        </form>

        {/* Logout Option */}
        <div className="text-center pt-2">
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}

export default VerifyOTP
