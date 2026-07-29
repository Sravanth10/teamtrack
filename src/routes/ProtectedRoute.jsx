import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Loader } from 'lucide-react'

// User must be logged in, approved, and TOTP-verified (if enrolled). Used for
// both Admin and Member routes — no role restriction beyond that.
export const ProtectedRoute = ({ children }) => {
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

export default ProtectedRoute
