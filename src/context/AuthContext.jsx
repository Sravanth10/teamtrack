import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  isSupervisor: false,
  isAdmin: false,
  login: async () => {},
  logout: async () => {},
  refreshProfile: async () => {},
  resetPassword: async () => {},
  updatePassword: async () => {}
})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          team_members (
            team_id,
            teams (
              id,
              name,
              category,
              lab_id,
              labs ( name )
            )
          ),
          lab_admins (
            lab_id,
            labs ( name )
          )
        `)
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error.message)
        return null
      }
      return data
    } catch (err) {
      console.error('Unexpected error fetching user profile:', err)
      return null
    }
  }

  const refreshProfile = async () => {
    if (user) {
      const prof = await fetchProfile(user.id)
      setProfile(prof)
    }
  }

  useEffect(() => {
    let isMounted = true

    // Check active session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return

      if (session) {
        setUser(session.user)
        const prof = await fetchProfile(session.user.id)
        if (isMounted) setProfile(prof)
      } else {
        setUser(null)
        setProfile(null)
      }
      if (isMounted) setLoading(false)
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return

        if (session) {
          setUser(session.user)
          const prof = await fetchProfile(session.user.id)
          if (isMounted) setProfile(prof)
        } else {
          setUser(null)
          setProfile(null)
        }
        if (isMounted) setLoading(false)
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const login = async (email, password) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      return { success: true, data }
    } catch (error) {
      setLoading(false)
      return { success: false, error: error.message }
    }
  }

  const resetPassword = async (email) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      return { success: true, data }
    } catch (error) {
      setLoading(false)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const updatePassword = async (newPassword) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      })
      if (error) throw error
      return { success: true, data }
    } catch (error) {
      setLoading(false)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      setProfile(null)
    } catch (error) {
      console.error('Error signing out:', error.message)
    } finally {
      setLoading(false)
    }
  }

  // Idle timeout: auto-logout after 1 hour of inactivity
  useEffect(() => {
    if (!user) return

    // Initialize/update last active on mount
    localStorage.setItem('teamtrack_last_active', Date.now().toString())

    const handleActivity = () => {
      // Throttle updates to localStorage to once every 10 seconds
      const now = Date.now()
      const lastActive = localStorage.getItem('teamtrack_last_active')
      if (!lastActive || now - Number(lastActive) > 10000) {
        localStorage.setItem('teamtrack_last_active', now.toString())
      }
    }

    // Set listeners for activity
    window.addEventListener('mousemove', handleActivity)
    window.addEventListener('keydown', handleActivity)
    window.addEventListener('click', handleActivity)
    window.addEventListener('scroll', handleActivity)
    window.addEventListener('touchstart', handleActivity)

    // Check inactivity every 10 seconds
    const interval = setInterval(() => {
      const lastActive = localStorage.getItem('teamtrack_last_active')
      if (lastActive) {
        const elapsed = Date.now() - Number(lastActive)
        const ONE_HOUR = 60 * 60 * 1000 // 1 hour in ms
        if (elapsed > ONE_HOUR) {
          logout()
          alert('You have been logged out due to 1 hour of inactivity.')
        }
      }
    }, 10000)

    return () => {
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('click', handleActivity)
      window.removeEventListener('scroll', handleActivity)
      window.removeEventListener('touchstart', handleActivity)
      clearInterval(interval)
    }
  }, [user, logout])

  const isSupervisor = profile?.role === 'supervisor'
  const isAdmin = profile?.role === 'admin' || profile?.role === 'supervisor'

  const value = {
    user,
    profile,
    loading,
    isSupervisor,
    isAdmin,
    login,
    logout,
    refreshProfile,
    resetPassword,
    updatePassword
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
