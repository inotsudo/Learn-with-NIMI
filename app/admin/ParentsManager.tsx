'use client'
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import supabase from '@/lib/supabaseClient'
import {
  Search, ChevronDown, Menu, Users, ArrowUpRight, Settings, AlertCircle, RefreshCw,
  Crown, Gift, Pencil, Check, X, Trash2, KeyRound,
} from 'lucide-react'
import { ACCENT, LANGUAGE_META, CATEGORY_META, FALLBACK_META, type Lang } from './missionMeta'
import { SkeletonHeaderBanner, SkeletonSplitPane } from './Skeleton'
import { useToast } from './Toast'
import { useConfirmDialog } from './ConfirmDialog'
import { logAdminAction } from '@/lib/adminAuditLog'

interface ParentsManagerProps {
  initialParentId?: string
  onNavigate: (table: string) => void
  onOpenSidebar?: () => void
}

interface ParentRow {
  id: string
  email: string
  name: string | null
  created_at: string | null
}

interface ChildRow {
  id: string
  parent_id: string
  name: string
  avatar_url: string | null
  language: string | null
  age: number | null
  favorite_category: string | null
}

interface SettingsRow {
  child_id: string
  daily_limit_minutes: number | null
  notifications_enabled: boolean | null
}

interface SubRow {
  parent_id: string
  status: string
  amount: number
  currency: string
  billing_interval: string
  current_period_end: string
  cancel_at_period_end: boolean
  payment_provider: string
}

const accent = ACCENT.emerald

const LANG_OPTIONS = [
  { value: 'en', label: '🇬🇧 English' },
  { value: 'fr', label: '🇫🇷 Français' },
  { value: 'rw', label: '🇷🇼 Kinyarwanda' },
]

const INPUT_CLS =
  'border border-gray-200 rounded-xl px-3 py-1.5 text-[13px] font-medium text-gray-700 focus:outline-none focus:border-green-400'
const ACTION_BTN =
  'w-8 h-8 rounded-lg flex items-center justify-center transition hover:bg-gray-100 text-gray-400 hover:text-gray-700'
const DANGER_BTN =
  'w-8 h-8 rounded-lg flex items-center justify-center transition hover:bg-red-50 text-gray-400 hover:text-red-500'

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function ParentAvatar({ name, size }: { name: string; size: 'sm' | 'lg' }) {
  const dims =
    size === 'lg' ? 'w-16 h-16 rounded-2xl text-lg' : 'w-11 h-11 rounded-full text-sm'
  return (
    <div className={`${dims} flex items-center justify-center flex-shrink-0 font-bold ${accent.tile}`}>
      {initials(name)}
    </div>
  )
}

function Avatar({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  // Bug fix: non-http strings that are longer than 4 chars are likely JSON / garbage — show initials
  if (avatarUrl && avatarUrl.startsWith('http')) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-white shadow-sm"
        loading="lazy"
      />
    )
  }
  if (avatarUrl && avatarUrl.length <= 4) {
    // Short string — treat as emoji avatar
    return (
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-base ${accent.tile}`}
      >
        <span className="leading-none">{avatarUrl}</span>
      </div>
    )
  }
  return (
    <div
      className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs ${accent.tile}`}
    >
      {initials(name)}
    </div>
  )
}

