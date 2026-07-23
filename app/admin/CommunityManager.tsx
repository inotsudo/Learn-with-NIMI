'use client'
import React, { useEffect, useState, useMemo } from 'react'
import supabase from '@/lib/supabaseClient'
import { getStorageUrl } from '@/lib/queries'
import { Search, Filter, Menu, ChevronLeft, ChevronRight, Heart, CheckCircle2, XCircle } from 'lucide-react'
import { useToast } from './Toast'

interface Props {
  onNavigate?: (table: string) => void
  onOpenSidebar?: () => void
}

interface PostRow {
  id: string
  child_name: string
  description: string
  image_url: string | null
  type: string
  is_public: boolean
  status: string | null
  likes: number
  created_at: string
}

type TabKey = 'all' | 'pending' | 'approved' | 'reported'
const PAGE_SIZE = 5

export default function CommunityManager({ onNavigate, onOpenSidebar }: Props) {
  const [posts, setPosts] = useState<PostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<TabKey>('all')
  const [page, setPage] = useState(1)
  const { success: toastOk } = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('admin_get_all_creations')
      if (error) console.error('[Community] RPC error:', error.message)
      setPosts((data ?? []) as PostRow[])
    } catch (err) {
      console.error('[CommunityManager] load failed:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase.from('creations').update({ status: 'approved', is_public: true }).eq('id', id)
      if (error) throw error
      await load()
      toastOk('Post approved')
    } catch (err) {
      console.error('[CommunityManager] handleApprove failed:', err)
    }
  }

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase.from('creations').update({ status: 'rejected', is_public: false }).eq('id', id)
      if (error) throw error
      await load()
      toastOk('Post rejected')
    } catch (err) {
      console.error('[CommunityManager] handleReject failed:', err)
    }
  }

  const filtered = useMemo(() => {
    let list = posts
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p => p.child_name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
    }
    if (tab === 'pending') list = list.filter(p => p.status === 'pending' || !p.status)
    if (tab === 'approved') list = list.filter(p => p.status === 'approved')
    if (tab === 'reported') list = list.filter(p => p.status === 'rejected' || p.status === 'reported')
    return list
  }, [posts, search, tab])

  const pendingCount = posts.filter(p => p.status === 'pending' || !p.status).length
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageClamped = Math.min(page, totalPages)
  const pageRows = filtered.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE)

  const TABS: { key: TabKey; label: string; count?: number }[] = [
    { key: 'all', label: 'All Posts' },
    { key: 'pending', label: 'Pending Review', count: pendingCount },
    { key: 'approved', label: 'Approved' },
    { key: 'reported', label: 'Reported' },
  ]

  const statusBadge = (s: string | null) => {
    if (s === 'approved') return { label: 'Approved', cls: 'bg-emerald-100 text-emerald-700' }
    if (s === 'rejected' || s === 'reported') return { label: 'Reported', cls: 'bg-red-100 text-red-600' }
    return { label: 'Pending Review', cls: 'bg-amber-100 text-amber-600' }
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
              <h1 className="text-[22px] font-extrabold text-gray-900">Community Posts</h1>
              <p className="text-[13px] text-gray-500">Review and moderate community posts.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search posts..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="pl-9 pr-4 py-2 bg-ds-input border border-ds-border rounded-xl text-[13px] font-medium text-ds-text focus:outline-none focus:ring-2 focus:ring-green-500 w-48" />
            </div>
            <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-medium text-gray-600 hover:bg-gray-50">
              <Filter size={14} /> Filter
            </button>
          </div>
        </div>

        <div className="flex gap-1 mt-4 border-b border-gray-100 -mb-px">
          {TABS.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setPage(1) }}
              className={`px-4 py-2.5 text-[12px] font-semibold border-b-2 transition flex items-center gap-1.5 ${
                tab === t.key ? 'border-green-600 text-green-600' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}>
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['Post', 'Author', 'Status', 'Likes', 'Posted On', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400 text-[13px]">No posts found.</td></tr>
                ) : pageRows.map(p => {
                  const badge = statusBadge(p.status)
                  return (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {p.image_url ? (
                            <img src={p.image_url.startsWith('/') ? p.image_url : getStorageUrl(p.image_url)}
                              alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-100"  loading="lazy" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300 text-lg">
                              {p.type === 'challenge' ? '🏆' : p.type === 'certificate' ? '📜' : '🎨'}
                            </div>
                          )}
                          <p className="text-[12px] text-gray-600 max-w-[200px] truncate">{p.description}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[13px] font-medium text-gray-700">{p.child_name}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${badge.cls}`}>{badge.label}</span>
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-gray-500">
                        <span className="flex items-center gap-1"><Heart size={12} className="text-pink-400" /> {p.likes}</span>
                      </td>
                      <td className="px-5 py-3.5 text-[12px] text-gray-400">
                        {new Date(p.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          {(!p.status || p.status === 'pending') && (
                            <>
                              <button onClick={() => handleApprove(p.id)}
                                className="w-7 h-7 rounded-lg border border-emerald-200 flex items-center justify-center text-emerald-500 hover:bg-emerald-50 transition" title="Approve">
                                <CheckCircle2 size={14} />
                              </button>
                              <button onClick={() => handleReject(p.id)}
                                className="w-7 h-7 rounded-lg border border-red-200 flex items-center justify-center text-red-400 hover:bg-red-50 transition" title="Reject">
                                <XCircle size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between mt-4 text-[12px] text-gray-400">
          <span>Showing {pageRows.length > 0 ? (pageClamped - 1) * PAGE_SIZE + 1 : 0} to {Math.min(pageClamped * PAGE_SIZE, filtered.length)} of {filtered.length} posts</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pageClamped <= 1}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 transition"><ChevronLeft size={14} /></button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
              <button key={i + 1} onClick={() => setPage(i + 1)}
                className={`w-8 h-8 rounded-lg text-[12px] font-bold transition ${i + 1 === pageClamped ? 'bg-green-600 text-white' : 'border border-ds-border text-gray-500 hover:bg-gray-50'}`}>{i + 1}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={pageClamped >= totalPages}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 transition"><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  )
}
