import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import { supabase } from './lib/supabaseClient'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import AdminDashboard from './pages/AdminDashboard'
import TeamSpace from './pages/TeamSpace'
import VerifyOTP from './pages/VerifyOTP'
import TasksArchive from './pages/TasksArchive'
import Navbar from './components/Navbar'
import UpdatePopup from './components/UpdatePopup'
import { Loader, AlertCircle, ShieldAlert, CheckCircle, Clock, Compass, Users } from 'lucide-react'

// 1. Root redirector that inspects user session, role, approval status, and TOTP status and sends them to the appropriate dashboard
const RootRedirector = () => {
  const { user, profile, loading, logout } = useAuth()
  const [redirectPath, setRedirectPath] = useState(null)
  const [checkingMembership, setCheckingMembership] = useState(false)

  useEffect(() => {
    if (loading) return

    if (!user) {
      setRedirectPath('/login')
      return
    }

    if (profile) {
      // Step 1: Check approval status
      if (profile.approved_status === 'pending') {
        setRedirectPath('/pending-approval')
        return
      }
      if (profile.approved_status === 'rejected') {
        setRedirectPath('/rejected')
        return
      }

      // Step 2: Check TOTP session validation
      if (profile.totp_secret && sessionStorage.getItem('totp_verified_' + user.id) !== 'true') {
        setRedirectPath('/verify-otp')
        return
      }

      // Step 3: Handle role redirection
      if (profile.role === 'admin') {
        setRedirectPath('/admin')
      } else {
        // Member role - Find which teams they belong to
        setCheckingMembership(true)
        supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id)
          .then(({ data, error }) => {
            if (error || !data || data.length === 0) {
              setRedirectPath('/no-team')
            } else if (data.length === 1) {
              setRedirectPath(`/team/${data[0].team_id}`)
            } else {
              setRedirectPath('/select-team')
            }
            setCheckingMembership(false)
          })
      }
    } else {
      // If user exists but profile is missing, clean up session
      logout().then(() => {
        setRedirectPath('/login')
      })
    }
  }, [user, profile, loading, logout])

  if (loading || checkingMembership) {
    return (
      <div className="min-h-screen bg-dark-950 flex justify-center items-center">
        <Loader className="h-10 w-10 text-brand-500 animate-spin" />
      </div>
    )
  }

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />
  }

  return null
}

// 2. Basic Protected Route that only enforces authentication (to prevent redirect loops on pending/rejected views)
const BasicProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex justify-center items-center">
        <Loader className="h-10 w-10 text-brand-500 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

// 3. Protected Route for both Admin and Members (User must be logged in, approved, and verified)
const ProtectedRoute = ({ children }) => {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex justify-center items-center">
        <Loader className="h-10 w-10 text-brand-500 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (profile) {
    if (profile.approved_status === 'pending') {
      return <Navigate to="/pending-approval" replace />
    }
    if (profile.approved_status === 'rejected') {
      return <Navigate to="/rejected" replace />
    }
    if (profile.totp_secret && sessionStorage.getItem('totp_verified_' + user.id) !== 'true') {
      return <Navigate to="/verify-otp" replace />
    }
  }

  return children
}

// 4. Admin Protected Route (User must be logged in, approved, verified, AND have role = admin)
const AdminRoute = ({ children }) => {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex justify-center items-center">
        <Loader className="h-10 w-10 text-brand-500 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (profile) {
    if (profile.approved_status === 'pending') {
      return <Navigate to="/pending-approval" replace />
    }
    if (profile.approved_status === 'rejected') {
      return <Navigate to="/rejected" replace />
    }
    if (profile.totp_secret && sessionStorage.getItem('totp_verified_' + user.id) !== 'true') {
      return <Navigate to="/verify-otp" replace />
    }
    if (profile.role !== 'admin') {
      return <Navigate to="/" replace />
    }
  }

  return children
}

