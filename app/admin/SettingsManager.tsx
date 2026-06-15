'use client'
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import supabase from '@/lib/supabaseClient'
import {
  Search, ChevronDown, Menu, Settings, Clock, Bell, Check, AlertCircle, RefreshCw,
} from 'lucide-react'
import { ACCENT, LANGUAGES, LANGUAGE_META, type Lang } from './missionMeta'
import { SkeletonHeaderBanner, SkeletonSplitPane } from './Skeleton'

interface SettingsManagerProps {
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
  parent_id: string
  parents: { name: string | null } | null
}

interface SettingsRow {
  id: string
  parent_id: string
  child_id: string
  daily_limit_minutes: number | null
  notifications_enabled: boolean | null
}

const accent = ACCENT.teal

const LIMIT_PRESETS = [30, 60, 90, 120, 150] as const

function initials(name: string) {
  return name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()
}

function Avatar({ avatarUrl, name, size }: { avatarUrl: string | null; name: string; size: 'sm' | 'lg' }) {
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

function ToggleSwitch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={`relative inline-flex items-center w-12 h-7 rounded-full transition flex-shrink-0 ${on ? accent.button.split(' ')[0] : 'bg-gray-200'}`}
    >
      <span className={`absolute left-0.5 top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

export default function SettingsManager({ initialChildId, onNavigate, onOpenSidebar }: SettingsManagerProps) {
  const [children, setChildren] = useState<ChildRow[]>([])
  const [settings, setSettings] = useState<SettingsRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const appliedInitialIdRef = useRef<string | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [langFilter, setLangFilter] = useState<Lang | 'all'>('all')
  const [admin, setAdmin] = useState<{ name: string; role: string } | null>(null)

  // Pending (unsaved) edits for the selected child
  const [pendingLimit, setPendingLimit] = useState<number | null>(60)
  const [pendingNotifs, setPendingNotifs] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)

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

  const fetchData = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [
        { data: childrenData, error: childrenErr },
        { data: settingsData, error: settingsErr },
      ] = await Promise.all([
        supabase.from('children').select('id, name, avatar_url, language, age, parent_id, parents(name)').order('created_at', { ascending: false }),
        supabase.from('parental_settings').select('id, parent_id, child_id, daily_limit_minutes, notifications_enabled'),
      ])
      if (childrenErr) throw childrenErr
      if (settingsErr) throw settingsErr

      const rows = (childrenData ?? []) as unknown as ChildRow[]
      setChildren(rows)
      setSelectedId(prev => (prev && rows.some(c => c.id === prev)) ? prev : (rows[0]?.id ?? null))
      setSettings((settingsData ?? []) as SettingsRow[])
    } catch (err) {
      console.error(err)
      setLoadError(err instanceof Error ? err.message : 'Failed to load settings.')
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

  const settingsByChild = useMemo(() => {
    const map = new Map<string, SettingsRow>()
    for (const s of settings) map.set(s.child_id, s)
    return map
  }, [settings])

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
  const selectedSettings = selectedId ? settingsByChild.get(selectedId) ?? null : null

  // Sync pending form state whenever the selected child (or their saved settings) changes
  useEffect(() => {
    setPendingLimit(selectedSettings ? selectedSettings.daily_limit_minutes : 60)
    setPendingNotifs(selectedSettings ? (selectedSettings.notifications_enabled ?? true) : true)
    setSaveError(null)
    setSavedFlash(false)
  }, [selectedId, selectedSettings])

  const isDirty = selected ? (
    pendingLimit !== (selectedSettings ? selectedSettings.daily_limit_minutes : 60) ||
    pendingNotifs !== (selectedSettings ? (selectedSettings.notifications_enabled ?? true) : true)
  ) : false

  const customCount = settings.length

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    setSaveError(null)
    try {
      const { data, error } = await supabase
        .from('parental_settings')
        .upsert(
          {
            parent_id: selected.parent_id,
            child_id: selected.id,
            daily_limit_minutes: pendingLimit,
            notifications_enabled: pendingNotifs,
          },
          { onConflict: 'parent_id,child_id' }
        )
        .select('id, parent_id, child_id, daily_limit_minutes, notifications_enabled')
        .single()
      if (error) throw error
      setSettings(prev => {
        const next = prev.filter(s => s.child_id !== selected.id)
        return [...next, data as SettingsRow]
      })
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2500)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save settings.')
    } finally {
      setSaving(false)
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
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-400 flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-gray-700">Couldn&apos;t load settings</p>
        <p className="text-xs text-gray-400 mt-1 max-w-sm">{loadError}</p>
        <button
          onClick={fetchData}
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
              <Settings className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                Parental Settings <span className="text-lg">⚙️</span>
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">
                Manage each learner&apos;s screen-time limit &amp; notifications
              </p>
              <p className="text-xs text-gray-400 mt-1.5">
                <button onClick={() => onNavigate('Dashboard')} className={`font-bold hover:underline ${accent.text}`}>Dashboard</button>
                <span className="mx-1.5 text-gray-300">/</span>
                <span className="font-bold text-gray-500">Settings</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 bg-white border border-gray-100 px-3.5 py-2 rounded-full text-sm font-bold shadow-sm ${accent.text}`}>
              <Settings className="w-3.5 h-3.5" /> {customCount} customized · {children.length} learners
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
              const hasCustom = settingsByChild.has(c.id)
              const flag = c.language && LANGUAGE_META[c.language as Lang] ? LANGUAGE_META[c.language as Lang].flag : '🌐'
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`relative rounded-2xl border p-3 cursor-pointer transition flex items-center gap-3 ${
                    isSelected ? `${accent.soft} ${accent.border} shadow-sm` : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                  }`}
                >
                  <Avatar avatarUrl={c.avatar_url} name={c.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 truncate">{c.name}{c.age ? `, ${c.age}` : ''}</p>
                    <p className="text-xs text-gray-500 truncate">{c.parents?.name ?? 'Unknown parent'}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${hasCustom ? accent.tile : 'bg-gray-100 text-gray-400'}`}>
                    {hasCustom ? 'Custom' : 'Default'}
                  </span>
                  <span className="text-lg flex-shrink-0">{flag}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Settings editor panel */}
        <div className="flex-1 lg:overflow-y-auto lg:min-h-0 bg-gradient-to-b from-gray-50 to-white">
          {!selected ? (
            <div className="h-full flex items-center justify-center text-center p-8">
              <div>
                <Settings className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-400">Select a learner to manage their settings.</p>
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

              {/* Screen Time & Notifications */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
                <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                  <Settings className={`w-4 h-4 ${accent.text}`} /> Screen Time &amp; Notifications
                </h3>

                {/* Daily limit */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" /> Daily screen-time limit
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {LIMIT_PRESETS.map(mins => (
                      <button
                        key={mins}
                        onClick={() => setPendingLimit(mins)}
                        className={`px-4 py-2 rounded-full text-sm font-bold border transition ${
                          pendingLimit === mins ? `${accent.soft} ${accent.border} ${accent.text}` : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
                        }`}
                      >
                        {mins} min
                      </button>
                    ))}
                    <button
                      onClick={() => setPendingLimit(null)}
                      className={`px-4 py-2 rounded-full text-sm font-bold border transition ${
                        pendingLimit === null ? `${accent.soft} ${accent.border} ${accent.text}` : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
                      }`}
                    >
                      No limit
                    </button>
                  </div>
                </div>

                {/* Notifications */}
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-gray-400" /> Notifications enabled
                  </p>
                  <ToggleSwitch on={pendingNotifs} onClick={() => setPendingNotifs(v => !v)} />
                </div>

                {/* Status + Save */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-50">
                  <p className="text-xs text-gray-400">
                    {selectedSettings ? 'Custom settings saved for this learner.' : 'Using default settings (60 min, notifications on).'}
                  </p>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {savedFlash && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                        <Check className="w-3.5 h-3.5" /> Saved
                      </span>
                    )}
                    <button
                      onClick={handleSave}
                      disabled={!isDirty || saving}
                      className={`text-sm font-bold text-white px-5 py-2.5 rounded-full transition whitespace-nowrap ${accent.button} disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {saving ? 'Saving...' : 'Save changes'}
                    </button>
                  </div>
                </div>

                {saveError && (
                  <div className="flex items-start gap-2 text-xs text-red-500 bg-red-50 rounded-xl p-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{saveError}</span>
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
