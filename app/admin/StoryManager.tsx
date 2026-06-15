'use client'
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import supabase from '@/lib/supabaseClient'
import { getStorageUrl } from '@/lib/queries'
import {
  Search, SlidersHorizontal, LayoutGrid, Eye, Bell, ChevronDown, Plus,
  MoreVertical, Pencil, Copy, ArrowUpDown, Trash2, ChevronLeft, ChevronRight,
  BookOpen, FileStack, Menu, AlertCircle, RefreshCw, X,
} from 'lucide-react'
import { ACCENT, type StoryRow } from './missionMeta'
import StoryEditor from './StoryEditor'
import { SkeletonHeaderBanner, SkeletonSplitPane } from './Skeleton'
import { useConfirmDialog } from './ConfirmDialog'

interface StoryManagerProps {
  initialStoryId?: string
  onNavigate: (table: string) => void
  onOpenSidebar?: () => void
}

const PAGE_SIZE = 12
const accent = ACCENT.blue

export default function StoryManager({ initialStoryId, onNavigate, onOpenSidebar }: StoryManagerProps) {
  const [stories, setStories] = useState<StoryRow[]>([])
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

  const fetchStories = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('id, slug, title, cover_url, sort_order, is_active, theme_title, theme_emoji, story_pages(id, page_number, image_url, story_page_versions(id, language, text, audio_url, published))')
        .order('sort_order')
      if (error) throw error
      const rows = (data ?? []) as unknown as StoryRow[]
      setStories(rows)
      setSelectedId(prev => (prev && rows.some(s => s.id === prev)) ? prev : (rows[0]?.id ?? null))
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setSearch('')
    setPage(1)
    fetchStories()
  }, [fetchStories])

  // Deep-link from search: jump straight to a specific story once it's loaded
  useEffect(() => {
    if (
      initialStoryId &&
      initialStoryId !== appliedInitialIdRef.current &&
      stories.some(s => s.id === initialStoryId)
    ) {
      setSelectedId(initialStoryId)
      appliedInitialIdRef.current = initialStoryId
    }
  }, [initialStoryId, stories])

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

  useEffect(() => {
    const fetchNotifs = async () => {
      const { data: flipflopMissions } = await supabase.from('missions').select('id').eq('category_slug', 'flipflop')
      const missionIds = (flipflopMissions ?? []).map(m => m.id)
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
  }, [])

  const totalPages = useMemo(() => stories.reduce((sum, s) => sum + s.story_pages.length, 0), [stories])

  const filtered = useMemo(() => {
    if (!search.trim()) return stories
    const q = search.toLowerCase()
    return stories.filter(s => s.title.toLowerCase().includes(q))
  }, [stories, search])

  const totalPagesForPagination = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageClamped = Math.min(page, totalPagesForPagination)
  const pageStart = (pageClamped - 1) * PAGE_SIZE
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  const selected = stories.find(s => s.id === selectedId) ?? null

  const handlePreview = () => {
    window.open('/missions/flipflop', '_blank')
  }

  const handleCreate = async () => {
    setActionError(null)
    setCreating(true)
    try {
      const maxSort = stories.reduce((max, s) => Math.max(max, s.sort_order), 0)
      const { data: newStory, error } = await supabase
        .from('stories')
        .insert({ slug: `new-story-${Date.now()}`, title: 'New Story', sort_order: maxSort + 1, is_active: false, theme_title: '', theme_emoji: '📚' })
        .select()
        .single()
      if (error) throw error
      await fetchStories()
      setSelectedId(newStory.id)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not create the story.')
    } finally {
      setCreating(false)
    }
  }

  const handleDuplicate = async (s: StoryRow) => {
    setActionError(null)
    setMutatingId(s.id)
    try {
      const maxSort = stories.reduce((max, x) => Math.max(max, x.sort_order), 0)
      const { data: dup, error } = await supabase
        .from('stories')
        .insert({
          slug: `${s.slug}-copy-${Date.now()}`, title: s.title + ' (Copy)', cover_url: s.cover_url,
          sort_order: maxSort + 1, is_active: false, theme_title: s.theme_title, theme_emoji: s.theme_emoji,
        })
        .select()
        .single()
      if (error) throw error

      for (const p of s.story_pages) {
        const { data: newPage, error: pageErr } = await supabase
          .from('story_pages')
          .insert({ story_id: dup.id, page_number: p.page_number, image_url: p.image_url })
          .select()
          .single()
        if (pageErr) throw pageErr
        const versions = p.story_page_versions.map(v => ({
          story_page_id: newPage.id, language: v.language, text: v.text, audio_url: v.audio_url, published: false,
        }))
        if (versions.length) {
          const { error: versionsErr } = await supabase.from('story_page_versions').insert(versions)
          if (versionsErr) throw versionsErr
        }
      }

      await fetchStories()
      setSelectedId(dup.id)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not duplicate the story.')
      await fetchStories()
    } finally {
      setMutatingId(null)
    }
  }

  const handleDelete = async (s: StoryRow) => {
    const pageCount = s.story_pages.length
    const ok = await confirm({
      title: `Delete "${s.title}"?`,
      message: `This also deletes its ${pageCount} page${pageCount === 1 ? '' : 's'}, any matching coloring pages, and any missions (and learners' completion records) that use this story. This cannot be undone.`,
    })
    if (!ok) return
    setActionError(null)
    setMutatingId(s.id)
    try {
      const { error } = await supabase.from('stories').delete().eq('id', s.id)
      if (error) throw error
      await fetchStories()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete the story.')
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
          <p className="text-sm font-bold text-gray-700">Couldn&apos;t load stories</p>
          <p className="text-xs text-gray-400 mt-1">{loadError}</p>
          <button onClick={fetchStories} className={`mt-4 inline-flex items-center gap-2 text-white text-xs font-bold px-4 py-2 rounded-full transition ${accent.button}`}>
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
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                Stories &amp; FlipFlop Books <span className="text-lg">📚</span>
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">
                Manage storybooks, pages, and translations
              </p>
              <p className="text-xs text-gray-400 mt-1.5">
                <button onClick={() => onNavigate('Dashboard')} className={`font-bold hover:underline ${accent.text}`}>Dashboard</button>
                <span className="mx-1.5 text-gray-300">/</span>
                <span className="font-bold text-gray-500">Stories &amp; FlipFlop Books</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handlePreview} className="flex items-center gap-1.5 bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 px-3.5 py-2 rounded-full text-sm font-bold shadow-sm transition">
              <Eye className="w-4 h-4" /> Preview as Child
            </button>
            <span className={`inline-flex items-center gap-1.5 bg-white border border-gray-100 px-3.5 py-2 rounded-full text-sm font-bold shadow-sm ${accent.text}`}>
              <BookOpen className="w-3.5 h-3.5" /> {stories.length}
            </span>
            <span className={`inline-flex items-center gap-1.5 bg-white border border-gray-100 px-3.5 py-2 rounded-full text-sm font-bold shadow-sm ${accent.text}`}>
              <FileStack className="w-3.5 h-3.5" /> {totalPages}
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
            <Plus className="w-4 h-4" /> {creating ? 'Creating...' : 'Create New Story'}
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
                placeholder="Search stories..."
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
            {pageRows.map(s => {
              const isSelected = s.id === selectedId
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`relative rounded-2xl border p-3 cursor-pointer transition ${
                    isSelected ? `${accent.soft} ${accent.border} shadow-sm` : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {s.cover_url ? (
                      <img src={getStorageUrl(s.cover_url)} alt="" className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition ${
                        isSelected ? `${accent.button} text-white` : 'bg-gray-100 text-gray-400'
                      }`}>
                        <BookOpen size={16} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 truncate text-sm">{s.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {s.theme_emoji && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 truncate">
                            {s.theme_emoji} {s.theme_title}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 flex-shrink-0">
                          {s.story_pages.length} page{s.story_pages.length === 1 ? '' : 's'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${s.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          {s.is_active ? 'Active' : 'Draft'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === s.id ? null : s.id) }}
                      className="p-1.5 rounded-lg hover:bg-white/70 text-gray-400 flex-shrink-0 transition"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>
                  {openMenuId === s.id && (
                    <div
                      className="absolute right-3 top-12 w-44 bg-white border border-gray-100 rounded-2xl shadow-lg z-20 overflow-hidden py-1.5 text-left"
                      onClick={e => e.stopPropagation()}
                    >
                      <button onClick={() => { setSelectedId(s.id); setOpenMenuId(null) }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium hover:bg-gray-50 transition">
                        <Pencil size={14} className="text-gray-400" /> Edit
                      </button>
                      <button
                        onClick={() => { handleDuplicate(s); setOpenMenuId(null) }}
                        disabled={mutatingId === s.id}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Copy size={14} className="text-gray-400" /> {mutatingId === s.id ? 'Duplicating...' : 'Duplicate'}
                      </button>
                      <button onClick={() => { handlePreview(); setOpenMenuId(null) }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium hover:bg-gray-50 transition">
                        <Eye size={14} className="text-gray-400" /> Preview
                      </button>
                      <button onClick={() => { void alert({ title: 'Drag-and-drop reordering', message: 'Coming soon! For now, edit a story and change its order number to reorder it in the list.' }); setOpenMenuId(null) }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium hover:bg-gray-50 transition">
                        <ArrowUpDown size={14} className="text-gray-400" /> Change Order
                      </button>
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={() => { handleDelete(s); setOpenMenuId(null) }}
                        disabled={mutatingId === s.id}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={14} /> {mutatingId === s.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
            {pageRows.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8">No stories found.</p>
            )}
          </div>

          {/* Pagination */}
          <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between text-xs text-gray-500 flex-shrink-0 flex-wrap gap-2">
            <span>
              Showing {filtered.length === 0 ? 0 : pageStart + 1} to {Math.min(pageStart + PAGE_SIZE, filtered.length)} of {filtered.length} stories
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pageClamped <= 1} className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-100 disabled:opacity-40 hover:bg-gray-50 transition">
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPagesForPagination }, (_, i) => i + 1).slice(0, 5).map(p => (
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
              <button onClick={() => setPage(p => Math.min(totalPagesForPagination, p + 1))} disabled={pageClamped >= totalPagesForPagination} className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-100 disabled:opacity-40 hover:bg-gray-50 transition">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Editor panel */}
        <div className="flex-1 lg:overflow-y-auto lg:min-h-0 bg-gradient-to-b from-gray-50 to-white">
          {selected ? (
            <StoryEditor key={selected.id} story={selected} onSaved={fetchStories} />
          ) : (
            <div className="flex items-center justify-center h-full p-8">
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-10 text-center max-w-sm">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${accent.tile}`}>
                  <BookOpen className="w-7 h-7" />
                </div>
                <p className="font-bold text-gray-700 mb-1">No stories yet</p>
                <p className="text-sm text-gray-400">Click &quot;+ Create New Story&quot; to add your first storybook.</p>
              </div>
            </div>
          )}
        </div>
      </div>
      {dialog}
    </div>
  )
}
