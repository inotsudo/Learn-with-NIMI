'use client'
import React, { useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import { Search, Menu, ChevronDown, ChevronRight, Users, Baby } from 'lucide-react'

interface Props {
  onNavigate: (table: string) => void
  onOpenSidebar?: () => void
}

interface FamilyRow {
  parent_id: string
  parent_name: string
  parent_email: string
  children: { id: string; name: string; avatar_url: string | null; age: number | null; language: string; created_at: string }[]
}

export default function FamiliesManager({ onNavigate, onOpenSidebar }: Props) {
  const [families, setFamilies] = useState<FamilyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const { data: parents } = await supabase.from('parents').select('id, name, email').order('name')
      const { data: children } = await supabase.from('children').select('id, name, avatar_url, age, language, created_at, parent_id').order('name')

      const result: FamilyRow[] = (parents ?? []).map(p => ({
        parent_id: p.id,
        parent_name: p.name ?? 'Unknown',
        parent_email: p.email ?? '',
        children: (children ?? []).filter(c => c.parent_id === p.id),
      }))
      setFamilies(result)
      setLoading(false)
    })()
  }, [])

  const filtered = search.trim()
    ? families.filter(f => f.parent_name.toLowerCase().includes(search.toLowerCase()) || f.parent_email.toLowerCase().includes(search.toLowerCase()) || f.children.some(c => c.name.toLowerCase().includes(search.toLowerCase())))
    : families

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-5 flex-shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={onOpenSidebar} className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-gray-500">
              <Menu size={17} />
            </button>
            <div>
              <h1 className="text-[22px] font-extrabold text-gray-900">Families</h1>
              <p className="text-[13px] text-gray-500">View parents and their children together.</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search families..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-[13px] font-medium text-gray-700 focus:outline-none focus:border-indigo-300 w-56" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4 space-y-3">
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-[14px] font-bold text-gray-400">No families found.</p>
          </div>
        ) : filtered.map(f => {
          const isOpen = expandedId === f.parent_id
          return (
            <div key={f.parent_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button onClick={() => setExpandedId(isOpen ? null : f.parent_id)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition text-left">
                <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-[16px] shrink-0">
                  {f.parent_name[0]?.toUpperCase() ?? 'P'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-gray-800">{f.parent_name}</p>
                  <p className="text-[11px] text-gray-400">{f.parent_email}</p>
                </div>
                <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Baby size={12} /> {f.children.length} child{f.children.length !== 1 ? 'ren' : ''}
                </span>
                {isOpen ? <ChevronDown size={16} className="text-gray-400 shrink-0" /> : <ChevronRight size={16} className="text-gray-400 shrink-0" />}
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 px-5 py-3 bg-gray-50/30">
                  {f.children.length === 0 ? (
                    <p className="text-[12px] text-gray-400 py-2">No children registered yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {f.children.map(c => (
                        <div key={c.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3">
                          <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-[14px] font-black shrink-0 border border-purple-200">
                            {c.avatar_url && !c.avatar_url.startsWith('http') ? c.avatar_url : c.name[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-gray-800">{c.name}</p>
                            <p className="text-[10px] text-gray-400">
                              Age: {c.age ?? '—'} · {c.language?.toUpperCase()} · Joined {new Date(c.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
