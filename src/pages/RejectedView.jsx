import React from 'react'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/Navbar'
import { ShieldAlert } from 'lucide-react'

// Shown to a user whose registration was declined by an admin
export const RejectedView = () => {
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

export default RejectedView
