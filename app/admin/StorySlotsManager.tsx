'use client'
import React, { useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import { Menu, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'
import { SLOT_META, type SlotKey } from './missionMeta'
import { useToast } from './Toast'

interface Props {
  onNavigate: (table: string) => void
  onOpenSidebar?: () => void
}

interface StorySlotRow {
  story_id: string
  slot_key: string
  mission_id: string | null
  sort_order: number
  story_title: string
  story_slug: string
  mission_title: string | null
  published: boolean
}

export default function StorySlotsManager({ onNavigate, onOpenSidebar }: Props) {
  const { error: toastErr } = useToast()
  const [rows, setRows] = useState<StorySlotRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const [{ data: stories }, { data: slots }, { data: versions }] = await Promise.all([
          supabase.from('stories').select('id, title, slug, sort_order').order('sort_order'),
          supabase.from('story_slots').select('story_id, slot_key, mission_id, sort_order'),
          supabase.from('mission_versions').select('mission_id, title, published, language').eq('language', 'en'),
        ])

        const result: StorySlotRow[] = []
        for (const story of stories ?? []) {
          for (const slotKey of ['flipflop_audio', 'story_pdf', 'coloring', 'move_explore', 'sing_along', 'bonus_video']) {
            const slot = (slots ?? []).find(s => s.story_id === story.id && s.slot_key === slotKey)
            const ver = slot ? (versions ?? []).find(v => v.mission_id === slot.mission_id) : null
            result.push({
              story_id: story.id,
              slot_key: slotKey,
              mission_id: slot?.mission_id ?? null,
              sort_order: slot?.sort_order ?? 0,
              story_title: story.title,
              story_slug: story.slug,
              mission_title: ver?.title ?? null,
              published: ver?.published ?? false,
            })
          }
        }
        setRows(result)
      } catch (err) {
        toastErr(err instanceof Error ? err.message : 'Failed to load story slots.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const storyGroups = rows.reduce<Record<string, StorySlotRow[]>>((acc, r) => {
    if (!acc[r.story_id]) acc[r.story_id] = []
    acc[r.story_id].push(r)
    return acc
  }, {})

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onOpenSidebar} className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-gray-500">
            <Menu size={17} />
          </button>
          <div>
            <h1 className="text-[22px] font-extrabold text-gray-900">Story Slots</h1>
            <p className="text-[13px] text-gray-500">View and manage mission assignments for each story slot.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {loading ? (
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
        ) : (
          <div className="space-y-5">
            {Object.entries(storyGroups).map(([storyId, group]) => {
              const filled = group.filter(s => s.mission_id).length
              return (
                <div key={storyId} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 bg-gray-50/50">
                    <div>
                      <h3 className="text-[15px] font-extrabold text-gray-800">{group[0].story_title}</h3>
                      <p className="text-[11px] text-gray-400">{group[0].story_slug}</p>
                    </div>
                    <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${filled === 6 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-600'}`}>
                      {filled}/6 assigned
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-gray-100">
                    {group.map(slot => {
                      const meta = SLOT_META[slot.slot_key as SlotKey]
                      return (
                        <div key={slot.slot_key} className="bg-white p-4 text-center">
                          <span className="text-2xl">{meta?.emoji ?? '📌'}</span>
                          <p className="text-[11px] font-bold text-gray-700 mt-1">{meta?.label ?? slot.slot_key}</p>
                          {slot.mission_id ? (
                            <>
                              <p className="text-[10px] text-gray-400 mt-1 truncate">{slot.mission_title ?? 'Untitled'}</p>
                              {slot.published ? (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 mt-1">
                                  <CheckCircle2 size={10} /> Published
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-500 mt-1">
                                  <AlertCircle size={10} /> Draft
                                </span>
                              )}
                            </>
                          ) : (
                            <p className="text-[10px] text-gray-300 mt-1">Not assigned</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
