'use client'
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import supabase from '@/lib/supabaseClient'
import {
  Bell, Menu, ChevronDown, AlertCircle, RefreshCw, Send, Users, Smartphone, Clock,
} from 'lucide-react'
import { ACCENT } from './missionMeta'
import { useToast } from './Toast'
import { Skeleton, SkeletonStatCards, SkeletonForm, SkeletonList } from './Skeleton'

interface NotificationsManagerProps {
  onNavigate: (table: string) => void
  onOpenSidebar?: () => void
}

interface ParentRow {
  id: string
  name: string | null
  email: string
}

interface BroadcastRow {
  id: string
  title: string
  body: string
  url: string | null
  target_parent_id: string | null
  recipient_parents: number
  recipient_devices: number
  created_at: string
  parents: { name: string | null; email: string } | null
}

const accent = ACCENT.violet

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function StatCard({ icon: Icon, label, value, hint }: { icon: React.ElementType; label: string; value: string | number; hint?: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${accent.tile}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-extrabold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  )
}

export default function NotificationsManager({ onNavigate, onOpenSidebar }: NotificationsManagerProps) {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [subscribedParentIds, setSubscribedParentIds] = useState<Set<string>>(new Set())
  const [totalDevices, setTotalDevices] = useState(0)
  const [parents, setParents] = useState<ParentRow[]>([])
  const [broadcasts, setBroadcasts] = useState<BroadcastRow[]>([])

  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [url, setUrl] = useState('')
  const [targetParentId, setTargetParentId] = useState('')
  const [sending, setSending] = useState(false)
  const { success: toastOk, error: toastErr } = useToast()
  const [sendError, setSendError] = useState<string | null>(null)
  const [sendResult, setSendResult] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [{ data: subs, error: subsError }, { data: parentRows, error: parentsError }, { data: broadcastRows, error: broadcastsError }] = await Promise.all([
        supabase.from('push_subscriptions').select('parent_id'),
        supabase.from('parents').select('id, name, email').order('created_at', { ascending: false }),
        supabase.from('push_broadcasts').select('*, parents(name, email)').order('created_at', { ascending: false }).limit(10),
      ])
      if (subsError) throw subsError
      if (parentsError) throw parentsError
      if (broadcastsError) throw broadcastsError

      setSubscribedParentIds(new Set((subs ?? []).map(s => s.parent_id as string)))
      setTotalDevices((subs ?? []).length)
      setParents((parentRows ?? []) as ParentRow[])
      setBroadcasts((broadcastRows ?? []) as unknown as BroadcastRow[])
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load notifications.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const canSend = title.trim().length > 0 && message.trim().length > 0 && !sending

  const handleSend = async () => {
    if (!canSend) return
    setSending(true)
    setSendError(null)
    setSendResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No active session.')

      const res = await fetch('/api/admin/push/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          title: title.trim(),
          body: message.trim(),
          url: url.trim() || undefined,
          target_parent_id: targetParentId || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send notification.')

      setBroadcasts(prev => [data as BroadcastRow, ...prev].slice(0, 10))

      // Also create in-app notifications
      if (targetParentId) {
        await supabase.from('notifications').insert({
          parent_id: targetParentId, title: title.trim(), body: message.trim(),
          type: 'info', url: url.trim() || null,
        })
      } else {
        const { data: allParents } = await supabase.from('parents').select('id')
        if (allParents?.length) {
          await supabase.from('notifications').insert(
            allParents.map(p => ({
              parent_id: p.id, title: title.trim(), body: message.trim(),
              type: 'info', url: url.trim() || null,
            }))
          )
        }
      }

      const msg = `Sent to ${data.recipient_parents} parent${data.recipient_parents === 1 ? '' : 's'}, ${data.recipient_devices} device${data.recipient_devices === 1 ? '' : 's'}.`
      setSendResult(msg)
      toastOk(msg)
      setTitle('')
      setMessage('')
      setUrl('')
      setTargetParentId('')
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to send notification.'
      setSendError(errMsg)
      toastErr(errMsg)
    } finally {
      setSending(false)
    }
  }

  const targetLabel = useCallback((b: BroadcastRow) => {
    if (!b.target_parent_id) return 'All parents'
    return b.parents?.name || b.parents?.email || 'Parent'
  }, [])

  const subscribedCount = useMemo(() => subscribedParentIds.size, [subscribedParentIds])

  return (
    <div>
      {/* Header */}
      <header className={`border-b border-gray-100 px-4 sm:px-6 py-5 ${accent.soft}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3.5 min-w-0">
            <button
              onClick={onOpenSidebar}
              className="lg:hidden flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-100 hover:bg-gray-50 text-gray-600 shadow-sm transition mt-0.5"
            >
              <Menu size={17} />
            </button>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm bg-white ${accent.text}`}>
              <Bell className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                Notifications <span className="text-lg">🔔</span>
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">
                Send push announcements to parents
              </p>
              <p className="text-xs text-gray-400 mt-1.5">
                <button onClick={() => onNavigate('Dashboard')} className={`font-bold hover:underline ${accent.text}`}>Dashboard</button>
                <span className="mx-1.5 text-gray-300">/</span>
                <span className="font-bold text-gray-500">Notifications</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-100 pl-1.5 pr-3 py-1.5 rounded-full shadow-sm">
            <img src="/nimi-logo-circle.png" alt="Profile" className="w-7 h-7 rounded-full object-cover flex-shrink-0 ring-2 ring-white"  loading="lazy" />
            <ChevronDown size={14} className="text-gray-400" />
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        {loading ? (
          <>
            <SkeletonStatCards count={3} cols="sm:grid-cols-3" />
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <Skeleton className="h-5 w-44 mb-4" />
              <SkeletonForm fields={3} />
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <Skeleton className="h-5 w-32 mb-4" />
              <SkeletonList rows={3} avatar={false} />
            </div>
          </>
        ) : loadError ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-400 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-gray-700">Couldn&apos;t load notifications</p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm">{loadError}</p>
            <button
              onClick={fetchData}
              className={`mt-4 inline-flex items-center gap-2 text-white text-xs font-bold px-4 py-2 rounded-full transition ${accent.button}`}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Try again
            </button>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <StatCard icon={Users} label="Subscribed Parents" value={subscribedCount} />
              <StatCard icon={Smartphone} label="Total Devices" value={totalDevices} />
              <StatCard icon={Clock} label="Daily Reminder" value="5:00 PM UTC" hint="Sent to parents with no mission today" />
            </div>

            {/* Composer */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-1">
                <Send className={`w-4 h-4 ${accent.text}`} /> Send Notification
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                Push a message to one parent or everyone with notifications enabled.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Title</label>
                  <input
                    type="text"
                    placeholder="New stories added!"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    maxLength={80}
                    className={`w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm ${accent.ring}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Message</label>
                  <textarea
                    placeholder="We just added 3 new FlipFlop Books to the library!"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={3}
                    maxLength={200}
                    className={`w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm resize-none ${accent.ring}`}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Link (optional)</label>
                    <input
                      type="text"
                      placeholder="/certificates"
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                      className={`w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm ${accent.ring}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Send to</label>
                    <select
                      value={targetParentId}
                      onChange={e => setTargetParentId(e.target.value)}
                      className={`w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white ${accent.ring}`}
                    >
                      <option value="">All subscribed parents ({subscribedCount})</option>
                      {parents.map(p => (
                        <option key={p.id} value={p.id}>
                          {(p.name || p.email)}{subscribedParentIds.has(p.id) ? ' 🔔' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 pt-1">
                  {sendResult && <p className="text-xs font-bold text-emerald-600">{sendResult}</p>}
                  {sendError && <p className="text-xs font-bold text-red-500">{sendError}</p>}
                  <button
                    onClick={handleSend}
                    disabled={!canSend}
                    className={`inline-flex items-center gap-2 text-sm font-bold text-white px-5 py-2.5 rounded-full transition whitespace-nowrap ${accent.button} disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <Send className="w-3.5 h-3.5" /> {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </div>

            {/* Recently sent */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-base font-bold text-gray-800 mb-4">Recently Sent</h3>
              {broadcasts.length === 0 ? (
                <p className="text-sm text-gray-400">No notifications sent yet.</p>
              ) : (
                <div className="space-y-3">
                  {broadcasts.map(b => (
                    <div key={b.id} className="rounded-2xl border border-gray-100 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-gray-800 truncate">{b.title}</p>
                          <p className="text-sm text-gray-500 mt-0.5">{b.body}</p>
                        </div>
                        <span className="text-[11px] text-gray-400 whitespace-nowrap">{formatDateTime(b.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${accent.tile}`}>
                          {targetLabel(b)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {b.recipient_parents} parent{b.recipient_parents === 1 ? '' : 's'} · {b.recipient_devices} device{b.recipient_devices === 1 ? '' : 's'}
                        </span>
                        {b.url && <span className="text-xs text-gray-400">→ {b.url}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
