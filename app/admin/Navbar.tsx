'use client'
import React, { useEffect, useState, useRef } from 'react'
import supabase from "@/lib/supabaseClient"
import { getCachedAdmin } from './adminAuth'
import {
  LogOut, Search, ChevronDown, LayoutDashboard, UserCog, Menu,
  Compass, Baby, Users, BookOpen, X, Loader2, ChevronRight, type LucideIcon,
} from 'lucide-react'
import { ACCENT, CATEGORY_META, FALLBACK_META, LANGUAGE_META, LANGUAGES, type Lang } from './missionMeta'
import NotificationBell from './NotificationBell'

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavbarProps {
  tables: string[]
  currentTable: string
  setCurrentTable: (table: string) => void
  onOpenSidebar?: () => void
  adminLang?: Lang
  onAdminLangChange?: (lang: Lang) => void
}

type SearchResult =
  | { kind: 'mission'; id: string; title: string; categorySlug: string }
  | { kind: 'child';  id: string; name: string }
  | { kind: 'parent'; id: string; name: string; email: string | null }
  | { kind: 'story';  id: string; title: string }
  | { kind: 'page';   table: string; label: string }

// ── Constants ─────────────────────────────────────────────────────────────────

const GROUP_META: Record<SearchResult['kind'], { label: string; icon: LucideIcon }> = {
  mission: { label: 'Daily Adventures', icon: Compass },
  child:   { label: 'Children',         icon: Baby },
  parent:  { label: 'Parents',          icon: Users },
  story:   { label: 'Stories',          icon: BookOpen },
  page:    { label: 'Pages',            icon: LayoutDashboard },
}

// Maps table keys → human labels for the breadcrumb
const SECTION_LABELS: Record<string, string> = {
  Dashboard:            'Overview',
  stories:              'Story Studio',
  story_slots:          'Story Slots',
  story_ordering:       'Story Ordering',
  story_publishing:     'Publishing',
  content_library:      'Content Library',
  flipflop_books:       'FlipFlop Books',
  coloring_pages:       'Coloring Pages',
  story_pdfs:           'Story PDFs',
  videos:               'Videos',
  audio:                'Audio',
  weekly_challenges:    'Weekly Challenges',
  child_badges:         'Rewards',
  badge_images:         'Badge Images',
  families:             'Families',
  children:             'Children',
  parents:              'Parents',
  creations:            'Community',
  child_achievements:   'Certificates',
  certificate_templates:'Cert Templates',
  notifications:        'Notifications',
  Buckets:              'Media Library',
  products:             'Products & Pricing',
  masterpieces:         'Masterpieces',
  child_progress:       'Analytics',
  curriculum:           'Curriculum',
  school_inquiries:     'Schools',
  roster_provisioning:  'Roster Sync',
  newsletter_signups:   'Newsletter',
  referral_redemptions: 'Referrals',
  discount_codes:       'Discount Codes',
  gift_subscriptions:   'Gift Subscriptions',
  testimonials:         'Testimonials',
  partners:             'Partners',
  conversation_history: 'AI Chat History',
  admins:               'Administrators',
  parental_settings:    'Settings',
  Profile:              'My Profile',
}

function getBreadcrumb(currentTable: string): { parent: string | null; current: string } {
  const base = currentTable.split(':')[0]
  if (base === 'mission')   return { parent: 'Content Library', current: 'Daily Adventure' }
  if (base === 'stories' && currentTable.includes(':')) return { parent: 'Story Studio', current: 'Story Editor' }
  if (base === 'children' && currentTable.includes(':')) return { parent: 'Families', current: 'Child Profile' }
  if (base === 'parents' && currentTable.includes(':'))  return { parent: 'Families', current: 'Parent Profile' }
  if (base === 'child_badges' && currentTable.includes(':')) return { parent: 'Rewards', current: 'Child Rewards' }
  if (base === 'coloring_pages' && currentTable.includes(':')) return { parent: 'Coloring Pages', current: 'Book Editor' }
  const label = SECTION_LABELS[base] ?? base.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  return { parent: null, current: label }
}

