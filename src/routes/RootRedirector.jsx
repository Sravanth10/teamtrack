import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabaseClient'
import { Loader } from 'lucide-react'

// Inspects the user's session, role, approval status, and TOTP status, and
// routes them to the appropriate dashboard/fallback view.
export const RootRedirector = () => {
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
      if (profile.role === 'supervisor') {
        setRedirectPath('/supervisor')
      } else if (profile.role === 'admin') {
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
          .catch((err) => {
            console.error('Error checking team membership:', err.message)
            setRedirectPath('/no-team')
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

export default RootRedirector
