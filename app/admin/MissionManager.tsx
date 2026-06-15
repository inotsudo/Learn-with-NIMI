'use client'
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import supabase from '@/lib/supabaseClient'
import {
  Search, SlidersHorizontal, LayoutGrid, Eye, Bell, ChevronDown, Plus,
  MoreVertical, Pencil, Copy, ArrowUpDown, Trash2, ChevronLeft, ChevronRight,
  Star, ListChecks, Menu, AlertCircle, RefreshCw, X,
} from 'lucide-react'
import { ACCENT, CATEGORY_META, FALLBACK_META, TYPE_META, STATUS_META, type MissionType, type MissionRow } from './missionMeta'
import MissionEditor from './MissionEditor'
import { SkeletonHeaderBanner, SkeletonSplitPane } from './Skeleton'
import { useConfirmDialog } from './ConfirmDialog'

interface MissionManagerProps {
  categorySlug: string
  initialMissionId?: string
  onNavigate: (table: string) => void
  onOpenSidebar?: () => void
}

const PAGE_SIZE = 12

export default function MissionManager({ categorySlug, initialMissionId, onNavigate, onOpenSidebar }: MissionManagerProps) {
  const [missions, setMissions] = useState<MissionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [mutatingId, setMutatingId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const appliedInitialIdRef = useRef<string | undefined>(undefined)
  const { confirm, alert, dialog } = useConfirmDialog()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [admin, setAdmin] = useState<{ name: string; role: string } | null>(null)
  const [notifCount, setNotifCount] = useState(0)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [defaultType, setDefaultType] = useState<MissionType>('sing')

  const meta = CATEGORY_META[categorySlug] ?? FALLBACK_META
  const accent = ACCENT[meta.accent]

  const fetchMissions = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const { data, error } = await supabase
        .from('missions')
        .select('id, type, sequence, stars, duration_minutes, category_slug, active, mission_versions(id, language, title, subtitle, tip_text, media_url, content_json, published, status)')
        .eq('category_slug', categorySlug)
        .order('sequence')
      if (error) throw error
      const rows = (data ?? []) as unknown as MissionRow[]
      setMissions(rows)
      setSelectedId(prev => (prev && rows.some(m => m.id === prev)) ? prev : (rows[0]?.id ?? null))
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load missions.')
    } finally {
      setLoading(false)
    }
  }, [categorySlug])

  useEffect(() => {
    setSearch('')
    setPage(1)
    fetchMissions()
  }, [fetchMissions])

  // Deep-link from search: jump straight to a specific mission once it's loaded
  useEffect(() => {
    if (
      initialMissionId &&
      initialMissionId !== appliedInitialIdRef.current &&
      missions.some(m => m.id === initialMissionId)
    ) {
      setSelectedId(initialMissionId)
      appliedInitialIdRef.current = initialMissionId
    }
  }, [initialMissionId, missions])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('admins').select('name, role').eq('id', user.id).maybeSingle()
        if (data) setAdmin({ name: data.name ?? 'Admin', role: data.role ?? 'admin' })
      }
      const { data: cat } = await supabase.from('categories').select('default_type').eq('slug', categorySlug).maybeSingle()
      if (cat?.default_type) setDefaultType(cat.default_type as MissionType)
    }
    init()
  }, [categorySlug])

  useEffect(() => {
    const fetchNotifs = async () => {
      const missionIds = missions.map(m => m.id)
      if (missionIds.length === 0) { setNotifCount(0); return }
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { count } = await supabase
        .from('child_progress')
        .select('*', { count: 'exact', head: true })
        .in('mission_id', missionIds)
        .gte('completed_at', since)
      setNotifCount(count ?? 0)
    }
    fetchNotifs()
  }, [missions])

  const totalStars = useMemo(() => missions.reduce((sum, m) => sum + (m.stars ?? 0), 0), [missions])
  const currentType: MissionType = (missions[0]?.type as MissionType) ?? defaultType

  const filtered = useMemo(() => {
    if (!search.trim()) return missions
    const q = search.toLowerCase()
    return missions.filter(m => {
      const enTitle = m.mission_versions.find(v => v.language === 'en')?.title ?? ''
      return enTitle.toLowerCase().includes(q)
    })
  }, [missions, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageClamped = Math.min(page, totalPages)
  const pageStart = (pageClamped - 1) * PAGE_SIZE
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  const selected = missions.find(m => m.id === selectedId) ?? null

  const handlePreview = () => {
    window.open(`/missions/${categorySlug}`, '_blank')
  }

  const handleCreate = async () => {
    setActionError(null)
    setCreating(true)
    try {
      const maxSeq = missions.reduce((max, m) => Math.max(max, m.sequence), 0)
      const { data: newMission, error } = await supabase
        .from('missions')
        .insert({ category_slug: categorySlug, type: defaultType, sequence: maxSeq + 1, stars: 10, duration_minutes: 10, active: false })
        .select()
        .single()
      if (error) throw error
      const { error: versionError } = await supabase.from('mission_versions').insert({
        mission_id: newMission.id, language: 'en', title: 'New Mission',
        subtitle: '', tip_text: '', media_url: '', content_json: {}, status: 'draft',
      })
      if (versionError) throw versionError
      await fetchMissions()
      setSelectedId(newMission.id)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create mission.')
    } finally {
      setCreating(false)
    }
  }

  const handleDuplicate = async (m: MissionRow) => {
    setActionError(null)
    setMutatingId(m.id)
    try {
      const maxSeq = missions.reduce((max, x) => Math.max(max, x.sequence), 0)
      const { data: dup, error } = await supabase
        .from('missions')
        .insert({ category_slug: m.category_slug, type: m.type, sequence: maxSeq + 1, stars: m.stars, duration_minutes: m.duration_minutes, active: false })
        .select()
        .single()
      if (error) throw error
      const versions = m.mission_versions.map(v => ({
        mission_id: dup.id, language: v.language, title: v.title + ' (Copy)',
        subtitle: v.subtitle, tip_text: v.tip_text, media_url: v.media_url,
        content_json: v.content_json, status: 'draft',
      }))
      if (versions.length) {
        const { error: versionsError } = await supabase.from('mission_versions').insert(versions)
        if (versionsError) throw versionsError
      }
      await fetchMissions()
      setSelectedId(dup.id)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to duplicate mission.')
    } finally {
      setMutatingId(null)
    }
  }

  const handleDelete = async (m: MissionRow) => {
    const title = m.mission_versions.find(v => v.language === 'en')?.title ?? 'this mission'
    const ok = await confirm({
      title: `Delete "${title}"?`,
      message: "This also deletes its translations and any learners' completion records for it. This cannot be undone.",
    })
    if (!ok) return
    setActionError(null)
    setMutatingId(m.id)
    try {
      const { error } = await supabase.from('missions').delete().eq('id', m.id)
      if (error) throw error
      await fetchMissions()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete mission.')
    } finally {
      setMutatingId(null)
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
          <p className="text-sm font-bold text-gray-700">Couldn&apos;t load missions</p>
          <p className="text-xs text-gray-400 mt-1">{loadError}</p>
          <button onClick={fetchMissions} className={`mt-4 inline-flex items-center gap-2 text-white text-xs font-bold px-4 py-2 rounded-full transition ${accent.button}`}>
            <RefreshCw className="w-3.5 h-3.5" /> Try again
          </button>
        </div>
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
              <meta.icon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                {meta.label} Missions <span className="text-lg">{TYPE_META[currentType]?.emoji}</span>
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">
                Manage {meta.label.toLowerCase()} missions and their translations
              </p>
              <p className="text-xs text-gray-400 mt-1.5">
                <button onClick={() => onNavigate('Dashboard')} className={`font-bold hover:underline ${accent.text}`}>Daily Adventures</button>
                <span className="mx-1.5 text-gray-300">/</span>
                <span className="font-bold text-gray-500">{meta.label}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handlePreview} className="flex items-center gap-1.5 bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 px-3.5 py-2 rounded-full text-sm font-bold shadow-sm transition">
              <Eye className="w-4 h-4" /> Preview as Child
            </button>
            <span className="inline-flex items-center gap-1.5 bg-white border border-gray-100 text-amber-500 px-3.5 py-2 rounded-full text-sm font-bold shadow-sm">
              <Star className="w-3.5 h-3.5 fill-amber-400" /> {totalStars}
            </span>
            <span className={`inline-flex items-center gap-1.5 bg-white border border-gray-100 px-3.5 py-2 rounded-full text-sm font-bold shadow-sm ${accent.text}`}>
              <ListChecks className="w-3.5 h-3.5" /> {missions.length}
            </span>
            <button className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-100 hover:bg-gray-50 transition text-gray-500 shadow-sm">
              <Bell size={17} />
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                  {notifCount}
                </span>
              )}
            </button>
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
        <div className="flex justify-end mt-4">
          <button
            onClick={handleCreate}
            disabled={creating}
            className={`flex items-center gap-1.5 text-white px-4 py-2.5 rounded-full text-sm font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:-translate-y-0 ${accent.button}`}
          >
            <Plus className="w-4 h-4" /> {creating ? 'Creating...' : 'Create New Mission'}
          </button>
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

      {/* Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
        {/* List panel */}
        <div className="w-full lg:w-[400px] flex-shrink-0 border-b lg:border-b-0 lg:border-r border-gray-100 bg-white flex flex-col lg:overflow-hidden lg:min-h-0">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
            <div className="flex-1 min-w-0 flex items-center bg-gray-50 border border-gray-100 rounded-full px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-gray-200 transition">
              <Search size={15} className="text-gray-400 mr-2 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search missions..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="flex-1 min-w-0 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
              />
            </div>
            <button className="flex items-center gap-1 px-3 py-2.5 rounded-full border border-gray-100 text-gray-500 text-sm font-semibold hover:bg-gray-50 flex-shrink-0 transition">
              <SlidersHorizontal size={14} /> <span className="hidden sm:inline">Filter</span>
            </button>
            <button className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-100 text-gray-500 hover:bg-gray-50 flex-shrink-0 transition">
              <LayoutGrid size={15} />
            </button>
          </div>

          <div className="px-3 py-3 space-y-2 lg:flex-1 lg:overflow-y-auto lg:min-h-0" onClick={() => setOpenMenuId(null)}>
            {pageRows.map(m => {
              const en = m.mission_versions.find(v => v.language === 'en')
              const isSelected = m.id === selectedId
              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedId(m.id)}
                  className={`relative rounded-2xl border p-3 cursor-pointer transition ${
                    isSelected ? `${accent.soft} ${accent.border} shadow-sm` : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-extrabold flex-shrink-0 transition ${
                      isSelected ? `${accent.button} text-white` : 'bg-gray-100 text-gray-400'
                    }`}>
                      {m.sequence}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 truncate text-sm">{en?.title ?? 'Untitled'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-500">
                          <Star size={11} className="fill-amber-400" /> {m.stars}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_META[en?.status ?? 'draft'].badge}`}>
                          {STATUS_META[en?.status ?? 'draft'].label}
                        </span>
                        {!m.active && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">
                            Inactive — hidden from learners
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === m.id ? null : m.id) }}
                      className="p-1.5 rounded-lg hover:bg-white/70 text-gray-400 flex-shrink-0 transition"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>
                  {openMenuId === m.id && (
                    <div
                      className="absolute right-3 top-12 w-44 bg-white border border-gray-100 rounded-2xl shadow-lg z-20 overflow-hidden py-1.5 text-left"
                      onClick={e => e.stopPropagation()}
                    >
                      <button onClick={() => { setSelectedId(m.id); setOpenMenuId(null) }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium hover:bg-gray-50 transition">
                        <Pencil size={14} className="text-gray-400" /> Edit
                      </button>
                      <button onClick={() => { handleDuplicate(m); setOpenMenuId(null) }} disabled={mutatingId === m.id} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed">
                        <Copy size={14} className="text-gray-400" /> {mutatingId === m.id ? 'Duplicating...' : 'Duplicate'}
                      </button>
                      <button onClick={() => { handlePreview(); setOpenMenuId(null) }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium hover:bg-gray-50 transition">
                        <Eye size={14} className="text-gray-400" /> Preview
                      </button>
                      <button onClick={() => { void alert({ title: 'Drag-and-drop reordering', message: 'Coming soon! For now, edit a mission and change its sequence number to reorder it.' }); setOpenMenuId(null) }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium hover:bg-gray-50 transition">
                        <ArrowUpDown size={14} className="text-gray-400" /> Change Order
                      </button>
                      <div className="border-t border-gray-100 my-1" />
                      <button onClick={() => { handleDelete(m); setOpenMenuId(null) }} disabled={mutatingId === m.id} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition disabled:opacity-50 disabled:cursor-not-allowed">
                        <Trash2 size={14} /> {mutatingId === m.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
            {pageRows.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8">No missions found.</p>
            )}
          </div>

          {/* Pagination */}
          <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between text-xs text-gray-500 flex-shrink-0 flex-wrap gap-2">
            <span>
              Showing {filtered.length === 0 ? 0 : pageStart + 1} to {Math.min(pageStart + PAGE_SIZE, filtered.length)} of {filtered.length} missions
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pageClamped <= 1} className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-100 disabled:opacity-40 hover:bg-gray-50 transition">
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold transition ${
                    p === pageClamped ? `${accent.button} text-white shadow-sm` : 'hover:bg-gray-100 text-gray-500'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={pageClamped >= totalPages} className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-100 disabled:opacity-40 hover:bg-gray-50 transition">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Editor panel */}
        <div className="flex-1 lg:overflow-y-auto lg:min-h-0 bg-gradient-to-b from-gray-50 to-white">
          {selected ? (
            <MissionEditor key={selected.id} mission={selected} onSaved={fetchMissions} />
          ) : (
            <div className="flex items-center justify-center h-full p-8">
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-10 text-center max-w-sm">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${accent.tile}`}>
                  <meta.icon className="w-7 h-7" />
                </div>
                <p className="font-bold text-gray-700 mb-1">No missions yet</p>
                <p className="text-sm text-gray-400">Click &quot;+ Create New Mission&quot; to add your first {meta.label.toLowerCase()} mission.</p>
              </div>
            </div>
          )}
        </div>
      </div>
      {dialog}
    </div>
  )
}
