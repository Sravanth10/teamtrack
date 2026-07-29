import React from 'react'
import { useAuth } from '../hooks/useAuth'
import { AlertCircle } from 'lucide-react'

// Fallback view for members who signed up but are not yet added to any team space
export const NoTeamView = () => {
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

export default NoTeamView
