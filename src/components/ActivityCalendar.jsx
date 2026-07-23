import React, { useEffect, useState } from 'react'
import { X, ChevronLeft, ChevronRight, Loader, CalendarCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const toDateKey = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const ActivityCalendar = ({ isOpen, onClose }) => {
  const { profile } = useAuth()
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })
  const [activityDays, setActivityDays] = useState(new Set())
  const [leaveDays, setLeaveDays] = useState(new Set())
  const [loading, setLoading] = useState(false)

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth() // 0-indexed

  const fetchMonthData = async () => {
    if (!profile?.id) return
    setLoading(true)
    try {
      const monthStart = new Date(year, month, 1)
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)

      const [{ data: tasksData, error: tasksErr }, { data: notesData, error: notesErr }] = await Promise.all([
        supabase
          .from('tasks')
          .select('title, created_at')
          .eq('created_by', profile.id)
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString()),
        supabase
          .from('task_updates')
          .select('created_at')
          .eq('user_id', profile.id)
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString())
      ])

      if (tasksErr) throw tasksErr
      if (notesErr) throw notesErr

      const nextActivity = new Set()
      const nextLeave = new Set()

      ;(tasksData || []).forEach((t) => {
        const dateKey = toDateKey(new Date(t.created_at))
        if (t.title === 'Leave') {
          nextLeave.add(dateKey)
        } else {
          nextActivity.add(dateKey)
        }
      })
      ;(notesData || []).forEach((n) => {
        nextActivity.add(toDateKey(new Date(n.created_at)))
      })

      setActivityDays(nextActivity)
      setLeaveDays(nextLeave)
    } catch (err) {
      console.error('Error loading activity calendar:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) fetchMonthData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, year, month, profile?.id])

  if (!isOpen) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const joinDate = profile?.created_at ? new Date(profile.created_at) : null
  if (joinDate) joinDate.setHours(0, 0, 0, 0)

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) cells.push(day)

  const getDayStatus = (day) => {
    const date = new Date(year, month, day)
    date.setHours(0, 0, 0, 0)

    if (date > today) return 'future'
    if (joinDate && date < joinDate) return 'unregistered'

    const dayOfWeek = date.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) return 'weekend'

    const dateKey = toDateKey(date)
    if (leaveDays.has(dateKey)) return 'leave'
    if (activityDays.has(dateKey)) return 'active'
    return 'missed'
  }

  const STATUS_STYLES = {
    active: 'bg-emerald-500/80 text-white',
    leave: 'bg-sky-500/80 text-white',
    missed: 'bg-rose-500/70 text-white',
    weekend: 'bg-dark-800/50 text-slate-600',
    future: 'bg-transparent text-slate-700',
    unregistered: 'bg-transparent text-slate-700'
  }

  let activeCount = 0
  let missedCount = 0
  let leaveCount = 0
  for (let day = 1; day <= daysInMonth; day++) {
    const status = getDayStatus(day)
    if (status === 'active') activeCount++
    else if (status === 'missed') missedCount++
    else if (status === 'leave') leaveCount++
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-dark-800 bg-dark-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-dark-800 pb-3 mb-4">
          <h3 className="font-sans text-lg font-bold text-white flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-brand-400" />
            My Activity Calendar
          </h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-dark-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-dark-800 hover:text-white transition"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-bold text-white">
            {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button
            type="button"
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
            disabled={isCurrentMonth}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-dark-800 hover:text-white transition disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader className="h-6 w-6 text-brand-500 animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1.5 mb-3">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="text-center text-[10px] font-bold uppercase text-slate-500">
                  {label}
                </div>
              ))}
              {cells.map((day, idx) => {
                if (day === null) return <div key={`pad-${idx}`} />
                const status = getDayStatus(day)
                return (
                  <div
                    key={day}
                    title={`${viewDate.toLocaleDateString('en-US', { month: 'short' })} ${day}: ${status}`}
                    className={`aspect-square rounded-lg flex items-center justify-center text-xs font-semibold ${STATUS_STYLES[status]}`}
                  >
                    {day}
                  </div>
                )
              })}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-slate-400 border-t border-dark-800 pt-3">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />Active ({activeCount})</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sky-500/80" />Leave ({leaveCount})</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />Missed ({missedCount})</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-dark-800 border border-dark-700" />Weekend</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ActivityCalendar
