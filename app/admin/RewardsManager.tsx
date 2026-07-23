'use client'
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import supabase from '@/lib/supabaseClient'
import {
  Search, Menu, Trophy, Award, X, RefreshCw, AlertCircle,
} from 'lucide-react'
import { ACCENT, LANGUAGES, LANGUAGE_META, type Lang, type AccentKey } from './missionMeta'
import { SkeletonHeaderBanner, SkeletonSplitPane } from './Skeleton'
import { useConfirmDialog } from './ConfirmDialog'
import { useToast } from './Toast'

interface RewardsManagerProps {
  initialChildId?: string
  onNavigate?: (table: string) => void
  onOpenSidebar?: () => void
}

interface ChildRow {
  id: string
  name: string
  avatar_url: string | null
  language: string | null
  age: number | null
  parent_id: string
  parents: { name: string | null } | null
}

interface BadgeRow {
  id: string
  child_id: string
  badge_slug: string
  earned_at: string | null
}

interface BadgeDefinition {
  slug: string
  label: string
  emoji: string
  description: string
  accent: AccentKey
}

const accent = ACCENT.violet

const BADGE_CATALOG: BadgeDefinition[] = [
  { slug: 'star-of-the-week', label: 'Star of the Week', emoji: '⭐', description: 'Outstanding effort and engagement this week', accent: 'amber' },
  { slug: 'most-improved', label: 'Most Improved', emoji: '📈', description: 'Made great progress recently', accent: 'emerald' },
  { slug: 'helper-award', label: 'Helper Award', emoji: '🤝', description: 'Kind and helpful to others', accent: 'sky' },
  { slug: 'super-effort', label: 'Super Effort', emoji: '💪', description: 'Tried hard on every activity', accent: 'orange' },
  { slug: 'creative-spark', label: 'Creative Spark', emoji: '✨', description: 'Showed amazing creativity', accent: 'pink' },
  { slug: 'perfect-week', label: 'Perfect Week', emoji: '🏆', description: 'Completed an activity every day this week', accent: 'violet' },
]

