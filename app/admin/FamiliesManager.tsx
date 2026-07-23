'use client'
import React, { useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import { Search, Menu, ChevronDown, ChevronRight, Users, Baby, Crown, Gift, X, Trash2, AlertTriangle } from 'lucide-react'
import { useToast } from './Toast'
import { useConfirmDialog } from './ConfirmDialog'
import { logAdminAction } from '@/lib/adminAuditLog'
import ChildAvatar from '@/components/avatar/ChildAvatar'

interface Props {
  onNavigate: (table: string) => void
  onOpenSidebar?: () => void
}

interface SubRow {
  status: string
  amount: number
  currency: string
  billing_interval: string
  current_period_end: string
  cancel_at_period_end: boolean
  payment_provider: string
}

interface ChildRow {
  id: string
  name: string
  avatar_url: string | null
  age: number | null
  language: string
  created_at: string
  parent_id?: string | null
  teacher_id?: string | null
}

interface FamilyRow {
  parent_id: string
  parent_name: string
  parent_email: string
  children: ChildRow[]
  subscription: SubRow | null
}

type FilterMode = 'all' | 'club' | 'free'

/** Normalise raw JSON avatar strings that are missing the "ava:" prefix */
function normaliseAvatar(raw: string | null): string | null {
  if (!raw) return null
  if (raw.startsWith('ava:') || raw.startsWith('http')) return raw
  if (raw.startsWith('{')) return 'ava:' + raw
  return raw
}

const LANG_LABEL: Record<string, string> = { en: '🇬🇧 EN', fr: '🇫🇷 FR', rw: '🇷🇼 RW' }

export default function FamiliesManager({ onNavigate, onOpenSidebar }: Props) {
  const [families, setFamilies] = useState<FamilyRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState<FilterMode>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [grantingId, setGrantingId] = useState<string | null>(null)
  const [grantMonths, setGrantMonths] = useState(1)
  const [grantingFor, setGrantingFor] = useState<string | null>(null)
  const [grantError, setGrantError]   = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const { error: toastErr, success: toastOk } = useToast()
  const { confirm, dialog } = useConfirmDialog()

  useEffect(() => {
    void (async () => {
      try {
        // Fetch children flat (not via nested FK join) so we capture both
        // parent_id-linked children AND teacher_id-linked children (the parent
        // view does the same with .or(parent_id,teacher_id)).
        // The admin RLS bypass lets us read all rows; limit 10 000 avoids the
        // default 1 000-row PostgREST cap without a full paginated loop.
        const [
          { data: parents, error: parentsErr },
          { data: allChildren, error: childrenErr },
          { data: subs, error: subsErr },
        ] = await Promise.all([
          supabase.from('parents').select('id, name, email').order('name'),
          supabase
            .from('children')
            .select('id, name, avatar_url, age, language, created_at, parent_id, teacher_id')
            .limit(10000),
          supabase
            .from('nimipiko_subscriptions')
            .select('parent_id, status, amount, currency, billing_interval, current_period_end, cancel_at_period_end, payment_provider')
            .eq('status', 'active'),
        ])

        if (parentsErr) throw parentsErr
        if (childrenErr) throw childrenErr
        if (subsErr) throw subsErr

        const subMap = new Map<string, SubRow>()
        for (const s of subs ?? []) subMap.set(s.parent_id, s)

        const result: FamilyRow[] = (parents ?? []).map(p => ({
          parent_id:    p.id,
          parent_name:  (p.name && p.name !== 'Parent' && p.name !== 'parent') ? p.name : (p.email ?? 'Unknown'),
          parent_email: p.email ?? '',
          children: (allChildren ?? [])
            .filter(c => c.parent_id === p.id || (c.teacher_id === p.id && !c.parent_id))
            .map(c => ({ ...c, avatar_url: normaliseAvatar(c.avatar_url) })),
          subscription: subMap.get(p.id) ?? null,
        }))
        setFamilies(result)
      } catch (err) {
        toastErr(err instanceof Error ? err.message : 'Failed to load families.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const trialCount    = families.filter(f => f.subscription?.payment_provider === 'trial').length
  const clubCount     = families.filter(f => f.subscription !== null && f.subscription.payment_provider !== 'trial').length
  const freeCount     = families.length - clubCount - trialCount
  const totalChildren = families.reduce((n, f) => n + f.children.length, 0)

  async function handleGrantAccess(parentId: string, months: number) {
    setGrantingFor(parentId)
    setGrantError(null)
    try {
      const now = new Date()
      const periodEnd = new Date(now)
      periodEnd.setMonth(periodEnd.getMonth() + months)

      // Step 1: optional product lookup (fire-and-forget style, non-blocking)
      const { data: clubProduct } = await supabase
        .from('products').select('id').eq('slug', 'nimipiko-club').maybeSingle()

      // Step 2: insert subscription WITHOUT chained .select() to avoid the
      // "Prefer: return=representation" hang that occurs on some RLS setups
      const { error: subErr } = await supabase
        .from('nimipiko_subscriptions')
        .insert({
          parent_id: parentId,
          product_id: clubProduct?.id ?? null,
          status: 'active',
          currency: 'USD',
          amount: 0,
          billing_interval: 'month',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          payment_provider: 'admin_grant',
          cancel_at_period_end: true,
        })
      if (subErr) throw new Error(`Subscription insert: ${subErr.message} (${subErr.code})`)

      // Step 3: fetch the subscription we just created (separate read)
      const { data: newSub, error: fetchErr } = await supabase
        .from('nimipiko_subscriptions')
        .select('id, status, amount, currency, billing_interval, current_period_end, cancel_at_period_end, payment_provider')
        .eq('parent_id', parentId)
        .eq('status', 'active')
        .eq('payment_provider', 'admin_grant')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (fetchErr) throw new Error(`Subscription fetch: ${fetchErr.message} (${fetchErr.code})`)

      // Step 4: insert content_access row linked to the new subscription
      const { error: accessErr } = await supabase
        .from('content_access')
        .insert({ parent_id: parentId, access_type: 'club', story_id: null, subscription_id: newSub.id })
      if (accessErr) {
        // Best-effort rollback
        void supabase.from('nimipiko_subscriptions').delete().eq('id', newSub.id)
        throw new Error(`Access insert: ${accessErr.message} (${accessErr.code})`)
      }

      setFamilies(prev => prev.map(f => f.parent_id === parentId ? { ...f, subscription: newSub } : f))
      setGrantingId(null)
      setGrantError(null)
      toastOk(`Club granted for ${months} month${months > 1 ? 's' : ''}.`)
      void logAdminAction({ action: 'grant_club', entityType: 'subscription', entityId: newSub.id, entityLabel: parentId, metadata: { months, parent_id: parentId } })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setGrantError(msg)
      toastErr(msg)
    } finally {
      setGrantingFor(null)
    }
  }

  const filtered = families.filter(f => {
    if (filter === 'club' && !f.subscription) return false
    if (filter === 'free' && f.subscription) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      f.parent_name.toLowerCase().includes(q) ||
      f.parent_email.toLowerCase().includes(q) ||
      f.children.some(c => c.name.toLowerCase().includes(q))
    )
  })

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allFilteredIds = filtered.map(f => f.parent_id)
  const allSelected    = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.has(id))
  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(allFilteredIds))
  }

  async function handleBulkGrantClub() {
    const targets = filtered.filter(f => selectedIds.has(f.parent_id) && !f.subscription)
    if (targets.length === 0) { toastErr('All selected families already have Club.'); return }
    setBulkBusy(true)
    try {
      const { data: clubProduct } = await supabase.from('products').select('id').eq('slug', 'nimipiko-club').maybeSingle()
      const periodEnd = new Date()
      periodEnd.setMonth(periodEnd.getMonth() + 1)
      for (const f of targets) {
        await supabase.from('nimipiko_subscriptions').insert({
          parent_id: f.parent_id, product_id: clubProduct?.id ?? null,
          status: 'active', currency: 'USD', amount: 0, billing_interval: 'month',
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
          payment_provider: 'admin_grant', cancel_at_period_end: true,
        })
        await supabase.from('content_access').insert({ parent_id: f.parent_id, access_type: 'club', story_id: null })
      }
      const grantedIds = targets.map(t => t.parent_id)
      const { data: freshSubs } = await supabase
        .from('nimipiko_subscriptions')
        .select('parent_id, status, amount, currency, billing_interval, current_period_end, cancel_at_period_end, payment_provider')
        .eq('status', 'active').in('parent_id', grantedIds)
      const subMap = new Map<string, SubRow>()
      for (const s of freshSubs ?? []) subMap.set(s.parent_id, s)
      setFamilies(prev => prev.map(f => subMap.has(f.parent_id) ? { ...f, subscription: subMap.get(f.parent_id)! } : f))
      toastOk(`Club granted to ${targets.length} famil${targets.length === 1 ? 'y' : 'ies'}.`)
      setSelectedIds(new Set())
    } catch { toastErr('Bulk grant failed. Please try again.') }
    finally { setBulkBusy(false) }
  }

  async function handleBulkRevokeClub() {
    const targets = filtered.filter(f => selectedIds.has(f.parent_id) && f.subscription)
    if (targets.length === 0) { toastErr('No selected families have Club.'); return }
    const ok = await confirm({
      title: `Revoke Club from ${targets.length} ${targets.length === 1 ? 'family' : 'families'}?`,
      message: 'This will immediately remove their active Club subscriptions.',
      confirmLabel: 'Revoke', danger: true,
    })
    if (!ok) return
    setBulkBusy(true)
    try {
      const ids = targets.map(t => t.parent_id)
      const { error } = await supabase.from('nimipiko_subscriptions').delete().in('parent_id', ids).eq('status', 'active')
      if (error) throw error
      setFamilies(prev => prev.map(f => ids.includes(f.parent_id) ? { ...f, subscription: null } : f))
      toastOk(`Club revoked from ${targets.length} famil${targets.length === 1 ? 'y' : 'ies'}.`)
      setSelectedIds(new Set())
    } catch { toastErr('Bulk revoke failed. Please try again.') }
    finally { setBulkBusy(false) }
  }

  async function handleBulkDeleteAccounts() {
    const targets = filtered.filter(f => selectedIds.has(f.parent_id))
    if (targets.length === 0) return
    const ok = await confirm({
      title: `Delete ${targets.length} parent account${targets.length === 1 ? '' : 's'}?`,
      message: 'This permanently removes all selected parent accounts and cannot be undone.',
      confirmLabel: 'Delete', danger: true,
    })
    if (!ok) return
    setBulkBusy(true)
    try {
      const ids = targets.map(t => t.parent_id)
      const { error } = await supabase.from('parents').delete().in('id', ids)
      if (error) throw error
      setFamilies(prev => prev.filter(f => !ids.includes(f.parent_id)))
      toastOk(`${targets.length} account${targets.length === 1 ? '' : 's'} deleted.`)
      setSelectedIds(new Set())
    } catch { toastErr('Bulk delete failed. Please try again.') }
    finally { setBulkBusy(false) }
  }

  const selectedCount = Array.from(selectedIds).filter(id => filtered.some(f => f.parent_id === id)).length

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {dialog}

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5 flex-shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={onOpenSidebar} className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-gray-500">
              <Menu size={17} />
            </button>
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <h1 className="text-[17px] font-black text-gray-900">Families</h1>
              <p className="text-[12px] text-gray-500">
                {families.length} famil{families.length !== 1 ? 'ies' : 'y'} · <span className="text-green-600 font-bold">{clubCount} Club</span> · {freeCount} Free · {totalChildren} children
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
              {(['all', 'club', 'free'] as FilterMode[]).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-[12px] font-bold transition ${filter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
                  {f === 'club' ? '👑 Club' : f === 'free' ? '🔓 Free' : 'All'}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search families…" value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 bg-ds-input border border-ds-border rounded-xl text-[13px] text-ds-text focus:outline-none focus:ring-2 focus:ring-green-500 w-48" />
            </div>
          </div>
        </div>

        {!loading && filtered.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll}
              className="w-4 h-4 accent-green-600 cursor-pointer" aria-label="Select all families" />
            <span className="text-[12px] font-medium text-gray-500">Select all ({filtered.length})</span>
          </div>
        )}
      </div>

      {/* Stat cards */}
      {!loading && (
        <div className="px-6 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 flex-shrink-0">
          {[
            { label: 'Total Families',  value: families.length,  color: 'bg-gray-50 text-gray-700' },
            { label: 'Club Members',    value: clubCount,         color: 'bg-green-50 text-green-700' },
            { label: 'On Trial',        value: trialCount,        color: 'bg-amber-50 text-amber-700' },
            { label: 'Children',        value: totalChildren,     color: 'bg-blue-50 text-blue-700' },
          ].map(s => (
            <div key={s.label} className={`${s.color} rounded-2xl p-4`}>
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-60">{s.label}</p>
              <p className="text-[28px] font-black mt-0.5 leading-none">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-auto px-6 py-4 space-y-2 pb-28">
        {loading ? (
          <div className="pt-2 space-y-2">{Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[72px] bg-white rounded-2xl border border-gray-100 animate-pulse" />
          ))}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Users size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-[15px] font-bold text-gray-400">No families found</p>
            {search && <p className="text-[12px] text-gray-400 mt-1">Try a different search term.</p>}
          </div>
        ) : filtered.map(f => {
          const isOpen     = expandedId === f.parent_id
          const isSelected = selectedIds.has(f.parent_id)

          return (
            <div key={f.parent_id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                isSelected ? 'border-green-300 ring-1 ring-green-200' : 'border-gray-100'
              }`}>

              {/* Row header */}
              <button onClick={() => setExpandedId(isOpen ? null : f.parent_id)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50/50 transition text-left">

                <span onClick={e => e.stopPropagation()} className="shrink-0">
                  <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(f.parent_id)}
                    className="w-4 h-4 accent-green-600 cursor-pointer" aria-label={`Select ${f.parent_name}`} />
                </span>

                {/* Parent avatar — initial letter in colored circle */}
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-black text-[15px] shrink-0 select-none">
                  {f.parent_name[0]?.toUpperCase() ?? 'P'}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-gray-900 truncate">{f.parent_name}</p>
                  {f.parent_name !== f.parent_email && (
                    <p className="text-[11px] text-gray-400 truncate">{f.parent_email}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {f.subscription?.payment_provider === 'trial' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                      ⏳ Trial
                    </span>
                  ) : f.subscription ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                      <Crown size={10} /> Club
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">Free</span>
                  )}
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                    <Baby size={11} /> {f.children.length}
                  </span>
                  {isOpen
                    ? <ChevronDown size={15} className="text-gray-400" />
                    : <ChevronRight size={15} className="text-gray-400" />
                  }
                </div>
              </button>

              {/* Expanded panel */}
              {isOpen && (
                <div className="border-t border-gray-100 bg-gray-50/40 px-5 py-4 space-y-3">

                  {/* Subscription card */}
                  {f.subscription?.payment_provider === 'trial' ? (
                    <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                      <span className="text-[18px] shrink-0">⏳</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-black text-amber-800">7-Day Free Trial</p>
                        <p className="text-[10px] text-amber-700 mt-0.5">
                          Expires {new Date(f.subscription.current_period_end).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {' · '}
                          {Math.max(0, Math.ceil((new Date(f.subscription.current_period_end).getTime() - Date.now()) / 86_400_000))} days left
                        </p>
                      </div>
                    </div>
                  ) : f.subscription ? (
                    <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                      <Crown size={16} className="text-green-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-black text-green-800">NIMIPIKO Club Active</p>
                        <p className="text-[10px] text-green-600 mt-0.5">
                          {f.subscription.currency} {f.subscription.amount.toLocaleString()} / {f.subscription.billing_interval}
                          {' · '}Renews {new Date(f.subscription.current_period_end).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {f.subscription.cancel_at_period_end && (
                            <span className="ml-1 text-amber-600">· ⚠ Cancels at period end</span>
                          )}
                          {' · '}via {f.subscription.payment_provider === 'admin_grant' ? 'Admin Grant' : f.subscription.payment_provider === 'cybersource' ? 'Card' : 'MTN MoMo'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 bg-white border border-gray-100 rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <p className="text-[11px] text-gray-400 font-semibold">Free plan — no active subscription</p>
                        {grantingId === f.parent_id ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <select value={grantMonths} onChange={e => setGrantMonths(Number(e.target.value))}
                              className="text-[12px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
                              {[1, 2, 3, 6, 12].map(m => <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>)}
                            </select>
                            <button onClick={() => handleGrantAccess(f.parent_id, grantMonths)} disabled={grantingFor === f.parent_id}
                              className="text-[12px] font-bold bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 px-3 py-1.5 rounded-lg transition">
                              {grantingFor === f.parent_id ? 'Granting…' : 'Confirm'}
                            </button>
                            <button onClick={() => { setGrantingId(null); setGrantError(null) }} className="text-gray-400 hover:text-gray-600">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => { setGrantingId(f.parent_id); setGrantError(null) }}
                            className="flex items-center gap-1.5 text-[12px] font-bold text-green-700 bg-green-100 hover:bg-green-200 px-3 py-1.5 rounded-lg transition">
                            <Gift size={12} /> Grant Club Access
                          </button>
                        )}
                      </div>
                      {grantingId === f.parent_id && grantError && (
                        <p className="text-[11px] font-semibold text-red-600 bg-red-50 rounded-lg px-3 py-2 break-all">
                          ⚠ {grantError}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Children */}
                  {f.children.length === 0 ? (
                    <p className="text-[12px] text-gray-400 py-1 px-1">No children registered yet.</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide px-1">
                        {f.children.length} child{f.children.length !== 1 ? 'ren' : ''}
                      </p>
                      {f.children.map(c => (
                        <div key={c.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3 hover:border-gray-200 transition">
                          {/* Proper avatar: AvatarSvg for ava: strings, emoji for short strings, initial fallback */}
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200">
                            <ChildAvatar
                              avatarUrl={c.avatar_url}
                              name={c.name}
                              size={40}
                              fallbackEmoji="🧒"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-gray-900">{c.name}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {c.age != null && (
                                <span className="text-[10px] text-gray-400">Age {c.age}</span>
                              )}
                              {c.language && (
                                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                  {LANG_LABEL[c.language] ?? c.language.toUpperCase()}
                                </span>
                              )}
                              <span className="text-[10px] text-gray-400">
                                Joined {new Date(c.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => onNavigate(`children:${c.id}`)}
                            className="text-[11px] font-bold text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 px-2.5 py-1.5 rounded-lg transition shrink-0">
                            View
                          </button>
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

      {/* Floating bulk action bar */}
      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-[13px] font-bold text-gray-200 shrink-0">
            {selectedCount} famil{selectedCount === 1 ? 'y' : 'ies'} selected
          </span>
          <div className="w-px h-5 bg-gray-700 shrink-0" />
          <button onClick={handleBulkGrantClub} disabled={bulkBusy}
            className="text-[12px] font-bold bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition flex items-center gap-1.5">
            <Crown size={12} /> Grant Club (1 mo)
          </button>
          <button onClick={handleBulkRevokeClub} disabled={bulkBusy}
            className="text-[12px] font-bold bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition flex items-center gap-1.5">
            <AlertTriangle size={12} /> Revoke Club
          </button>
          <button onClick={handleBulkDeleteAccounts} disabled={bulkBusy}
            className="text-[12px] font-bold bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition flex items-center gap-1.5">
            <Trash2 size={12} /> Delete accounts
          </button>
          <button onClick={() => setSelectedIds(new Set())} disabled={bulkBusy}
            className="ml-1 text-gray-400 hover:text-white transition disabled:opacity-50" aria-label="Deselect all">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
