'use client'
import React, { useEffect, useState, useMemo } from 'react'
import supabase from '@/lib/supabaseClient'
import { Menu, Rocket, XCircle, Archive } from 'lucide-react'
import { computeReadiness } from '@/lib/storyReadiness'
import { useToast } from './Toast'
import { useConfirmDialog } from './ConfirmDialog'
import { logAdminAction } from '@/lib/adminAuditLog'
import PublishingStats from '@/components/admin/publishing/PublishingStats'
import PublishingFilters, { type PublishingFilter } from '@/components/admin/publishing/PublishingFilters'
import PublishingTable from '@/components/admin/publishing/PublishingTable'
import PublishingChecklistModal from '@/components/admin/publishing/PublishingChecklistModal'

interface Props {
  onNavigate: (table: string) => void
  onOpenSidebar?: () => void
}

interface StoryData {
  id: string; title: string; slug: string; status: string; cover_url: string | null;
  story_versions: {
    language: string;
    published: boolean;
    intro_video_url?: string | null;
    theme_song_url?: string | null;
    meet_characters_url?: string | null;
    story_intro_url?: string | null;
  }[];
  story_slots: {
    story_id: string;
    slot_key: string;
    mission_id: string | null;
  }[];
}

export default function StoryPublishingManager({ onNavigate, onOpenSidebar }: Props) {
  const { success: toastOk, error: toastErr } = useToast()
  const { confirm, dialog } = useConfirmDialog()

  const [stories, setStories] = useState<StoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<PublishingFilter>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [checklistStory, setChecklistStory] = useState<StoryData | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data: storiesData } = await supabase.from('stories')
        .select('id, title, slug, status, cover_url, story_versions(id, story_id, language, published, intro_video_url, theme_song_url, meet_characters_url, story_intro_url), story_slots(story_id, slot_key, mission_id)')
        .order('sort_order')
      setStories((storiesData ?? []) as unknown as StoryData[])
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Failed to load stories.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

