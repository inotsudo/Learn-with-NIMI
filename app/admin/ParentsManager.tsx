'use client'
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import supabase from '@/lib/supabaseClient'
import {
  Search, ChevronDown, Menu, Users, ArrowUpRight, Settings, AlertCircle, RefreshCw,
} from 'lucide-react'
import { ACCENT, LANGUAGE_META, CATEGORY_META, FALLBACK_META, type Lang } from './missionMeta'
import { SkeletonHeaderBanner, SkeletonSplitPane } from './Skeleton'

interface ParentsManagerProps {
  initialParentId?: string
  onNavigate: (table: string) => void
  onOpenSidebar?: () => void
}

interface ParentRow {
  id: string
  email: string
  name: string | null
  created_at: string | null
}

interface ChildRow {
  id: string
  parent_id: string
  name: string
  avatar_url: string | null
  language: string | null
  age: number | null
  favorite_category: string | null
}

interface SettingsRow {
  child_id: string
  daily_limit_minutes: number | null
  notifications_enabled: boolean | null
}

const accent = ACCENT.emerald

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function initials(name: string) {
  return name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()
}

function ParentAvatar({ name, size }: { name: string; size: 'sm' | 'lg' }) {
  const dims = size === 'lg' ? 'w-16 h-16 rounded-2xl text-lg' : 'w-11 h-11 rounded-full text-sm'
  return (
    <div className={`${dims} flex items-center justify-center flex-shrink-0 font-bold ${accent.tile}`}>
      {initials(name)}
    </div>
  )
}

