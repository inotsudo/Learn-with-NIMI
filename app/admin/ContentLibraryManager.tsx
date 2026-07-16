'use client'
import React, { useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import { getStorageUrl } from '@/lib/queries'
import { Menu, Search, Headphones, FileText, Video, Music, Palette, Image as ImageIcon, Upload, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react'
import { useToast } from './Toast'

interface Props {
  onNavigate: (table: string) => void
  onOpenSidebar?: () => void
}

type ContentTab = 'all' | 'flipflop' | 'pdfs' | 'videos' | 'audio' | 'coloring' | 'images'

interface ContentItem {
  id: string
  type: ContentTab
  title: string
  story: string
  language: string
  media_url: string | null
  published: boolean
}

const TABS: { key: ContentTab; label: string; icon: any; color: string }[] = [
  { key: 'all',      label: 'All Content',    icon: null,        color: '' },
  { key: 'flipflop', label: 'FlipFlop Books', icon: Headphones,  color: 'bg-purple-100 text-purple-600' },
  { key: 'pdfs',     label: 'PDFs',           icon: FileText,    color: 'bg-blue-100 text-blue-600' },
  { key: 'videos',   label: 'Videos',         icon: Video,       color: 'bg-red-100 text-red-600' },
  { key: 'audio',    label: 'Audio',          icon: Music,       color: 'bg-pink-100 text-pink-600' },
  { key: 'coloring', label: 'Coloring',       icon: Palette,     color: 'bg-orange-100 text-orange-600' },
  { key: 'images',   label: 'Images',         icon: ImageIcon,   color: 'bg-teal-100 text-teal-600' },
]

const TYPE_MAP: Record<string, ContentTab> = { story: 'flipflop', read: 'pdfs', watch: 'videos', sing: 'audio', color: 'coloring', move: 'videos' }

export default function ContentLibraryManager({ onNavigate, onOpenSidebar }: Props) {
  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<ContentTab>('all')
  const [search, setSearch] = useState('')
  const { error: toastErr } = useToast()

  useEffect(() => {
    void (async () => {
      try {
        const [{ data: slots }, { data: stories }, { data: missions }, { data: versions }] = await Promise.all([
          supabase.from('story_slots').select('story_id, slot_key, mission_id'),
          supabase.from('stories').select('id, title').order('sort_order'),
          supabase.from('missions').select('id, type'),
          supabase.from('mission_versions').select('id, mission_id, language, title, media_url, published'),
        ])

        const result: ContentItem[] = []
        for (const v of versions ?? []) {
          const m = (missions ?? []).find(ms => ms.id === v.mission_id)
          if (!m) continue
          const slot = (slots ?? []).find(s => s.mission_id === v.mission_id)
          const story = slot ? (stories ?? []).find(s => s.id === slot.story_id) : null
          result.push({
            id: v.id,
            type: TYPE_MAP[m.type] ?? 'flipflop',
            title: v.title ?? 'Untitled',
            story: story?.title ?? 'Unassigned',
            language: v.language,
            media_url: v.media_url,
            published: v.published,
          })
        }
        setItems(result)
      } catch (err) {
        console.error('[ContentLibraryManager] load failed:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handleSaveUrl = async (id: string, url: string) => {
    try {
      const { error } = await supabase.from('mission_versions').update({ media_url: url || null }).eq('id', id)
      if (error) throw error
      setItems(prev => prev.map(i => i.id === id ? { ...i, media_url: url || null } : i))
    } catch (err) {
      console.error('[ContentLibraryManager] handleSaveUrl failed:', err)
      toastErr(err instanceof Error ? err.message : 'Save failed')
    }
  }

  const filtered = items.filter(i => {
    if (tab !== 'all' && i.type !== tab) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return i.title.toLowerCase().includes(q) || i.story.toLowerCase().includes(q)
    }
    return true
  })

  const counts = TABS.filter(t => t.key !== 'all').reduce<Record<string, number>>((acc, t) => {
    acc[t.key] = items.filter(i => i.type === t.key).length
    return acc
  }, {})

  const withMedia = items.filter(i => i.media_url).length

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-5 flex-shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={onOpenSidebar} className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-gray-500">
              <Menu size={17} />
            </button>
            <div>
              <h1 className="text-[22px] font-extrabold text-gray-900">Content Library</h1>
              <p className="text-[13px] text-gray-500">All your story content in one place.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[12px] font-bold px-3 py-1.5 rounded-full ${withMedia === items.length && items.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-600'}`}>
              {withMedia}/{items.length} have media
            </span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search content..." value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-[13px] font-medium text-gray-700 focus:outline-none focus:border-green-500 w-48" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition whitespace-nowrap ${
                tab === t.key ? 'bg-green-50 text-green-700' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
              }`}>
              {t.icon && <t.icon size={14} />}
              {t.label}
              {t.key !== 'all' && <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full ml-0.5">{counts[t.key] ?? 0}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Palette size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-[14px] font-bold text-gray-400">No content found.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['Type', 'Title', 'Story', 'Language', 'Media', 'Status'].map(h => (
                    <th key={h} className="px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const tabMeta = TABS.find(t => t.key === item.type)
                  return (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                      <td className="px-5 py-3">
                        {tabMeta?.icon && (
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tabMeta.color}`}>
                            <tabMeta.icon size={14} />
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-[13px] font-bold text-gray-800">{item.title}</td>
                      <td className="px-5 py-3 text-[12px] text-gray-500">{item.story}</td>
                      <td className="px-5 py-3">
                        <span className="text-[10px] font-bold uppercase bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{item.language}</span>
                      </td>
                      <td className="px-5 py-3">
                        <input type="text" defaultValue={item.media_url ?? ''} placeholder="Upload or paste URL..."
                          onBlur={e => handleSaveUrl(item.id, e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-[11px] font-medium text-gray-600 focus:outline-none focus:border-green-500 max-w-[200px]" />
                      </td>
                      <td className="px-5 py-3">
                        {item.media_url ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600"><CheckCircle2 size={12} /> Set</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500"><AlertCircle size={12} /> Missing</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