const filtered = useMemo(() => {
    let list = stories
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(s => s.title.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q))
    }
    if (filter !== 'all') {
      list = list.filter(s => {
        const r = computeReadiness(s)
        if (filter === 'draft') return s.status === 'draft'
        if (filter === 'review') return s.status === 'review'
        if (filter === 'published') return s.status === 'published'
        if (filter === 'retired') return s.status === 'retired'
        if (filter === 'ready') return r.score === 100 && s.status !== 'published'
        if (filter === 'missing') return r.score < 100
        return true
      })
    }
    return list
  }, [stories, filter, search])

  const stats = useMemo(() => {
    const published = stories.filter(s => s.status === 'published').length
    const ready = stories.filter(s => { const r = computeReadiness(s); return r.score === 100 && s.status !== 'published' }).length
    const review = stories.filter(s => s.status === 'review').length
    const missing = stories.filter(s => computeReadiness(s).score < 100).length
    return { published, ready, review, missing }
  }, [stories])

  const handlePublish = async (id: string) => {
    const story = stories.find(s => s.id === id)
    const title = story?.title ?? id
    if (!await confirm({
      title: `Publish "${title}"?`,
      message: 'This makes the story live for all learners immediately.',
      confirmLabel: 'Publish',
      danger: false,
    })) return
    try {
      await supabase.from('stories').update({ status: 'published', published_at: new Date().toISOString() }).eq('id', id)
      // Auto-warm story knowledge cache + seed concept graph — fire-and-forget
      // First child to read this story will always get a cache hit, never pay AI cost.
      void fetch('/api/admin/warm-story-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId: id }),
      }).catch(err => toastErr(`Cache warm failed: ${err instanceof Error ? err.message : String(err)}`))
      toastOk(`"${title}" is now live.`)
      void logAdminAction({ action: 'publish_story', entityType: 'story', entityId: id, entityLabel: title })
      await load()
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Failed to publish story.')
    }
  }

  const handleUnpublish = async (id: string) => {
    const story = stories.find(s => s.id === id)
    const title = story?.title ?? id
    if (!await confirm({
      title: `Unpublish "${title}"?`,
      message: 'Learners currently using this story will lose access.',
      confirmLabel: 'Unpublish',
      danger: true,
    })) return
    try {
      await supabase.from('stories').update({ status: 'draft', published_at: null }).eq('id', id)
      toastOk(`"${title}" unpublished.`)
      void logAdminAction({ action: 'unpublish_story', entityType: 'story', entityId: id, entityLabel: title })
      await load()
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Failed to unpublish story.')
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selected.size === 0) return
    const count = selected.size
    const ids = Array.from(selected)

    if (action === 'retire') {
      if (!await confirm({
        title: `Retire ${count} ${count === 1 ? 'story' : 'stories'}?`,
        message: 'Retired stories are hidden from learners and cannot be easily restored.',
        confirmLabel: 'Retire',
        danger: true,
      })) return
    } else if (action === 'unpublish') {
      if (!await confirm({
        title: `Unpublish ${count} ${count === 1 ? 'story' : 'stories'}?`,
        message: 'This removes them from the learner library immediately.',
        confirmLabel: 'Unpublish',
        danger: true,
      })) return
    }

    try {
      if (action === 'publish') {
        for (const id of ids) {
          const s = stories.find(st => st.id === id)
          if (!s) continue
          const r = computeReadiness(s)
          if (r.score === 100 && s.story_versions.some((v: any) => v.published)) {
            await supabase.from('stories').update({ status: 'published', published_at: new Date().toISOString() }).eq('id', id)
          }
        }
        toastOk('Published eligible stories.')
        void logAdminAction({ action: 'bulk_publish_stories', entityType: 'story', entityId: ids.join(','), entityLabel: `${count} stories`, metadata: { count } })
      } else if (action === 'unpublish') {
        await supabase.from('stories').update({ status: 'draft', published_at: null }).in('id', ids)
        toastOk(`${count} ${count === 1 ? 'story' : 'stories'} unpublished.`)
        void logAdminAction({ action: 'bulk_unpublish_stories', entityType: 'story', entityId: ids.join(','), entityLabel: `${count} stories`, metadata: { count } })
      } else if (action === 'retire') {
        await supabase.from('stories').update({ status: 'retired' }).in('id', ids)
        toastOk(`${count} ${count === 1 ? 'story' : 'stories'} retired.`)
        void logAdminAction({ action: 'bulk_retire_stories', entityType: 'story', entityId: ids.join(','), entityLabel: `${count} stories`, metadata: { count } })
      }
      setSelected(new Set())
      await load()
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Bulk action failed.')
    }
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(s => s.id)))
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-5 flex-shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={onOpenSidebar} className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-gray-500">
              <Menu size={17} />
            </button>
            <div>
              <h1 className="text-[22px] font-extrabold text-gray-900">Story Publishing Center</h1>
              <p className="text-[13px] text-gray-500">Review readiness and publish stories for children.</p>
            </div>
          </div>
          {selected.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-gray-500">{selected.size} selected</span>
              <button onClick={() => void handleBulkAction('publish')}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[12px] rounded-lg px-3 py-2 transition">
                <Rocket size={14} /> Publish
              </button>
              <button onClick={() => void handleBulkAction('unpublish')}
                className="flex items-center gap-1.5 bg-gray-600 hover:bg-gray-700 text-white font-bold text-[12px] rounded-lg px-3 py-2 transition">
                <XCircle size={14} /> Unpublish
              </button>
              <button onClick={() => void handleBulkAction('retire')}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-[12px] rounded-lg px-3 py-2 transition">
                <Archive size={14} /> Retire
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4 space-y-5">
        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
            <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
          </div>
        ) : (
          <>
            <PublishingStats {...stats} />
            <PublishingFilters filter={filter} onFilterChange={f => { setFilter(f); setSelected(new Set()) }} search={search} onSearchChange={setSearch} />
            <PublishingTable
              stories={filtered}
              selected={selected}
              onToggleSelect={toggleSelect}
              onSelectAll={selectAll}
              onPreview={slug => window.open(`/stories/${slug}?preview=true`, '_blank')}
              onPublish={handlePublish}
              onUnpublish={handleUnpublish}
              onViewChecklist={setChecklistStory}
              onEdit={id => onNavigate(`stories:${id}`)}
            />
          </>
        )}
      </div>

      {/* Checklist modal */}
      {checklistStory && (
        <PublishingChecklistModal story={checklistStory} onClose={() => setChecklistStory(null)} />
      )}

      {dialog}
    </div>
  )
}
