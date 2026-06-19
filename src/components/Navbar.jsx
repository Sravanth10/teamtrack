import React from 'react'
import { useAuth } from '../hooks/useAuth'
import { LogOut, User, Compass } from 'lucide-react'

export const Navbar = () => {
  const { profile, logout } = useAuth()

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-dark-800 bg-dark-950/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white shadow-glow-brand animate-pulse">
              <Compass className="h-6 w-6" />
            </div>
            <span className="font-sans text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-brand-300 bg-clip-text text-transparent">
              TeamTrack
            </span>
          </div>

          {/* User Section */}
          {profile && (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-semibold text-slate-200">
                  {profile.name || profile.email}
                </span>
                <span className="text-xs text-slate-400 capitalize flex items-center gap-1">
                  <User className="h-3 w-3 text-brand-400" />
                  {profile.role}
                </span>
              </div>

              {/* Role Badge */}
              <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium ${
                profile.role === 'admin' 
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                {profile.role === 'admin' ? 'Lead Admin' : 'Team Member'}
              </span>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="flex items-center gap-2 rounded-lg bg-dark-900 border border-dark-700 px-3.5 py-1.5 text-sm font-semibold text-slate-300 transition-all duration-200 hover:bg-dark-800 hover:text-white hover:border-slate-500 focus:outline-none"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
export default Navbar
