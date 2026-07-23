'use client'
import React, { useEffect, useRef, useState, useCallback } from 'react'
import supabase from '@/lib/supabaseClient'
import { Bell, Send, Users, ArrowRight, CheckCheck, Loader2 } from 'lucide-react'

interface Broadcast {
  id: string
  title: string
  body: string
  recipient_parents: number
  recipient_devices: number
  created_at: string
}

// localStorage key for last-seen timestamp (per-browser, per-admin)
const LAST_SEEN_KEY = 'nimipiko-admin-notif-last-seen'

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60)   return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface Props {
  onNavigate: (table: string) => void
}

export default function NotificationBell({ onNavigate }: Props) {
  const [open, setOpen]               = useState(false)
  const [broadcasts, setBroadcasts]   = useState<Broadcast[]>([])
  const [loading, setLoading]         = useState(false)
  const [unread, setUnread]           = useState(0)
  const [subscriberCount, setSubscriberCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: rows }, { count }] = await Promise.all([
        supabase
          .from('push_broadcasts')
          .select('id, title, body, recipient_parents, recipient_devices, created_at')
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('push_subscriptions')
          .select('*', { count: 'exact', head: true }),
      ])
      const items = (rows ?? []) as Broadcast[]
      setBroadcasts(items)
      setSubscriberCount(count ?? 0)

      // Count broadcasts newer than last-seen timestamp
      const lastSeen = localStorage.getItem(LAST_SEEN_KEY)
      if (!lastSeen) {
        setUnread(Math.min(items.length, 5))
      } else {
        setUnread(items.filter(b => new Date(b.created_at) > new Date(lastSeen)).length)
      }
    } catch {
      // silent — bell degrades gracefully
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchData() }, [fetchData])

  // Click-outside
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const handleOpen = () => {
    setOpen(o => {
      if (!o) {
        // Mark as seen when opening
        localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString())
        setUnread(0)
      }
      return !o
    })
  }

  const handleViewAll = () => {
    setOpen(false)
    onNavigate('notifications')
  }

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        aria-expanded={open}
        className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition ${
          open ? 'bg-green-50 text-green-600' : 'bg-gray-50 hover:bg-gray-100 text-gray-500'
        }`}
      >
        <Bell
          size={16}
          className={open ? 'fill-green-100' : ''}
          style={unread > 0 ? { animation: 'bellRing 1s ease-in-out' } : undefined}
        />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 leading-none ring-2 ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <div>
              <p className="text-[13px] font-bold text-gray-800">Notifications</p>
              <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                <Users size={10} />
                {subscriberCount} device{subscriberCount !== 1 ? 's' : ''} subscribed
              </p>
            </div>
            <button
              onClick={handleViewAll}
              className="flex items-center gap-1 text-[11px] font-bold text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-2.5 py-1.5 rounded-lg transition"
            >
              Send new <Send size={10} />
            </button>
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-gray-400 text-[13px]">
                <Loader2 size={15} className="animate-spin" />
                Loading…
              </div>
            ) : broadcasts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-center px-6">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                  <Bell size={18} className="text-gray-300" />
                </div>
                <p className="text-[13px] font-semibold text-gray-500">No broadcasts yet</p>
                <p className="text-[11px] text-gray-400">Send your first notification to families</p>
              </div>
            ) : (
              <ul>
                {broadcasts.map((b, i) => {
                  const isNew = i < unread + (localStorage.getItem(LAST_SEEN_KEY)
                    ? broadcasts.filter(x => new Date(x.created_at) > new Date(localStorage.getItem(LAST_SEEN_KEY)!)).length
                    : 0)
                  return (
                    <li key={b.id}
                      className="flex gap-3 px-4 py-3 hover:bg-gray-50 transition border-b border-gray-50 last:border-0 cursor-default group"
                    >
                      {/* Icon */}
                      <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Send size={13} className="text-green-600" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[12px] font-bold text-gray-800 leading-snug truncate">{b.title}</p>
                          <span className="text-[10px] text-gray-400 flex-shrink-0 mt-px">{timeAgo(b.created_at)}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{b.body}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Users size={9} /> {b.recipient_parents} parent{b.recipient_parents !== 1 ? 's' : ''}
                          </span>
                          <span className="text-gray-200">·</span>
                          <span className="text-[10px] text-gray-400">{b.recipient_devices} device{b.recipient_devices !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          {broadcasts.length > 0 && (
            <div className="border-t border-gray-50 px-4 py-2.5 flex items-center justify-between">
              <span className="text-[11px] text-gray-400 flex items-center gap-1">
                <CheckCheck size={11} className="text-green-500" />
                All caught up
              </span>
              <button
                onClick={handleViewAll}
                className="flex items-center gap-1 text-[11px] font-bold text-green-600 hover:text-green-700 transition"
              >
                View all <ArrowRight size={11} />
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes bellRing {
          0%,100% { transform: rotate(0deg); }
          10%,30%,50% { transform: rotate(-12deg); }
          20%,40%  { transform: rotate(12deg); }
          60% { transform: rotate(6deg); }
          80% { transform: rotate(-4deg); }
        }
      `}</style>
    </div>
  )
}
