import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabaseClient'
import { Loader, Compass, Sun, Moon } from 'lucide-react'
import { getTeamCategoryLabel } from '../lib/utils'

// Fallback view for members to choose between their allocated teams
export const SelectTeamView = () => {
  const { user, logout } = useAuth()
  const [userTeams, setUserTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')

  useEffect(() => {
    const activeTheme = localStorage.getItem('theme') || 'dark'
    if (activeTheme === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
  }, [])

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
    if (user) {
      supabase
        .from('team_members')
        .select(`
          team_id,
          teams (
            id,
            name,
            description,
            category,
            is_active
          )
        `)
        .eq('user_id', user.id)
        .then(({ data, error }) => {
          if (!error && data) {
            setUserTeams(data.map(m => m.teams).filter(Boolean))
          }
          setLoading(false)
        })
        .catch((err) => {
          console.error('Error loading team spaces:', err.message)
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
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 bg-dark-900 border border-dark-800 text-slate-400 hover:bg-dark-800 hover:text-white transition"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <Sun className="h-4.5 w-4.5 text-amber-400" />
            ) : (
              <Moon className="h-4.5 w-4.5 text-indigo-400" />
            )}
          </button>
          <button
            onClick={logout}
            className="text-xs text-slate-400 bg-dark-900 border border-dark-800 px-3 py-1.5 rounded-lg hover:text-white transition font-semibold"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <div className="flex-1 flex flex-col justify-center items-center p-6 max-w-4xl mx-auto w-full space-y-8 my-auto">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Select Team Space</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            You are assigned to multiple workspaces. Please select which workspace team board you want to access:
          </p>
        </div>

        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 w-full max-w-2xl">
          {userTeams.map((team) => {
            const isInactiveStatus = team.is_active === false
            return (
              <Link
                key={team.id}
                to={`/team/${team.id}`}
                className={`rounded-2xl border p-6 transition-all shadow-glass flex flex-col justify-between text-left group ${
                  isInactiveStatus
                    ? 'bg-dark-950/40 border-dark-850 opacity-60 hover:opacity-80'
                    : 'border-dark-800 bg-dark-900 hover:border-brand-500/30'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-base font-bold text-white group-hover:text-brand-400 transition-colors">
                        {team.name}
                      </h3>
                      {isInactiveStatus && (
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.25 rounded bg-amber-500/10 border border-amber-500/25 text-amber-400">
                          Deactivated
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-brand-500/10 border border-brand-500/20 text-brand-400">
                      {getTeamCategoryLabel(team.category)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {team.description || 'No description provided.'}
                  </p>
                </div>
                <div className="pt-4 border-t border-dark-800/40 text-[10px] text-slate-500 flex justify-end font-semibold group-hover:text-white transition-colors">
                  {isInactiveStatus ? 'View Team Board (Read-Only) →' : 'Enter Team Board →'}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default SelectTeamView
