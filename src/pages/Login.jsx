import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Compass, Key, Mail, User, ShieldAlert, Loader, Eye, EyeOff } from 'lucide-react'

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
  const [showPassword, setShowPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Redirect to home if user session already exists
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/')
    }
  }, [user, authLoading, navigate])

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
      if (!name.trim() || !email.trim() || !password || !confirmPassword) {
        setError('Please fill in all fields')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        return
      }
    } else {
      if (!email.trim() || !password) {
        setError('Please fill in all fields')
        return
      }
    }

    setLoading(true)

    try {
      if (isSignUp) {
        // Register new user
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              name: name.trim() || email.split('@')[0],
            }
          }
        })

        if (signUpError) throw signUpError
        
        setSuccess('Registration successful! If email confirmation is enabled, please verify your email. Otherwise, you can now log in.')
        setIsSignUp(false)
      } else {
        // Sign in existing user
        const res = await login(email.trim(), password)
        if (!res.success) {
          throw new Error(res.error)
        }
        
        // Redirect to root, triggering the dashboard router logic
        navigate('/')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-dark-950 px-4 py-12 sm:px-6 lg:px-8">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 h-[300px] w-[300px] rounded-full bg-brand-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md space-y-8 rounded-2xl border border-dark-800 bg-dark-900/60 p-8 shadow-2xl backdrop-blur-xl">
        
        {/* Brand Logo and Header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white shadow-glow-brand mb-4">
            <Compass className="h-7 w-7" />
          </div>
          <h2 className="font-sans text-3xl font-extrabold tracking-tight text-white">
            {isForgotPassword 
              ? 'Reset your Password' 
              : isSignUp 
                ? 'Create your Account' 
                : 'Welcome to TeamTrack'}
          </h2>
          <p className="mt-2 text-sm text-slate-400 font-medium">
            {isForgotPassword
              ? 'Enter your email to receive a password reset link.'
              : isSignUp 
                ? 'Get started with task monitoring and daily logs.' 
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
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md">
            
            {/* Name field (Sign Up only) */}
            {isSignUp && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Full Name
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
                Email Address
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

            {/* Password Field */}
            {!isForgotPassword && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Password
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

                {isSignUp && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Confirm Password
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
                )}
              </div>
            )}
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
                isForgotPassword
                  ? 'Send Reset Link'
                  : isSignUp ? 'Create Account' : 'Sign In'
              )}
            </button>
          </div>
        </form>

        {/* Toggle between Login and Register */}
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
                setShowConfirmPassword(false)
                setError(null)
                setSuccess(null)
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
      </div>
    </div>
  )
}
export default Login
