'use client'
import React, { useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import { Menu, GripVertical, ArrowUp, ArrowDown, Save, CheckCircle2 } from 'lucide-react'
import { useToast } from './Toast'

interface Props {
  onNavigate: (table: string) => void
  onOpenSidebar?: () => void
}

interface StoryOrder {
  id: string
  title: string
  slug: string
  sort_order: number
  status: string
  slots_filled: number
}

export default function StoryOrderingManager({ onNavigate, onOpenSidebar }: Props) {
  const { success: toastOk, error: toastErr } = useToast()
  const [stories, setStories] = useState<StoryOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const [{ data: storiesData }, { data: slotsData }] = await Promise.all([
          supabase.from('stories').select('id, title, slug, sort_order, status').order('sort_order'),
          supabase.from('story_slots').select('story_id, mission_id'),
        ])
        const result: StoryOrder[] = (storiesData ?? []).map(s => ({
          ...s,
          slots_filled: (slotsData ?? []).filter(sl => sl.story_id === s.id && sl.mission_id).length,
        }))
        setStories(result)
      } catch (err) {
        toastErr(err instanceof Error ? err.message : 'Failed to load stories.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= stories.length) return
    const next = [...stories]
    const temp = next[index]
    next[index] = next[target]
    next[target] = temp
    next.forEach((s, i) => { s.sort_order = i + 1 })
    setStories(next)
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await Promise.all(stories.map(s => supabase.from('stories').update({ sort_order: s.sort_order }).eq('id', s.id)))
      setSaved(true)
      toastOk('Story order saved.')
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Failed to save story order.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onOpenSidebar} className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-gray-500">
              <Menu size={17} />
            </button>
            <div>
              <h1 className="text-[22px] font-extrabold text-gray-900">Story Ordering</h1>
              <p className="text-[13px] text-gray-500">Drag stories to set the order children experience them.</p>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold text-[13px] rounded-xl px-5 py-2.5 shadow-sm transition disabled:opacity-50">
            {saved ? <><CheckCircle2 size={16} /> Saved!</> : saving ? 'Saving...' : <><Save size={16} /> Save Order</>}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-gray-50/50 border-b border-gray-100 grid grid-cols-[40px_1fr_100px_100px_80px] gap-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
              <span>Order</span>
              <span>Story</span>
              <span>Status</span>
              <span>Slots</span>
              <span>Move</span>
            </div>
            {stories.map((s, i) => (
              <div key={s.id} className="px-5 py-3.5 grid grid-cols-[40px_1fr_100px_100px_80px] gap-4 items-center border-b border-gray-50 hover:bg-gray-50 transition">
                <div className="flex items-center gap-1.5">
                  <GripVertical size={14} className="text-gray-300" />
                  <span className="text-[14px] font-extrabold text-gray-800">{s.sort_order}</span>
                </div>
                <div>
                  <p className="text-[13px] font-bold text-gray-800">{s.title}</p>
                  <p className="text-[10px] text-gray-400">{s.slug}</p>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full inline-block w-fit ${
                  s.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {s.status}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-bold text-gray-700">{s.slots_filled}/6</span>
                  <div className="w-12 bg-gray-100 rounded-full h-1.5">
                    <div className={`h-full rounded-full ${s.slots_filled === 6 ? 'bg-emerald-500' : s.slots_filled > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}
                      style={{ width: `${(s.slots_filled / 6) * 100}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => move(i, -1)} disabled={i === 0}
                    className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-20 transition">
                    <ArrowUp size={14} />
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === stories.length - 1}
                    className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-20 transition">
                    <ArrowDown size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
