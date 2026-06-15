'use client'
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import supabase from '@/lib/supabaseClient'
import {
  Search, ChevronDown, Menu, Baby, Star, Trophy, Award, Medal, Settings, ArrowUpRight, AlertCircle, RefreshCw,
} from 'lucide-react'
import { ACCENT, LANGUAGES, LANGUAGE_META, CATEGORY_META, FALLBACK_META, type Lang, type AccentKey } from './missionMeta'
import { SkeletonHeaderBanner, SkeletonSplitPane } from './Skeleton'

interface ChildrenManagerProps {
  initialChildId?: string
  onNavigate: (table: string) => void
  onOpenSidebar?: () => void
}

interface ChildRow {
  id: string
  name: string
  avatar_url: string | null
  language: string | null
  age: number | null
  favorite_category: string | null
  created_at: string | null
  parent_id: string
  parents: { name: string | null; email: string } | null
}

interface ProgressItem {
  id: string
  completed_at: string | null
  language: string
  stars_earned: number
  categorySlug: string | null
  title: string | null
}

interface AchievementItem {
  id: string
  language: string
  type: string
  slug: string
  earned_at: string | null
}

interface BadgeItem {
  id: string
  badge_slug: string
  earned_at: string | null
}

interface ChildTotals {
  stars: number
  missions: number
  achievements: number
  badges: number
}

const accent = ACCENT.pink

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function initials(name: string) {
  return name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()
}

