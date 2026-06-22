import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import { supabase } from './lib/supabaseClient'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import AdminDashboard from './pages/AdminDashboard'
import TeamSpace from './pages/TeamSpace'
import { Loader, AlertCircle } from 'lucide-react'

// 1. Root redirector that inspects user session + role and sends them to the appropriate dashboard
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
      if (profile.role === 'admin') {
        setRedirectPath('/admin')
      } else {
        // Member role - Find which team they belong to
        setCheckingMembership(true)
        supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id)
          .maybeSingle()
          .then(({ data, error }) => {
            if (error || !data) {
              setRedirectPath('/no-team')
            } else {
              setRedirectPath(`/team/${data.team_id}`)
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

// 2. Protected Route for both Admin and Members (User must be logged in)
const ProtectedRoute = ({ children }) => {
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

// 3. Admin Protected Route (User must be logged in AND have role = admin)
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

  if (!profile || profile.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}

// 4. Fallback view for members who signed up but are not yet added to any team space
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
          Once your admin adds you, log out and sign back in to access your space.
        </p>
      </div>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public login/register page */}
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Special view for unassigned members */}
          <Route 
            path="/no-team" 
            element={
              <ProtectedRoute>
                <NoTeamView />
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
