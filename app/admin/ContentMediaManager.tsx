'use client'
import React, { useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import { getStorageUrl } from '@/lib/queries'
import { Menu, ExternalLink, Upload, CheckCircle2, AlertCircle, Search } from 'lucide-react'

interface Props {
  title: string
  description: string
  missionType: string
  mediaField: 'media_url'
  onNavigate: (table: string) => void
  onOpenSidebar?: () => void
}

interface MediaRow {
  version_id: string
  mission_id: string
  language: string
  title: string
  media_url: string | null
  published: boolean
  story_title: string
  slot_key: string
}

export default function ContentMediaManager({ title, description, missionType, mediaField, onNavigate, onOpenSidebar }: Props) {
  const [rows, setRows] = useState<MediaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    void (async () => {
      const { data: slots } = await supabase.from('story_slots').select('story_id, slot_key, mission_id')
      const { data: stories } = await supabase.from('stories').select('id, title').order('sort_order')
      const { data: missions } = await supabase.from('missions').select('id, type')
      const { data: versions } = await supabase.from('mission_versions').select('id, mission_id, language, title, media_url, published')

      const typedMissions = (missions ?? []).filter(m => m.type === missionType)
      const result: MediaRow[] = []

      for (const m of typedMissions) {
        const slot = (slots ?? []).find(s => s.mission_id === m.id)
        const story = slot ? (stories ?? []).find(s => s.id === slot.story_id) : null
        const mvs = (versions ?? []).filter(v => v.mission_id === m.id)

        for (const v of mvs) {
          result.push({
            version_id: v.id,
            mission_id: m.id,
            language: v.language,
            title: v.title ?? 'Untitled',
            media_url: v.media_url,
            published: v.published,
            story_title: story?.title ?? 'Unassigned',
            slot_key: slot?.slot_key ?? '',
          })
        }
      }
      setRows(result)
      setLoading(false)
    })()
  }, [missionType])

  const handleSave = async (versionId: string, url: string) => {
    await supabase.from('mission_versions').update({ media_url: url || null }).eq('id', versionId)
    setRows(prev => prev.map(r => r.version_id === versionId ? { ...r, media_url: url || null } : r))
  }

  const filtered = search.trim()
    ? rows.filter(r => r.title.toLowerCase().includes(search.toLowerCase()) || r.story_title.toLowerCase().includes(search.toLowerCase()))
    : rows

  const withMedia = rows.filter(r => r.media_url).length
  const total = rows.length

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-5 flex-shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={onOpenSidebar} className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-gray-500">
              <Menu size={17} />
            </button>
            <div>
              <h1 className="text-[22px] font-extrabold text-gray-900">{title}</h1>
              <p className="text-[13px] text-gray-500">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-[12px] font-bold px-3 py-1.5 rounded-full ${withMedia === total && total > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-600'}`}>
              {withMedia}/{total} have media
            </span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-[13px] font-medium text-gray-700 focus:outline-none focus:border-indigo-300 w-44" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-[14px] font-medium">No content found for this type.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['Story', 'Mission', 'Language', 'Media URL', 'Status', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.version_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                    <td className="px-5 py-3 text-[13px] font-medium text-gray-700">{r.story_title}</td>
                    <td className="px-5 py-3 text-[13px] font-bold text-gray-800">{r.title}</td>
                    <td className="px-5 py-3">
                      <span className="text-[10px] font-bold uppercase bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{r.language}</span>
                    </td>
                    <td className="px-5 py-3">
                      <input type="text" defaultValue={r.media_url ?? ''}
                        onBlur={e => handleSave(r.version_id, e.target.value)}
                        placeholder="Paste media URL..."
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] font-medium text-gray-600 focus:outline-none focus:border-indigo-300" />
                    </td>
                    <td className="px-5 py-3">
                      {r.media_url ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600"><CheckCircle2 size={12} /> Set</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500"><AlertCircle size={12} /> Missing</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {r.media_url && (
                        <a href={r.media_url.startsWith('http') ? r.media_url : getStorageUrl(r.media_url)} target="_blank" rel="noreferrer"
                          className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:border-indigo-200 transition">
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
