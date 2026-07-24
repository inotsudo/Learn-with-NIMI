'use client'
import React, { useCallback, useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import {
  Menu, ClipboardList, Search, RefreshCw, ChevronDown, ChevronRight,
  AlertCircle, Shield, User, BookOpen, Star, Bell, Award, Gift, Mail, Share2,
} from 'lucide-react'
import { ACCENT } from './missionMeta'

interface Props {
  onNavigate?: (table: string) => void
  onOpenSidebar?: () => void
}

interface AuditRow {
  id: string
  admin_email: string
  action: string
  entity_type: string
  entity_id: string | null
  entity_label: string | null
  metadata: Record<string, unknown>
  created_at: string
}

type DateFilter = 'today' | '7d' | '30d' | 'all'
type EntityFilter = 'all' | 'child' | 'parent' | 'story' | 'mission' | 'subscription' | 'certificate' | 'gift' | 'newsletter'

const PAGE_SIZE = 20

// Color and icon per entity type
const ENTITY_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  child:        { label: 'Child',        icon: User,        color: 'bg-green-100 text-green-700' },
  parent:       { label: 'Parent',       icon: Shield,      color: 'bg-blue-100 text-blue-700' },
  story:        { label: 'Story',        icon: BookOpen,    color: 'bg-violet-100 text-violet-700' },
  mission:      { label: 'Mission',      icon: Star,        color: 'bg-amber-100 text-amber-700' },
  subscription: { label: 'Subscription', icon: Award,       color: 'bg-emerald-100 text-emerald-700' },
  certificate:  { label: 'Certificate',  icon: Award,       color: 'bg-sky-100 text-sky-700' },
  gift:         { label: 'Gift',         icon: Gift,        color: 'bg-pink-100 text-pink-700' },
  newsletter:   { label: 'Newsletter',   icon: Mail,        color: 'bg-orange-100 text-orange-700' },
  referral:     { label: 'Referral',     icon: Share2,      color: 'bg-teal-100 text-teal-700' },
}

const DEFAULT_ENTITY = { label: 'Event', icon: Bell, color: 'bg-gray-100 text-gray-600' }

function getEntityMeta(type: string) {
  return ENTITY_META[type] ?? DEFAULT_ENTITY
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  const months = Math.floor(days / 30)
  return `${months} month${months === 1 ? '' : 's'} ago`
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 animate-pulse">
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-100 rounded w-48" />
        <div className="h-2.5 bg-gray-100 rounded w-32" />
      </div>
      <div className="h-3 bg-gray-100 rounded w-20" />
    </div>
  )
}

const accent = ACCENT.violet

