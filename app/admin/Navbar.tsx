'use client'
import React, { useEffect, useState, useRef } from 'react'
import supabase from "@/lib/supabaseClient"
import {
  LogOut, Search, ChevronDown, LayoutDashboard, UserCog, Bell, Menu,
  Compass, Baby, Users, BookOpen, X, Loader2, type LucideIcon,
} from 'lucide-react'
import { ACCENT, CATEGORY_META, FALLBACK_META } from './missionMeta'

interface NavbarProps {
  tables: string[]
  currentTable: string
  setCurrentTable: (table: string) => void
  onOpenSidebar?: () => void
}

type SearchResult =
  | { kind: 'mission'; id: string; title: string; categorySlug: string }
  | { kind: 'child'; id: string; name: string }
  | { kind: 'parent'; id: string; name: string; email: string | null }
  | { kind: 'story'; id: string; title: string }
  | { kind: 'page'; table: string; label: string }

const GROUP_META: Record<SearchResult['kind'], { label: string; icon: LucideIcon }> = {
  mission: { label: 'Daily Adventures', icon: Compass },
  child: { label: 'Children', icon: Baby },
  parent: { label: 'Parents', icon: Users },
  story: { label: 'Stories', icon: BookOpen },
  page: { label: 'Pages', icon: LayoutDashboard },
}

