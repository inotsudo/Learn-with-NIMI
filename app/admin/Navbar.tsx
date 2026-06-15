'use client'
import React, { useEffect, useState, useRef } from 'react'
import supabase from "@/lib/supabaseClient";
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

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
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
          <span className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${ACCENT[meta.accent].tile}`}>
            <Icon size={14} />
          </span>
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
          <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-pink-50 text-pink-400">
            <Baby size={14} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-semibold text-gray-700 truncate">{result.name}</span>
            <span className="block text-xs text-gray-400 truncate">Child profile</span>
          </span>
        </>
      )
    case 'parent':
      return (
        <>
          <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-indigo-50 text-indigo-400">
            <Users size={14} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-semibold text-gray-700 truncate">{result.name}</span>
            {result.email && <span className="block text-xs text-gray-400 truncate">{result.email}</span>}
          </span>
        </>
      )
    case 'story':
      return (
        <>
          <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-50 text-blue-400">
            <BookOpen size={14} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-semibold text-gray-700 truncate">{result.title}</span>
            <span className="block text-xs text-gray-400 truncate">Story</span>
          </span>
        </>
      )
    case 'page':
      return (
        <>
          <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-100 text-gray-400">
            <LayoutDashboard size={14} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-semibold text-gray-700 truncate">{result.label}</span>
            <span className="block text-xs text-gray-400 truncate">Page</span>
          </span>
        </>
      )
  }
}

export default function Navbar({ tables, currentTable, setCurrentTable, onOpenSidebar }: NavbarProps) {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [adminName, setAdminName] = useState<string>('Admin')
  const [notifCount, setNotifCount] = useState(0)
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
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserEmail(user.email ?? null)
      const { data: admin } = await supabase
        .from('admins')
        .select('name')
        .eq('id', user.id)
        .maybeSingle()
      if (admin?.name) setAdminName(admin.name)
    }
    getUser()
  }, [])

  useEffect(() => {
    const fetchNotifications = async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const [{ count: achievements }, { count: progress }, { count: stories }, { count: children }] = await Promise.all([
        supabase.from('child_achievements').select('*', { count: 'exact', head: true }).gte('earned_at', since),
        supabase.from('child_progress').select('*', { count: 'exact', head: true }).gte('completed_at', since),
        supabase.from('stories').select('*', { count: 'exact', head: true }).gte('created_at', since),
        supabase.from('children').select('*', { count: 'exact', head: true }).gte('created_at', since),
      ])
      setNotifCount((achievements ?? 0) + (progress ?? 0) + (stories ?? 0) + (children ?? 0))
    }
    fetchNotifications()
  }, [])

  // Debounce the search query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  // Cross-entity global search: missions, children, parents, stories, pages
  useEffect(() => {
    const q = debouncedSearch
    if (q.length < 2) {
      setResults([])
      setSearching(false)
      return
    }
    let cancelled = false
    setSearching(true)
    const orSafeQ = q.replace(/[,()]/g, '')
    const run = async () => {
      const [missionsRes, childrenRes, parentsRes, storiesRes] = await Promise.all([
        supabase
          .from('mission_versions')
          .select('mission_id, title, missions(category_slug)')
          .eq('language', 'en')
          .ilike('title', `%${q}%`)
          .limit(5),
        supabase
          .from('children')
          .select('id, name')
          .ilike('name', `%${q}%`)
          .limit(5),
        supabase
          .from('parents')
          .select('id, name, email')
          .or(`name.ilike.%${orSafeQ}%,email.ilike.%${orSafeQ}%`)
          .limit(5),
        supabase
          .from('stories')
          .select('id, title')
          .ilike('title', `%${q}%`)
          .limit(5),
      ])
      if (cancelled) return

      const missionResults: SearchResult[] = (missionsRes.data ?? [])
        .map((m: any): SearchResult | null => {
          const rel = m.missions
          const categorySlug = Array.isArray(rel) ? rel[0]?.category_slug : rel?.category_slug
          return categorySlug ? { kind: 'mission' as const, id: m.mission_id, title: m.title, categorySlug } : null
        })
        .filter((r): r is SearchResult => r !== null)

      const childResults: SearchResult[] = (childrenRes.data ?? []).map((c: any) => ({
        kind: 'child' as const, id: c.id, name: c.name,
      }))

      const parentResults: SearchResult[] = (parentsRes.data ?? []).map((p: any) => ({
        kind: 'parent' as const, id: p.id, name: p.name || p.email || 'Parent', email: p.email ?? null,
      }))

      const storyResults: SearchResult[] = (storiesRes.data ?? []).map((s: any) => ({
        kind: 'story' as const, id: s.id, title: s.title,
      }))

      const lowerQ = q.toLowerCase()
      const pageResults: SearchResult[] = tables
        .filter(t => t.toLowerCase().includes(lowerQ) || t.replace(/_/g, ' ').toLowerCase().includes(lowerQ))
        .slice(0, 5)
        .map(t => ({ kind: 'page' as const, table: t, label: t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }))

      setResults([...missionResults, ...childResults, ...parentResults, ...storyResults, ...pageResults])
      setSearching(false)
    }
    run()
    return () => { cancelled = true }
  }, [debouncedSearch, tables])

  // Reset keyboard selection whenever the result set changes
  useEffect(() => {
    setActiveIndex(-1)
  }, [results])

  // Close the results dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const showDropdown = searchFocused && search.trim().length >= 2
  const isPending = searching || search.trim() !== debouncedSearch

  const handleSelectResult = (r: SearchResult) => {
    switch (r.kind) {
      case 'mission':
        setCurrentTable(`mission:${r.categorySlug}:${r.id}`)
        break
      case 'child':
        setCurrentTable(`children:${r.id}`)
        break
      case 'parent':
        setCurrentTable(`parents:${r.id}`)
        break
      case 'story':
        setCurrentTable(`stories:${r.id}`)
        break
      case 'page':
        setCurrentTable(r.table)
        break
    }
    setSearch('')
    setDebouncedSearch('')
    setResults([])
    setSearchFocused(false)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setSearch('')
      setSearchFocused(false)
      return
    }
    if (!showDropdown || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && activeIndex < results.length) handleSelectResult(results[activeIndex])
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/admin/login'
  }

  const handleProfileAction = (action: string) => {
    setProfileOpen(false)
    if (action === 'profile') setCurrentTable('Profile')
    if (action === 'dashboard') setCurrentTable('Dashboard')
    if (action === 'logout') handleLogout()
  }

  // Close profile menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false)
      }
    }
    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [profileOpen])

  return (
    <header className="w-full bg-white border-b border-gray-200 flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 py-3 shadow-sm relative z-40">
      {/* Left: hamburger + greeting */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition"
        >
          <Menu size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-gray-800 leading-tight truncate">
            {greeting()}, {adminName}! 👋
          </h1>
          <p className="text-xs text-gray-400 font-medium hidden sm:block truncate">Let&apos;s build amazing adventures for our explorers! ✨</p>
        </div>
      </div>

      {/* Middle: global search */}
      <div className="relative flex-1 max-w-md hidden md:block" ref={searchBoxRef}>
        <div className="flex items-center bg-gray-100 rounded-full px-4 py-2.5 focus-within:ring-2 focus-within:ring-indigo-100 transition">
          <Search size={16} className="text-gray-400 mr-2 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search missions, children, parents, stories..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onKeyDown={handleSearchKeyDown}
            className="flex-1 min-w-0 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setResults([]); setSearchFocused(false) }}
              className="text-gray-300 hover:text-gray-500 flex-shrink-0 ml-1 transition"
            >
              <X size={14} />
            </button>
          )}
        </div>
        {showDropdown && (
          <div className="absolute mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-lg max-h-96 overflow-auto z-50 py-2">
            {isPending ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-400">
                <Loader2 size={16} className="animate-spin" /> Searching...
              </div>
            ) : results.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8 px-4">No results found for &quot;{debouncedSearch}&quot;</p>
            ) : (
              results.map((r, idx) => {
                const prevKind = idx > 0 ? results[idx - 1].kind : null
                const group = GROUP_META[r.kind]
                const GroupIcon = group.icon
                const key = r.kind === 'page' ? `page-${r.table}` : `${r.kind}-${r.id}`
                return (
                  <React.Fragment key={key}>
                    {r.kind !== prevKind && (
                      <div className="px-3.5 pt-2.5 pb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        <GroupIcon size={11} /> {group.label}
                      </div>
                    )}
                    <button
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => handleSelectResult(r)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2 text-left text-sm transition ${idx === activeIndex ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                    >
                      <ResultRow result={r} />
                    </button>
                  </React.Fragment>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Right: notifications, language, profile */}
      <div className="relative flex items-center gap-2 sm:gap-3 flex-shrink-0" ref={profileRef}>
        {/* Language pill (decorative) */}
        <div className="hidden sm:flex items-center gap-1 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-sm font-semibold">
          🇬🇧 English
        </div>

        {/* Notification bell */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition text-gray-500">
          <Bell size={17} />
          {notifCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {notifCount}
            </span>
          )}
        </button>

        <div
          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 pl-1.5 pr-3 py-1.5 rounded-full cursor-pointer transition"
          onClick={() => setProfileOpen(!profileOpen)}
        >
          <img
            src="/nimi-logo-circle.png"
            alt="Profile"
            className="w-7 h-7 rounded-full object-cover flex-shrink-0"
          />
          <span className="text-sm font-semibold text-gray-700 max-w-[160px] truncate hidden sm:inline">{userEmail || 'Admin'}</span>
          <ChevronDown size={14} className="text-gray-400" />
        </div>

        {profileOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 text-gray-700 rounded-xl shadow-lg z-50 overflow-hidden py-1">
            <button
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-left text-sm"
              onClick={() => handleProfileAction('dashboard')}
            >
              <LayoutDashboard size={15} className="text-gray-400" /> Dashboard
            </button>
            <button
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-left text-sm"
              onClick={() => handleProfileAction('profile')}
            >
              <UserCog size={15} className="text-gray-400" /> Profile
            </button>
            <div className="border-t border-gray-100 my-1" />
            <button
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-left text-sm text-red-600"
              onClick={() => handleProfileAction('logout')}
            >
              <LogOut size={15} /> Logout
            </button>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="hidden lg:flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg text-sm font-semibold transition"
        >
          <LogOut size={15} /> Logout
        </button>
      </div>
    </header>
  )
}