function badgeMeta(slug: string): BadgeDefinition {
  return BADGE_CATALOG.find(b => b.slug === slug) ?? { slug, label: slug, emoji: '🎖️', description: '', accent: 'indigo' }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function initials(name: string) {
  return name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()
}

function Avatar({ avatarUrl, name, size }: { avatarUrl: string | null; name: string; size: 'sm' | 'lg' }) {
  const dims = size === 'lg' ? 'w-16 h-16 rounded-2xl' : 'w-11 h-11 rounded-full'
  if (avatarUrl && avatarUrl.startsWith('http')) {
    return <img src={avatarUrl} alt={name} className={`${dims} object-cover flex-shrink-0 ring-2 ring-white shadow-sm`}  loading="lazy" />
  }
  // Short strings are emoji; long strings are JSON avatar-customization data — show initials instead
  if (avatarUrl && avatarUrl.length <= 4) {
    return (
      <div className={`${dims} flex items-center justify-center flex-shrink-0 ${accent.tile} ${size === 'lg' ? 'text-3xl' : 'text-xl'}`}>
        <span className="leading-none">{avatarUrl}</span>
      </div>
    )
  }
  return (
    <div className={`${dims} flex items-center justify-center flex-shrink-0 font-bold ${accent.tile} ${size === 'lg' ? 'text-lg' : 'text-sm'}`}>
      {initials(name)}
    </div>
  )
}

export default function RewardsManager({ initialChildId, onNavigate: _onNavigate, onOpenSidebar }: RewardsManagerProps) {
  const [children, setChildren] = useState<ChildRow[]>([])
  const [badges, setBadges] = useState<BadgeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const appliedInitialIdRef = useRef<string | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [langFilter, setLangFilter] = useState<Lang | 'all'>('all')
  const [pending, setPending] = useState<string | null>(null)
  const { confirm, dialog } = useConfirmDialog()
  const { error: toastErr } = useToast()

  const fetchData = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [{ data: childrenData, error: childrenErr }, { data: badgesData, error: badgesErr }] = await Promise.all([
        supabase.from('children').select('id, name, avatar_url, language, age, parent_id, parents(name)').order('created_at', { ascending: false }),
        supabase.from('child_badges').select('id, child_id, badge_slug, earned_at'),
      ])
      if (childrenErr) throw childrenErr
      if (badgesErr) throw badgesErr
      const rows = (childrenData ?? []) as unknown as ChildRow[]
      setChildren(rows)
      setSelectedId(prev => (prev && rows.some(c => c.id === prev)) ? prev : (rows[0]?.id ?? null))
      setBadges((badgesData ?? []) as BadgeRow[])
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Deep-link from search/dashboard: jump straight to a specific learner once loaded
  useEffect(() => {
    if (
      initialChildId &&
      initialChildId !== appliedInitialIdRef.current &&
      children.some(c => c.id === initialChildId)
    ) {
      setSelectedId(initialChildId)
      appliedInitialIdRef.current = initialChildId
    }
  }, [initialChildId, children])

  const filtered = useMemo(() => {
    let rows = children
    if (langFilter !== 'all') rows = rows.filter(c => c.language === langFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(c => c.name.toLowerCase().includes(q) || (c.parents?.name ?? '').toLowerCase().includes(q))
    }
    return rows
  }, [children, search, langFilter])

  const selected = children.find(c => c.id === selectedId) ?? null
  const selectedBadges = useMemo(() => badges.filter(b => b.child_id === selectedId), [badges, selectedId])
  const awardedSlugs = useMemo(() => new Set(selectedBadges.map(b => b.badge_slug)), [selectedBadges])
  const availableBadges = BADGE_CATALOG.filter(b => !awardedSlugs.has(b.slug))

  const award = async (slug: string) => {
    if (!selectedId) return
    setPending(slug)
    try {
      const { data, error } = await supabase
        .from('child_badges')
        .insert({ child_id: selectedId, badge_slug: slug })
        .select('id, child_id, badge_slug, earned_at')
        .single()
      if (error) throw error
      setBadges(prev => [...prev, data as BadgeRow])
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Could not award the badge.')
    } finally {
      setPending(null)
    }
  }

  const revoke = async (row: BadgeRow) => {
    const meta = badgeMeta(row.badge_slug)
    const ok = await confirm({
      title: `Revoke "${meta.label}"?`,
      message: `This will remove this badge from ${selected?.name}.`,
      confirmLabel: 'Revoke',
    })
    if (!ok) return
    setPending(row.badge_slug)
    try {
      const { error } = await supabase.from('child_badges').delete().eq('id', row.id)
      if (error) throw error
      setBadges(prev => prev.filter(b => b.id !== row.id))
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Could not revoke the badge.')
    } finally {
      setPending(null)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <SkeletonHeaderBanner />
        <SkeletonSplitPane rows={8} />
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
          <p className="text-sm font-bold text-gray-700">Couldn&apos;t load learners</p>
          <p className="text-xs text-gray-400 mt-1">{loadError}</p>
          <button onClick={fetchData} className="mt-4 inline-flex items-center gap-2 text-white text-xs font-bold px-4 py-2 rounded-full transition bg-green-600 hover:bg-green-700">
            <RefreshCw className="w-3.5 h-3.5" /> Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5 flex-shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={onOpenSidebar} className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-gray-500">
              <Menu size={17} />
            </button>
            <div>
              <h1 className="text-[22px] font-extrabold text-gray-900">Rewards &amp; Badges</h1>
              <p className="text-[13px] text-gray-500">{badges.length} badges awarded · select a learner to manage</p>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
        {/* List panel */}
        <div className="w-full lg:w-[400px] flex-shrink-0 border-b lg:border-b-0 lg:border-r border-gray-100 bg-white flex flex-col lg:overflow-hidden lg:min-h-0">
          <div className="px-4 py-3 border-b border-gray-100 flex flex-col gap-2 flex-shrink-0">
            <div className="flex items-center bg-gray-50 border border-gray-100 rounded-full px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-gray-200 transition">
              <Search size={15} className="text-gray-400 mr-2 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search by name or parent..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5">
              {(['all', ...LANGUAGES] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setLangFilter(l)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${langFilter === l ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                >
                  {l === 'all' ? 'All' : `${LANGUAGE_META[l].flag} ${l.toUpperCase()}`}
                </button>
              ))}
            </div>
          </div>

          <div className="px-3 py-3 space-y-2 lg:flex-1 lg:overflow-y-auto lg:min-h-0">
            {filtered.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-10">No learners found.</p>
            ) : filtered.map(c => {
              const isSelected = c.id === selectedId
              const badgeCount = badges.filter(b => b.child_id === c.id).length
              const flag = c.language && LANGUAGE_META[c.language as Lang] ? LANGUAGE_META[c.language as Lang].flag : '🌐'
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`relative rounded-2xl border p-3 cursor-pointer transition flex items-center gap-3 ${
                    isSelected ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                  }`}
                >
                  <Avatar avatarUrl={c.avatar_url} name={c.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 truncate">{c.name}{c.age ? `, ${c.age}` : ''}</p>
                    <p className="text-xs text-gray-500 truncate">{c.parents?.name ?? 'Unknown parent'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      🏆 {badgeCount} badge{badgeCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span className="text-lg flex-shrink-0">{flag}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Profile / badges panel */}
        <div className="flex-1 lg:overflow-y-auto lg:min-h-0 bg-gray-50">
          {!selected ? (
            <div className="h-full flex items-center justify-center text-center p-8">
              <div>
                <Trophy className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-400">Select a learner to manage their badges.</p>
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-6 space-y-6">
              {/* Profile header */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-4">
                  <Avatar avatarUrl={selected.avatar_url} name={selected.name} size="lg" />
                  <div className="min-w-0">
                    <h2 className="text-xl font-extrabold text-gray-800">
                      {selected.name}{selected.age ? `, ${selected.age}` : ''}
                    </h2>
                    {selected.language && LANGUAGE_META[selected.language as Lang] && (
                      <span className="inline-flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1 text-xs font-bold text-gray-600 mt-2">
                        {LANGUAGE_META[selected.language as Lang].flag} {LANGUAGE_META[selected.language as Lang].label}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Awarded Badges */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-green-600" /> Awarded Badges
                </h3>
                {selectedBadges.length === 0 ? (
                  <p className="text-sm text-gray-400">No badges awarded yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedBadges.map(b => {
                      const meta = badgeMeta(b.badge_slug)
                      const a = ACCENT[meta.accent]
                      return (
                        <span key={b.id} className={`inline-flex items-center gap-2 rounded-full pl-3 pr-2 py-1.5 text-xs font-bold ${a.tile}`}>
                          <span>{meta.emoji}</span> {meta.label}
                          <span className="font-normal opacity-70">· {formatDate(b.earned_at)}</span>
                          <button
                            onClick={() => revoke(b)}
                            disabled={pending === b.badge_slug}
                            title="Revoke"
                            className="ml-1 w-5 h-5 rounded-full bg-white/60 hover:bg-white flex items-center justify-center transition disabled:opacity-50"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Award a Badge */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Award className="w-4 h-4 text-green-600" /> Award a Badge
                </h3>
                {availableBadges.length === 0 ? (
                  <p className="text-sm text-gray-400">All badges awarded! 🎉</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {availableBadges.map(b => {
                      const a = ACCENT[b.accent]
                      return (
                        <div key={b.slug} className={`rounded-2xl border p-4 flex flex-col gap-2 ${a.soft} ${a.border}`}>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{b.emoji}</span>
                            <p className="font-bold text-gray-800">{b.label}</p>
                          </div>
                          <p className="text-xs text-gray-500 flex-1">{b.description}</p>
                          <button
                            onClick={() => award(b.slug)}
                            disabled={pending === b.slug}
                            className={`text-xs font-bold text-white px-3 py-1.5 rounded-full transition self-start whitespace-nowrap ${a.button} disabled:opacity-50`}
                          >
                            {pending === b.slug ? 'Awarding...' : 'Award'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {dialog}
    </div>
  )
}