function Avatar({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  if (avatarUrl && avatarUrl.startsWith('http')) {
    return <img src={avatarUrl} alt={name} className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-white shadow-sm" />
  }
  if (avatarUrl) {
    return (
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-base ${accent.tile}`}>
        <span className="leading-none">{avatarUrl}</span>
      </div>
    )
  }
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs ${accent.tile}`}>
      {initials(name)}
    </div>
  )
}

export default function ParentsManager({ initialParentId, onNavigate, onOpenSidebar }: ParentsManagerProps) {
  const [parents, setParents] = useState<ParentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const appliedInitialIdRef = useRef<string | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [admin, setAdmin] = useState<{ name: string; role: string } | null>(null)
  const [childrenByParent, setChildrenByParent] = useState<Record<string, ChildRow[]>>({})
  const [settingsByChild, setSettingsByChild] = useState<Record<string, SettingsRow>>({})

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

  const fetchParents = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [
        { data: parentsData, error: parentsErr },
        { data: childrenData, error: childrenErr },
        { data: settingsData, error: settingsErr },
      ] = await Promise.all([
        supabase.from('parents').select('id, email, name, created_at').order('created_at', { ascending: false }),
        supabase.from('children').select('id, parent_id, name, avatar_url, language, age, favorite_category'),
        supabase.from('parental_settings').select('child_id, daily_limit_minutes, notifications_enabled'),
      ])
      if (parentsErr) throw parentsErr
      if (childrenErr) throw childrenErr
      if (settingsErr) throw settingsErr

      const rows = (parentsData ?? []) as unknown as ParentRow[]
      setParents(rows)
      setSelectedId(prev => (prev && rows.some(p => p.id === prev)) ? prev : (rows[0]?.id ?? null))

      const byParent: Record<string, ChildRow[]> = {}
      for (const c of (childrenData ?? []) as unknown as ChildRow[]) {
        if (!byParent[c.parent_id]) byParent[c.parent_id] = []
        byParent[c.parent_id].push(c)
      }
      setChildrenByParent(byParent)

      const byChild: Record<string, SettingsRow> = {}
      for (const s of (settingsData ?? []) as unknown as SettingsRow[]) {
        byChild[s.child_id] = s
      }
      setSettingsByChild(byChild)
    } catch (err) {
      console.error(err)
      setLoadError(err instanceof Error ? err.message : 'Failed to load parents.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchParents() }, [fetchParents])

  // Deep-link from search/dashboard: jump straight to a specific parent once loaded
  useEffect(() => {
    if (
      initialParentId &&
      initialParentId !== appliedInitialIdRef.current &&
      parents.some(p => p.id === initialParentId)
    ) {
      setSelectedId(initialParentId)
      appliedInitialIdRef.current = initialParentId
    }
  }, [initialParentId, parents])

  const filtered = useMemo(() => {
    let rows = parents
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(p => (p.name ?? '').toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
    }
    return rows
  }, [parents, search])

  const selected = parents.find(p => p.id === selectedId) ?? null
  const selectedChildren = selected ? (childrenByParent[selected.id] ?? []) : []

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
        <p className="text-sm font-bold text-gray-700">Couldn&apos;t load parents</p>
        <p className="text-xs text-gray-400 mt-1 max-w-sm">{loadError}</p>
        <button
          onClick={fetchParents}
          className="mt-4 inline-flex items-center gap-2 text-white text-xs font-bold px-4 py-2 rounded-full transition bg-green-600 hover:bg-green-700"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Try again
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-ds-border px-4 sm:px-6 py-5 flex-shrink-0 z-30">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3.5 min-w-0">
            <button
              onClick={onOpenSidebar}
              className="lg:hidden flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-100 hover:bg-gray-50 text-gray-600 shadow-sm transition mt-0.5"
            >
              <Menu size={17} />
            </button>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm bg-green-50 text-green-600">
              <Users className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                Parents <span className="text-lg">👨‍👩‍👧</span>
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">
                Browse parent accounts, their children &amp; settings
              </p>
              <p className="text-xs text-gray-400 mt-1.5">
                <button onClick={() => onNavigate('Dashboard')} className="font-bold hover:underline text-green-600">Dashboard</button>
                <span className="mx-1.5 text-gray-300">/</span>
                <span className="font-bold text-gray-500">Parents</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-white border border-ds-border px-3.5 py-2 rounded-full text-sm font-bold shadow-sm text-green-600">
              <Users className="w-3.5 h-3.5" /> {parents.length}
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
          <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center bg-gray-50 border border-gray-100 rounded-full px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-gray-200 transition">
              <Search size={15} className="text-gray-400 mr-2 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="px-3 py-3 space-y-2 lg:flex-1 lg:overflow-y-auto lg:min-h-0">
            {filtered.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-10">No parents found.</p>
            ) : filtered.map(p => {
              const isSelected = p.id === selectedId
              const childCount = (childrenByParent[p.id] ?? []).length
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`relative rounded-2xl border p-3 cursor-pointer transition flex items-center gap-3 ${
                    isSelected ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                  }`}
                >
                  <ParentAvatar name={p.name ?? 'Parent'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 truncate">{p.name ?? 'Parent'}</p>
                    <p className="text-xs text-gray-500 truncate">{p.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {childCount} {childCount === 1 ? 'child' : 'children'} · Joined {formatDate(p.created_at)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Profile panel */}
        <div className="flex-1 lg:overflow-y-auto lg:min-h-0 bg-gray-50">
          {!selected ? (
            <div className="h-full flex items-center justify-center text-center p-8">
              <div>
                <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-400">Select a parent to view their profile.</p>
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-6 space-y-6">
              {/* Profile header */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-start gap-4 min-w-0">
                  <ParentAvatar name={selected.name ?? 'Parent'} size="lg" />
                  <div className="min-w-0">
                    <h2 className="text-xl font-extrabold text-gray-800">{selected.name ?? 'Parent'}</h2>
                    <p className="text-sm text-gray-500 mt-1">{selected.email}</p>
                    <p className="text-xs text-gray-400 mt-2">Joined {formatDate(selected.created_at)}</p>
                  </div>
                </div>
              </div>

              {/* Children */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-base font-bold text-gray-800 mb-4">Children</h3>
                {selectedChildren.length === 0 ? (
                  <p className="text-sm text-gray-400">No children added yet.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedChildren.map(c => {
                      const favMeta = c.favorite_category ? (CATEGORY_META[c.favorite_category] ?? FALLBACK_META) : null
                      const flag = c.language && LANGUAGE_META[c.language as Lang] ? LANGUAGE_META[c.language as Lang].flag : '🌐'
                      return (
                        <div key={c.id} className="flex items-center gap-3">
                          <Avatar avatarUrl={c.avatar_url} name={c.name} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate">{c.name}{c.age ? `, ${c.age}` : ''}</p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="inline-flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5 text-xs font-bold text-gray-600">
                                {flag} {c.language?.toUpperCase() ?? '—'}
                              </span>
                              {favMeta && (
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${ACCENT[favMeta.accent].tile}`}>
                                  <favMeta.icon className="w-3 h-3" /> {favMeta.label}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => onNavigate(`children:${c.id}`)}
                            className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-100 transition whitespace-nowrap"
                          >
                            View Profile <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Parental Settings */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-gray-400" /> Parental Settings
                </h3>
                {selectedChildren.length === 0 ? (
                  <p className="text-sm text-gray-400">No children added yet.</p>
                ) : (
                  <div className="space-y-4 divide-y divide-gray-50">
                    {selectedChildren.map(c => {
                      const s = settingsByChild[c.id]
                      return (
                        <div key={c.id} className="flex flex-wrap items-center gap-6 pt-4 first:pt-0">
                          <p className="text-sm font-bold text-gray-700 min-w-[120px]">{c.name}</p>
                          <div>
                            <p className="text-xs text-gray-400 font-bold uppercase mb-1">Daily Limit</p>
                            <p className="text-sm font-semibold text-gray-700">
                              {s?.daily_limit_minutes ? `${s.daily_limit_minutes} minutes` : 'No limit set'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 font-bold uppercase mb-1">Notifications</p>
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${s?.notifications_enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                              {s?.notifications_enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
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
    </div>
  )
}
