'use client'
import React, { useEffect, useState, useMemo } from 'react'
import supabase from '@/lib/supabaseClient'
import { Search, Filter, Menu, ChevronLeft, ChevronRight, Baby, X } from 'lucide-react'
import { useToast } from './Toast'
import { logAdminAction } from '@/lib/adminAuditLog'

interface Props {
  initialChildId?: string
  onNavigate: (table: string) => void
  onOpenSidebar?: () => void
}

interface ChildRow {
  id: string
  name: string
  avatar_url: string | null
  age: number | null
  language: string | null
  created_at: string
  parent_name: string
  stories_complete: number
  total_stories: number
  last_active: string | null
}

const PAGE_SIZE = 5

export default function ChildrenManager({ onNavigate, onOpenSidebar }: Props) {
  const [children, setChildren] = useState<ChildRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkLang, setBulkLang] = useState('en')
  const [showLangPicker, setShowLangPicker] = useState(false)
  const { error: toastErr, success: toastOk } = useToast()

  useEffect(() => {
    void (async () => {
      try {
        const [{ data: kids }, { data: stories }, { data: progress }] = await Promise.all([
          supabase.from('children').select('id, name, avatar_url, age, language, created_at, parent_id, parents(name)').order('created_at', { ascending: false }),
          supabase.from('stories').select('id'),
          supabase.from('child_progress').select('child_id, completed_at').order('completed_at', { ascending: false }),
        ])

        const totalStories = (stories ?? []).length

        const rows: ChildRow[] = (kids ?? []).map(k => {
          const parentData = k.parents as any
          const childProgress = (progress ?? []).filter(p => p.child_id === k.id)
          const lastActive = childProgress[0]?.completed_at ?? null
          return {
            id: k.id,
            name: k.name,
            avatar_url: k.avatar_url,
            age: k.age,
            language: k.language,
            created_at: k.created_at,
            parent_name: parentData?.name ?? 'Unknown',
            stories_complete: 0,
            total_stories: totalStories,
            last_active: lastActive,
          }
        })
        setChildren(rows)
      } catch (err) {
        console.error('[ChildrenManager] load failed:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return children
    const q = search.toLowerCase()
    return children.filter(c => c.name.toLowerCase().includes(q) || c.parent_name.toLowerCase().includes(q))
  }, [children, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageClamped = Math.min(page, totalPages)
  const pageRows = filtered.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE)

  // — Bulk selection helpers —
  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allFilteredIds = filtered.map(c => c.id)
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.has(id))

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allFilteredIds))
    }
  }

  async function handleBulkChangeLanguage() {
    const ids = Array.from(selectedIds).filter(id => filtered.some(c => c.id === id))
    if (ids.length === 0) return
    setBulkBusy(true)
    try {
      const { error } = await supabase
        .from('children')
        .update({ language: bulkLang })
        .in('id', ids)
      if (error) throw error
      setChildren(prev => prev.map(c => ids.includes(c.id) ? { ...c, language: bulkLang } : c))
      toastOk(`Language updated to ${bulkLang.toUpperCase()} for ${ids.length} child${ids.length === 1 ? '' : 'ren'}.`)
      void logAdminAction({ action: 'bulk_update_language', entityType: 'child', entityId: ids.join(','), entityLabel: `${ids.length} children`, metadata: { count: ids.length, language: bulkLang } })
      setSelectedIds(new Set())
      setShowLangPicker(false)
    } catch (err) {
      console.error('[ChildrenManager] bulk language update failed:', err)
      toastErr('Language update failed. Check console for details.')
    } finally {
      setBulkBusy(false)
    }
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds).filter(id => filtered.some(c => c.id === id))
    if (ids.length === 0) return
    if (!confirm(`Delete ${ids.length} child${ids.length === 1 ? '' : 'ren'}? This cannot be undone.`)) return
    setBulkBusy(true)
    try {
      const { error } = await supabase.from('children').delete().in('id', ids)
      if (error) throw error
      setChildren(prev => prev.filter(c => !ids.includes(c.id)))
      toastOk(`${ids.length} child${ids.length === 1 ? '' : 'ren'} deleted.`)
      void logAdminAction({ action: 'bulk_delete_children', entityType: 'child', entityId: ids.join(','), entityLabel: `${ids.length} children`, metadata: { count: ids.length } })
      setSelectedIds(new Set())
    } catch (err) {
      console.error('[ChildrenManager] bulk delete failed:', err)
      toastErr('Bulk delete failed. Check console for details.')
    } finally {
      setBulkBusy(false)
    }
  }

  const selectedCount = Array.from(selectedIds).filter(id => filtered.some(c => c.id === id)).length

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-5 flex-shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={onOpenSidebar} className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-gray-500">
              <Menu size={17} />
            </button>
            <div>
              <h1 className="text-[22px] font-extrabold text-gray-900">Children</h1>
              <p className="text-[13px] text-gray-500">View and manage all children.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search children..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="pl-9 pr-4 py-2 bg-ds-input border border-ds-border rounded-xl text-[13px] font-medium text-ds-text focus:outline-none focus:ring-2 focus:ring-green-500 w-48" />
            </div>
            <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-medium text-gray-600 hover:bg-gray-50 transition">
              <Filter size={14} /> Filter
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4 pb-24">
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {/* Select-all checkbox header */}
                  <th className="px-4 py-3 w-10">
                    {filtered.length > 0 && (
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 accent-green-600 cursor-pointer"
                        aria-label="Select all children"
                      />
                    )}
                  </th>
                  {['Child', 'Age', 'Parent/Guardian', 'Joined On', 'Last Active', 'Progress'].map(h => (
                    <th key={h} className="px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-[13px]">No children found.</td></tr>
                ) : pageRows.map(c => {
                  const isSelected = selectedIds.has(c.id)
                  return (
                    <tr key={c.id} className={`border-b border-gray-50 transition ${isSelected ? 'bg-green-50/60' : 'hover:bg-gray-50'}`}>
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(c.id)}
                          className="w-4 h-4 accent-green-600 cursor-pointer"
                          aria-label={`Select ${c.name}`}
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-[16px] font-black shrink-0 border border-green-200">
                            {c.avatar_url && !c.avatar_url.startsWith('http') ? c.avatar_url : c.name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-gray-800">{c.name}</p>
                            <p className="text-[10px] text-gray-400">{c.language?.toUpperCase() ?? '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[13px] font-medium text-gray-600">{c.age ?? '—'}</td>
                      <td className="px-5 py-3.5 text-[13px] font-medium text-gray-600">{c.parent_name}</td>
                      <td className="px-5 py-3.5 text-[12px] text-gray-400">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-[12px] text-gray-400">
                        {c.last_active ? new Date(c.last_active).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-100 rounded-full h-2">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${c.total_stories > 0 ? (c.stories_complete / c.total_stories) * 100 : 0}%` }} />
                          </div>
                          <span className="text-[11px] font-bold text-gray-500">{c.total_stories > 0 ? Math.round((c.stories_complete / c.total_stories) * 100) : 0}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 text-[12px] text-gray-400">
          <span>Showing {pageRows.length > 0 ? (pageClamped - 1) * PAGE_SIZE + 1 : 0} to {Math.min(pageClamped * PAGE_SIZE, filtered.length)} of {filtered.length} children</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pageClamped <= 1}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 transition">
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
              <button key={i + 1} onClick={() => setPage(i + 1)}
                className={`w-8 h-8 rounded-lg text-[12px] font-bold transition ${i + 1 === pageClamped ? 'bg-green-600 text-white' : 'border border-ds-border text-gray-500 hover:bg-gray-50'}`}>
                {i + 1}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={pageClamped >= totalPages}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 transition">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Floating bulk action bar */}
      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-[13px] font-bold text-gray-200 shrink-0">
            {selectedCount} child{selectedCount === 1 ? '' : 'ren'} selected
          </span>
          <div className="w-px h-5 bg-gray-700 shrink-0" />

          {/* Language change — shows inline picker */}
          {showLangPicker ? (
            <div className="flex items-center gap-2">
              <select
                value={bulkLang}
                onChange={e => setBulkLang(e.target.value)}
                className="text-[12px] bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-1.5 focus:outline-none"
              >
                <option value="en">EN — English</option>
                <option value="fr">FR — French</option>
                <option value="rw">RW — Kinyarwanda</option>
              </select>
              <button
                onClick={handleBulkChangeLanguage}
                disabled={bulkBusy}
                className="text-[12px] font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition"
              >
                {bulkBusy ? 'Updating…' : 'Apply'}
              </button>
              <button
                onClick={() => setShowLangPicker(false)}
                className="text-gray-400 hover:text-white transition"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLangPicker(true)}
              disabled={bulkBusy}
              className="text-[12px] font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition"
            >
              Change Language
            </button>
          )}

          <button
            onClick={handleBulkDelete}
            disabled={bulkBusy}
            className="text-[12px] font-bold bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition"
          >
            Delete
          </button>
          <button
            onClick={() => { setSelectedIds(new Set()); setShowLangPicker(false) }}
            disabled={bulkBusy}
            className="ml-1 text-gray-400 hover:text-white transition disabled:opacity-50"
            aria-label="Deselect all"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
