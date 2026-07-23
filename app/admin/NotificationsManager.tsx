'use client'
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import supabase from '@/lib/supabaseClient'
import {
  Bell, Menu, AlertCircle, RefreshCw, Send, Users, Smartphone, Clock,
} from 'lucide-react'
import { ACCENT } from './missionMeta'
import { useToast } from './Toast'
import { useConfirmDialog } from './ConfirmDialog'
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2">
      <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
        <Icon className="w-4 h-4 text-violet-600" />
      </div>
      <div>
        <p className="text-[22px] font-extrabold text-gray-900 leading-none tabular-nums whitespace-nowrap">{value}</p>
        <p className="text-[11px] font-medium text-gray-400 mt-1">{label}</p>
        {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
      </div>
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
  const { confirm, dialog } = useConfirmDialog()

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

    // Confirm before blasting all parents
    if (!targetParentId) {
      const ok = await confirm({
        title: `Send to all ${subscribedCount} subscribed parent${subscribedCount !== 1 ? 's' : ''}?`,
        message: `"${title.trim()}" will be pushed to ${totalDevices} device${totalDevices !== 1 ? 's' : ''}. This cannot be undone.`,
      })
      if (!ok) return
    }

    setSending(true)
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

      toastOk(`Sent to ${data.recipient_parents} parent${data.recipient_parents === 1 ? '' : 's'}, ${data.recipient_devices} device${data.recipient_devices === 1 ? '' : 's'}`)
      setTitle('')
      setMessage('')
      setUrl('')
      setTargetParentId('')
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Failed to send notification.')
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
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {dialog}
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onOpenSidebar} className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-gray-500">
            <Menu size={17} />
          </button>
          <div>
            <h1 className="text-[22px] font-extrabold text-gray-900">Notifications</h1>
            <p className="text-[13px] text-gray-500">Push announcements to parent devices</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-5">
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
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-[14px] font-bold text-gray-700">Couldn&apos;t load notifications</p>
            <p className="text-[12px] text-gray-400 mt-1 max-w-sm">{loadError}</p>
            <button onClick={fetchData}
              className="mt-4 inline-flex items-center gap-2 text-white text-[12px] font-bold bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl transition">
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
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-3">Send Notification</p>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Title</label>
                    <span className={`text-[10px] font-bold tabular-nums ${title.length > 72 ? 'text-red-500' : 'text-gray-400'}`}>{title.length}/80</span>
                  </div>
                  <input
                    type="text"
                    placeholder="New stories added!"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    maxLength={80}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-gray-700 focus:outline-none focus:border-green-400 transition"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Message</label>
                    <span className={`text-[10px] font-bold tabular-nums ${message.length > 180 ? 'text-red-500' : 'text-gray-400'}`}>{message.length}/200</span>
                  </div>
                  <textarea
                    placeholder="We just added 3 new FlipFlop Books to the library!"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={3}
                    maxLength={200}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] text-gray-600 focus:outline-none focus:border-green-400 resize-none transition"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 min-w-0">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1.5">Link (optional)</label>
                    <input
                      type="text"
                      placeholder="/certificates"
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-gray-700 focus:outline-none focus:border-green-400 transition"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1.5">Send to</label>
                    <select
                      value={targetParentId}
                      onChange={e => setTargetParentId(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-gray-700 focus:outline-none focus:border-green-400 bg-white transition"
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
                <div className="flex items-center justify-end pt-1">
                  <button
                    onClick={() => void handleSend()}
                    disabled={!canSend}
                    className="inline-flex items-center gap-2 text-[13px] font-bold text-white bg-green-600 hover:bg-green-700 px-5 py-2.5 rounded-xl shadow-sm transition whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {sending ? 'Sending…' : targetParentId ? 'Send to parent' : `Send to all ${subscribedCount}`}
                  </button>
                </div>
              </div>
            </div>

            {/* Recently sent */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-3">Recently Sent</p>
              {broadcasts.length === 0 ? (
                <div className="text-center py-10">
                  <Bell size={32} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-[13px] font-bold text-gray-400">No broadcasts yet</p>
                  <p className="text-[12px] text-gray-400 mt-0.5">Send your first notification above</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {broadcasts.map(b => (
                    <div key={b.id} className="rounded-xl border border-gray-100 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-gray-800 truncate">{b.title}</p>
                          <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-2">{b.body}</p>
                        </div>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">{formatDateTime(b.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600">
                          {targetLabel(b)}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {b.recipient_parents} parent{b.recipient_parents === 1 ? '' : 's'} · {b.recipient_devices} device{b.recipient_devices === 1 ? '' : 's'}
                        </span>
                        {b.url && <span className="text-[11px] text-gray-400">→ {b.url}</span>}
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
    </div>
  )
}

