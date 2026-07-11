'use client'

import { useState } from 'react'
import { Eye, Rocket, XCircle, CheckCircle2, AlertCircle, ChevronDown, ClipboardCheck } from 'lucide-react'
import { computeReadiness } from '@/lib/storyReadiness'
import ReadinessRing from '@/components/admin/story-readiness/ReadinessRing'
import ReadinessBadge from '@/components/admin/story-readiness/ReadinessBadge'

interface StoryData {
  id: string
  title: string
  slug: string
  status: string
  cover_url: string | null
  story_versions: any[]
  story_slots: any[]
}

interface Props {
  stories: StoryData[]
  selected: Set<string>
  onToggleSelect: (id: string) => void
  onSelectAll: () => void
  onPreview: (slug: string) => void
  onPublish: (id: string) => void
  onUnpublish: (id: string) => void
  onViewChecklist: (story: StoryData) => void
  onEdit: (id: string) => void
}

const LANG_FLAGS: Record<string, string> = { en: '🇬🇧', fr: '🇫🇷', rw: '🇷🇼' }

function LangBadge({ lang, versions }: { lang: string; versions: any[] }) {
  const v = versions.find((sv: any) => sv.language === lang)
  const status = v?.published ? 'complete' : v ? 'incomplete' : 'missing'
  const cls = status === 'complete' ? 'bg-emerald-100 text-emerald-700' : status === 'incomplete' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'
  const icon = status === 'complete' ? <CheckCircle2 size={10} /> : status === 'incomplete' ? <AlertCircle size={10} /> : <XCircle size={10} />

  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${cls}`}>
      {icon} {lang}
    </span>
  )
}

export default function PublishingTable({ stories, selected, onToggleSelect, onSelectAll, onPreview, onPublish, onUnpublish, onViewChecklist, onEdit }: Props) {
  const allSelected = stories.length > 0 && selected.size === stories.length

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/50">
            <th className="px-4 py-3 w-10">
              <input type="checkbox" checked={allSelected} onChange={onSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
            </th>
            {['Story', 'Readiness', 'Languages', 'Status', 'Actions'].map(h => (
              <th key={h} className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stories.length === 0 ? (
            <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-[13px]">No stories match the filter.</td></tr>
          ) : stories.map(s => {
            const r = computeReadiness(s)
            const canPublish = r.score === 100 && s.story_versions.some((v: any) => v.published)
            const isPublished = s.status === 'published'

            return (
              <tr key={s.id} className={`border-b border-gray-50 transition ${selected.has(s.id) ? 'bg-green-50/30' : 'hover:bg-gray-50/50'}`}>
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.has(s.id)} onChange={() => onToggleSelect(s.id)}
                    className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => onEdit(s.id)} className="text-left hover:underline">
                    <p className="text-[13px] font-bold text-gray-800">{s.title}</p>
                    <p className="text-[10px] text-gray-400">{s.slug}</p>
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ReadinessRing score={r.score} size={36} strokeWidth={4} />
                    <div>
                      <span className="text-[13px] font-bold text-gray-700">{r.score}%</span>
                      <button onClick={() => onViewChecklist(s)} className="block text-[10px] text-green-600 hover:text-green-800 font-medium">
                        View checklist
                      </button>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {['en', 'fr', 'rw'].map(lang => (
                      <LangBadge key={lang} lang={lang} versions={s.story_versions} />
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <ReadinessBadge status={r.status} statusLabel={isPublished ? 'Published' : r.statusLabel} statusColor={isPublished ? 'emerald' : r.statusColor} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => onPreview(s.slug)} title="Preview"
                      className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-green-600 hover:border-green-200 transition">
                      <Eye size={14} />
                    </button>
                    {isPublished ? (
                      <button onClick={() => onUnpublish(s.id)} title="Unpublish"
                        className="w-8 h-8 rounded-lg border border-red-200 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 transition">
                        <XCircle size={14} />
                      </button>
                    ) : (
                      <button onClick={() => onPublish(s.id)} disabled={!canPublish} title={canPublish ? 'Publish' : 'Not ready'}
                        className="w-8 h-8 rounded-lg border border-emerald-200 flex items-center justify-center text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 transition disabled:opacity-30 disabled:cursor-not-allowed">
                        <Rocket size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
