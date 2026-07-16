import React, { useEffect, useRef, useState } from 'react'
import { Bell, Clock, User } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'

export const NotificationsBell = () => {
  const { user, profile } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const panelRef = useRef(null)

  // Members always have this feature; admins only if a supervisor granted access. Supervisors never see it.
  const canSeeNotifications = !!profile && (
    profile.role === 'member' ||
    (profile.role === 'admin' && profile.notifications_access === true)
  )

  const fetchNotifications = async (userId) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!error) setNotifications(data || [])
    } finally {
      setLoading(false)
    }
  }

  // Once per session, ask the DB to backfill any missed-progress notifications, then load the list
  useEffect(() => {
    if (!user || !canSeeNotifications) return

    const sessionFlag = 'teamtrack_notif_scan_' + user.id
    if (sessionStorage.getItem(sessionFlag) === 'true') {
      fetchNotifications(user.id)
      return
    }

    sessionStorage.setItem(sessionFlag, 'true')
    supabase.rpc('generate_missed_progress_notifications').finally(() => {
      fetchNotifications(user.id)
    })
  }, [user, canSeeNotifications])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const unreadCount = notifications.filter(n => !n.is_read).length

  const handleToggle = async () => {
    const next = !isOpen
    setIsOpen(next)

    if (next && unreadCount > 0) {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds)
    }
  }

  if (!canSeeNotifications) return null

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleToggle}
        className="relative flex items-center justify-center h-9 w-9 rounded-lg bg-dark-900 border border-dark-700 text-slate-350 transition-all duration-200 hover:bg-dark-800 hover:text-white hover:border-slate-500 focus:outline-none"
        title="Notifications"
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-rose-500 border-2 border-dark-950 animate-pulse" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-2xl border border-dark-800 bg-dark-900 shadow-2xl z-50">
          <div className="sticky top-0 bg-dark-900 border-b border-dark-800 px-4 py-3 flex items-center justify-between">
            <h4 className="text-sm font-bold text-white">Notifications</h4>
            <span className="text-[10px] text-slate-500 font-semibold">{notifications.length}</span>
          </div>

          {loading ? (
            <div className="p-6 text-center text-xs text-slate-500">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No notifications yet. You'll be alerted here if a workday's progress goes unlogged.
            </div>
          ) : (
            <div className="divide-y divide-dark-800">
              {notifications.map((n) => {
                const isSelf = n.type === 'missed_progress_self'
                return (
                  <div key={n.id} className={`px-4 py-3 text-xs space-y-1.5 ${n.is_read ? '' : 'bg-brand-500/5'}`}>
                    <div className="flex items-center gap-1.5">
                      {isSelf ? (
                        <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <User className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                      )}
                      <span className={`text-[9px] uppercase font-bold tracking-wider ${isSelf ? 'text-amber-400' : 'text-rose-400'}`}>
                        {isSelf ? 'Your Activity' : 'Team Alert'}
                      </span>
                    </div>
                    <p className="text-slate-200 leading-relaxed">{n.message}</p>
                    <span className="text-[10px] text-slate-500 block">
                      {new Date(n.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationsBell
