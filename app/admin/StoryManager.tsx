'use client'
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import supabase from '@/lib/supabaseClient'
import { getStorageUrl } from '@/lib/queries'
import {
  Search, Filter, Plus, MoreVertical, Pencil, Copy, Trash2, CheckCircle2,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, BookOpen, Menu, AlertCircle, RefreshCw, X,
  LayoutGrid, List, XCircle, ArrowRight,
} from 'lucide-react'
import { type StoryRow, type Lang } from './missionMeta'
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

type TabKey = 'all' | 'ready' | 'review' | 'progress' | 'missing' | 'published' | 'archived'
type FreeFilter = 'all' | 'free' | 'premium'

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatAge(min?: number | null, max?: number | null): string {
  if (min == null && max == null) return 'All ages'
  if (min != null && max != null) return `Age ${min}–${max}`
  if (min != null) return `Age ${min}+`
  return `Up to age ${max}`
}

function getPages(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | null)[] = [1]
  if (current > 3) pages.push(null)
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 2) pages.push(null)
  pages.push(total)
  return pages
}

const TAB_EMPTY: Record<TabKey, { title: string; desc: string }> = {
  all:       { title: 'No stories yet',           desc: 'Create your first story to get started.' },
  ready:     { title: 'None ready to publish',    desc: 'Complete all required content to mark a story ready.' },
  review:    { title: 'Nothing in review',        desc: 'Stories sent for editorial review will appear here.' },
  progress:  { title: 'No stories in progress',   desc: 'Stories with some but not all content appear here.' },
  missing:   { title: 'All content uploaded! 🎉', desc: 'Every story has its required assets. Great work!' },
  published: { title: 'No published stories',     desc: 'Publish a complete story to make it visible to learners.' },
  archived:  { title: 'No archived stories',      desc: 'Retired stories will appear here.' },
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function StoryManager({ initialStoryId, onNavigate, onOpenSidebar, defaultLang }: StoryManagerProps) {
  const [stories,    setStories]    = useState<StoryRow[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError,  setLoadError]  = useState<string | null>(null)
  const isFirstLoad = useRef(true)
  const [creating,   setCreating]   = useState(false)
  const [mutatingId, setMutatingId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const appliedInitialIdRef = useRef<string | undefined>(undefined)
  const { confirm, dialog } = useConfirmDialog()
  const { success: toastSuccess, error: toastError } = useToast()

  const [view,       setView]       = useState<'list' | 'coverage'>('list')
  const [search,     setSearch]     = useState('')
  const [page,       setPage]       = useState(1)
  const [tab,        setTab]        = useState<TabKey>('all')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [bulkActing, setBulkActing] = useState(false)

  // Filter panel
  const [showFilter, setShowFilter] = useState(false)
  const [filterFree, setFilterFree] = useState<FreeFilter>('all')
  const filterRef = useRef<HTMLDivElement>(null)

  // Close filter on outside click or Escape
  useEffect(() => {
    if (!showFilter) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowFilter(false) }
    const onMouse = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilter(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onMouse)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onMouse) }
  }, [showFilter])

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchStories = useCallback(async () => {
    // First load shows skeleton; subsequent refreshes (after saves) update silently in background
    if (isFirstLoad.current) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }
    setLoadError(null)
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('id, slug, title, cover_url, sort_order, is_active, is_free, status, age_min, age_max, published_at, theme_title, theme_emoji, is_personalizable, personalization_config, story_pages(id, story_id, page_number, image_url, story_page_versions(id, language, text, audio_url, published)), coloring_pages(id), story_versions(id, story_id, language, title, cover_url, intro_video_url, theme_song_url, meet_characters_url, story_intro_url, status, published), story_slots(story_id, slot_key, mission_id, sort_order, missions(id, mission_versions(id, language, media_url)))')
        .order('sort_order')
      if (error) throw error
      setStories((data ?? []) as unknown as StoryRow[])
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
      setRefreshing(false)
      isFirstLoad.current = false
    }
  }, [])

  useEffect(() => { fetchStories() }, [fetchStories])

  useEffect(() => {
    if (initialStoryId && initialStoryId !== appliedInitialIdRef.current && stories.some(s => s.id === initialStoryId)) {
      setSelectedId(initialStoryId)
      appliedInitialIdRef.current = initialStoryId
    }
  }, [initialStoryId, stories])

  // ── Derived readiness helpers ──────────────────────────────────────────────
  const getReadiness = (s: StoryRow) => computeReadiness(s)
  const getContentStatus = (s: StoryRow): 'complete' | 'progress' | 'missing' => {
    const r = getReadiness(s)
    if (r.score === 100) return 'complete'
    if (r.score > 0) return 'progress'
    return 'missing'
  }

  // ── Filtering + pagination ─────────────────────────────────────────────────

  // Step 1: apply search
  const searchFiltered = useMemo(() => {
    if (!search.trim()) return stories
    const q = search.toLowerCase()
    return stories.filter(s => s.title.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q))
  }, [stories, search])

  // Step 2: apply free/premium filter + tab
  const filtered = useMemo(() => {
    let list = searchFiltered
    if (filterFree === 'free')    list = list.filter(s => s.is_free)
    if (filterFree === 'premium') list = list.filter(s => !s.is_free)

    if (tab === 'ready')         list = list.filter(s => computeReadiness(s).score === 100 && s.status !== 'published' && s.status !== 'review' && s.status !== 'retired')
    else if (tab === 'progress') list = list.filter(s => { const r = computeReadiness(s).score; return r > 0 && r < 100 && s.status !== 'published' && s.status !== 'retired' && (s.status as string) !== 'archived' })
    else if (tab === 'missing')  list = list.filter(s => computeReadiness(s).score < 100 && s.status !== 'published' && s.status !== 'retired' && (s.status as string) !== 'archived')
    else if (tab === 'review')   list = list.filter(s => s.status === 'review')
    else if (tab === 'published') list = list.filter(s => s.status === 'published')
    else if (tab === 'archived') list = list.filter(s => s.status === 'retired' || (s.status as string) === 'archived')
    return list
  }, [searchFiltered, filterFree, tab])

  // Tab counts — derived from search+free filtered stories (before tab filter)
  const tabCounts = useMemo(() => {
    let base = searchFiltered
    if (filterFree === 'free')    base = base.filter(s => s.is_free)
    if (filterFree === 'premium') base = base.filter(s => !s.is_free)
    return {
      all:       base.length,
      ready:     base.filter(s => computeReadiness(s).score === 100 && s.status !== 'published' && s.status !== 'review' && s.status !== 'retired').length,
      review:    base.filter(s => s.status === 'review').length,
      progress:  base.filter(s => { const r = computeReadiness(s).score; return r > 0 && r < 100 && s.status !== 'published' && s.status !== 'retired' && (s.status as string) !== 'archived' }).length,
      missing:   base.filter(s => computeReadiness(s).score < 100 && s.status !== 'published' && s.status !== 'retired' && (s.status as string) !== 'archived').length,
      published: base.filter(s => s.status === 'published').length,
      archived:  base.filter(s => s.status === 'retired' || (s.status as string) === 'archived').length,
    }
  }, [searchFiltered, filterFree])

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageClamped = Math.min(page, totalPages)
  const pageRows    = filtered.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE)
  const selected    = selectedId ? stories.find(s => s.id === selectedId) ?? null : null

  // ── Selection ──────────────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const selectAll = () => {
    if (checkedIds.size === pageRows.length && pageRows.length > 0) setCheckedIds(new Set())
    else setCheckedIds(new Set(pageRows.map(s => s.id)))
  }
  const allOnPageChecked = pageRows.length > 0 && checkedIds.size === pageRows.length

  // ── Bulk actions ───────────────────────────────────────────────────────────
  const handleBulkPublish = async () => {
    if (checkedIds.size === 0) return

    // Only stories with at least one language already marked ready can go live
    const eligible   = stories.filter(s => checkedIds.has(s.id) && (s.story_versions ?? []).some(v => v.published))
    const skipped    = checkedIds.size - eligible.length

    if (eligible.length === 0) {
      toastError('None of the selected stories have a language marked ready. Open each story and mark at least one language ready first.')
      return
    }

    const detail = skipped > 0
      ? `${eligible.length} will go live. ${skipped} ${skipped === 1 ? 'story has' : 'stories have'} no language marked ready and will be skipped.`
      : `${eligible.length} ${eligible.length === 1 ? 'story' : 'stories'} will become visible to learners.`

    const ok = await confirm({ title: `Go Live: ${eligible.length} ${eligible.length === 1 ? 'story' : 'stories'}?`, message: detail, danger: false })
    if (!ok) return

    setBulkActing(true)
    try {
      const now = new Date().toISOString()
      await Promise.all(eligible.map(s => supabase.from('stories').update({ status: 'published', published_at: now }).eq('id', s.id)))
      await fetchStories()
      toastSuccess(`${eligible.length} ${eligible.length === 1 ? 'story' : 'stories'} now live${skipped > 0 ? `, ${skipped} skipped` : ''}`)
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

  // ── Single story actions ───────────────────────────────────────────────────
  const handleCreate = async () => {
    setCreating(true)
    try {
      const maxSort = stories.reduce((max, s) => Math.max(max, s.sort_order), 0)
      const { data: newStory, error } = await supabase
        .from('stories')
        .insert({ slug: `draft-story-${Date.now()}`, title: 'New Story', sort_order: maxSort + 1, status: 'draft', theme_title: '', theme_emoji: '📚' })
        .select().single()
      if (error) throw error

      await supabase.from('story_versions').insert({
        story_id: newStory.id, language: 'en', title: 'New Story', published: false,
      })

      const missionTypes = [
        { slot_key: 'flipflop_audio', type: 'story', sequence: 1, category_slug: 'flipflop' },
        { slot_key: 'story_pdf',      type: 'read',  sequence: 2, category_slug: 'discovery' },
        { slot_key: 'coloring',       type: 'color', sequence: 3, category_slug: 'coloring' },
        { slot_key: 'move_explore',   type: 'move',  sequence: 4, category_slug: 'movement' },
        { slot_key: 'sing_along',     type: 'sing',  sequence: 5, category_slug: 'morning' },
        { slot_key: 'bonus_video',    type: 'watch', sequence: 6, category_slug: 'zoom' },
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

  const handleReorder = async (s: StoryRow, dir: 'up' | 'down') => {
    const sorted = [...stories].sort((a, b) => a.sort_order - b.sort_order)
    const idx = sorted.findIndex(x => x.id === s.id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const neighbor = sorted[swapIdx]
    setMutatingId(s.id)
    try {
      await Promise.all([
        supabase.from('stories').update({ sort_order: neighbor.sort_order }).eq('id', s.id),
        supabase.from('stories').update({ sort_order: s.sort_order }).eq('id', neighbor.id),
      ])
      await fetchStories()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not reorder.')
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

      // Copy language versions from source (intro media URLs carry over; published resets to false)
      const sourceLangs = s.story_versions ?? []
      if (sourceLangs.length > 0) {
        for (const sv of sourceLangs) {
          await supabase.from('story_versions').insert({
            story_id: dup.id, language: sv.language, title: sv.title,
            cover_url: sv.cover_url, intro_video_url: sv.intro_video_url,
            theme_song_url: sv.theme_song_url, meet_characters_url: sv.meet_characters_url,
            story_intro_url: sv.story_intro_url, status: 'draft', published: false,
          })
        }
      } else {
        // Source had no versions yet — seed English so editor isn't blank
        await supabase.from('story_versions').insert({ story_id: dup.id, language: 'en', title: dup.title, published: false })
      }

      // Create fresh mission slots — same structure as a new story
      // (FlipFlop pages and coloring templates are not copied; media must be re-uploaded)
      const missionTypes = [
        { slot_key: 'flipflop_audio', type: 'story', sequence: 1, category_slug: 'flipflop' },
        { slot_key: 'story_pdf',      type: 'read',  sequence: 2, category_slug: 'discovery' },
        { slot_key: 'coloring',       type: 'color', sequence: 3, category_slug: 'coloring' },
        { slot_key: 'move_explore',   type: 'move',  sequence: 4, category_slug: 'movement' },
        { slot_key: 'sing_along',     type: 'sing',  sequence: 5, category_slug: 'morning' },
        { slot_key: 'bonus_video',    type: 'watch', sequence: 6, category_slug: 'zoom' },
      ]
      for (const mt of missionTypes) {
        const { data: mission } = await supabase
          .from('missions')
          .insert({ story_id: dup.id, type: mt.type, sequence: mt.sequence, stars: 10, duration_minutes: 10, category_slug: mt.category_slug })
          .select('id').single()
        if (mission) {
          await supabase.from('story_slots').insert({ story_id: dup.id, slot_key: mt.slot_key, mission_id: mission.id, sort_order: mt.sequence })
          await supabase.from('mission_versions').insert({
            mission_id: mission.id, language: 'en', title: mt.slot_key.replace(/_/g, ' '),
            revision_number: 1, status: 'draft', published: false, is_current: true,
          })
        }
      }

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
    if (s.status === 'published' && cs === 'complete')    return { label: 'Published ✓',         cls: 'bg-emerald-50 text-emerald-700' }
    if (s.status === 'published' && cs !== 'complete')    return { label: 'Published · Incomplete', cls: 'bg-amber-50 text-amber-600' }
    if (s.status === 'retired' || (s.status as string) === 'archived') return { label: 'Archived', cls: 'bg-gray-100 text-gray-500' }
    if (s.status === 'review')  return { label: 'In Review',   cls: 'bg-blue-50 text-blue-600' }
    if (cs === 'complete')      return { label: 'Ready',        cls: 'bg-emerald-50 text-emerald-700' }
    if (cs === 'progress')      return { label: 'In Progress',  cls: 'bg-amber-50 text-amber-600' }
    return { label: 'Draft', cls: 'bg-gray-100 text-gray-500' }
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'all',       label: 'All' },
    { key: 'ready',     label: 'Ready' },
    { key: 'review',    label: 'In Review' },
    { key: 'progress',  label: 'In Progress' },
    { key: 'missing',   label: 'Missing' },
    { key: 'published', label: 'Published' },
    { key: 'archived',  label: 'Archived' },
  ]

  // ── Loading & error states ─────────────────────────────────────────────────
  if (loading) return <div className="flex-1 flex flex-col overflow-hidden"><SkeletonHeaderBanner /><SkeletonSplitPane rows={8} /></div>

  if (loadError) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center max-w-sm">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="font-bold text-gray-700">Couldn&apos;t load stories</p>
          <p className="text-xs text-gray-400 mt-1">{loadError}</p>
          <button type="button" onClick={fetchStories}
            className="mt-4 bg-green-600 text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5 mx-auto">
            <RefreshCw className="w-3.5 h-3.5" /> Try again
          </button>
        </div>
      </div>
    )
  }

  // ── Story editor view ──────────────────────────────────────────────────────
  if (selected) {
    return (
      <div className="flex-1 flex flex-col overflow-auto bg-gray-50">
        {dialog}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setSelectedId(null)}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
              <ChevronLeft size={20} />
            </button>
            <div>
              <p className="text-[11px] text-gray-400 font-medium">Story Studio › {selected.title}</p>
              <h2 className="text-[16px] font-extrabold text-gray-800">Edit Story</h2>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusBadge(selected).cls}`}>
            {statusBadge(selected).label}
          </span>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <StoryEditor story={selected} onSaved={fetchStories} defaultLang={defaultLang} />
        </div>
      </div>
    )
  }

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {dialog}

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onOpenSidebar}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-100 text-gray-500">
              <Menu size={17} />
            </button>
            <div>
              <h1 className="text-[20px] sm:text-[22px] font-extrabold text-gray-900">Story Studio</h1>
              <p className="text-[12px] sm:text-[13px] text-gray-400 flex items-center gap-1.5">
                {stories.length} {stories.length === 1 ? 'story' : 'stories'} ·{' '}
                {stories.filter(s => s.status === 'published').length} published
                {refreshing && <RefreshCw size={11} className="animate-spin text-green-500 shrink-0" />}
              </p>
            </div>
          </div>

          {/* Search + Filter + New */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="text" placeholder="Search stories…" value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-[12px] sm:text-[13px] font-medium text-gray-700 focus:outline-none focus:border-green-300 w-40 sm:w-48 transition" />
              {search && (
                <button type="button" onClick={() => { setSearch(''); setPage(1) }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filter button with panel */}
            <div className="relative" ref={filterRef}>
              <button type="button" onClick={() => setShowFilter(o => !o)}
                className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-[12px] sm:text-[13px] font-medium transition ${
                  filterFree !== 'all'
                    ? 'border-green-300 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}>
                <Filter size={13} />
                <span className="hidden sm:inline">Filter</span>
                {filterFree !== 'all' && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
              </button>

              {showFilter && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-gray-100 rounded-2xl shadow-2xl z-40 py-2 overflow-hidden">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 pt-1 pb-2">Access Type</p>
                  {([
                    { value: 'all',     label: 'All Stories' },
                    { value: 'free',    label: '🆓 Free only' },
                    { value: 'premium', label: '👑 Premium only' },
                  ] as { value: FreeFilter; label: string }[]).map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => { setFilterFree(opt.value); setShowFilter(false); setPage(1) }}
                      className={`w-full text-left px-3 py-2.5 text-[12px] font-medium transition ${
                        filterFree === opt.value
                          ? 'bg-green-50 text-green-700 font-bold'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
              <button type="button" onClick={() => setView('list')}
                title="List view"
                className={`w-8 h-8 flex items-center justify-center transition ${view === 'list' ? 'bg-green-50 text-green-700' : 'text-gray-400 hover:bg-gray-50'}`}>
                <List size={14} />
              </button>
              <button type="button" onClick={() => setView('coverage')}
                title="Coverage matrix"
                className={`w-8 h-8 flex items-center justify-center transition ${view === 'coverage' ? 'bg-green-50 text-green-700' : 'text-gray-400 hover:bg-gray-50'}`}>
                <LayoutGrid size={14} />
              </button>
            </div>

            <button type="button" onClick={handleCreate} disabled={creating}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold text-[12px] sm:text-[13px] rounded-xl px-3 sm:px-4 py-2 shadow-sm shadow-green-100 transition disabled:opacity-50">
              <Plus size={15} />
              <span className="hidden sm:inline">New Story</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </div>

        {/* Tabs with counts */}
        <div className="flex gap-0 mt-4 border-b border-gray-100 -mb-px overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} type="button" onClick={() => { setTab(t.key); setPage(1) }}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-[12px] font-semibold border-b-2 whitespace-nowrap transition flex-shrink-0 ${
                tab === t.key
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}>
              {t.label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none ${
                tab === t.key ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {tabCounts[t.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table area */}
      <div className="flex-1 overflow-auto px-4 sm:px-6 py-4">
        {view === 'coverage' && (
          <StoryCoverageMatrix stories={filtered.length > 0 ? filtered : stories} onSelect={setSelectedId} />
        )}
        {view === 'list' && (<>

        {/* Bulk action bar */}
        {checkedIds.size > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 mb-3 flex items-center gap-3 text-[12px]">
            <span className="font-bold text-green-700">{checkedIds.size} selected</span>
            <button type="button" onClick={handleBulkPublish} disabled={bulkActing}
              className="font-bold text-emerald-600 bg-white border border-emerald-200 hover:bg-emerald-50 rounded-lg px-3 py-1.5 transition disabled:opacity-50">
              Go Live
            </button>
            <button type="button" onClick={handleBulkDelete} disabled={bulkActing}
              className="font-bold text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-lg px-3 py-1.5 transition disabled:opacity-50">
              Delete all
            </button>
            <button type="button" onClick={() => setCheckedIds(new Set())}
              className="font-medium text-gray-500 hover:text-gray-700 ml-auto flex items-center gap-1">
              <X size={12} /> Clear
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">

          {/* Select-all header */}
          {pageRows.length > 0 && (
            <div className="flex items-center gap-2 px-2 sm:px-3 py-2.5 border-b border-gray-50 bg-gray-50/60">
              <button type="button" onClick={selectAll}
                className="w-8 h-8 flex items-center justify-center shrink-0">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition ${
                  allOnPageChecked ? 'bg-green-600 border-green-600' : 'border-gray-300 hover:border-gray-400'
                }`}>
                  {allOnPageChecked && <CheckCircle2 size={10} className="text-white" />}
                </div>
              </button>
              <span className="text-[11px] font-semibold text-gray-400 flex-1">
                {checkedIds.size > 0 ? `${checkedIds.size} of ${pageRows.length} selected` : `${filtered.length} ${filtered.length === 1 ? 'story' : 'stories'}`}
              </span>
              <span className="text-[10px] text-gray-300 hidden sm:block w-20 text-center">Readiness</span>
              <span className="text-[10px] text-gray-300 hidden sm:block w-8 text-center">Free</span>
              <span className="text-[10px] text-gray-300 w-20 text-right">Status</span>
              <span className="w-9" />
            </div>
          )}

          {/* Story rows */}
          <div className="divide-y divide-gray-50">
            {pageRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-2.5 text-center px-6">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
                  <BookOpen size={20} className="text-gray-300" />
                </div>
                <div>
                  {(search || filterFree !== 'all') && stories.length > 0 ? (
                    <>
                      <p className="text-[13px] font-bold text-gray-600">No results</p>
                      <p className="text-[12px] text-gray-400 mt-0.5">
                        {search && filterFree !== 'all'
                          ? `No ${filterFree} stories matching "${search}" in this tab.`
                          : search
                            ? `No stories matching "${search}" in this tab.`
                            : `No ${filterFree} stories in this tab.`}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-[13px] font-bold text-gray-600">{TAB_EMPTY[tab].title}</p>
                      <p className="text-[12px] text-gray-400 mt-0.5">{TAB_EMPTY[tab].desc}</p>
                    </>
                  )}
                </div>
                {(search || filterFree !== 'all') && stories.length > 0 ? (
                  <button type="button"
                    onClick={() => { setSearch(''); setFilterFree('all'); setPage(1) }}
                    className="mt-1 flex items-center gap-1.5 border border-gray-200 hover:bg-gray-50 text-gray-600 text-[12px] font-bold px-4 py-2 rounded-xl transition">
                    <X size={13} /> Clear filters
                  </button>
                ) : tab === 'all' && (
                  <button type="button" onClick={handleCreate} disabled={creating}
                    className="mt-1 flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-[12px] font-bold px-4 py-2 rounded-xl transition disabled:opacity-50">
                    <Plus size={13} /> New Story
                  </button>
                )}
              </div>
            ) : pageRows.map(s => {
              const badge     = statusBadge(s)
              const readiness = getReadiness(s)
              const missing   = readiness.items.filter(i => !i.done)
              const sortedAll = [...stories].sort((a, b) => a.sort_order - b.sort_order)
              const sortedIdx = sortedAll.findIndex(x => x.id === s.id)
              return (
                <div key={s.id} className={`transition ${mutatingId === s.id ? 'opacity-40 pointer-events-none' : ''}`}>
                  <div className="flex items-center gap-0 px-1 sm:px-2 hover:bg-gray-50/60 transition">
                    {/* Checkbox */}
                    <button type="button" onClick={e => { e.stopPropagation(); toggleSelect(s.id) }}
                      className="w-8 h-8 flex items-center justify-center shrink-0">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition ${
                        checkedIds.has(s.id) ? 'bg-green-600 border-green-600' : 'border-gray-300'
                      }`}>
                        {checkedIds.has(s.id) && <CheckCircle2 size={10} className="text-white" />}
                      </div>
                    </button>

                    {/* Sort order arrows — hidden on mobile to save space */}
                    <div className="hidden sm:flex flex-col shrink-0">
                      <button type="button"
                        disabled={sortedIdx === 0}
                        onClick={e => { e.stopPropagation(); handleReorder(s, 'up') }}
                        className="w-5 h-4 flex items-center justify-center text-gray-300 hover:text-green-600 disabled:opacity-20 disabled:pointer-events-none transition">
                        <ChevronUp size={12} />
                      </button>
                      <button type="button"
                        disabled={sortedIdx === sortedAll.length - 1}
                        onClick={e => { e.stopPropagation(); handleReorder(s, 'down') }}
                        className="w-5 h-4 flex items-center justify-center text-gray-300 hover:text-green-600 disabled:opacity-20 disabled:pointer-events-none transition">
                        <ChevronDown size={12} />
                      </button>
                    </div>

                    {/* Row body */}
                    <button type="button"
                      className="flex-1 flex items-center gap-3 pr-2 sm:pr-3 py-3.5 text-left min-w-0"
                      onClick={() => setSelectedId(s.id)}>
                      {/* Thumbnail */}
                      {s.cover_url ? (
                        <img src={getStorageUrl(s.cover_url)} alt="" loading="lazy"
                          className="w-10 h-10 rounded-xl object-cover border border-gray-100 flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 font-bold text-[13px] flex-shrink-0">
                          {s.sort_order}
                        </div>
                      )}

                      {/* Name + age */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-gray-800 truncate">{s.title}</p>
                        <p className="text-[11px] text-gray-400">{formatAge(s.age_min, s.age_max)}</p>
                      </div>

                      {/* Readiness bar */}
                      <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0 w-20">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              readiness.score === 100 ? 'bg-emerald-500'
                              : readiness.score >= 50  ? 'bg-green-400'
                              :                          'bg-amber-400'
                            }`}
                            style={{ width: `${readiness.score}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 w-7 text-right tabular-nums">
                          {readiness.score}%
                        </span>
                      </div>

                      {/* Free badge */}
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 hidden sm:inline-block ${
                        s.is_free ? 'bg-emerald-50 text-emerald-600' : 'bg-violet-50 text-violet-600'
                      }`}>
                        {s.is_free ? '🆓' : '👑'}
                      </span>

                      {/* Status badge */}
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0 leading-none ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </button>

                    {/* Context menu */}
                    <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <button type="button" onClick={() => setOpenMenuId(openMenuId === s.id ? null : s.id)}
                        className="w-9 h-9 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition">
                        <MoreVertical size={15} />
                      </button>
                      {openMenuId === s.id && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setOpenMenuId(null)} />
                          <div className="fixed sm:absolute right-4 sm:right-0 bottom-4 sm:bottom-auto sm:top-full sm:mt-1 w-[calc(100vw-32px)] sm:w-48 bg-white border border-gray-100 rounded-2xl shadow-2xl z-40 py-2">
                            <p className="px-4 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-wide sm:hidden">{s.title}</p>
                            <button type="button" onClick={() => { setOpenMenuId(null); setSelectedId(s.id) }}
                              className="w-full text-left px-4 py-3 sm:py-2.5 text-[13px] sm:text-[12px] font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition">
                              <Pencil size={15} className="text-gray-400" /> Edit Story
                            </button>
                            <button type="button" onClick={() => { setOpenMenuId(null); handleDuplicate(s) }}
                              className="w-full text-left px-4 py-3 sm:py-2.5 text-[13px] sm:text-[12px] font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition">
                              <Copy size={15} className="text-gray-400" /> Duplicate
                            </button>
                            <div className="border-t border-gray-100 my-1" />
                            <button type="button" onClick={() => { setOpenMenuId(null); handleDelete(s) }}
                              className="w-full text-left px-4 py-3 sm:py-2.5 text-[13px] sm:text-[12px] font-medium text-red-600 hover:bg-red-50 flex items-center gap-3 transition">
                              <Trash2 size={15} className="text-red-400" /> Delete
                            </button>
                            <button type="button" onClick={() => setOpenMenuId(null)}
                              className="w-full text-center py-3 text-[13px] font-bold text-gray-400 hover:text-gray-600 sm:hidden transition">
                              Cancel
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Missing items inline (on missing tab) */}
                  {tab === 'missing' && missing.length > 0 && (
                    <div className="px-4 sm:px-5 pb-3 -mt-1">
                      <div className="ml-[52px] flex flex-wrap gap-1">
                        {missing.map(m => (
                          <span key={m.key}
                            className="text-[10px] font-medium text-red-500 bg-red-50 border border-red-100 rounded-md px-2 py-0.5">
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
            <span>{filtered.length} {filtered.length === 1 ? 'story' : 'stories'}</span>
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pageClamped <= 1}
                className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center disabled:opacity-30 transition text-gray-500">
                <ChevronLeft size={14} />
              </button>

              {getPages(pageClamped, totalPages).map((n, i) =>
                n === null ? (
                  <span key={`ellipsis-${i}`} className="w-7 h-7 flex items-center justify-center text-gray-300 text-[12px]">…</span>
                ) : (
                  <button key={n} type="button" onClick={() => setPage(n)}
                    className={`w-7 h-7 rounded-lg text-[11px] font-bold transition ${
                      n === pageClamped ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                    }`}>
                    {n}
                  </button>
                )
              )}

              <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={pageClamped >= totalPages}
                className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center disabled:opacity-30 transition text-gray-500">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
        </>)}
      </div>
    </div>
  )
}

// ── Coverage Matrix ───────────────────────────────────────────────────────────
const LANGS_COVERAGE = ['en', 'fr', 'rw'] as const

function StoryCoverageMatrix({ stories, onSelect }: { stories: StoryRow[]; onSelect: (id: string) => void }) {
  const slotMedia = (s: StoryRow, slotKey: string, lang: string): boolean => {
    const slot = (s.story_slots ?? []).find(sl => sl.slot_key === slotKey)
    if (!slot?.missions) return false
    return (slot.missions.mission_versions ?? []).some(v => v.language === lang && v.media_url)
  }

  const allComplete  = stories.filter(s => computeReadiness(s).score === 100).length
  const avgScore     = stories.length > 0
    ? Math.round(stories.reduce((a, s) => a + computeReadiness(s).score, 0) / stories.length)
    : 0

  return (
    <div>
      {/* Summary pills */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-gray-100 text-gray-600">{stories.length} stories</span>
        <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700">{allComplete} fully complete</span>
        <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full ${avgScore >= 80 ? 'bg-emerald-50 text-emerald-700' : avgScore >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>
          Avg {avgScore}% coverage
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-[12px] min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-[180px]">Story</th>
              <th className="px-2 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-center">Cover</th>
              <th className="px-2 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-center">FlipFlop</th>
              <th className="px-2 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-center">PDF</th>
              <th className="px-2 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-center">Coloring</th>
              <th className="px-2 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-center">Move</th>
              <th className="px-2 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-center">Sing</th>
              <th className="px-2 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-center">Bonus</th>
              <th className="px-2 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-center">Score</th>
              <th className="px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {stories.map(s => {
              const score = computeReadiness(s).score
              const hasFlipFlop = (s.story_pages ?? []).length > 0
              const hasColoring = (s.coloring_pages ?? []).length > 0
              return (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/40 transition">
                  <td className="px-4 py-3">
                    <p className="font-bold text-gray-800 truncate max-w-[170px]">{s.title}</p>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      s.status === 'published' ? 'bg-emerald-50 text-emerald-600'
                      : s.status === 'review'  ? 'bg-blue-50 text-blue-600'
                      : s.status === 'retired' ? 'bg-zinc-100 text-zinc-500'
                      : 'bg-gray-100 text-gray-500'
                    }`}>{s.status}</span>
                  </td>
                  <td className="px-2 py-3 text-center">
                    {s.cover_url
                      ? <CheckCircle2 size={14} className="text-emerald-500 mx-auto" />
                      : <XCircle     size={14} className="text-red-200   mx-auto" />}
                  </td>
                  <td className="px-2 py-3 text-center">
                    {hasFlipFlop
                      ? <span className="text-[10px] font-bold text-emerald-600">{(s.story_pages ?? []).length}p</span>
                      : <XCircle size={14} className="text-red-200 mx-auto" />}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex gap-0.5 justify-center">
                      {LANGS_COVERAGE.map(l => (
                        <span key={l} title={l.toUpperCase()}
                          className={`w-2 h-2 rounded-full ${slotMedia(s, 'story_pdf', l) ? 'bg-emerald-400' : 'bg-red-200'}`} />
                      ))}
                    </div>
                  </td>
                  <td className="px-2 py-3 text-center">
                    {hasColoring
                      ? <span className="text-[10px] font-bold text-emerald-600">{(s.coloring_pages ?? []).length}p</span>
                      : <XCircle size={14} className="text-red-200 mx-auto" />}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex gap-0.5 justify-center">
                      {LANGS_COVERAGE.map(l => (
                        <span key={l} title={l.toUpperCase()}
                          className={`w-2 h-2 rounded-full ${slotMedia(s, 'move_explore', l) ? 'bg-emerald-400' : 'bg-red-200'}`} />
                      ))}
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex gap-0.5 justify-center">
                      {LANGS_COVERAGE.map(l => (
                        <span key={l} title={l.toUpperCase()}
                          className={`w-2 h-2 rounded-full ${slotMedia(s, 'sing_along', l) ? 'bg-emerald-400' : 'bg-red-200'}`} />
                      ))}
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex gap-0.5 justify-center">
                      {LANGS_COVERAGE.map(l => (
                        <span key={l} title={l.toUpperCase()}
                          className={`w-2 h-2 rounded-full ${slotMedia(s, 'bonus_video', l) ? 'bg-emerald-400' : 'bg-red-200'}`} />
                      ))}
                    </div>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      score === 100 ? 'bg-emerald-100 text-emerald-700'
                      : score >= 60  ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-600'
                    }`}>{score}%</span>
                  </td>
                  <td className="px-2 py-3">
                    <button type="button" onClick={() => onSelect(s.id)}
                      className="flex items-center gap-1 text-[11px] font-bold text-green-600 hover:text-green-700">
                      Edit <ArrowRight size={11} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