function ChildAvatar({ avatarUrl, name, size }: { avatarUrl: string | null; name: string; size: 'sm' | 'lg' }) {
  const dims = size === 'lg' ? 'w-16 h-16 rounded-2xl' : 'w-11 h-11 rounded-full'
  if (avatarUrl && avatarUrl.startsWith('http')) {
    return <img src={avatarUrl} alt={name} className={`${dims} object-cover flex-shrink-0 ring-2 ring-white shadow-sm`} />
  }
  if (avatarUrl) {
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

function StatCard({ icon: Icon, label, value, accentKey }: { icon: React.ElementType; label: string; value: number; accentKey: AccentKey }) {
  const a = ACCENT[accentKey]
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${a.tile}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-extrabold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
    </div>
  )
}

export default function ChildrenManager({ initialChildId, onNavigate, onOpenSidebar }: ChildrenManagerProps) {
  const [children, setChildren] = useState<ChildRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const appliedInitialIdRef = useRef<string | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [langFilter, setLangFilter] = useState<Lang | 'all'>('all')
  const [admin, setAdmin] = useState<{ name: string; role: string } | null>(null)
  const [totals, setTotals] = useState<Record<string, ChildTotals>>({})

  const [detailLoading, setDetailLoading] = useState(false)
  const [progress, setProgress] = useState<ProgressItem[]>([])
  const [achievements, setAchievements] = useState<AchievementItem[]>([])
  const [badges, setBadges] = useState<BadgeItem[]>([])
  const [settings, setSettings] = useState<{ daily_limit_minutes: number | null; notifications_enabled: boolean | null } | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('admins').select('name, role').eq('id', user.id).maybeSingle()
        if (data) setAdmin({ name: data.name ?? 'Admin', role: data.role ?? 'admin' })
      }
    }
    init()
  }, [])

  const fetchChildren = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [
        { data: childrenData, error: childrenErr },
        { data: progressData, error: progressErr },
        { data: achievementsData, error: achievementsErr },
        { data: badgesData, error: badgesErr },
      ] = await Promise.all([
        supabase.from('children').select('id, name, avatar_url, language, age, favorite_category, created_at, parent_id, parents(name, email)').order('created_at', { ascending: false }),
        supabase.from('child_progress').select('child_id, stars_earned'),
        supabase.from('child_achievements').select('child_id'),
        supabase.from('child_badges').select('child_id'),
      ])
      if (childrenErr) throw childrenErr
      if (progressErr) throw progressErr
      if (achievementsErr) throw achievementsErr
      if (badgesErr) throw badgesErr

      const rows = (childrenData ?? []) as unknown as ChildRow[]
      setChildren(rows)
      setSelectedId(prev => (prev && rows.some(c => c.id === prev)) ? prev : (rows[0]?.id ?? null))

      const t: Record<string, ChildTotals> = {}
      for (const c of rows) t[c.id] = { stars: 0, missions: 0, achievements: 0, badges: 0 }
      for (const p of progressData ?? []) {
        if (t[p.child_id]) { t[p.child_id].stars += p.stars_earned ?? 0; t[p.child_id].missions += 1 }
      }
      for (const a of achievementsData ?? []) {
        if (t[a.child_id]) t[a.child_id].achievements += 1
      }
      for (const b of badgesData ?? []) {
        if (t[b.child_id]) t[b.child_id].badges += 1
      }
      setTotals(t)
    } catch (err) {
      console.error(err)
      setLoadError(err instanceof Error ? err.message : 'Failed to load learners.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchChildren() }, [fetchChildren])

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

  useEffect(() => {
    if (!selectedId) { setProgress([]); setAchievements([]); setBadges([]); setSettings(null); return }
    const fetchDetail = async () => {
      setDetailLoading(true)
      const [{ data: progressData }, { data: achievementsData }, { data: badgesData }, { data: settingsData }] = await Promise.all([
        supabase.from('child_progress')
          .select('id, completed_at, language, stars_earned, missions(category_slug, mission_versions(title, language))')
          .eq('child_id', selectedId).order('completed_at', { ascending: false }).limit(10),
        supabase.from('child_achievements').select('id, language, type, slug, earned_at').eq('child_id', selectedId).order('earned_at', { ascending: false }),
        supabase.from('child_badges').select('id, badge_slug, earned_at').eq('child_id', selectedId).order('earned_at', { ascending: false }),
        supabase.from('parental_settings').select('daily_limit_minutes, notifications_enabled').eq('child_id', selectedId).maybeSingle(),
      ])

      setProgress((progressData ?? []).map((p: any) => {
        const versions = p.missions?.mission_versions ?? []
        const title = versions.find((v: any) => v.language === p.language)?.title
          ?? versions.find((v: any) => v.language === 'en')?.title
          ?? null
        return {
          id: p.id, completed_at: p.completed_at, language: p.language, stars_earned: p.stars_earned ?? 0,
          categorySlug: p.missions?.category_slug ?? null, title,
        }
      }))
      setAchievements(achievementsData ?? [])
      setBadges(badgesData ?? [])
      setSettings(settingsData ?? null)
      setDetailLoading(false)
    }
    fetchDetail()
  }, [selectedId])

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
  const selectedTotals = selected ? totals[selected.id] : undefined
  const favMeta = selected?.favorite_category ? (CATEGORY_META[selected.favorite_category] ?? FALLBACK_META) : null

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
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-400 flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-gray-700">Couldn&apos;t load learners</p>
        <p className="text-xs text-gray-400 mt-1 max-w-sm">{loadError}</p>
        <button
          onClick={fetchChildren}
          className={`mt-4 inline-flex items-center gap-2 text-white text-xs font-bold px-4 py-2 rounded-full transition ${accent.button}`}
        >
          <RefreshCw className="w-3.5 h-3.5" /> Try again
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className={`border-b border-gray-100 px-4 sm:px-6 py-5 flex-shrink-0 z-30 ${accent.soft}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3.5 min-w-0">
            <button
              onClick={onOpenSidebar}
              className="lg:hidden flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-100 hover:bg-gray-50 text-gray-600 shadow-sm transition mt-0.5"
            >
              <Menu size={17} />
            </button>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm bg-white ${accent.text}`}>
              <Baby className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                Learners <span className="text-lg">👶</span>
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">
                Browse learner profiles, progress &amp; achievements
              </p>
              <p className="text-xs text-gray-400 mt-1.5">
                <button onClick={() => onNavigate('Dashboard')} className={`font-bold hover:underline ${accent.text}`}>Dashboard</button>
                <span className="mx-1.5 text-gray-300">/</span>
                <span className="font-bold text-gray-500">Children</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 bg-white border border-gray-100 px-3.5 py-2 rounded-full text-sm font-bold shadow-sm ${accent.text}`}>
              <Baby className="w-3.5 h-3.5" /> {children.length}
            </span>
            <div className="flex items-center gap-2 bg-white border border-gray-100 pl-1.5 pr-3 py-1.5 rounded-full shadow-sm">
              <img src="/nimi-logo-circle.png" alt="Profile" className="w-7 h-7 rounded-full object-cover flex-shrink-0 ring-2 ring-white" />
              <div className="hidden sm:block leading-tight">
                <p className="text-sm font-semibold text-gray-700">{admin?.name ?? 'Admin'}</p>
                <p className="text-[10px] text-gray-400 uppercase font-bold">{admin?.role ?? 'admin'}</p>
              </div>
              <ChevronDown size={14} className="text-gray-400" />
            </div>
          </div>
        </div>
      </header>

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
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${langFilter === l ? `${accent.button} text-white` : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
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
              const ct = totals[c.id]
              const flag = c.language && LANGUAGE_META[c.language as Lang] ? LANGUAGE_META[c.language as Lang].flag : '🌐'
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`relative rounded-2xl border p-3 cursor-pointer transition flex items-center gap-3 ${
                    isSelected ? `${accent.soft} ${accent.border} shadow-sm` : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                  }`}
                >
                  <ChildAvatar avatarUrl={c.avatar_url} name={c.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 truncate">{c.name}{c.age ? `, ${c.age}` : ''}</p>
                    <p className="text-xs text-gray-500 truncate">{c.parents?.name ?? 'Unknown parent'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      ⭐ {ct?.stars ?? 0} · {ct?.missions ?? 0} mission{(ct?.missions ?? 0) === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span className="text-lg flex-shrink-0">{flag}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Profile panel */}
        <div className="flex-1 lg:overflow-y-auto lg:min-h-0 bg-gradient-to-b from-gray-50 to-white">
          {!selected ? (
            <div className="h-full flex items-center justify-center text-center p-8">
              <div>
                <Baby className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-400">Select a learner to view their profile.</p>
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-6 space-y-6">
              {/* Profile header */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-start gap-4 flex-wrap justify-between">
                  <div className="flex items-start gap-4 min-w-0">
                    <ChildAvatar avatarUrl={selected.avatar_url} name={selected.name} size="lg" />
                    <div className="min-w-0">
                      <h2 className="text-xl font-extrabold text-gray-800">
                        {selected.name}{selected.age ? `, ${selected.age}` : ''}
                      </h2>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {selected.language && LANGUAGE_META[selected.language as Lang] && (
                          <span className="inline-flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1 text-xs font-bold text-gray-600">
                            {LANGUAGE_META[selected.language as Lang].flag} {LANGUAGE_META[selected.language as Lang].label}
                          </span>
                        )}
                        {favMeta && (
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${ACCENT[favMeta.accent].tile}`}>
                            <favMeta.icon className="w-3.5 h-3.5" /> {favMeta.label}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Joined {formatDate(selected.created_at)}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl px-4 py-3 min-w-0">
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Parent</p>
                    <p className="text-sm font-semibold text-gray-700 truncate">{selected.parents?.name ?? 'Unknown'}</p>
                    <p className="text-xs text-gray-400 truncate">{selected.parents?.email}</p>
                    <button
                      onClick={() => onNavigate(`parents:${selected.parent_id}`)}
                      className={`inline-flex items-center gap-1 mt-2 text-xs font-bold hover:underline ${accent.text}`}
                    >
                      View Parent <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard icon={Star} label="Total Stars" value={selectedTotals?.stars ?? 0} accentKey="amber" />
                <StatCard icon={Trophy} label="Missions Completed" value={selectedTotals?.missions ?? 0} accentKey="emerald" />
                <StatCard icon={Award} label="Achievements" value={selectedTotals?.achievements ?? 0} accentKey="violet" />
                <StatCard icon={Medal} label="Badges" value={selectedTotals?.badges ?? 0} accentKey="blue" />
              </div>

              {/* Recent activity */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-base font-bold text-gray-800 mb-4">Recent Activity</h3>
                {detailLoading ? (
                  <p className="text-sm text-gray-400">Loading...</p>
                ) : progress.length === 0 ? (
                  <p className="text-sm text-gray-400">No missions completed yet.</p>
                ) : (
                  <div className="space-y-3">
                    {progress.map(p => {
                      const meta = (p.categorySlug && CATEGORY_META[p.categorySlug]) || FALLBACK_META
                      const a = ACCENT[meta.accent]
                      return (
                        <div key={p.id} className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${a.tile}`}>
                            <meta.icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-700 truncate">{p.title ?? meta.label}</p>
                            <p className="text-xs text-gray-400">{(p.language ?? '').toUpperCase()} · {p.stars_earned}★ · {formatDate(p.completed_at)}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Achievements & Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Award className="w-4 h-4 text-violet-500" /> Achievements
                  </h3>
                  {detailLoading ? (
                    <p className="text-sm text-gray-400">Loading...</p>
                  ) : achievements.length === 0 ? (
                    <p className="text-sm text-gray-400">No achievements yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {achievements.map(a => (
                        <span key={a.id} className="inline-flex items-center gap-1.5 bg-violet-50 text-violet-700 border border-violet-100 rounded-full px-3 py-1.5 text-xs font-bold">
                          {a.slug} <span className="text-violet-400 font-normal">· {(a.language ?? '').toUpperCase()} · {formatDate(a.earned_at)}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Medal className="w-4 h-4 text-blue-500" /> Badges
                  </h3>
                  {detailLoading ? (
                    <p className="text-sm text-gray-400">Loading...</p>
                  ) : badges.length === 0 ? (
                    <p className="text-sm text-gray-400">No badges yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {badges.map(b => (
                        <span key={b.id} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-3 py-1.5 text-xs font-bold">
                          {b.badge_slug} <span className="text-blue-400 font-normal">· {formatDate(b.earned_at)}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Parental settings */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-gray-400" /> Parental Settings
                </h3>
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Daily Limit</p>
                    <p className="text-sm font-semibold text-gray-700">
                      {settings?.daily_limit_minutes ? `${settings.daily_limit_minutes} minutes` : 'No limit set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Notifications</p>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${settings?.notifications_enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                      {settings?.notifications_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
