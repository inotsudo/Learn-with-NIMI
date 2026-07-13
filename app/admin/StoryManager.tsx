'use client'
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import supabase from '@/lib/supabaseClient'
import { getStorageUrl } from '@/lib/queries'
import {
  Search, Filter, Plus, MoreVertical, Pencil, Copy, Trash2, CheckCircle2,
  ChevronLeft, ChevronRight, BookOpen, Menu, AlertCircle, RefreshCw,
} from 'lucide-react'
import { ACCENT, type StoryRow, type Lang } from './missionMeta'
import { computeReadiness } from '@/lib/storyReadiness'
import StoryEditor from './StoryEditor'
import { SkeletonHeaderBanner, SkeletonSplitPane } from './Skeleton'
import { useConfirmDialog } from './ConfirmDialog'
import { useToast } from './Toast'

interface StoryManagerProps {
  initialStoryId?: string
  onNavigate: (table: string) => void
  onOpenSidebar?: () => void
  defaultLang?: Lang
}

const PAGE_SIZE = 5
const accent = ACCENT.blue

type TabKey = 'all' | 'ready' | 'progress' | 'missing' | 'published' | 'archived'

export default function StoryManager({ initialStoryId, onNavigate, onOpenSidebar, defaultLang }: StoryManagerProps) {
  const [stories, setStories] = useState<StoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [mutatingId, setMutatingId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const appliedInitialIdRef = useRef<string | undefined>(undefined)
  const { confirm, dialog } = useConfirmDialog()
  const { success: toastSuccess, error: toastError } = useToast()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [tab, setTab] = useState<TabKey>('all')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [bulkActing, setBulkActing] = useState(false)

  const toggleSelect = (id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const selectAll = () => {
    if (checkedIds.size === pageRows.length) setCheckedIds(new Set())
    else setCheckedIds(new Set(pageRows.map(s => s.id)))
  }

  const handleBulkPublish = async () => {
    if (checkedIds.size === 0) return
    const ok = await confirm({ title: `Publish ${checkedIds.size} stories?`, message: 'These stories will be visible to children.' })
    if (!ok) return
    setBulkActing(true)
    try {
      await Promise.all([...checkedIds].map(id => supabase.from('stories').update({ status: 'published' }).eq('id', id)))
      await fetchStories()
      toastSuccess(`${checkedIds.size} stories published`)
      setCheckedIds(new Set())
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Bulk publish failed')
    } finally {
      setBulkActing(false)
    }
  }

  const handleBulkDelete = async () => {
    if (checkedIds.size === 0) return
    const ok = await confirm({ title: `Delete ${checkedIds.size} stories?`, message: 'This cannot be undone.' })
    if (!ok) return
    setBulkActing(true)
    try {
      await Promise.all([...checkedIds].map(id => supabase.from('stories').delete().eq('id', id)))
      await fetchStories()
      toastSuccess(`${checkedIds.size} stories deleted`)
      setCheckedIds(new Set())
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Bulk delete failed')
    } finally {
      setBulkActing(false)
    }
  }

  const fetchStories = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('id, slug, title, cover_url, sort_order, is_active, is_free, status, age_min, age_max, published_at, theme_title, theme_emoji, is_personalizable, personalization_config, story_pages(id, story_id, page_number, image_url, story_page_versions(id, language, text, audio_url, published)), story_versions(id, story_id, language, title, cover_url, intro_video_url, theme_song_url, meet_characters_url, story_intro_url, status, published), story_slots(story_id, slot_key, mission_id, sort_order)')
        .order('sort_order')
      if (error) throw error
      setStories((data ?? []) as unknown as StoryRow[])
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStories() }, [fetchStories])

  useEffect(() => {
    if (initialStoryId && initialStoryId !== appliedInitialIdRef.current && stories.some(s => s.id === initialStoryId)) {
      setSelectedId(initialStoryId)
      appliedInitialIdRef.current = initialStoryId
    }
  }, [initialStoryId, stories])

  const getSlotsFilled = (s: StoryRow) => (s.story_slots ?? []).length
  const getReadiness = (s: StoryRow) => computeReadiness(s)
  const getTab = (s: StoryRow): TabKey => {
    if ((s.status as string) === 'archived' || s.status === 'retired') return 'archived'
    if (s.status === 'published') return 'published'
    const r = getReadiness(s)
    if (r.score === 100) return 'ready'
    if (r.score > 0) return 'progress'
    return 'missing'
  }
  const getContentStatus = (s: StoryRow): 'complete' | 'progress' | 'missing' => {
    const r = getReadiness(s)
    if (r.score === 100) return 'complete'
    if (r.score > 0) return 'progress'
    return 'missing'
  }

  const filtered = useMemo(() => {
    let list = stories
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(s => s.title.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q))
    }
    if (tab === 'ready') {
      list = list.filter(s => computeReadiness(s).score === 100 && s.status !== 'published')
    } else if (tab === 'progress') {
      list = list.filter(s => { const r = computeReadiness(s).score; return r > 0 && r < 100 })
    } else if (tab === 'missing') {
      list = list.filter(s => computeReadiness(s).score < 100)
    } else if (tab === 'published') {
      list = list.filter(s => s.status === 'published')
    } else if (tab === 'archived') {
      list = list.filter(s => s.status === 'retired' || (s.status as string) === 'archived')
    }
    return list
  }, [stories, search, tab])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageClamped = Math.min(page, totalPages)
  const pageRows = filtered.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE)

  const selected = selectedId ? stories.find(s => s.id === selectedId) ?? null : null

  const handleCreate = async () => {
    setActionError(null)
    setCreating(true)
    try {
      const maxSort = stories.reduce((max, s) => Math.max(max, s.sort_order), 0)
      const { data: newStory, error } = await supabase
        .from('stories')
        .insert({ slug: `new-story-${Date.now()}`, title: 'New Story', sort_order: maxSort + 1, status: 'draft', theme_title: '', theme_emoji: '📚' })
        .select().single()
      if (error) throw error

      // Auto-create EN story version so intro uploaders work immediately
      await supabase.from('story_versions').insert({
        story_id: newStory.id, language: 'en', title: 'New Story', published: false,
      })

      // Auto-create 6 mission slots so activities tab is ready
      const missionTypes = [
        { slot_key: 'flipflop_audio', type: 'story', sequence: 1, category_slug: 'flipflop' },
        { slot_key: 'story_pdf', type: 'read', sequence: 2, category_slug: 'discovery' },
        { slot_key: 'coloring', type: 'color', sequence: 3, category_slug: 'coloring' },
        { slot_key: 'move_explore', type: 'move', sequence: 4, category_slug: 'movement' },
        { slot_key: 'sing_along', type: 'sing', sequence: 5, category_slug: 'morning' },
        { slot_key: 'bonus_video', type: 'watch', sequence: 6, category_slug: 'zoom' },
      ]
      for (const mt of missionTypes) {
        const { data: mission } = await supabase
          .from('missions')
          .insert({ story_id: newStory.id, type: mt.type, sequence: mt.sequence, stars: 10, duration_minutes: 10, category_slug: mt.category_slug })
          .select('id').single()
        if (mission) {
          await supabase.from('story_slots').insert({
            story_id: newStory.id, slot_key: mt.slot_key, mission_id: mission.id, sort_order: mt.sequence,
          })
          await supabase.from('mission_versions').insert({
            mission_id: mission.id, language: 'en', title: mt.slot_key.replace(/_/g, ' '),
            revision_number: 1, status: 'draft', published: false, is_current: true,
          })
        }
      }

      await fetchStories()
      setSelectedId(newStory.id)
      toastSuccess('Story created')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not create story.')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (s: StoryRow) => {
    const ok = await confirm({ title: `Delete "${s.title}"?`, message: 'This deletes all pages, slots, and progress. Cannot be undone.' })
    if (!ok) return
    setMutatingId(s.id)
    try {
      await supabase.from('stories').delete().eq('id', s.id)
      await fetchStories()
      if (selectedId === s.id) setSelectedId(null)
      toastSuccess(`"${s.title}" deleted`)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not delete.')
    } finally {
      setMutatingId(null)
    }
  }

  const handleDuplicate = async (s: StoryRow) => {
    setMutatingId(s.id)
    try {
      const maxSort = stories.reduce((max, x) => Math.max(max, x.sort_order), 0)
      const { data: dup, error } = await supabase
        .from('stories')
        .insert({ slug: `${s.slug}-copy-${Date.now()}`, title: s.title + ' (Copy)', cover_url: s.cover_url, sort_order: maxSort + 1, status: 'draft', theme_title: s.theme_title, theme_emoji: s.theme_emoji })
        .select().single()
      if (error) throw error
      await fetchStories()
      setSelectedId(dup.id)
      toastSuccess(`"${s.title}" duplicated`)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not duplicate.')
    } finally {
      setMutatingId(null)
    }
  }

  const statusBadge = (s: StoryRow) => {
    const cs = getContentStatus(s)
    if (s.status === 'published' && cs === 'complete') return { label: 'Published', cls: 'bg-emerald-50 text-emerald-600' }
    if (s.status === 'published' && cs !== 'complete') return { label: 'Published · Incomplete', cls: 'bg-amber-50 text-amber-600' }
    if (s.status === 'retired') return { label: 'Archived', cls: 'bg-gray-100 text-gray-500' }
    if (s.status === 'review') return { label: 'Review', cls: 'bg-blue-50 text-blue-600' }
    if (cs === 'complete') return { label: 'Ready', cls: 'bg-emerald-50 text-emerald-600' }
    if (cs === 'progress') return { label: 'In Progress', cls: 'bg-amber-50 text-amber-600' }
    return { label: 'Draft', cls: 'bg-gray-100 text-gray-500' }
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'all', label: 'All Stories' },
    { key: 'ready', label: 'Ready to Publish' },
    { key: 'progress', label: 'In Progress' },
    { key: 'missing', label: 'Missing Assets' },
    { key: 'published', label: 'Published' },
    { key: 'archived', label: 'Archived' },
  ]

  if (loading) return <div className="flex-1 flex flex-col overflow-hidden"><SkeletonHeaderBanner /><SkeletonSplitPane rows={8} /></div>

  if (loadError) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center max-w-sm">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="font-bold text-gray-700">Couldn&apos;t load stories</p>
          <p className="text-xs text-gray-400 mt-1">{loadError}</p>
          <button onClick={fetchStories} className="mt-4 bg-green-600 text-white text-xs font-bold px-4 py-2 rounded-full">
            <RefreshCw className="w-3.5 h-3.5 inline mr-1" /> Try again
          </button>
        </div>
      </div>
    )
  }

  // If a story is selected, show the editor
  if (selected) {
    return (
      <div className="flex-1 flex flex-col overflow-auto bg-gray-50">
        {dialog}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedId(null)} className="text-gray-400 hover:text-gray-600 transition">
              <ChevronLeft size={20} />
            </button>
            <div>
              <p className="text-[11px] text-gray-400 font-medium">Stories &gt; {selected.title}</p>
              <h2 className="text-[16px] font-extrabold text-gray-800">Edit Story</h2>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <StoryEditor story={selected} onSaved={fetchStories} defaultLang={defaultLang} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {dialog}

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5 flex-shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={onOpenSidebar} className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-gray-500">
              <Menu size={17} />
            </button>
            <div>
              <h1 className="text-[22px] font-extrabold text-gray-900">Stories</h1>
              <p className="text-[13px] text-gray-500">Manage and organize all your stories.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search stories..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-[13px] font-medium text-gray-700 focus:outline-none focus:border-green-300 w-48" />
            </div>
            <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-medium text-gray-600 hover:bg-gray-50 transition">
              <Filter size={14} /> Filter
            </button>
            <button onClick={handleCreate} disabled={creating}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold text-[13px] rounded-xl px-4 py-2 shadow-sm transition disabled:opacity-50">
              <Plus size={16} /> New Story
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 border-b border-gray-100 -mb-px">
          {TABS.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setPage(1) }}
              className={`px-4 py-2.5 text-[12px] font-semibold border-b-2 transition ${
                tab === t.key ? 'border-green-600 text-green-600' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {actionError && (
          <div className="mb-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-[12px] font-medium text-red-600 flex items-center gap-2">
            <AlertCircle size={14} /> {actionError}
          </div>
        )}

        {/* Bulk action bar */}
        {checkedIds.size > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 mb-3 flex items-center gap-3 text-[12px]">
            <span className="font-bold text-green-700">{checkedIds.size} selected</span>
            <button onClick={handleBulkPublish} disabled={bulkActing}
              className="font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg px-3 py-1.5 transition disabled:opacity-50">
              Publish
            </button>
            <button onClick={handleBulkDelete} disabled={bulkActing}
              className="font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg px-3 py-1.5 transition disabled:opacity-50">
              Delete
            </button>
            <button onClick={() => setCheckedIds(new Set())} className="font-medium text-gray-500 hover:text-gray-700 ml-auto">
              Clear
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100">
          <div className="divide-y divide-gray-50">
            {pageRows.length === 0 ? (
              <div className="px-5 py-12 text-center text-gray-400 text-[13px]">No stories found.</div>
            ) : pageRows.map(s => {
              const badge = statusBadge(s)
              const readiness = getReadiness(s)
              const missing = readiness.items.filter(i => !i.done)
              return (
                <div key={s.id} className={`hover:bg-gray-50/50 transition ${mutatingId === s.id ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-0 px-1 sm:px-2">
                  <button onClick={e => { e.stopPropagation(); toggleSelect(s.id) }}
                    className="w-8 h-8 flex items-center justify-center shrink-0">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition ${
                      checkedIds.has(s.id) ? 'bg-green-600 border-green-600' : 'border-gray-300'
                    }`}>
                      {checkedIds.has(s.id) && <CheckCircle2 size={10} className="text-white" />}
                    </div>
                  </button>
                <button
                  className="flex-1 flex items-center gap-3 pr-3 sm:pr-4 py-3.5 text-left min-w-0"
                  onClick={() => setSelectedId(s.id)}>
                  {s.cover_url ? (
                    <img src={getStorageUrl(s.cover_url)} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-100 flex-shrink-0"  loading="lazy" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600 font-bold text-[13px] flex-shrink-0">
                      {s.sort_order}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-gray-800 truncate">{s.title}</p>
                    <p className="text-[11px] text-gray-400">Age {s.age_min ?? '—'}–{s.age_max ?? '—'}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[12px] font-bold text-gray-500">{readiness.score}%</span>
                    <div className="w-14 bg-gray-100 rounded-full h-1.5">
                      <div className={`h-full rounded-full ${readiness.score === 100 ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${readiness.score}%` }} />
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${s.is_free ? 'bg-emerald-50 text-emerald-600' : 'bg-violet-50 text-violet-600'}`}>
                    {s.is_free ? '🆓' : '👑'}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md flex-shrink-0 ${badge.cls}`}>{badge.label}</span>
                  <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setOpenMenuId(openMenuId === s.id ? null : s.id)}
                      className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition">
                      <MoreVertical size={16} />
                    </button>
                    {openMenuId === s.id && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setOpenMenuId(null)} />
                        <div className="fixed sm:absolute right-4 sm:right-0 bottom-4 sm:bottom-auto sm:top-full sm:mt-1 w-[calc(100vw-32px)] sm:w-48 bg-white border border-gray-200 rounded-2xl sm:rounded-xl shadow-2xl z-40 py-2 sm:py-1.5">
                          <p className="px-4 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-wide sm:hidden">{s.title}</p>
                          <button onClick={() => { setOpenMenuId(null); setSelectedId(s.id) }}
                            className="w-full text-left px-4 py-3 sm:py-2.5 text-[14px] sm:text-[13px] font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition">
                            <Pencil size={16} className="text-gray-400" /> Edit Story
                          </button>
                          <button onClick={() => { setOpenMenuId(null); handleDuplicate(s) }}
                            className="w-full text-left px-4 py-3 sm:py-2.5 text-[14px] sm:text-[13px] font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition">
                            <Copy size={16} className="text-gray-400" /> Duplicate
                          </button>
                          <div className="border-t border-gray-100 my-1" />
                          <button onClick={() => { setOpenMenuId(null); handleDelete(s) }}
                            className="w-full text-left px-4 py-3 sm:py-2.5 text-[14px] sm:text-[13px] font-medium text-red-600 hover:bg-red-50 flex items-center gap-3 transition">
                            <Trash2 size={16} className="text-red-400" /> Delete
                          </button>
                          <button onClick={() => setOpenMenuId(null)}
                            className="w-full text-center py-3 text-[13px] font-bold text-gray-400 hover:text-gray-600 sm:hidden transition">
                            Cancel
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </button>
                </div>
                {tab === 'missing' && missing.length > 0 && (
                  <div className="px-4 sm:px-5 pb-3 -mt-1">
                    <div className="ml-[52px] flex flex-wrap gap-1">
                      {missing.map(m => (
                        <span key={m.key} className="text-[10px] font-medium text-red-500 bg-red-50 border border-red-100 rounded-md px-2 py-0.5">
                          {m.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 text-[12px] text-gray-400">
          <span>{filtered.length} stories</span>
          <div className="flex items-center gap-0.5">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pageClamped <= 1}
              className="w-7 h-7 rounded-md hover:bg-gray-100 flex items-center justify-center disabled:opacity-20 transition text-gray-500">
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const n = i + 1
              return (
                <button key={n} onClick={() => setPage(n)}
                  className={`w-7 h-7 rounded-md text-[11px] font-bold transition ${n === pageClamped ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                  {n}
                </button>
              )
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={pageClamped >= totalPages}
              className="w-7 h-7 rounded-md hover:bg-gray-100 flex items-center justify-center disabled:opacity-20 transition text-gray-500">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}
