'use client'
import React, { useEffect, useState, useCallback } from 'react'
import supabase from '@/lib/supabaseClient'
import {
  ShieldCheck, Menu, ChevronDown, AlertCircle, RefreshCw, Trash2, UserPlus, Check,
} from 'lucide-react'
import { ACCENT } from './missionMeta'
import { Skeleton, SkeletonList } from './Skeleton'
import { useConfirmDialog } from './ConfirmDialog'

interface AdministratorsManagerProps {
  onNavigate: (table: string) => void
  onOpenSidebar?: () => void
}

interface AdminRow {
  id: string
  email: string
  name: string | null
  role: 'admin' | 'superadmin'
  created_at: string
}

const accent = ACCENT.indigo

function initials(name: string) {
  return name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function Avatar({ name }: { name: string }) {
  return (
    <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${accent.tile}`}>
      {initials(name)}
    </div>
  )
}

interface AdminCardProps {
  row: AdminRow
  isSelf: boolean
  amSuperadmin: boolean
  roleSaving: string | null
  roleError: { id: string; message: string } | null
  savedFlashId: string | null
  removing: string | null
  onRoleChange: (row: AdminRow, role: 'admin' | 'superadmin') => void
  onRemove: (row: AdminRow) => void
  onNavigate: (table: string) => void
}

function AdminCard({ row, isSelf, amSuperadmin, roleSaving, roleError, savedFlashId, removing, onRoleChange, onRemove, onNavigate }: AdminCardProps) {
  return (
    <div className="rounded-2xl border border-gray-100 p-4 flex flex-wrap items-start gap-3">
      <Avatar name={row.name || row.email} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold text-gray-800">{row.name || row.email.split('@')[0]}</p>
          {isSelf && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">You</span>
          )}
          {row.role === 'superadmin' ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              <ShieldCheck className="w-3 h-3" /> Superadmin
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Admin</span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{row.email}</p>
        <p className="text-[11px] text-gray-400 mt-1">Joined {formatDate(row.created_at)}</p>
        {roleError?.id === row.id && (
          <p className="text-xs text-red-500 mt-1.5">{roleError.message}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        {savedFlashId === row.id && (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
            <Check className="w-3.5 h-3.5" /> Saved
          </span>
        )}
        {isSelf ? (
          <button onClick={() => onNavigate('Profile')} className="text-xs font-bold hover:underline text-green-600">
            Edit in My Profile →
          </button>
        ) : amSuperadmin ? (
          <>
            <div className="inline-flex rounded-full border border-gray-100 divide-x divide-gray-100 overflow-hidden">
              <button
                onClick={() => onRoleChange(row, 'admin')}
                disabled={roleSaving === row.id}
                className={`px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${row.role === 'admin' ? 'bg-green-50 text-green-700' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
              >
                Admin
              </button>
              <button
                onClick={() => onRoleChange(row, 'superadmin')}
                disabled={roleSaving === row.id}
                className={`px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${row.role === 'superadmin' ? 'bg-green-50 text-green-700' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
              >
                Superadmin
              </button>
            </div>
            <button
              onClick={() => onRemove(row)}
              disabled={removing === row.id}
              className="inline-flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 disabled:opacity-40 transition"
            >
              <Trash2 className="w-3.5 h-3.5" /> {removing === row.id ? 'Removing...' : 'Remove access'}
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}

export default function AdministratorsManager({ onNavigate, onOpenSidebar }: AdministratorsManagerProps) {
  const [admins, setAdmins] = useState<AdminRow[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [roleSaving, setRoleSaving] = useState<string | null>(null)
  const [roleError, setRoleError] = useState<{ id: string; message: string } | null>(null)
  const [savedFlashId, setSavedFlashId] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'superadmin'>('admin')
  const [addPending, setAddPending] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [addSuccess, setAddSuccess] = useState(false)
  const { confirm, dialog } = useConfirmDialog()

  const fetchData = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [{ data: { user } }, { data, error }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('admins').select('id, email, name, role, created_at').order('created_at', { ascending: true }),
      ])
      setCurrentUserId(user?.id ?? null)
      if (error) throw error
      setAdmins((data ?? []) as AdminRow[])
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load administrators.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const currentAdmin = admins.find(a => a.id === currentUserId) ?? null
  const amSuperadmin = currentAdmin?.role === 'superadmin'

  const handleRoleChange = async (row: AdminRow, role: 'admin' | 'superadmin') => {
    if (row.role === role) return
    setRoleSaving(row.id)
    setRoleError(null)
    try {
      const { error } = await supabase.from('admins').update({ role }).eq('id', row.id)
      if (error) throw error
      setAdmins(prev => prev.map(a => a.id === row.id ? { ...a, role } : a))
      setSavedFlashId(row.id)
      setTimeout(() => setSavedFlashId(id => id === row.id ? null : id), 2000)
    } catch (err) {
      setRoleError({ id: row.id, message: err instanceof Error ? err.message : 'Failed to update role.' })
    } finally {
      setRoleSaving(null)
    }
  }

  const handleRemove = async (row: AdminRow) => {
    const ok = await confirm({
      title: `Remove admin access for ${row.name || row.email}?`,
      message: 'They will keep their regular NIMIPIKO account but lose admin console access.',
      confirmLabel: 'Remove access',
    })
    if (!ok) return
    setRemoving(row.id)
    try {
      const { error } = await supabase.from('admins').delete().eq('id', row.id)
      if (error) throw error
      setAdmins(prev => prev.filter(a => a.id !== row.id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove admin.')
    } finally {
      setRemoving(null)
    }
  }

  const handleAdd = async () => {
    const email = newEmail.trim()
    if (!email) return
    setAddPending(true)
    setAddError(null)
    setAddSuccess(false)
    try {
      const { data: userId, error: rpcError } = await supabase.rpc('admin_lookup_user_by_email', { p_email: email })
      if (rpcError) throw rpcError
      if (!userId) {
        setAddError('No NIMIPIKO account found with that email. They need to sign up first, then you can grant admin access.')
        return
      }
      if (admins.some(a => a.id === userId)) {
        setAddError('This user is already an administrator.')
        return
      }
      const { data, error } = await supabase
        .from('admins')
        .insert({ id: userId, email, name: null, role: newRole })
        .select('id, email, name, role, created_at')
        .single()
      if (error) throw error
      setAdmins(prev => [...prev, data as AdminRow])
      setNewEmail('')
      setNewRole('admin')
      setAddSuccess(true)
      setTimeout(() => setAddSuccess(false), 2500)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add administrator.')
    } finally {
      setAddPending(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <header className="bg-white border-b border-ds-border px-4 sm:px-6 py-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3.5 min-w-0">
            <button
              onClick={onOpenSidebar}
              className="lg:hidden flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-100 hover:bg-gray-50 text-gray-600 shadow-sm transition mt-0.5"
            >
              <Menu size={17} />
            </button>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm bg-green-50 text-green-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                Administrators <span className="text-lg">🛡️</span>
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">
                Manage admin accounts &amp; roles
              </p>
              <p className="text-xs text-gray-400 mt-1.5">
                <button onClick={() => onNavigate('Dashboard')} className="font-bold hover:underline text-green-600">Dashboard</button>
                <span className="mx-1.5 text-gray-300">/</span>
                <span className="font-bold text-gray-500">Administrators</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-white border border-ds-border px-3.5 py-2 rounded-full text-sm font-bold shadow-sm text-green-600">
              <ShieldCheck className="w-3.5 h-3.5" /> {admins.length} admins
            </span>
            <div className="flex items-center gap-2 bg-white border border-gray-100 pl-1.5 pr-3 py-1.5 rounded-full shadow-sm">
              <img src="/nimi-logo-circle.png" alt="Profile" className="w-7 h-7 rounded-full object-cover flex-shrink-0 ring-2 ring-white"  loading="lazy" />
              <div className="hidden sm:block leading-tight">
                <p className="text-sm font-semibold text-gray-700">{currentAdmin?.name ?? 'Admin'}</p>
                <p className="text-[10px] text-gray-400 uppercase font-bold">{currentAdmin?.role ?? 'admin'}</p>
              </div>
              <ChevronDown size={14} className="text-gray-400" />
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <Skeleton className="h-5 w-40 mb-4" />
            <SkeletonList rows={4} />
          </div>
        ) : loadError ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-400 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-gray-700">Couldn&apos;t load administrators</p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm">{loadError}</p>
            <button
              onClick={fetchData}
              className="mt-4 inline-flex items-center gap-2 text-white text-xs font-bold px-4 py-2 rounded-full transition bg-green-600 hover:bg-green-700"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Try again
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-bold text-gray-800 mb-4">Admin Accounts</h2>
              <div className="space-y-3">
                {admins.map(row => (
                  <AdminCard
                    key={row.id}
                    row={row}
                    isSelf={row.id === currentUserId}
                    amSuperadmin={amSuperadmin}
                    roleSaving={roleSaving}
                    roleError={roleError}
                    savedFlashId={savedFlashId}
                    removing={removing}
                    onRoleChange={handleRoleChange}
                    onRemove={handleRemove}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
              {!amSuperadmin && (
                <p className="text-xs text-gray-400 mt-4">Only superadmins can change roles or remove admin access.</p>
              )}
            </div>

            {amSuperadmin ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-1">
                  <UserPlus className="w-4 h-4 text-green-600" /> Add Administrator
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  Grant admin console access to someone who already has a NIMIPIKO account.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
                    <input
                      type="email"
                      placeholder="parent@example.com"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      className="w-full bg-ds-input border border-ds-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div className="sm:w-40">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Role</label>
                    <select
                      value={newRole}
                      onChange={e => setNewRole(e.target.value as 'admin' | 'superadmin')}
                      className="w-full bg-ds-input border border-ds-border rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="admin">Admin</option>
                      <option value="superadmin">Superadmin</option>
                    </select>
                  </div>
                  <button
                    onClick={handleAdd}
                    disabled={addPending || !newEmail.trim()}
                    className="text-sm font-bold text-white px-5 py-2.5 rounded-full transition whitespace-nowrap bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {addPending ? 'Adding...' : 'Add Administrator'}
                  </button>
                </div>
                {addSuccess && (
                  <p className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 mt-3">
                    <Check className="w-3.5 h-3.5" /> Administrator added
                  </p>
                )}
                {addError && (
                  <div className="flex items-start gap-2 text-xs text-red-500 bg-red-50 rounded-xl p-3 mt-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{addError}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-sm text-gray-400">
                Only superadmins can add new administrators.
              </div>
            )}
          </>
        )}
      </div>
      {dialog}
    </div>
  )
}
