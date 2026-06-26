'use client'
import React, { useEffect, useState, useMemo } from 'react'
import supabase from '@/lib/supabaseClient'
import { Menu, Rocket, XCircle, Archive } from 'lucide-react'
import { computeReadiness } from '@/lib/storyReadiness'
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
  story_versions: any[]; story_slots: any[];
}

export default function StoryPublishingManager({ onNavigate, onOpenSidebar }: Props) {
  const [stories, setStories] = useState<StoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<PublishingFilter>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [checklistStory, setChecklistStory] = useState<StoryData | null>(null)
  const [bulkAction, setBulkAction] = useState<string | null>(null)

  const load = async () => {
    const { data: storiesData } = await supabase.from('stories')
      .select('id, title, slug, status, cover_url, story_versions(id, story_id, language, published, intro_video_url, theme_song_url, meet_characters_url, story_intro_url), story_slots(story_id, slot_key, mission_id)')
      .order('sort_order')
    setStories((storiesData ?? []) as unknown as StoryData[])
    setLoading(false)
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
    await supabase.from('stories').update({ status: 'published', published_at: new Date().toISOString() }).eq('id', id)
    await load()
  }

  const handleUnpublish = async (id: string) => {
    await supabase.from('stories').update({ status: 'draft', published_at: null }).eq('id', id)
    await load()
  }

  const handleBulkAction = async (action: string) => {
    if (selected.size === 0) return
    const ids = Array.from(selected)

    if (action === 'publish') {
      for (const id of ids) {
        const s = stories.find(st => st.id === id)
        if (!s) continue
        const r = computeReadiness(s)
        if (r.score === 100 && s.story_versions.some((v: any) => v.published)) {
          await supabase.from('stories').update({ status: 'published', published_at: new Date().toISOString() }).eq('id', id)
        }
      }
    } else if (action === 'unpublish') {
      await supabase.from('stories').update({ status: 'draft', published_at: null }).in('id', ids)
    } else if (action === 'retire') {
      await supabase.from('stories').update({ status: 'retired' }).in('id', ids)
    }

    setSelected(new Set())
    setBulkAction(null)
    await load()
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
              <button onClick={() => setBulkAction('publish')}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[12px] rounded-lg px-3 py-2 transition">
                <Rocket size={14} /> Publish
              </button>
              <button onClick={() => setBulkAction('unpublish')}
                className="flex items-center gap-1.5 bg-gray-600 hover:bg-gray-700 text-white font-bold text-[12px] rounded-lg px-3 py-2 transition">
                <XCircle size={14} /> Unpublish
              </button>
              <button onClick={() => setBulkAction('retire')}
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

      {/* Bulk action confirmation */}
      {bulkAction && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setBulkAction(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 max-w-sm w-full text-center">
              <h3 className="text-[16px] font-extrabold text-gray-800 mb-2">
                {bulkAction === 'publish' ? 'Publish' : bulkAction === 'unpublish' ? 'Unpublish' : 'Retire'} {selected.size} stor{selected.size === 1 ? 'y' : 'ies'}?
              </h3>
              <p className="text-[13px] text-gray-500 mb-4">
                {bulkAction === 'publish' ? 'Only stories with 100% readiness and at least one published language will be published.' :
                 bulkAction === 'retire' ? 'Retired stories will no longer be visible to children.' :
                 'Stories will be moved back to draft status.'}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setBulkAction(null)}
                  className="flex-1 border border-gray-200 text-gray-600 font-bold text-[13px] rounded-xl py-2.5 hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button onClick={() => handleBulkAction(bulkAction)}
                  className={`flex-1 text-white font-bold text-[13px] rounded-xl py-2.5 transition ${
                    bulkAction === 'publish' ? 'bg-emerald-600 hover:bg-emerald-700' :
                    bulkAction === 'retire' ? 'bg-red-600 hover:bg-red-700' :
                    'bg-gray-600 hover:bg-gray-700'
                  }`}>
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