function ResultRow({ result }: { result: SearchResult }) {
  switch (result.kind) {
    case 'mission': {
      const meta = CATEGORY_META[result.categorySlug] ?? FALLBACK_META
      const Icon = meta.icon
      return (
        <>
          <span className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${ACCENT[meta.accent].tile}`}><Icon size={14} /></span>
          <span className="flex-1 min-w-0">
            <span className="block font-semibold text-gray-700 truncate">{result.title}</span>
            <span className="block text-xs text-gray-400 truncate">{meta.label}</span>
          </span>
        </>
      )
    }
    case 'child':
      return (
        <>
          <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-pink-50 text-pink-400"><Baby size={14} /></span>
          <span className="flex-1 min-w-0"><span className="block font-semibold text-gray-700 truncate">{result.name}</span></span>
        </>
      )
    case 'parent':
      return (
        <>
          <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-indigo-50 text-indigo-400"><Users size={14} /></span>
          <span className="flex-1 min-w-0">
            <span className="block font-semibold text-gray-700 truncate">{result.name}</span>
            {result.email && <span className="block text-xs text-gray-400 truncate">{result.email}</span>}
          </span>
        </>
      )
    case 'story':
      return (
        <>
          <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-50 text-blue-400"><BookOpen size={14} /></span>
          <span className="flex-1 min-w-0"><span className="block font-semibold text-gray-700 truncate">{result.title}</span></span>
        </>
      )
    case 'page':
      return (
        <>
          <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-100 text-gray-400"><LayoutDashboard size={14} /></span>
          <span className="flex-1 min-w-0"><span className="block font-semibold text-gray-700 truncate">{result.label}</span></span>
        </>
      )
  }
}

export default function Navbar({ tables, currentTable, setCurrentTable, onOpenSidebar }: NavbarProps) {
  const [adminName, setAdminName] = useState('Admin')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [searchFocused, setSearchFocused] = useState(false)
  const searchBoxRef = useRef<HTMLDivElement>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('admins').select('name').eq('id', user.id).maybeSingle()
      if (data?.name) setAdminName(data.name)
    })()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    const q = debouncedSearch
    if (q.length < 2) { setResults([]); setSearching(false); return }
    let cancelled = false
    setSearching(true)
    const orSafeQ = q.replace(/[,()]/g, '')
    void (async () => {
      const [missionsRes, childrenRes, parentsRes, storiesRes] = await Promise.all([
        supabase.from('mission_versions').select('mission_id, title, missions(category_slug)').eq('language', 'en').ilike('title', `%${q}%`).limit(5),
        supabase.from('children').select('id, name').ilike('name', `%${q}%`).limit(5),
        supabase.from('parents').select('id, name, email').or(`name.ilike.%${orSafeQ}%,email.ilike.%${orSafeQ}%`).limit(5),
        supabase.from('stories').select('id, title').ilike('title', `%${q}%`).limit(5),
      ])
      if (cancelled) return
      const all: SearchResult[] = [
        ...(missionsRes.data ?? []).map((m: any) => {
          const rel = m.missions; const cs = Array.isArray(rel) ? rel[0]?.category_slug : rel?.category_slug
          return cs ? { kind: 'mission' as const, id: m.mission_id, title: m.title, categorySlug: cs } : null
        }).filter(Boolean) as SearchResult[],
        ...(childrenRes.data ?? []).map((c: any) => ({ kind: 'child' as const, id: c.id, name: c.name })),
        ...(parentsRes.data ?? []).map((p: any) => ({ kind: 'parent' as const, id: p.id, name: p.name || p.email || 'Parent', email: p.email ?? null })),
        ...(storiesRes.data ?? []).map((s: any) => ({ kind: 'story' as const, id: s.id, title: s.title })),
        ...tables.filter(t => t.toLowerCase().includes(q.toLowerCase())).slice(0, 3).map(t => ({
          kind: 'page' as const, table: t, label: t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        })),
      ]
      setResults(all)
      setSearching(false)
    })()
    return () => { cancelled = true }
  }, [debouncedSearch, tables])

  useEffect(() => { setActiveIndex(-1) }, [results])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setSearchFocused(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (!profileOpen) return
    const h = (e: MouseEvent) => { if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [profileOpen])

  const showDropdown = searchFocused && search.trim().length >= 2
  const isPending = searching || search.trim() !== debouncedSearch

  const handleSelectResult = (r: SearchResult) => {
    switch (r.kind) {
      case 'mission': setCurrentTable(`mission:${r.categorySlug}:${r.id}`); break
      case 'child': setCurrentTable(`children:${r.id}`); break
      case 'parent': setCurrentTable(`parents:${r.id}`); break
      case 'story': setCurrentTable(`stories:${r.id}`); break
      case 'page': setCurrentTable(r.table); break
    }
    setSearch(''); setDebouncedSearch(''); setResults([]); setSearchFocused(false)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setSearch(''); setSearchFocused(false); return }
    if (!showDropdown || results.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => (i + 1) % results.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => (i - 1 + results.length) % results.length) }
    else if (e.key === 'Enter') { e.preventDefault(); if (activeIndex >= 0) handleSelectResult(results[activeIndex]) }
  }

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/admin/login' }

  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  return (
    <header className="w-full bg-white border-b border-gray-100 relative z-40">
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2.5">
        {/* Hamburger (mobile) */}
        <button onClick={onOpenSidebar}
          className="lg:hidden flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 transition">
          <Menu size={18} />
        </button>

        {/* Search — icon on mobile, full bar on sm+ */}
        <button onClick={() => setMobileSearchOpen(true)}
          className="sm:hidden flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 transition">
          <Search size={16} />
        </button>

        <div className="relative flex-1 max-w-lg hidden sm:block" ref={searchBoxRef}>
          <div className="flex items-center bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 focus-within:border-green-500 focus-within:bg-white transition">
            <Search size={15} className="text-gray-400 mr-2 flex-shrink-0" />
            <input type="text" placeholder="Search stories, children, parents..." value={search}
              onChange={e => setSearch(e.target.value)} onFocus={() => setSearchFocused(true)} onKeyDown={handleSearchKeyDown}
              className="flex-1 min-w-0 bg-transparent text-[13px] text-gray-700 placeholder:text-gray-400 focus:outline-none" />
            {search && (
              <button onClick={() => { setSearch(''); setResults([]); setSearchFocused(false) }} className="text-gray-300 hover:text-gray-500 ml-1"><X size={14} /></button>
            )}
          </div>
        {showDropdown && (
          <div className="absolute mt-1.5 w-full bg-white border border-gray-100 rounded-xl shadow-lg max-h-80 overflow-auto z-50 py-1.5">
            {isPending ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400"><Loader2 size={16} className="animate-spin" /> Searching...</div>
            ) : results.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-6">No results for &quot;{debouncedSearch}&quot;</p>
            ) : results.map((r, idx) => {
              const prevKind = idx > 0 ? results[idx - 1].kind : null
              const group = GROUP_META[r.kind]
              const GroupIcon = group.icon
              const key = r.kind === 'page' ? `page-${r.table}` : `${r.kind}-${r.id}`
              return (
                <React.Fragment key={key}>
                  {r.kind !== prevKind && (
                    <div className="px-3 pt-2 pb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      <GroupIcon size={11} /> {group.label}
                    </div>
                  )}
                  <button onMouseEnter={() => setActiveIndex(idx)} onClick={() => handleSelectResult(r)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] transition rounded-lg mx-1 ${idx === activeIndex ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                    style={{ width: 'calc(100% - 8px)' }}>
                    <ResultRow result={r} />
                  </button>
                </React.Fragment>
              )
            })}
          </div>
        )}
      </div>

        {/* Spacer on mobile */}
        <div className="flex-1 sm:hidden" />

        {/* Right actions */}
        <div className="relative flex items-center gap-1.5 sm:gap-2 flex-shrink-0" ref={profileRef}>
          {/* Notification bell */}
          <button onClick={() => setCurrentTable('notifications')}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg bg-gray-50 hover:bg-gray-100 transition text-gray-500">
            <Bell size={16} />
          </button>

          {/* Profile */}
          <button onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-1.5 sm:gap-2 bg-gray-50 hover:bg-gray-100 pl-1.5 pr-1.5 sm:pr-2.5 py-1.5 rounded-lg transition">
            <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0">
              {adminName[0].toUpperCase()}
            </div>
            <span className="text-[13px] font-semibold text-gray-700 hidden sm:inline max-w-[120px] truncate">{adminName}</span>
            <ChevronDown size={13} className="text-gray-400 hidden sm:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden py-1">
              <button className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-gray-50 text-left text-[13px] text-gray-700"
                onClick={() => { setProfileOpen(false); setCurrentTable('Dashboard') }}>
                <LayoutDashboard size={15} className="text-gray-400" /> Dashboard
              </button>
              <button className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-gray-50 text-left text-[13px] text-gray-700"
                onClick={() => { setProfileOpen(false); setCurrentTable('Profile') }}>
                <UserCog size={15} className="text-gray-400" /> My Profile
              </button>
              <div className="border-t border-gray-100 my-0.5" />
              <button className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-red-50 text-left text-[13px] text-red-600"
                onClick={handleLogout}>
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile search overlay */}
      {mobileSearchOpen && (
        <div className="absolute inset-0 bg-white z-50 flex items-center gap-2 px-3 py-2.5 sm:hidden">
          <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
            <Search size={15} className="text-gray-400 mr-2 flex-shrink-0" />
            <input type="text" placeholder="Search..." value={search} autoFocus
              onChange={e => setSearch(e.target.value)} onKeyDown={handleSearchKeyDown}
              className="flex-1 min-w-0 bg-transparent text-[14px] text-gray-700 placeholder:text-gray-400 focus:outline-none" />
            {search && (
              <button onClick={() => { setSearch(''); setResults([]) }} className="text-gray-400 ml-1"><X size={14} /></button>
            )}
          </div>
          <button onClick={() => { setMobileSearchOpen(false); setSearch(''); setResults([]) }}
            className="text-[13px] font-semibold text-gray-500 px-2 py-2">
            Cancel
          </button>
          {search.trim().length >= 2 && (
            <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg max-h-72 overflow-auto z-50 py-1.5">
              {isPending ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400"><Loader2 size={16} className="animate-spin" /> Searching...</div>
              ) : results.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-6">No results</p>
              ) : results.map((r, idx) => {
                const prevKind = idx > 0 ? results[idx - 1].kind : null
                const group = GROUP_META[r.kind]
                const GroupIcon = group.icon
                const key = r.kind === 'page' ? `page-${r.table}` : `${r.kind}-${r.id}`
                return (
                  <React.Fragment key={key}>
                    {r.kind !== prevKind && (
                      <div className="px-3 pt-2 pb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        <GroupIcon size={11} /> {group.label}
                      </div>
                    )}
                    <button onClick={() => { handleSelectResult(r); setMobileSearchOpen(false) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[13px] hover:bg-gray-50 transition">
                      <ResultRow result={r} />
                    </button>
                  </React.Fragment>
                )
              })}
            </div>
          )}
        </div>
      )}
    </header>
  )
}
