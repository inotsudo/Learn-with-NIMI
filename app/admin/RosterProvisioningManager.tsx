'use client'
import React, { useEffect, useState, useCallback } from 'react'
import supabase from '@/lib/supabaseClient'
import {
  Users, School, GraduationCap, RefreshCw, Link2, Archive,
  Search, ChevronDown, AlertCircle, CheckCircle2, Clock, Menu,
  X, ExternalLink,
} from 'lucide-react'

interface Props {
  onOpenSidebar?: () => void
}

type RecordType = 'student' | 'teacher' | 'school'
type StatusFilter = 'pending' | 'linked' | 'archived'

interface StagedRow {
  id:              string
  provider:        string
  provider_id:     string
  record_type:     string
  data:            Record<string, unknown>
  school_id:       string | null
  status:          string
  linked_child_id: string | null
  linked_user_id:  string | null
  archived:        boolean
  created_at:      string
  schools?:        { name: string } | null
}

interface ChildOption {
  id:   string
  name: string
  age:  number | null
  language: string
}

const RECORD_TABS: { key: RecordType; label: string; icon: React.ElementType }[] = [
  { key: 'student', label: 'Students',  icon: Users },
  { key: 'teacher', label: 'Teachers',  icon: GraduationCap },
  { key: 'school',  label: 'Schools',   icon: School },
]

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'pending',  label: 'Pending' },
  { key: 'linked',   label: 'Linked' },
  { key: 'archived', label: 'Archived' },
]

function extractName(data: Record<string, unknown>): string {
  if (typeof data.name === 'string') return data.name
  if (data.name && typeof data.name === 'object') {
    const n = data.name as { first?: string; last?: string }
    return [n.first, n.last].filter(Boolean).join(' ')
  }
  return (data.email as string) ?? (data.id as string) ?? '—'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function ProviderBadge({ provider }: { provider: string }) {
  const colors: Record<string, string> = {
    clever:    'bg-yellow-100 text-yellow-800',
    classlink: 'bg-blue-100 text-blue-800',
    csv:       'bg-gray-100 text-gray-700',
  }
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${colors[provider] ?? 'bg-gray-100 text-gray-700'}`}>
      {provider}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    pending:  { label: 'Pending',  className: 'bg-amber-100 text-amber-700',  icon: Clock },
    linked:   { label: 'Linked',   className: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
    archived: { label: 'Archived', className: 'bg-gray-100 text-gray-500',    icon: Archive },
    error:    { label: 'Error',    className: 'bg-red-100 text-red-700',       icon: AlertCircle },
  }
  const c = cfg[status] ?? cfg.error
  const Icon = c.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.className}`}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  )
}

// ── LinkChildModal ────────────────────────────────────────────────────────────

interface LinkModalProps {
  row:       StagedRow
  onLink:    (rowId: string, childId: string) => Promise<void>
  onClose:   () => void
}

