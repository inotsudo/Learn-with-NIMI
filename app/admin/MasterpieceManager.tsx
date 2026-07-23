'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Crown, Check, Download, RefreshCw, Upload, Award, Menu, Search,
  Trash2, AlertCircle, ChevronLeft, ChevronRight, X,
} from 'lucide-react'
import supabase from '@/lib/supabaseClient'
import { authedFetch } from '@/lib/authedFetch'
import { useToast } from './Toast'
import { useConfirmDialog } from './ConfirmDialog'
import { logAdminAction } from '@/lib/adminAuditLog'
import { Skeleton, SkeletonStatCards } from './Skeleton'

interface Story {
  id: string
  title: string
  slug: string
  theme_emoji: string | null
  is_personalizable: boolean
  personalization_config: Record<string, unknown> | null
  certificate_config: Record<string, Record<string, unknown>> | null
}

interface MasterpieceOrder {
  id: string
  child_name: string
  child_photo_url: string | null
  status: string
  pdf_url: string | null
  created_at: string
  stories: { title: string; theme_emoji: string | null } | null
  parent_id: string | null
}

interface Props {
  onNavigate?: (table: string) => void
  onOpenSidebar?: () => void
}

type Tab = 'stories' | 'orders' | 'certificates'
type StatusFilter = 'all' | 'pending' | 'processing' | 'completed' | 'failed'

const PAGE_SIZE = 10

const STATUS_BADGE: Record<string, string> = {
  pending:    'bg-gray-100 text-gray-600',
  processing: 'bg-yellow-100 text-yellow-700',
  completed:  'bg-green-100 text-green-700',
  failed:     'bg-red-100 text-red-600',
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1.5">
      <p className="text-[22px] font-extrabold text-gray-900 tabular-nums leading-none">{value}</p>
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
    </div>
  )
}