export default function AuditLogManager({ onOpenSidebar }: Props) {
  const [rows, setRows] = useState<AuditRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [entityFilter, setEntityFilter] = useState<EntityFilter>('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [stats, setStats] = useState({ total: 0, today: 0, week: 0, admins: 0 })

  // Debounce the search to avoid a fetch on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [debouncedSearch, entityFilter, dateFilter])

  const load = useCallback(async (
    currentPage: number,
    currentSearch: string,
    currentEntity: EntityFilter,
    currentDate: DateFilter,
  ) => {
    setLoading(true)
    setError('')
    try {
      const offset = (currentPage - 1) * PAGE_SIZE
      let q = supabase
        .from('admin_audit_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)

      // Server-side date filter
      if (currentDate !== 'all') {
        const cutoff = new Date()
        if (currentDate === 'today') cutoff.setHours(0, 0, 0, 0)
        else if (currentDate === '7d')  cutoff.setDate(cutoff.getDate() - 7)
        else if (currentDate === '30d') cutoff.setDate(cutoff.getDate() - 30)
        q = q.gte('created_at', cutoff.toISOString())
      }

      // Server-side entity filter
      if (currentEntity !== 'all') q = q.eq('entity_type', currentEntity)

      // Server-side search (admin email, action, or entity label)
      if (currentSearch.trim()) {
        q = q.or(
          `admin_email.ilike.%${currentSearch}%,action.ilike.%${currentSearch}%,entity_label.ilike.%${currentSearch}%`
        )
      }

      const { data, error: fetchErr, count } = await q
      if (fetchErr) throw fetchErr

      const loaded = (data ?? []) as AuditRow[]
      setRows(loaded)
      setTotal(count ?? 0)

      // Stats: lightweight count-only queries (no row data returned)
      const todayISO = new Date(); todayISO.setHours(0, 0, 0, 0)
      const weekISO  = new Date(); weekISO.setDate(weekISO.getDate() - 7)
      const [{ count: todayCnt }, { count: weekCnt }, { data: adminRows }] = await Promise.all([
        supabase.from('admin_audit_log').select('*', { count: 'exact', head: true }).gte('created_at', todayISO.toISOString()),
        supabase.from('admin_audit_log').select('*', { count: 'exact', head: true }).gte('created_at', weekISO.toISOString()),
        supabase.from('admin_audit_log').select('admin_email'),
      ])
      const uniqueAdmins = new Set((adminRows ?? []).map((r: { admin_email: string }) => r.admin_email)).size
      setStats({ total: count ?? 0, today: todayCnt ?? 0, week: weekCnt ?? 0, admins: uniqueAdmins })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(page, debouncedSearch, entityFilter, dateFilter)
  }, [load, page, debouncedSearch, entityFilter, dateFilter])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const pageRows   = rows    // already the correct page from the server

  const ENTITY_OPTIONS: { value: EntityFilter; label: string }[] = [
    { value: 'all',          label: 'All types' },
    { value: 'child',        label: 'Child' },
    { value: 'parent',       label: 'Parent' },
    { value: 'story',        label: 'Story' },
    { value: 'mission',      label: 'Mission' },
    { value: 'subscription', label: 'Subscription' },
    { value: 'certificate',  label: 'Certificate' },
    { value: 'gift',         label: 'Gift' },
    { value: 'newsletter',   label: 'Newsletter' },
  ]

  const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: '7d',    label: 'Last 7 days' },
    { value: '30d',   label: 'Last 30 days' },
    { value: 'all',   label: 'All time' },
  ]

  // --- Render ---
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-ds-border px-5 sm:px-6 py-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSidebar}
            aria-label="Open sidebar"
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-gray-500 hover:bg-gray-100 transition flex-shrink-0"
          >
            <Menu size={17} />
          </button>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accent.tile}`}>
            <ClipboardList className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[19px] font-extrabold text-gray-900 leading-tight">Audit Log</h1>
            <p className="text-[12px] text-gray-400 font-medium mt-0.5">
              Every meaningful admin action — who did what, when, on which record
            </p>
          </div>
          <button
            onClick={() => void load(page, debouncedSearch, entityFilter, dateFilter)}
            disabled={loading}
            aria-label="Refresh audit log"
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full border border-ds-border bg-white text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition disabled:opacity-40"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Events',    value: stats.total,  color: 'bg-violet-50 text-violet-700' },
            { label: 'Today',           value: stats.today,  color: 'bg-emerald-50 text-emerald-700' },
            { label: 'Last 7 Days',     value: stats.week,   color: 'bg-blue-50 text-blue-700' },
            { label: 'Unique Admins',   value: stats.admins, color: 'bg-amber-50 text-amber-700' },
          ].map(s => (
            <div key={s.label} className={`${s.color} rounded-2xl px-4 py-4`}>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{s.label}</p>
              <p className="text-[28px] font-black mt-1 tabular-nums">{loading ? '—' : s.value}</p>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by admin, record, or action…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-ds-border rounded-xl text-[13px] text-ds-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 transition"
            />
          </div>

          {/* Entity type */}
          <div className="relative">
            <select
              value={entityFilter}
              onChange={e => setEntityFilter(e.target.value as EntityFilter)}
              className="appearance-none pl-3 pr-8 py-2 bg-white border border-ds-border rounded-xl text-[13px] font-medium text-ds-text focus:outline-none focus:ring-2 focus:ring-violet-200 transition cursor-pointer"
            >
              {ENTITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Date range */}
          <div className="flex items-center gap-1 bg-white border border-ds-border rounded-xl p-1">
            {DATE_OPTIONS.map(o => (
              <button
                key={o.value}
                onClick={() => setDateFilter(o.value)}
                className={`px-2.5 py-1 rounded-lg text-[12px] font-bold transition ${
                  dateFilter === o.value
                    ? `${accent.soft} ${accent.text}`
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {error ? (
          <div className="bg-white rounded-2xl border border-red-100 p-8 flex flex-col items-center text-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-400">
              <AlertCircle className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-gray-700">Failed to load audit log</p>
            <p className="text-xs text-gray-400 max-w-xs">{error}</p>
            <button
              onClick={() => void load(page, debouncedSearch, entityFilter, dateFilter)}
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full text-white transition ${accent.button}`}
            >
              <RefreshCw className="w-3 h-3" /> Try again
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <>
                {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
              </>
            ) : pageRows.length === 0 ? (
              <div className="py-16 flex flex-col items-center text-center gap-3 text-gray-400">
                <ClipboardList className="w-10 h-10 opacity-30" />
                <p className="font-bold text-[15px]">No events found</p>
                <p className="text-[13px]">
                  {debouncedSearch || entityFilter !== 'all' || dateFilter !== 'all'
                    ? 'Try broadening your filters.'
                    : 'Admin actions will appear here as they happen.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {pageRows.map(row => {
                  const meta    = getEntityMeta(row.entity_type)
                  const Icon    = meta.icon
                  const isOpen  = expandedId === row.id
                  const hasData = row.metadata && Object.keys(row.metadata).length > 0

                  return (
                    <div key={row.id}>
                      <div className="flex items-center gap-3 px-5 py-3.5">
                        {/* Entity icon pill */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>

                        {/* Main content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Action badge */}
                            <span className="font-mono text-[11px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md tracking-tight">
                              {row.action}
                            </span>
                            {/* Entity label */}
                            {row.entity_label && (
                              <span className="text-[13px] font-bold text-gray-800 truncate max-w-[200px]">
                                {row.entity_label}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                            {row.admin_email}
                          </p>
                        </div>

                        {/* Timestamp */}
                        <time
                          dateTime={row.created_at}
                          title={new Date(row.created_at).toLocaleString('en-US', {
                            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                          className="text-[11px] text-gray-400 flex-shrink-0 tabular-nums"
                        >
                          {relativeTime(row.created_at)}
                        </time>

                        {/* Expand toggle */}
                        {hasData && (
                          <button
                            onClick={() => setExpandedId(isOpen ? null : row.id)}
                            aria-label={isOpen ? 'Collapse metadata' : 'Expand metadata'}
                            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                          >
                            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        )}
                        {!hasData && <div className="w-7 flex-shrink-0" />}
                      </div>

                      {/* Metadata panel */}
                      {isOpen && hasData && (
                        <div className="px-5 pb-4">
                          <pre className="text-[11px] text-gray-600 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap break-all">
                            {JSON.stringify(row.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pagination */}
            {!loading && total > PAGE_SIZE && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-50 bg-gray-50/50">
                <span className="text-[12px] text-gray-400 tabular-nums">
                  {total > 0
                    ? `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, total)} of ${total}`
                    : '0 events'}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="px-3 py-1.5 rounded-lg border border-ds-border text-[12px] font-bold text-gray-500 hover:bg-white disabled:opacity-30 transition"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                    const pageNum = i + 1
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-[12px] font-bold transition ${
                          pageNum === safePage
                            ? `${accent.badge} text-white`
                            : 'border border-ds-border text-gray-500 hover:bg-white'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    className="px-3 py-1.5 rounded-lg border border-ds-border text-[12px] font-bold text-gray-500 hover:bg-white disabled:opacity-30 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