export default function ParentsManager({
  initialParentId,
  onNavigate,
  onOpenSidebar,
}: ParentsManagerProps) {
  const [parents, setParents] = useState<ParentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const appliedInitialIdRef = useRef<string | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [childrenByParent, setChildrenByParent] = useState<Record<string, ChildRow[]>>({})
  const [settingsByChild, setSettingsByChild] = useState<Record<string, SettingsRow>>({})
  const [subsByParent, setSubsByParent] = useState<Record<string, SubRow>>({})

  // Edit name
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [editNameValue, setEditNameValue] = useState('')
  const [savingName, setSavingName] = useState(false)

  // Grant Club
  const [showGrantId, setShowGrantId] = useState<string | null>(null)
  const [grantMonths, setGrantMonths] = useState(1)
  const [grantingFor, setGrantingFor] = useState<string | null>(null)

  // Revoke / delete / reset
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [sendingResetId, setSendingResetId] = useState<string | null>(null)

  // Delete account: custom email-confirm dialog
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; email: string } | null>(null)
  const [deleteEmailInput, setDeleteEmailInput] = useState('')

  const { success: toastOk, error: toastErr } = useToast()
  const { confirm, dialog } = useConfirmDialog()

  const fetchParents = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [
        { data: parentsData, error: parentsErr },
        { data: childrenData, error: childrenErr },
        { data: settingsData, error: settingsErr },
        { data: subsData, error: subsErr },
      ] = await Promise.all([
        supabase
          .from('parents')
          .select('id, email, name, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('children')
          .select('id, parent_id, name, avatar_url, language, age, favorite_category'),
        supabase
          .from('parental_settings')
          .select('child_id, daily_limit_minutes, notifications_enabled'),
        supabase
          .from('nimipiko_subscriptions')
          .select(
            'parent_id, status, amount, currency, billing_interval, current_period_end, cancel_at_period_end, payment_provider',
          )
          .eq('status', 'active'),
      ])
      if (parentsErr) throw parentsErr
      if (childrenErr) throw childrenErr
      if (settingsErr) throw settingsErr
      if (subsErr) throw subsErr

      const rows = (parentsData ?? []) as unknown as ParentRow[]
      setParents(rows)
      setSelectedId(prev =>
        prev && rows.some(p => p.id === prev) ? prev : (rows[0]?.id ?? null),
      )

      const byParent: Record<string, ChildRow[]> = {}
      for (const c of (childrenData ?? []) as unknown as ChildRow[]) {
        if (!byParent[c.parent_id]) byParent[c.parent_id] = []
        byParent[c.parent_id].push(c)
      }
      setChildrenByParent(byParent)

      const byChild: Record<string, SettingsRow> = {}
      for (const s of (settingsData ?? []) as unknown as SettingsRow[]) {
        byChild[s.child_id] = s
      }
      setSettingsByChild(byChild)

      const bySub: Record<string, SubRow> = {}
      for (const s of (subsData ?? []) as unknown as SubRow[]) {
        bySub[s.parent_id] = s
      }
      setSubsByParent(bySub)
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Operation failed.')
      setLoadError(err instanceof Error ? err.message : 'Failed to load parents.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchParents()
  }, [fetchParents])

  useEffect(() => {
    if (
      initialParentId &&
      initialParentId !== appliedInitialIdRef.current &&
      parents.some(p => p.id === initialParentId)
    ) {
      setSelectedId(initialParentId)
      appliedInitialIdRef.current = initialParentId
    }
  }, [initialParentId, parents])

  const filtered = useMemo(() => {
    let rows = parents
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(
        p => (p.name ?? '').toLowerCase().includes(q) || p.email.toLowerCase().includes(q),
      )
    }
    return rows
  }, [parents, search])

  const selected = parents.find(p => p.id === selectedId) ?? null
  const selectedChildren = selected ? (childrenByParent[selected.id] ?? []) : []
  const selectedSub = selected ? (subsByParent[selected.id] ?? null) : null

  // ── Edit Name ───────────────────────────────────────────────────────────────
  function startEditName(p: ParentRow) {
    setEditingNameId(p.id)
    setEditNameValue(p.name ?? '')
  }

  async function handleSaveName(parentId: string) {
    const trimmed = editNameValue.trim()
    if (!trimmed) return
    setSavingName(true)
    try {
      const { error } = await supabase.from('parents').update({ name: trimmed }).eq('id', parentId)
      if (error) throw error
      setParents(prev =>
        prev.map(p => (p.id === parentId ? { ...p, name: trimmed } : p)),
      )
      setEditingNameId(null)
      toastOk('Name updated.')
      void logAdminAction({ action: 'update_parent_name', entityType: 'parent', entityId: parentId, entityLabel: trimmed })
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Failed to update name.')
    } finally {
      setSavingName(false)
    }
  }

  // ── Grant Club ──────────────────────────────────────────────────────────────
  async function handleGrantAccess(parentId: string, months: number) {
    setGrantingFor(parentId)
    try {
      const periodEnd = new Date()
      periodEnd.setMonth(periodEnd.getMonth() + months)
      const { data: clubProduct } = await supabase
        .from('products')
        .select('id')
        .eq('slug', 'nimipiko-club')
        .maybeSingle()
      const { error: subErr } = await supabase.from('nimipiko_subscriptions').insert({
        parent_id: parentId,
        product_id: clubProduct?.id ?? null,
        status: 'active',
        currency: 'USD',
        amount: 0,
        billing_interval: 'month',
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
        payment_provider: 'admin_grant',
        cancel_at_period_end: true,
      })
      if (subErr) throw subErr
      const { error: accessErr } = await supabase.from('content_access').insert({
        parent_id: parentId,
        access_type: 'club',
        story_id: null,
      })
      if (accessErr) throw accessErr
      const { data: newSub } = await supabase
        .from('nimipiko_subscriptions')
        .select('*')
        .eq('parent_id', parentId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (newSub) {
        setSubsByParent(prev => ({ ...prev, [parentId]: newSub as SubRow }))
      }
      setShowGrantId(null)
      toastOk('Club access granted.')
      void logAdminAction({ action: 'grant_club', entityType: 'parent', entityId: parentId, entityLabel: parentId, metadata: { months } })
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Failed to grant access.')
    } finally {
      setGrantingFor(null)
    }
  }

  // ── Revoke Club ─────────────────────────────────────────────────────────────
  async function handleRevokeAccess(parentId: string) {
    const ok = await confirm({
      title: 'Revoke Club Access?',
      message: "This will immediately remove the parent's active Club subscription.",
      confirmLabel: 'Revoke',
      danger: true,
    })
    if (!ok) return
    setRevokingId(parentId)
    try {
      const { error } = await supabase
        .from('nimipiko_subscriptions')
        .delete()
        .eq('parent_id', parentId)
        .eq('status', 'active')
      if (error) throw error
      setSubsByParent(prev => {
        const next = { ...prev }
        delete next[parentId]
        return next
      })
      toastOk('Club access revoked.')
      void logAdminAction({ action: 'revoke_club', entityType: 'parent', entityId: parentId, entityLabel: parentId })
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Failed to revoke access.')
    } finally {
      setRevokingId(null)
    }
  }

  // ── Password Reset ───────────────────────────────────────────────────────────
  async function handlePasswordReset(email: string, parentId: string) {
    setSendingResetId(parentId)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      toastOk(`Password reset email sent to ${email}.`)
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Failed to send password reset.')
    } finally {
      setSendingResetId(null)
    }
  }

  // ── Delete Account ───────────────────────────────────────────────────────────
  function openDeleteDialog(p: ParentRow) {
    setDeleteDialog({ id: p.id, email: p.email })
    setDeleteEmailInput('')
  }

  async function handleDeleteAccount() {
    const dd = deleteDialog
    if (!dd) return
    if (deleteEmailInput.trim().toLowerCase() !== dd.email.toLowerCase()) {
      toastErr('Email does not match. Please type the exact email to confirm.')
      return
    }
    setDeletingId(dd.id)
    try {
      const { error } = await supabase.from('parents').delete().eq('id', dd.id)
      if (error) throw error
      setParents(prev => prev.filter(p => p.id !== dd.id))
      setSubsByParent(prev => {
        const next = { ...prev }
        delete next[dd.id]
        return next
      })
      if (selectedId === dd.id) setSelectedId(null)
      setDeleteDialog(null)
      setDeleteEmailInput('')
      toastOk('Parent account deleted.')
      void logAdminAction({ action: 'delete_parent', entityType: 'parent', entityId: dd.id, entityLabel: dd.email })
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Failed to delete account.')
    } finally {
      setDeletingId(null)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <SkeletonHeaderBanner />
        <SkeletonSplitPane rows={8} />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-400 flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-gray-700">Couldn&apos;t load parents</p>
        <p className="text-xs text-gray-400 mt-1 max-w-sm">{loadError}</p>
        <button
          onClick={fetchParents}
          className="mt-4 inline-flex items-center gap-2 text-white text-xs font-bold px-4 py-2 rounded-full transition bg-green-600 hover:bg-green-700"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Try again
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-ds-border px-4 sm:px-6 py-5 flex-shrink-0 z-30">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3.5 min-w-0">
            <button
              onClick={onOpenSidebar}
              className="lg:hidden flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-100 hover:bg-gray-50 text-gray-600 shadow-sm transition mt-0.5"
            >
              <Menu size={17} />
            </button>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm bg-green-50 text-green-600">
              <Users className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                Parents <span className="text-lg">👨‍👩‍👧</span>
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">
                Browse parent accounts, their children &amp; settings
              </p>
              <p className="text-xs text-gray-400 mt-1.5">
                <button
                  onClick={() => onNavigate('Dashboard')}
                  className="font-bold hover:underline text-green-600"
                >
                  Dashboard
                </button>
                <span className="mx-1.5 text-gray-300">/</span>
                <span className="font-bold text-gray-500">Parents</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-white border border-ds-border px-3.5 py-2 rounded-full text-sm font-bold shadow-sm text-green-600">
              <Users className="w-3.5 h-3.5" /> {parents.length}
            </span>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
        {/* List panel */}
        <div className="w-full lg:w-[400px] flex-shrink-0 border-b lg:border-b-0 lg:border-r border-gray-100 bg-white flex flex-col lg:overflow-hidden lg:min-h-0">
          <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center bg-gray-50 border border-gray-100 rounded-full px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-gray-200 transition">
              <Search size={15} className="text-gray-400 mr-2 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="px-3 py-3 space-y-2 lg:flex-1 lg:overflow-y-auto lg:min-h-0">
            {filtered.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-10">No parents found.</p>
            ) : (
              filtered.map(p => {
                const isSelected = p.id === selectedId
                const childCount = (childrenByParent[p.id] ?? []).length
                const hasSub = !!subsByParent[p.id]
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`relative rounded-2xl border p-3 cursor-pointer transition flex items-center gap-3 ${
                      isSelected
                        ? 'bg-green-50 border-green-200 shadow-sm'
                        : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                    }`}
                  >
                    <ParentAvatar name={p.name ?? 'Parent'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 truncate">{p.name ?? 'Parent'}</p>
                      <p className="text-xs text-gray-500 truncate">{p.email}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {childCount} {childCount === 1 ? 'child' : 'children'} · Joined{' '}
                        {formatDate(p.created_at)}
                      </p>
                    </div>
                    {hasSub && (
                      <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                        <Crown size={9} /> Club
                      </span>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Profile panel */}
        <div className="flex-1 lg:overflow-y-auto lg:min-h-0 bg-gray-50">
          {!selected ? (
            <div className="h-full flex items-center justify-center text-center p-8">
              <div>
                <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-400">Select a parent to view their profile.</p>
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-6 space-y-6">
              {/* Profile header */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-start gap-4 min-w-0">
                  <ParentAvatar name={selected.name ?? 'Parent'} size="lg" />
                  <div className="flex-1 min-w-0">
                    {editingNameId === selected.id ? (
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          autoFocus
                          value={editNameValue}
                          onChange={e => setEditNameValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') void handleSaveName(selected.id)
                            if (e.key === 'Escape') setEditingNameId(null)
                          }}
                          className={INPUT_CLS}
                        />
                        <button
                          onClick={() => void handleSaveName(selected.id)}
                          disabled={savingName}
                          className={`${ACTION_BTN} hover:text-green-600 hover:bg-green-50`}
                          title="Save"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setEditingNameId(null)}
                          className={ACTION_BTN}
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-extrabold text-gray-800">
                          {selected.name ?? 'Parent'}
                        </h2>
                        <button
                          onClick={() => startEditName(selected)}
                          className={ACTION_BTN}
                          title="Edit name"
                        >
                          <Pencil size={13} />
                        </button>
                      </div>
                    )}
                    <p className="text-sm text-gray-500">{selected.email}</p>
                    <p className="text-xs text-gray-400 mt-2">Joined {formatDate(selected.created_at)}</p>
                    {selectedSub && (
                      <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                        <Crown size={10} /> Club — expires{' '}
                        {new Date(selectedSub.current_period_end).toLocaleDateString('en', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Children */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-base font-bold text-gray-800 mb-4">Children</h3>
                {selectedChildren.length === 0 ? (
                  <p className="text-sm text-gray-400">No children added yet.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedChildren.map(c => {
                      const favMeta = c.favorite_category
                        ? (CATEGORY_META[c.favorite_category] ?? FALLBACK_META)
                        : null
                      const flag =
                        c.language && LANGUAGE_META[c.language as Lang]
                          ? LANGUAGE_META[c.language as Lang].flag
                          : '🌐'
                      return (
                        <div key={c.id} className="flex items-center gap-3">
                          <Avatar avatarUrl={c.avatar_url} name={c.name} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate">
                              {c.name}
                              {c.age ? `, ${c.age}` : ''}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="inline-flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5 text-xs font-bold text-gray-600">
                                {flag} {c.language?.toUpperCase() ?? '—'}
                              </span>
                              {favMeta && (
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${ACCENT[favMeta.accent].tile}`}
                                >
                                  <favMeta.icon className="w-3 h-3" /> {favMeta.label}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => onNavigate(`children:${c.id}`)}
                            className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-100 transition whitespace-nowrap"
                          >
                            View Profile <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Parental Settings */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-gray-400" /> Parental Settings
                </h3>
                {selectedChildren.length === 0 ? (
                  <p className="text-sm text-gray-400">No children added yet.</p>
                ) : (
                  <div className="space-y-4 divide-y divide-gray-50">
                    {selectedChildren.map(c => {
                      const s = settingsByChild[c.id]
                      return (
                        <div
                          key={c.id}
                          className="flex flex-wrap items-center gap-6 pt-4 first:pt-0"
                        >
                          <p className="text-sm font-bold text-gray-700 min-w-[120px]">
                            {c.name}
                          </p>
                          <div>
                            <p className="text-xs text-gray-400 font-bold uppercase mb-1">
                              Daily Limit
                            </p>
                            <p className="text-sm font-semibold text-gray-700">
                              {s?.daily_limit_minutes
                                ? `${s.daily_limit_minutes} minutes`
                                : 'No limit set'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 font-bold uppercase mb-1">
                              Notifications
                            </p>
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
                                s?.notifications_enabled
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {s?.notifications_enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Account Actions */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-gray-400" /> Account Actions
                </h3>
                <div className="space-y-3">
                  {/* Grant Club */}
                  {!selectedSub && (
                    <div>
                      {showGrantId === selected.id ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <select
                            value={grantMonths}
                            onChange={e => setGrantMonths(Number(e.target.value))}
                            className={INPUT_CLS}
                          >
                            {[1, 3, 6, 12].map(m => (
                              <option key={m} value={m}>
                                {m} month{m > 1 ? 's' : ''}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => void handleGrantAccess(selected.id, grantMonths)}
                            disabled={grantingFor === selected.id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition disabled:opacity-60"
                          >
                            {grantingFor === selected.id ? 'Granting…' : 'Confirm Grant'}
                          </button>
                          <button
                            onClick={() => setShowGrantId(null)}
                            className="px-4 py-2 rounded-full text-sm font-bold text-gray-600 hover:bg-gray-100 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowGrantId(selected.id)}
                          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-green-700 border border-green-200 bg-green-50 hover:bg-green-100 transition"
                        >
                          <Gift className="w-4 h-4" /> Grant Club Access
                        </button>
                      )}
                    </div>
                  )}

                  {/* Revoke Club */}
                  {selectedSub && (
                    <button
                      onClick={() => void handleRevokeAccess(selected.id)}
                      disabled={revokingId === selected.id}
                      className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-orange-700 border border-orange-200 bg-orange-50 hover:bg-orange-100 transition disabled:opacity-60"
                    >
                      <Crown className="w-4 h-4" />
                      {revokingId === selected.id ? 'Revoking…' : 'Revoke Club Access'}
                    </button>
                  )}

                  {/* Password Reset */}
                  <button
                    onClick={() => void handlePasswordReset(selected.email, selected.id)}
                    disabled={sendingResetId === selected.id}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-blue-700 border border-blue-200 bg-blue-50 hover:bg-blue-100 transition disabled:opacity-60"
                  >
                    <KeyRound className="w-4 h-4" />
                    {sendingResetId === selected.id ? 'Sending…' : 'Send Password Reset'}
                  </button>

                  {/* Delete Account */}
                  <button
                    onClick={() => openDeleteDialog(selected)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 transition"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm dialog */}
      {dialog}

      {/* Custom delete account dialog (email confirmation) */}
      {deleteDialog && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setDeleteDialog(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-sm w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">Delete Parent Account</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              This will permanently delete the parent account and all associated data. This action
              cannot be undone.
            </p>
            <p className="text-sm text-gray-700 font-semibold mt-3 mb-1.5">
              Type{' '}
              <span className="font-mono text-red-600">{deleteDialog.email}</span> to confirm:
            </p>
            <input
              autoFocus
              type="email"
              value={deleteEmailInput}
              onChange={e => setDeleteEmailInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void handleDeleteAccount() }}
              placeholder={deleteDialog.email}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] font-medium text-gray-700 focus:outline-none focus:border-red-400"
            />
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => setDeleteDialog(null)}
                className="px-4 py-2 rounded-full text-sm font-bold text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDeleteAccount()}
                disabled={
                  deletingId === deleteDialog.id ||
                  deleteEmailInput.trim().toLowerCase() !== deleteDialog.email.toLowerCase()
                }
                className="px-4 py-2 rounded-full text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingId === deleteDialog.id ? 'Deleting…' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
