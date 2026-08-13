import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Compass, Key, ShieldAlert, Loader, Eye, EyeOff, CheckCircle2, Sun, Moon, AlertTriangle } from 'lucide-react'

export const ResetPassword = () => {
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')

  // Whether a valid PASSWORD_RECOVERY session has been confirmed
  const [isRecoverySession, setIsRecoverySession] = useState(false)
  // Whether we have finished determining session validity (show spinner until true)
  const [sessionChecked, setSessionChecked] = useState(false)

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

  useEffect(() => {
    let recoveryEventReceived = false

    // Primary: Supabase automatically fires PASSWORD_RECOVERY when the page
    // loads with a valid #access_token=...&type=recovery hash in the URL.
    // Catching it here (not in AuthContext) avoids any race with getSession().
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        recoveryEventReceived = true
        setIsRecoverySession(true)
        setSessionChecked(true)
      }
    })

    // Fallback: if the PASSWORD_RECOVERY event fired before this component
    // mounted (rare, but possible on very fast machines), check for an
    // already-active session and allow the form.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!recoveryEventReceived) {
        if (session) {
          setIsRecoverySession(true)
        }
        setSessionChecked(true)
      }
    })

    // Safety net: if nothing responds in 5 s (e.g. network error),
    // mark as checked so we show "invalid link" instead of an infinite spinner.
    const timeout = setTimeout(() => {
      setSessionChecked(true)
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!password || !confirmPassword) {
      setError('Please fill in all fields')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      // Call supabase directly — the PASSWORD_RECOVERY session captured by
      // onAuthStateChange above lives in the Supabase client's internal store,
      // so this call succeeds even if AuthContext's global state is behind.
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError

      setSuccess('Your password has been successfully reset! Redirecting to login...')
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err) {
      setError(err.message || 'Failed to update password. The reset link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Loading state (waiting to confirm session) ────────────────────────────
  if (!sessionChecked) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-dark-950 px-4">
        <div className="flex flex-col items-center gap-4">
          <Loader className="h-8 w-8 animate-spin text-brand-400" />
          <p className="text-sm text-slate-400">Verifying your reset link…</p>
        </div>
      </div>
    )
  }

  // ─── Invalid / expired link ────────────────────────────────────────────────
  if (sessionChecked && !isRecoverySession) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-dark-950 px-4 py-12 sm:px-6 lg:px-8">
        {/* Decorative Blur Orbs */}
        <div className="absolute top-1/4 left-1/4 h-[300px] w-[300px] rounded-full bg-rose-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-md space-y-6 rounded-2xl border border-dark-800 bg-dark-900/60 p-8 shadow-2xl backdrop-blur-xl text-center">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20">
              <AlertTriangle className="h-7 w-7 text-rose-400" />
            </div>
          </div>
          <div>
            <h2 className="font-sans text-2xl font-extrabold tracking-tight text-white">
              Link Invalid or Expired
            </h2>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              This password reset link has either already been used, has expired, or is invalid.
              Reset links are single-use and expire after <span className="text-white font-semibold">1 hour</span>.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/login')}
              className="w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white shadow-glow-brand transition-all duration-200 hover:bg-brand-650 focus:outline-none"
            >
              Request a New Reset Link
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full rounded-xl border border-dark-700 py-3 text-sm font-semibold text-slate-400 transition-all duration-200 hover:text-white hover:border-dark-500 focus:outline-none"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Valid recovery session — show the reset form ──────────────────────────
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

      {/* Card */}
      <div className="relative z-10 w-full max-w-md space-y-8 rounded-2xl border border-dark-800 bg-dark-900/60 p-8 shadow-2xl backdrop-blur-xl">

        {/* Brand Logo and Header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white shadow-glow-brand mb-4">
            <Compass className="h-7 w-7" />
          </div>
          <h2 className="font-sans text-3xl font-extrabold tracking-tight text-white">
            Set New Password
          </h2>
          <p className="mt-2 text-sm text-slate-400 font-medium">
            Please enter your new password below.
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
          <div className="flex items-start gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-400">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md">

            {/* New Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                New Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <Key className="h-4 w-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-dark-700 bg-dark-950/80 py-3 pl-11 pr-11 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4.5 w-4.5" />
                  ) : (
                    <Eye className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <Key className="h-4 w-4" />
                </span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full rounded-xl border border-dark-700 bg-dark-950/80 py-3 pl-11 pr-11 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm transition"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4.5 w-4.5" />
                  ) : (
                    <Eye className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Action button */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white shadow-glow-brand transition-all duration-200 hover:bg-brand-650 focus:outline-none disabled:opacity-50"
            >
              {loading ? (
                <Loader className="h-5 w-5 animate-spin" />
              ) : (
                'Reset Password'
              )}
            </button>
          </div>
        </form>

        <div className="text-center pt-2">
          <button
            onClick={() => navigate('/login')}
            className="text-xs font-semibold text-brand-400 hover:text-brand-300 transition"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