function LinkChildModal({ row, onLink, onClose }: LinkModalProps) {
  const [search, setSearch] = useState('')
  const [children, setChildren] = useState<ChildOption[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    if (search.length < 2) { setChildren([]); return }
    setLoading(true)
    void supabase
      .from('children')
      .select('id, name, age, language')
      .ilike('name', `%${search}%`)
      .limit(20)
      .then(({ data }) => {
        setChildren((data ?? []) as ChildOption[])
        setLoading(false)
      })
  }, [search])

  async function handleLink() {
    if (!selected) return
    setSaving(true)
    await onLink(row.id, selected)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-ds-text text-[15px]">Link to existing child</h3>
            <p className="text-gray-400 text-[12px] mt-0.5">
              {extractName(row.data)} — {row.provider}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search child by name…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
            />
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1">
            {loading && (
              <div className="text-center py-4 text-gray-400 text-sm">Searching…</div>
            )}
            {!loading && children.length === 0 && search.length >= 2 && (
              <div className="text-center py-4 text-gray-400 text-sm">No children found</div>
            )}
            {children.map(c => (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition text-sm ${
                  selected === c.id ? 'bg-green-50 border border-green-200' : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-[13px] flex-shrink-0">
                  {c.name[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-ds-text">{c.name}</div>
                  <div className="text-gray-400 text-[11px]">Age {c.age ?? '?'} · {c.language.toUpperCase()}</div>
                </div>
                {selected === c.id && <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto" />}
              </button>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
              Cancel
            </button>
            <button
              onClick={handleLink}
              disabled={!selected || saving}
              className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Linking…' : 'Link child'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── RosterRow ─────────────────────────────────────────────────────────────────

interface RosterRowProps {
  row:       StagedRow
  onLink:    (row: StagedRow) => void
  onArchive: (id: string) => Promise<void>
}

function RosterRow({ row, onLink, onArchive }: RosterRowProps) {
  const [archiving, setArchiving] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const name  = extractName(row.data)
  const email = row.data.email as string | undefined
  const grade = row.data.grade as string | undefined

  async function archive() {
    setArchiving(true)
    await onArchive(row.id)
    setArchiving(false)
  }

  return (
    <div className="border border-gray-100 rounded-xl bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-[13px] flex-shrink-0">
          {name[0]?.toUpperCase() ?? '?'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[13px] text-ds-text truncate">{name}</span>
            <ProviderBadge provider={row.provider} />
            <StatusBadge status={row.status} />
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-400">
            {email && <span>{email}</span>}
            {grade && <span>Grade {grade}</span>}
            {row.schools?.name && <span>{row.schools.name}</span>}
            <span>{fmtDate(row.created_at)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {row.status === 'pending' && (
            <button
              onClick={() => onLink(row)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-[12px] font-bold hover:bg-green-700 transition"
            >
              <Link2 className="w-3.5 h-3.5" />
              Link
            </button>
          )}
          {row.status === 'linked' && row.linked_child_id && (
            <span className="flex items-center gap-1 text-[11px] text-green-600 font-semibold px-2 py-1 bg-green-50 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Child linked
            </span>
          )}
          {row.status !== 'archived' && (
            <button
              onClick={archive}
              disabled={archiving}
              title="Archive"
              className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition disabled:opacity-50"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 transition"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-3 border-t border-gray-50">
          <div className="mt-2 rounded-lg bg-gray-50 p-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Raw provider data</p>
            <pre className="text-[11px] text-gray-600 whitespace-pre-wrap break-all font-mono leading-relaxed overflow-x-auto">
              {JSON.stringify(row.data, null, 2)}
            </pre>
            <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-2 flex-wrap text-[10px] text-gray-400">
              <span className="font-mono">ID: {row.provider_id}</span>
              {row.linked_child_id && <span className="font-mono">→ child: {row.linked_child_id}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RosterProvisioningManager({ onOpenSidebar }: Props) {
  const [recordType, setRecordType] = useState<RecordType>('student')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [rows, setRows] = useState<StagedRow[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [linkTarget, setLinkTarget] = useState<StagedRow | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) { setError('Not authenticated'); setLoading(false); return }

      const res = await fetch(
        `/api/admin/roster?type=${recordType}&status=${statusFilter}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (!res.ok) { setError('Failed to load roster data'); setLoading(false); return }

      const json = await res.json() as { rows: StagedRow[]; counts: Record<string, number> }
      setRows(json.rows)
      setCounts(json.counts)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [recordType, statusFilter])

  useEffect(() => { void load() }, [load])

  async function handleLink(rowId: string, childId: string) {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) return
    await fetch('/api/admin/roster', {
      method:  'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: rowId, linkedChildId: childId }),
    })
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, status: 'linked', linked_child_id: childId } : r))
    setCounts(prev => ({ ...prev, pending: Math.max(0, (prev.pending ?? 0) - 1), linked: (prev.linked ?? 0) + 1 }))
  }

  async function handleArchive(id: string) {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) return
    await fetch(`/api/admin/roster?id=${id}`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setRows(prev => prev.filter(r => r.id !== id))
    setCounts(prev => ({
      ...prev,
      [statusFilter]: Math.max(0, (prev[statusFilter] ?? 0) - 1),
      archived: (prev.archived ?? 0) + 1,
    }))
  }

  const totalPending = counts.pending ?? 0

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-white flex items-center gap-3 flex-shrink-0">
        <button onClick={onOpenSidebar} className="lg:hidden w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition">
          <Menu className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-[17px] font-bold text-ds-text">Roster Provisioning</h1>
            {totalPending > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold">
                {totalPending} pending
              </span>
            )}
          </div>
          <p className="text-gray-400 text-[12px] mt-0.5">
            Review users imported via Clever and ClassLink — link students to existing learner accounts
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-500 transition"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Record type tabs */}
      <div className="px-6 pt-4 pb-0 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex gap-1">
          {RECORD_TABS.map(tab => {
            const Icon = tab.icon
            const active = recordType === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setRecordType(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold border-b-2 transition ${
                  active ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-ds-text'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Status filter + stats bar */}
      <div className="px-6 py-3 bg-white border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {STATUS_TABS.map(tab => {
            const cnt = counts[tab.key] ?? 0
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition ${
                  statusFilter === tab.key ? 'bg-white text-ds-text shadow-sm' : 'text-gray-500 hover:text-ds-text'
                }`}
              >
                {tab.label}
                {cnt > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    statusFilter === tab.key && tab.key === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {cnt}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <span className="text-[12px] text-gray-400 ml-auto">{rows.length} result{rows.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {loading && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              {statusFilter === 'pending'  && <Clock className="w-6 h-6 text-gray-400" />}
              {statusFilter === 'linked'   && <CheckCircle2 className="w-6 h-6 text-gray-400" />}
              {statusFilter === 'archived' && <Archive className="w-6 h-6 text-gray-400" />}
            </div>
            <p className="text-[14px] font-semibold text-gray-500">
              {statusFilter === 'pending'  && 'No pending entries'}
              {statusFilter === 'linked'   && 'No linked entries yet'}
              {statusFilter === 'archived' && 'Nothing archived'}
            </p>
            <p className="text-[12px] text-gray-400 mt-1 max-w-xs">
              {statusFilter === 'pending'
                ? `When ${recordType}s arrive via Clever or ClassLink webhooks, they'll appear here for review.`
                : `${statusFilter === 'linked' ? 'Linked' : 'Archived'} ${recordType}s will appear here.`}
            </p>
            {statusFilter === 'pending' && (
              <a
                href="https://dev.clever.com/v3.0/docs/webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center gap-1.5 text-[12px] text-green-600 font-semibold hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Clever webhook docs
              </a>
            )}
          </div>
        )}

        {!loading && !error && rows.map(row => (
          <RosterRow
            key={row.id}
            row={row}
            onLink={r => setLinkTarget(r)}
            onArchive={handleArchive}
          />
        ))}
      </div>

      {linkTarget && (
        <LinkChildModal
          row={linkTarget}
          onLink={handleLink}
          onClose={() => setLinkTarget(null)}
        />
      )}
    </div>
  )
}