// Fallback view for members to choose between their allocated teams
const SelectTeamView = () => {
  const { user, profile, logout } = useAuth()
  const [userTeams, setUserTeams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      supabase
        .from('team_members')
        .select(`
          team_id,
          teams (
            id,
            name,
            description,
            category
          )
        `)
        .eq('user_id', user.id)
        .then(({ data, error }) => {
          if (!error && data) {
            setUserTeams(data.map(m => m.teams).filter(Boolean))
          }
          setLoading(false)
        })
    }
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex justify-center items-center">
        <Loader className="h-10 w-10 text-brand-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col text-slate-200">
      <nav className="sticky top-0 z-40 w-full border-b border-dark-800 bg-dark-950/80 p-4 flex justify-between items-center">
        <span className="font-sans text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-brand-300 bg-clip-text text-transparent flex items-center gap-2">
          <Compass className="h-6 w-6 text-brand-500" />
          TeamTrack
        </span>
        <button 
          onClick={logout} 
          className="text-xs text-slate-400 bg-dark-900 border border-dark-800 px-3 py-1.5 rounded-lg hover:text-white transition"
        >
          Sign Out
        </button>
      </nav>
      
      <div className="flex-1 flex flex-col justify-center items-center p-6 max-w-4xl mx-auto w-full space-y-8 my-auto">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Select Team Space</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            You are assigned to multiple workspaces. Please select which workspace team board you want to access:
          </p>
        </div>

        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 w-full max-w-2xl">
          {userTeams.map((team) => (
            <a
              key={team.id}
              href={`/team/${team.id}`}
              className="rounded-2xl border border-dark-800 bg-dark-900 p-6 hover:border-brand-500/30 transition-all shadow-glass flex flex-col justify-between text-left group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white group-hover:text-brand-400 transition-colors">
                    {team.name}
                  </h3>
                  <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-brand-500/10 border border-brand-500/20 text-brand-400 capitalize">
                    {team.category || 'general'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {team.description || 'No description provided.'}
                </p>
              </div>
              <div className="pt-4 border-t border-dark-800/40 text-[10px] text-slate-500 flex justify-end font-semibold group-hover:text-white transition-colors">
                Enter Team Board &rarr;
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

// 5. Fallback view for members who signed up but are not yet added to any team space
const NoTeamView = () => {
  const { logout, profile } = useAuth()

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col text-slate-200">
      <nav className="sticky top-0 z-40 w-full border-b border-dark-800 bg-dark-950/80 p-4 flex justify-between items-center">
        <span className="font-bold text-lg text-white">TeamTrack</span>
        <button 
          onClick={logout} 
          className="text-xs text-slate-400 bg-dark-900 border border-dark-800 px-3 py-1.5 rounded-lg hover:text-white transition"
        >
          Sign Out
        </button>
      </nav>
      
      <div className="flex-1 flex flex-col justify-center items-center p-6 text-center space-y-4">
        <AlertCircle className="h-14 w-14 text-brand-400 animate-pulse" />
        <h2 className="text-xl font-bold text-white">Welcome, {profile?.name || 'Team Member'}!</h2>
        <p className="text-sm text-slate-400 max-w-md leading-relaxed">
          You haven't been assigned to any Team Space yet. Please contact your Team Lead or Admin and ask them to register your email in a team space:
        </p>
        <div className="bg-dark-900 px-4 py-2.5 rounded-xl border border-dark-800 inline-block font-mono text-xs text-brand-300">
          {profile?.email}
        </div>
        <p className="text-xs text-slate-500 italic">
          Once your admin adds you, refresh the page to access your space.
        </p>
      </div>
    </div>
  )
}

// 6. Pending Approval Fallback View
const PendingApprovalView = () => {
  const { profile } = useAuth()

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col text-slate-200">
      <Navbar />
      
      <main className="flex-1 flex flex-col justify-center items-center p-6 text-center max-w-2xl mx-auto space-y-6">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-500 shadow-glow-brand animate-pulse">
          <Clock className="h-10 w-10" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Registration Pending Approval</h2>
          <p className="text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
            Your profile details have been submitted. A system administrator must approve your account and assign your team workspace before you can access the application.
          </p>
        </div>

        {/* User Submitted Profile Details Card */}
        {profile && (
          <div className="w-full rounded-2xl border border-dark-800 bg-dark-900/60 p-6 text-left space-y-4 backdrop-blur-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-dark-800 pb-2">
              Submitted Profile Details
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">Name</span>
                <span className="text-slate-200 font-semibold">{profile.name}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Email Address</span>
                <span className="text-slate-200 font-semibold font-mono">{profile.email}</span>
              </div>
              <div>
                <span className="text-xs text-slate-505 block">Employee ID</span>
                <span className="text-slate-200 font-semibold">{profile.employee_id || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-505 block">Work Location</span>
                <span className="text-slate-200 font-semibold">{profile.work_location || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-505 block">Phone Number</span>
                <span className="text-slate-200 font-semibold">{profile.phone_number || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-505 block">Rapid Build Experience</span>
                <span className="text-slate-200 font-medium">{profile.rapid_experience || 'N/A'} <span className="text-slate-500 text-[10px]">({profile.rapid_joining_date || 'N/A'})</span></span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-dark-800/60">
              <span className="text-xs text-slate-505 block">Technical Skills</span>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills && profile.skills.length > 0 ? (
                  profile.skills.map((skill) => (
                    <span 
                      key={skill}
                      className="inline-flex rounded bg-dark-950 border border-dark-800 px-2.5 py-0.75 text-xs text-slate-350 font-medium"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-600 italic">No skills selected.</span>
                )}
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-500 italic">
          Tip: You can refresh this page once your Admin approves you, or Sign Out from the navbar above.
        </p>
      </main>
    </div>
  )
}

// 7. Rejected Fallback View
const RejectedView = () => {
  const { profile } = useAuth()

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col text-slate-200">
      <Navbar />
      
      <main className="flex-1 flex flex-col justify-center items-center p-6 text-center max-w-2xl mx-auto space-y-6">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-500 shadow-glow-brand">
          <ShieldAlert className="h-10 w-10 animate-bounce" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Registration Declined</h2>
          <p className="text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
            Unfortunately, your registration request has been declined by the system administrator.
          </p>
        </div>

        {profile && (
          <div className="w-full rounded-2xl border border-dark-800 bg-dark-900/60 p-6 text-left space-y-4 backdrop-blur-xl opacity-75">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 border-b border-dark-800 pb-2">
              Declined Profile Request
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">Name</span>
                <span className="text-slate-300 font-semibold">{profile.name}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Email Address</span>
                <span className="text-slate-300 font-semibold font-mono">{profile.email}</span>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-500 italic">
          Please contact your coordinator if you believe this was an error.
        </p>
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <UpdatePopup />
        <Routes>
          {/* Public login/register page */}
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Secure TOTP screen */}
          <Route path="/verify-otp" element={<VerifyOTP />} />

          {/* Special view for pending and rejected registrations */}
          <Route 
            path="/pending-approval" 
            element={
              <BasicProtectedRoute>
                <PendingApprovalView />
              </BasicProtectedRoute>
            } 
          />
          <Route 
            path="/rejected" 
            element={
              <BasicProtectedRoute>
                <RejectedView />
              </BasicProtectedRoute>
            } 
          />

          {/* Special view for unassigned members */}
          <Route 
            path="/no-team" 
            element={
              <ProtectedRoute>
                <NoTeamView />
              </ProtectedRoute>
            } 
          />

          {/* Team Selection for users assigned to multiple teams */}
          <Route 
            path="/select-team" 
            element={
              <ProtectedRoute>
                <SelectTeamView />
              </ProtectedRoute>
            } 
          />

          {/* Admin Dashboard */}
          <Route 
            path="/admin" 
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } 
          />

          {/* Team Workspace Board */}
          <Route 
            path="/team/:teamId" 
            element={
              <ProtectedRoute>
                <TeamSpace />
              </ProtectedRoute>
            } 
          />

          {/* Tasks Category Archive */}
          <Route 
            path="/team/:teamId/archive/:category" 
            element={
              <ProtectedRoute>
                <TasksArchive />
              </ProtectedRoute>
            } 
          />

          {/* Root Redirect handler */}
          <Route path="/" element={<RootRedirector />} />

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
