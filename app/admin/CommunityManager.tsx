'use client'
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import supabase from '@/lib/supabaseClient'
import {
  Images, Menu, ChevronDown, AlertCircle, RefreshCw, Check, X, Clock, CheckCircle2,
} from 'lucide-react'
import { ACCENT } from './missionMeta'
import { SkeletonHeaderBanner, SkeletonStatCards, SkeletonCardGrid } from './Skeleton'
import { useConfirmDialog } from './ConfirmDialog'

interface CommunityManagerProps {
  onNavigate: (table: string) => void
  onOpenSidebar?: () => void
}

type ModerationStatus = 'pending' | 'approved' | 'rejected'
type FilterTab = ModerationStatus | 'all'

interface CreationRow {
  id: string
  child_name: string
  age: number | null
  description: string | null
  image_url: string
  type: string
  status: ModerationStatus
  created_at: string
  parents: { name: string | null; email: string } | null
}

const accent = ACCENT.rose

const TYPE_META: Record<string, { emoji: string; label: string }> = {
  art: { emoji: '🎨', label: 'Artwork' },
  coloring: { emoji: '🖍️', label: 'Coloring' },
  story: { emoji: '📖', label: 'Story' },
}

const TABS: { id: FilterTab; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
]

const STATUS_BADGE: Record<ModerationStatus, string> = {
  pending: 'bg-amber-400 text-amber-900',
  approved: 'bg-emerald-500 text-white',
  rejected: 'bg-red-500 text-white',
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function StatCard({ icon: Icon, label, value, tint }: { icon: React.ElementType; label: string; value: string | number; tint?: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${tint ?? accent.tile}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-extrabold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
    </div>
  )
}

export default function CommunityManager({ onNavigate, onOpenSidebar }: CommunityManagerProps) {
  const [creations, setCreations] = useState<CreationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [tab, setTab] = useState<FilterTab>('pending')
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const { confirm, dialog } = useConfirmDialog()

  const fetchData = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const { data, error } = await supabase
        .from('creations')
        .select('id, child_name, age, description, image_url, type, status, created_at, parents(name, email)')
        .order('created_at', { ascending: false })
      if (error) throw error
      setCreations((data ?? []) as unknown as CreationRow[])
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load creations.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const counts = useMemo(() => ({
    pending: creations.filter(c => c.status === 'pending').length,
    approved: creations.filter(c => c.status === 'approved').length,
    rejected: creations.filter(c => c.status === 'rejected').length,
    all: creations.length,
  }), [creations])

  const filtered = useMemo(
    () => tab === 'all' ? creations : creations.filter(c => c.status === tab),
    [creations, tab]
  )

  const setStatus = async (row: CreationRow, status: ModerationStatus) => {
    setActionError(null)
    setPendingAction(row.id)
    try {
      const { error } = await supabase.from('creations').update({ status }).eq('id', row.id)
      if (error) throw error
      setCreations(prev => prev.map(c => c.id === row.id ? { ...c, status } : c))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update this creation.')
    } finally {
      setPendingAction(null)
    }
  }

  const handleReject = async (row: CreationRow) => {
    const ok = await confirm({
      title: 'Reject this creation?',
      message: `${row.child_name}'s creation will be hidden from the Community Gallery.`,
      confirmLabel: 'Reject',
    })
    if (!ok) return
    setStatus(row, 'rejected')
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <SkeletonHeaderBanner />
        <div className="p-6 lg:p-8 space-y-6 overflow-y-auto">
          <SkeletonStatCards count={4} />
          <SkeletonCardGrid count={8} />
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 flex flex-col items-center text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-400 flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-gray-700">Couldn&apos;t load creations</p>
          <p className="text-xs text-gray-400 mt-1">{loadError}</p>
          <button onClick={fetchData} className={`mt-4 inline-flex items-center gap-2 text-white text-xs font-bold px-4 py-2 rounded-full transition ${accent.button}`}>
            <RefreshCw className="w-3.5 h-3.5" /> Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Header */}
      <header className={`border-b border-gray-100 px-4 sm:px-6 py-5 flex-shrink-0 ${accent.soft}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3.5 min-w-0">
            <button
              onClick={onOpenSidebar}
              className="lg:hidden flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-100 hover:bg-gray-50 text-gray-600 shadow-sm transition mt-0.5"
            >
              <Menu size={17} />
            </button>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm bg-white ${accent.text}`}>
              <Images className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                Community <span className="text-lg">🖼️</span>
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">
                Review uploads before they appear in the Community Gallery
              </p>
              <p className="text-xs text-gray-400 mt-1.5">
                <button onClick={() => onNavigate('Dashboard')} className={`font-bold hover:underline ${accent.text}`}>Dashboard</button>
                <span className="mx-1.5 text-gray-300">/</span>
                <span className="font-bold text-gray-500">Community</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-100 pl-1.5 pr-3 py-1.5 rounded-full shadow-sm">
            <img src="/nimi-logo-circle.png" alt="Profile" className="w-7 h-7 rounded-full object-cover flex-shrink-0 ring-2 ring-white" />
            <ChevronDown size={14} className="text-gray-400" />
          </div>
        </div>
      </header>

      {actionError && (
        <div className="mx-4 sm:mx-6 mt-3 flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-xl px-3.5 py-2.5 flex-shrink-0">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600 flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="p-4 sm:p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={Clock} label="Pending Review" value={counts.pending} tint="bg-amber-100 text-amber-600" />
          <StatCard icon={CheckCircle2} label="Approved" value={counts.approved} tint="bg-emerald-100 text-emerald-600" />
          <StatCard icon={X} label="Rejected" value={counts.rejected} tint="bg-red-100 text-red-600" />
          <StatCard icon={Images} label="Total Uploads" value={counts.all} />
        </div>

        {/* Tabs */}
        <div className="inline-flex flex-wrap gap-2">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition ${
                tab === t.id ? `${accent.button} text-white shadow` : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {t.label}{t.id !== 'all' && ` (${counts[t.id]})`}
            </button>
          ))}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 flex flex-col items-center text-center">
            <Images className="w-10 h-10 text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">Nothing here yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(c => {
              const type = TYPE_META[c.type] ?? TYPE_META.art
              const busy = pendingAction === c.id
              return (
                <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="relative aspect-square bg-gray-50">
                    <img src={c.image_url} alt={c.child_name} className="w-full h-full object-cover" loading="lazy" />
                    <span className={`absolute top-2 left-2 text-[10px] font-black uppercase tracking-wide rounded-full px-2.5 py-1 shadow ${STATUS_BADGE[c.status]}`}>
                      {c.status}
                    </span>
                    <span className="absolute top-2 right-2 text-lg bg-white/90 rounded-full w-7 h-7 flex items-center justify-center shadow" title={type.label}>
                      {type.emoji}
                    </span>
                  </div>
                  <div className="p-3 flex-1 flex flex-col gap-1">
                    <p className="font-bold text-gray-800 text-sm truncate">
                      {c.child_name}{c.age ? `, ${c.age}` : ''}
                    </p>
                    {c.description && <p className="text-xs text-gray-500 line-clamp-2">{c.description}</p>}
                    <p className="text-[11px] text-gray-400 truncate mt-1">
                      {c.parents?.name || c.parents?.email || 'Unknown parent'}
                    </p>
                    <p className="text-[11px] text-gray-400">{formatDateTime(c.created_at)}</p>

                    <div className="mt-auto pt-2 flex gap-2">
                      {c.status === 'pending' && (
                        <>
                          <button
                            onClick={() => setStatus(c, 'approved')}
                            disabled={busy}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white px-3 py-1.5 rounded-full transition bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleReject(c)}
                            disabled={busy}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white px-3 py-1.5 rounded-full transition bg-red-500 hover:bg-red-600 disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                        </>
                      )}
                      {c.status === 'approved' && (
                        <button
                          onClick={() => handleReject(c)}
                          disabled={busy}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" /> Take Down
                        </button>
                      )}
                      {c.status === 'rejected' && (
                        <button
                          onClick={() => setStatus(c, 'approved')}
                          disabled={busy}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      {dialog}
    </div>
  )
}