// ── Sub-components ────────────────────────────────────────────────────────────

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

// ── Main component ────────────────────────────────────────────────────────────

export default function Navbar({ tables, currentTable, setCurrentTable, onOpenSidebar, adminLang = 'en', onAdminLangChange }: NavbarProps) {
  const [admin, setAdmin]                   = useState<{ name: string; email?: string; role: string } | null>(null)
  const [search, setSearch]                 = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searching, setSearching]           = useState(false)
  const [results, setResults]               = useState<SearchResult[]>([])
  const [activeIndex, setActiveIndex]       = useState(-1)
  const [searchFocused, setSearchFocused]   = useState(false)
  const [profileOpen, setProfileOpen]       = useState(false)
  const [langPickerOpen, setLangPickerOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  const searchBoxRef  = useRef<HTMLDivElement>(null)
  const profileRef    = useRef<HTMLDivElement>(null)
  const langPickerRef = useRef<HTMLDivElement>(null)

  // Load admin profile + unread notification count
  useEffect(() => {
    void getCachedAdmin().then(d => { if (d) setAdmin(d as typeof admin) })
  }, [])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  // Run search
  useEffect(() => {
    const q = debouncedSearch
    if (q.length < 2) { setResults([]); setSearching(false); return }
    let cancelled = false
    setSearching(true)
    const orSafeQ = q.replace(/[,()]/g, '')
    void (async () => {
      try {
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
        if (!cancelled) setResults(all)
      } catch (err) {
        console.error('[Navbar] search failed:', err)
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setSearching(false)
      }
    })()
    return () => { cancelled = true }
  }, [debouncedSearch, tables])

  useEffect(() => { setActiveIndex(-1) }, [results])

  // Click-outside handlers
  useEffect(() => {
    const h = (e: MouseEvent) => { if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setSearchFocused(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])
  useEffect(() => {
    if (!profileOpen) return
    const h = (e: MouseEvent) => { if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [profileOpen])
  useEffect(() => {
    if (!langPickerOpen) return
    const h = (e: MouseEvent) => { if (langPickerRef.current && !langPickerRef.current.contains(e.target as Node)) setLangPickerOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [langPickerOpen])

  const showDropdown = searchFocused && search.trim().length >= 2
  const isPending    = searching || search.trim() !== debouncedSearch
  const breadcrumb   = getBreadcrumb(currentTable)

  const handleSelectResult = (r: SearchResult) => {
    switch (r.kind) {
      case 'mission': setCurrentTable(`mission:${r.categorySlug}:${r.id}`); break
      case 'child':   setCurrentTable(`children:${r.id}`); break
      case 'parent':  setCurrentTable(`parents:${r.id}`); break
      case 'story':   setCurrentTable(`stories:${r.id}`); break
      case 'page':    setCurrentTable(r.table); break
    }
    setSearch(''); setDebouncedSearch(''); setResults([]); setSearchFocused(false)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setSearch(''); setSearchFocused(false); return }
    if (!showDropdown || results.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => (i + 1) % results.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => (i - 1 + results.length) % results.length) }
    else if (e.key === 'Enter')   { e.preventDefault(); if (activeIndex >= 0) handleSelectResult(results[activeIndex]) }
  }

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/admin/login' }

  const initials = (admin?.name ?? 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <header className="w-full bg-white border-b border-gray-100 relative z-40 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-3 px-4 sm:px-5 h-14">

        {/* Hamburger (mobile) */}
        <button onClick={onOpenSidebar} aria-label="Open sidebar"
          className="lg:hidden flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 transition">
          <Menu size={18} />
        </button>

        {/* Breadcrumb */}
        <div className="hidden lg:flex items-center gap-1.5 text-[13px] font-medium flex-shrink-0">
          {breadcrumb.parent ? (
            <>
              <span className="text-gray-400">{breadcrumb.parent}</span>
              <ChevronRight size={13} className="text-gray-300" />
              <span className="text-gray-800 font-semibold">{breadcrumb.current}</span>
            </>
          ) : (
            <span className="text-gray-800 font-semibold">{breadcrumb.current}</span>
          )}
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px h-5 bg-gray-100 flex-shrink-0 ml-1" />

        {/* Search bar */}
        <div className="relative flex-1 max-w-md hidden sm:block" ref={searchBoxRef}>
          <div className={`flex items-center gap-2 rounded-xl px-3 py-2 border transition-all ${
            searchFocused
              ? 'bg-white border-green-400 shadow-[0_0_0_3px_rgba(34,197,94,0.10)]'
              : 'bg-gray-50 border-gray-100 hover:border-gray-200'
          }`}>
            {isPending && search.trim().length >= 2
              ? <Loader2 size={14} className="text-gray-400 flex-shrink-0 animate-spin" />
              : <Search size={14} className="text-gray-400 flex-shrink-0" />
            }
            <input
              type="text"
              placeholder="Search stories, children, parents…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onKeyDown={handleSearchKeyDown}
              className="flex-1 min-w-0 bg-transparent text-[13px] text-gray-700 placeholder:text-gray-400 focus:outline-none"
            />
            {search && (
              <button onClick={() => { setSearch(''); setResults([]); setSearchFocused(false) }}
                className="text-gray-300 hover:text-gray-500 transition flex-shrink-0">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Search dropdown */}
          {showDropdown && (
            <div className="absolute top-full mt-2 left-0 w-full bg-white border border-gray-100 rounded-2xl shadow-xl max-h-80 overflow-auto z-50 py-2">
              {results.length === 0 && !isPending ? (
                <p className="text-center text-gray-400 text-[13px] py-8">No results for &quot;{debouncedSearch}&quot;</p>
              ) : results.map((r, idx) => {
                const prevKind = idx > 0 ? results[idx - 1].kind : null
                const group    = GROUP_META[r.kind]
                const GroupIcon = group.icon
                const key = r.kind === 'page' ? `page-${r.table}` : `${r.kind}-${r.id}`
                return (
                  <React.Fragment key={key}>
                    {r.kind !== prevKind && (
                      <div className="px-4 pt-2.5 pb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        <GroupIcon size={10} /> {group.label}
                      </div>
                    )}
                    <button
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => handleSelectResult(r)}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[13px] transition ${
                        idx === activeIndex ? 'bg-green-50' : 'hover:bg-gray-50'
                      }`}>
                      <ResultRow result={r} />
                    </button>
                  </React.Fragment>
                )
              })}
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right actions */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {/* Mobile search trigger */}
          <button onClick={() => setMobileSearchOpen(true)} aria-label="Search"
            className="sm:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 transition">
            <Search size={16} />
          </button>

          {/* Language picker */}
          {onAdminLangChange && (
            <div className="relative" ref={langPickerRef}>
              <button
                onClick={() => { setLangPickerOpen(o => !o); setProfileOpen(false) }}
                className="flex items-center gap-1.5 h-9 px-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition text-[12px] font-bold text-gray-600"
                title="Content language">
                <span className="text-base leading-none">{LANGUAGE_META[adminLang].flag}</span>
                <span className="uppercase">{adminLang}</span>
                <ChevronDown size={11} className="text-gray-400" />
              </button>
              {langPickerOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden py-1.5">
                  <p className="px-4 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">Content language</p>
                  {LANGUAGES.map(lang => {
                    const meta = LANGUAGE_META[lang]
                    const active = lang === adminLang
                    return (
                      <button key={lang}
                        onClick={() => { onAdminLangChange(lang); setLangPickerOpen(false) }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] transition ${
                          active ? 'bg-green-50 text-green-700 font-bold' : 'hover:bg-gray-50 text-gray-700 font-medium'
                        }`}>
                        <span className="text-base">{meta.flag}</span>
                        <span className="flex-1">{meta.label}</span>
                        {active && <span className="text-green-600 text-[11px] font-black">✓</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Notification bell */}
          <NotificationBell onNavigate={setCurrentTable} />

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => { setProfileOpen(o => !o); setLangPickerOpen(false) }}
              className="flex items-center gap-2 h-9 pl-1.5 pr-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition">
              <div className="w-6 h-6 rounded-lg bg-green-600 flex items-center justify-center text-white text-[10px] font-black flex-shrink-0">
                {initials}
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <p className="text-[12px] font-semibold text-gray-800 max-w-[100px] truncate">{admin?.name ?? 'Admin'}</p>
                <p className="text-[10px] text-gray-400 capitalize">{admin?.role ?? 'super admin'}</p>
              </div>
              <ChevronDown size={12} className="text-gray-400 hidden sm:block" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden">
                {/* Profile header */}
                <div className="px-4 py-3 border-b border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center text-white text-[13px] font-black flex-shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-gray-800 truncate">{admin?.name ?? 'Admin'}</p>
                      <p className="text-[11px] text-gray-400 capitalize truncate">{admin?.role ?? 'super admin'}</p>
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-1.5">
                  <button
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left text-[13px] text-gray-700 font-medium transition"
                    onClick={() => { setProfileOpen(false); setCurrentTable('Dashboard') }}>
                    <LayoutDashboard size={15} className="text-gray-400 flex-shrink-0" />
                    Dashboard
                  </button>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left text-[13px] text-gray-700 font-medium transition"
                    onClick={() => { setProfileOpen(false); setCurrentTable('Profile') }}>
                    <UserCog size={15} className="text-gray-400 flex-shrink-0" />
                    My Profile
                  </button>
                </div>

                <div className="border-t border-gray-50 py-1.5">
                  <button
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 text-left text-[13px] text-red-600 font-medium transition"
                    onClick={handleLogout}>
                    <LogOut size={15} className="flex-shrink-0" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile search overlay */}
      {mobileSearchOpen && (
        <div className="absolute inset-0 bg-white z-50 flex items-center gap-2 px-3 sm:hidden border-b border-gray-100">
          <div className={`flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5 border transition-all ${
            true ? 'bg-white border-green-400 shadow-[0_0_0_3px_rgba(34,197,94,0.10)]' : 'bg-gray-50 border-gray-100'
          }`}>
            <Search size={14} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search…"
              value={search}
              autoFocus
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="flex-1 min-w-0 bg-transparent text-[14px] text-gray-700 placeholder:text-gray-400 focus:outline-none"
            />
            {search && (
              <button onClick={() => { setSearch(''); setResults([]) }} className="text-gray-300 hover:text-gray-500 transition">
                <X size={13} />
              </button>
            )}
          </div>
          <button
            onClick={() => { setMobileSearchOpen(false); setSearch(''); setResults([]) }}
            className="text-[13px] font-semibold text-gray-500 px-1 py-2 flex-shrink-0">
            Cancel
          </button>

          {search.trim().length >= 2 && (
            <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-72 overflow-auto z-50 py-1.5">
              {isPending ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400">
                  <Loader2 size={16} className="animate-spin" /> Searching…
                </div>
              ) : results.length === 0 ? (
                <p className="text-center text-gray-400 text-[13px] py-8">No results</p>
              ) : results.map((r, idx) => {
                const prevKind  = idx > 0 ? results[idx - 1].kind : null
                const group     = GROUP_META[r.kind]
                const GroupIcon = group.icon
                const key = r.kind === 'page' ? `page-${r.table}` : `${r.kind}-${r.id}`
                return (
                  <React.Fragment key={key}>
                    {r.kind !== prevKind && (
                      <div className="px-4 pt-2.5 pb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        <GroupIcon size={10} /> {group.label}
                      </div>
                    )}
                    <button
                      onClick={() => { handleSelectResult(r); setMobileSearchOpen(false) }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[13px] hover:bg-gray-50 transition">
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