export default function MasterpieceManager({ onNavigate, onOpenSidebar }: Props) {
  const [tab, setTab] = useState<Tab>('stories')
  const [stories, setStories] = useState<Story[]>([])
  const [orders, setOrders] = useState<MasterpieceOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // Orders UI
  const [orderSearch, setOrderSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [orderPage, setOrderPage] = useState(1)

  // Per-story personalization config (controlled)
  const [configDraft, setConfigDraft] = useState<Record<string, Record<string, unknown>>>({})
  const [busyStoryId, setBusyStoryId] = useState<string | null>(null)
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null)
  const [changingStatus, setChangingStatus] = useState<{ id: string; value: string } | null>(null)

  const { success: toastOk, error: toastErr } = useToast()
  const { confirm, dialog } = useConfirmDialog()

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [{ data: s, error: sErr }, { data: o, error: oErr }] = await Promise.all([
        supabase
          .from('stories')
          .select('id, title, slug, theme_emoji, is_personalizable, personalization_config, certificate_config')
          .order('sort_order'),
        supabase
          .from('masterpiece_orders')
          .select('id, child_name, child_photo_url, status, pdf_url, created_at, parent_id, stories(title, theme_emoji)')
          .order('created_at', { ascending: false })
          .limit(200),
      ])
      if (sErr) throw sErr
      if (oErr) throw oErr
      const storyRows = (s ?? []) as Story[]
      setStories(storyRows)
      setOrders((o ?? []) as unknown as MasterpieceOrder[])

      // Seed configDraft with DB values
      const draft: Record<string, Record<string, unknown>> = {}
      for (const st of storyRows) {
        draft[st.id] = (st.personalization_config ?? {}) as Record<string, unknown>
      }
      setConfigDraft(draft)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load masterpiece data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  // ── Stories: toggle personalizable ─────────────────────────────────────────
  const togglePersonalizable = async (story: Story) => {
    setBusyStoryId(story.id)
    try {
      const { error } = await supabase
        .from('stories')
        .update({ is_personalizable: !story.is_personalizable })
        .eq('id', story.id)
      if (error) throw error
      setStories(prev =>
        prev.map(s => s.id === story.id ? { ...s, is_personalizable: !s.is_personalizable } : s),
      )
      toastOk(`${story.title} ${story.is_personalizable ? 'disabled' : 'enabled'} for personalization.`)
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Update failed.')
    } finally {
      setBusyStoryId(null)
    }
  }

  // ── Stories: save personalization config ────────────────────────────────────
  const saveConfig = async (storyId: string) => {
    setBusyStoryId(storyId)
    try {
      const config = configDraft[storyId] ?? {}
      const { error } = await supabase
        .from('stories')
        .update({ personalization_config: config })
        .eq('id', storyId)
      if (error) throw error
      setStories(prev =>
        prev.map(s => s.id === storyId ? { ...s, personalization_config: config } : s),
      )
      toastOk('Personalization config saved.')
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setBusyStoryId(null)
    }
  }

  function patchConfig(storyId: string, field: string, value: unknown) {
    setConfigDraft(prev => ({
      ...prev,
      [storyId]: { ...(prev[storyId] ?? {}), [field]: value },
    }))
  }

  // ── Certificates ────────────────────────────────────────────────────────────
  const removeCertImage = async (story: Story, lang: string) => {
    const certConfig = { ...(story.certificate_config ?? {}) }
    delete certConfig[lang]
    const { error } = await supabase
      .from('stories')
      .update({ certificate_config: certConfig })
      .eq('id', story.id)
    if (error) { toastErr(error.message); return }
    setStories(prev => prev.map(s => s.id === story.id ? { ...s, certificate_config: certConfig } : s))
    toastOk('Certificate image removed.')
  }

  const uploadCertImage = async (story: Story, lang: string, file: File) => {
    setBusyStoryId(story.id)
    try {
      const ext = file.name.split('.').pop()
      const path = `certificates/${story.slug}_${lang}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('story-assets')
        .upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const certConfig: Record<string, Record<string, unknown>> = {
        ...(story.certificate_config ?? {}),
        [lang]: {
          image_url: `story-assets/${path}`,
          nameX: (story.certificate_config?.[lang]?.nameX ?? 420) as number,
          nameY: (story.certificate_config?.[lang]?.nameY ?? 100) as number,
          nameSize: (story.certificate_config?.[lang]?.nameSize ?? 48) as number,
          nameColor: (story.certificate_config?.[lang]?.nameColor ?? '#1a1a5e') as string,
        },
      }
      const { error } = await supabase
        .from('stories')
        .update({ certificate_config: certConfig })
        .eq('id', story.id)
      if (error) throw error
      setStories(prev => prev.map(s => s.id === story.id ? { ...s, certificate_config: certConfig } : s))
      toastOk(`Certificate image uploaded for ${lang.toUpperCase()}.`)
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setBusyStoryId(null)
    }
  }

  const updateCertField = async (story: Story, field: string, value: number | string) => {
    const certConfig: Record<string, Record<string, unknown>> = { ...(story.certificate_config ?? {}) }
    for (const l of Object.keys(certConfig)) certConfig[l] = { ...certConfig[l], [field]: value }
    const { error } = await supabase
      .from('stories')
      .update({ certificate_config: certConfig })
      .eq('id', story.id)
    if (error) { toastErr(error.message); return }
    setStories(prev => prev.map(s => s.id === story.id ? { ...s, certificate_config: certConfig } : s))
    toastOk('Certificate config updated.')
  }

  // ── Orders ──────────────────────────────────────────────────────────────────
  const retryGenerate = async (orderId: string) => {
    setBusyOrderId(orderId)
    try {
      await authedFetch('/api/masterpiece/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterpieceId: orderId }),
      })
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'processing' } : o))
      toastOk('Regeneration started.')
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Retry failed.')
    } finally {
      setBusyOrderId(null)
    }
  }

  const updateOrderStatus = async (orderId: string, status: string) => {
    setBusyOrderId(orderId)
    try {
      const { error } = await supabase
        .from('masterpiece_orders')
        .update({ status })
        .eq('id', orderId)
      if (error) throw error
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
      setChangingStatus(null)
      toastOk(`Order marked as ${status}.`)
      void logAdminAction({ action: 'update_order_status', entityType: 'order', entityId: orderId, entityLabel: orderId, metadata: { status } })
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Status update failed.')
    } finally {
      setBusyOrderId(null)
    }
  }

  const deleteOrder = async (orderId: string, childName: string) => {
    const ok = await confirm({
      title: `Delete order for ${childName}?`,
      message: 'This will permanently delete the order record. Any generated PDF is not affected.',
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return
    setBusyOrderId(orderId)
    try {
      const { error } = await supabase
        .from('masterpiece_orders')
        .delete()
        .eq('id', orderId)
      if (error) throw error
      setOrders(prev => prev.filter(o => o.id !== orderId))
      toastOk('Order deleted.')
      void logAdminAction({ action: 'delete_order', entityType: 'order', entityId: orderId, entityLabel: childName })
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Delete failed.')
    } finally {
      setBusyOrderId(null)
    }
  }

  const downloadOrder = async (orderId: string) => {
    try {
      const res = await authedFetch(`/api/masterpiece/download?id=${orderId}`)
      const data = await res.json() as { downloadUrl?: string }
      if (data.downloadUrl) window.open(data.downloadUrl, '_blank')
    } catch {
      toastErr('Download failed.')
    }
  }

  // ── Filtered + paginated orders ─────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    let rows = orders
    if (statusFilter !== 'all') rows = rows.filter(o => o.status === statusFilter)
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase()
      rows = rows.filter(o =>
        o.child_name.toLowerCase().includes(q) ||
        (o.stories?.title ?? '').toLowerCase().includes(q),
      )
    }
    return rows
  }, [orders, statusFilter, orderSearch])

  const totalOrderPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE))
  const orderPageClamped = Math.min(orderPage, totalOrderPages)
  const pageOrders = filteredOrders.slice((orderPageClamped - 1) * PAGE_SIZE, orderPageClamped * PAGE_SIZE)

  const orderStats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    completed: orders.filter(o => o.status === 'completed').length,
    failed: orders.filter(o => o.status === 'failed').length,
  }), [orders])

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {dialog}

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5 flex-shrink-0">
        <div className="flex items-start gap-3.5">
          <button
            onClick={onOpenSidebar}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-gray-500 flex-shrink-0 mt-0.5"
          >
            <Menu size={17} />
          </button>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-yellow-50 text-yellow-500 shadow-sm">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-[22px] font-extrabold text-gray-900">Masterpieces</h1>
            <p className="text-[13px] text-gray-500">
              Personalized storybooks — configure which stories are personalizable and manage orders
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1.5 mt-5">
          {([
            { key: 'stories', label: 'Personalization' },
            { key: 'orders', label: `Orders (${orders.length})` },
            { key: 'certificates', label: 'Certificates' },
          ] as { key: Tab; label: string }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3.5 py-2 rounded-full text-sm font-bold transition whitespace-nowrap ${
                tab === t.key
                  ? 'bg-yellow-400 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-6 lg:p-8">
        {loading ? (
          <div className="space-y-6">
            <SkeletonStatCards count={4} cols="sm:grid-cols-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-2xl" />
              ))}
            </div>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-sm font-bold text-gray-700">Couldn&apos;t load masterpiece data</p>
            <p className="text-xs text-gray-400 mt-1">{loadError}</p>
            <button
              onClick={() => void load()}
              className="mt-4 inline-flex items-center gap-2 text-white text-xs font-bold bg-yellow-400 hover:bg-yellow-500 px-4 py-2 rounded-full transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Try again
            </button>
          </div>
        ) : tab === 'stories' ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Enable personalization on a story to let parents upload a child photo that gets embedded into the storybook PDF.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {stories.map(story => {
                const draft = configDraft[story.id] ?? {}
                const isBusy = busyStoryId === story.id
                return (
                  <div
                    key={story.id}
                    className={`rounded-2xl border-2 p-4 transition bg-white ${
                      story.is_personalizable ? 'border-yellow-400 bg-yellow-50/40' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">{story.theme_emoji ?? '📖'}</span>
                      <button
                        onClick={() => void togglePersonalizable(story)}
                        disabled={isBusy}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition disabled:opacity-50 ${
                          story.is_personalizable
                            ? 'bg-yellow-400 text-white hover:bg-yellow-500'
                            : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                        }`}
                        title={story.is_personalizable ? 'Disable personalization' : 'Enable personalization'}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="font-bold text-gray-900 text-[14px]">{story.title}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {story.is_personalizable ? '✅ Personalizable' : 'Not personalizable'}
                    </p>

                    {story.is_personalizable && (
                      <div className="mt-3 space-y-2 border-t pt-3">
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { field: 'photoX', label: 'Photo X', type: 'number' as const },
                            { field: 'photoY', label: 'Photo Y', type: 'number' as const },
                            { field: 'photoSize', label: 'Photo Size', type: 'number' as const },
                          ].map(({ field, label, type }) => (
                            <div key={field}>
                              <label className="text-[10px] font-bold text-gray-500 block mb-0.5">{label}</label>
                              <input
                                type={type}
                                value={(draft[field] as number | undefined) ?? (field === 'photoSize' ? 150 : 50)}
                                onChange={e => patchConfig(story.id, field, Number(e.target.value))}
                                className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-yellow-400"
                              />
                            </div>
                          ))}
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 block mb-0.5">Photo Pages</label>
                            <input
                              type="text"
                              value={((draft.photoPages as number[] | undefined) ?? []).join(',')}
                              onChange={e =>
                                patchConfig(
                                  story.id,
                                  'photoPages',
                                  e.target.value
                                    .split(',')
                                    .map(n => parseInt(n.trim(), 10))
                                    .filter(n => !isNaN(n)),
                                )
                              }
                              placeholder="1,3,5"
                              className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-yellow-400"
                            />
                          </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(draft.photoOnAllPages as boolean | undefined) ?? false}
                            onChange={e => patchConfig(story.id, 'photoOnAllPages', e.target.checked)}
                            className="w-3.5 h-3.5 rounded accent-yellow-400"
                          />
                          <span className="text-[11px] text-gray-600 font-bold">Photo on all pages</span>
                        </label>
                        <button
                          onClick={() => void saveConfig(story.id)}
                          disabled={isBusy}
                          className="w-full py-1.5 text-[11px] font-bold rounded-lg bg-yellow-400 hover:bg-yellow-500 text-white transition disabled:opacity-50"
                        >
                          {isBusy ? 'Saving…' : 'Save Config'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ) : tab === 'orders' ? (
          <div className="space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Total Orders" value={orderStats.total} />
              <StatCard label="Completed" value={orderStats.completed} />
              <StatCard label="Pending / Processing" value={orderStats.pending + orderStats.processing} />
              <StatCard label="Failed" value={orderStats.failed} sub={orderStats.failed > 0 ? 'Need attention' : undefined} />
            </div>

            {/* Filter bar */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by child or story…"
                  value={orderSearch}
                  onChange={e => { setOrderSearch(e.target.value); setOrderPage(1) }}
                  className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-[13px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400 w-full"
                />
              </div>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                {(['all', 'pending', 'processing', 'completed', 'failed'] as StatusFilter[]).map(s => (
                  <button
                    key={s}
                    onClick={() => { setStatusFilter(s); setOrderPage(1) }}
                    className={`px-3 py-1.5 rounded-md text-[12px] font-bold capitalize transition ${
                      statusFilter === s ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Orders list */}
            {pageOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
                <Crown className="w-10 h-10 mx-auto text-gray-200 mb-2" />
                <p className="text-sm font-bold text-gray-400">No orders match your filters</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pageOrders.map(order => (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4"
                  >
                    {order.child_photo_url ? (
                      <img
                        src={order.child_photo_url}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover border-2 border-yellow-300 shrink-0"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-yellow-50 border-2 border-yellow-200 flex items-center justify-center text-xl shrink-0">
                        👤
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-[14px]">{order.child_name}</p>
                      <p className="text-[11px] text-gray-500">
                        {order.stories?.theme_emoji} {order.stories?.title ?? '—'} ·{' '}
                        {new Date(order.created_at).toLocaleDateString('en', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>

                    {/* Status — click to change */}
                    {changingStatus?.id === order.id ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <select
                          value={changingStatus.value}
                          onChange={e => setChangingStatus({ id: order.id, value: e.target.value })}
                          className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 bg-white"
                        >
                          {['pending', 'processing', 'completed', 'failed'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => void updateOrderStatus(order.id, changingStatus.value)}
                          disabled={busyOrderId === order.id}
                          className="w-7 h-7 rounded-lg flex items-center justify-center bg-green-50 text-green-600 hover:bg-green-100 transition disabled:opacity-50"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          onClick={() => setChangingStatus(null)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-400 transition"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setChangingStatus({ id: order.id, value: order.status })}
                        className={`text-[11px] font-bold px-3 py-1 rounded-full transition hover:opacity-80 shrink-0 ${STATUS_BADGE[order.status] ?? 'bg-gray-100 text-gray-600'}`}
                        title="Click to change status"
                      >
                        {order.status}
                      </button>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {order.status === 'failed' && (
                        <button
                          onClick={() => void retryGenerate(order.id)}
                          disabled={busyOrderId === order.id}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition disabled:opacity-50"
                          title="Retry generation"
                        >
                          <RefreshCw size={14} />
                        </button>
                      )}
                      {order.status === 'completed' && order.pdf_url && (
                        <button
                          onClick={() => void downloadOrder(order.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-green-50 text-gray-400 hover:text-green-600 transition"
                          title="Download PDF"
                        >
                          <Download size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => void deleteOrder(order.id, order.child_name)}
                        disabled={busyOrderId === order.id}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 text-gray-400 hover:text-red-500 transition disabled:opacity-50"
                        title="Delete order"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            <div className="flex items-center justify-between text-[12px] text-gray-400">
              <span>
                Showing {pageOrders.length > 0 ? (orderPageClamped - 1) * PAGE_SIZE + 1 : 0} to{' '}
                {Math.min(orderPageClamped * PAGE_SIZE, filteredOrders.length)} of {filteredOrders.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setOrderPage(p => Math.max(1, p - 1))}
                  disabled={orderPageClamped <= 1}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 transition"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(totalOrderPages, 5) }).map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setOrderPage(i + 1)}
                    className={`w-8 h-8 rounded-lg text-[12px] font-bold transition ${
                      i + 1 === orderPageClamped
                        ? 'bg-yellow-400 text-white'
                        : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setOrderPage(p => Math.min(totalOrderPages, p + 1))}
                  disabled={orderPageClamped >= totalOrderPages}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 transition"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Certificates tab */
          <div className="space-y-4">
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <Award className="w-4 h-4 text-yellow-500 shrink-0" />
              Upload a designed certificate image per story per language. The child&apos;s name is overlaid at the position you configure below.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {stories.map(story => {
                const certConfig = (story.certificate_config ?? {}) as Record<string, Record<string, unknown>>
                const isBusy = busyStoryId === story.id
                const firstLang = Object.keys(certConfig)[0]
                return (
                  <div key={story.id} className="rounded-2xl border border-gray-100 p-4 bg-white shadow-sm">
                    <p className="font-bold text-gray-900 text-[14px] mb-3">
                      {story.theme_emoji} {story.title}
                    </p>

                    {['en', 'fr', 'rw'].map(lang => {
                      const lc = certConfig[lang]
                      return (
                        <div key={lang} className="flex items-center gap-2 mb-2">
                          <span className="text-[11px] font-bold text-gray-500 w-6 uppercase shrink-0">{lang}</span>
                          {lc?.image_url ? (
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-green-600 text-[11px] font-bold">✅ Uploaded</span>
                              <button
                                onClick={() => void removeCertImage(story, lang)}
                                className="text-red-400 text-[10px] hover:underline"
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <label className={`flex items-center gap-1.5 cursor-pointer text-[11px] text-yellow-700 font-bold hover:underline ${isBusy ? 'opacity-50 pointer-events-none' : ''}`}>
                              <Upload className="w-3 h-3" /> Upload
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={e => {
                                  const f = e.target.files?.[0]
                                  if (f) void uploadCertImage(story, lang, f)
                                }}
                              />
                            </label>
                          )}
                        </div>
                      )
                    })}

                    {firstLang && (
                      <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2">
                        {[
                          { field: 'nameX', label: 'Name X' },
                          { field: 'nameY', label: 'Name Y' },
                          { field: 'nameSize', label: 'Name Size' },
                        ].map(({ field, label }) => (
                          <div key={field}>
                            <label className="text-[9px] font-bold text-gray-400 block mb-0.5">{label}</label>
                            <input
                              type="number"
                              defaultValue={certConfig[firstLang]?.[field] as number ?? (field === 'nameX' ? 420 : field === 'nameY' ? 100 : 48)}
                              onBlur={e => void updateCertField(story, field, Number(e.target.value))}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-yellow-400"
                            />
                          </div>
                        ))}
                        <div>
                          <label className="text-[9px] font-bold text-gray-400 block mb-0.5">Name Color</label>
                          <input
                            type="color"
                            defaultValue={(certConfig[firstLang]?.nameColor as string) ?? '#1a1a5e'}
                            onChange={e => void updateCertField(story, 'nameColor', e.target.value)}
                            className="w-full h-8 rounded-lg cursor-pointer border border-gray-200"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
