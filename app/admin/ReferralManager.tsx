'use client'
import { useEffect, useState, useMemo } from 'react'
import supabase from '@/lib/supabaseClient'
import { Share2, Gift, Users, CheckCircle2, Trash2 } from 'lucide-react'
import { useToast } from './Toast'
import { useConfirmDialog } from './ConfirmDialog'
import { logAdminAction } from '@/lib/adminAuditLog'

interface Redemption {
  id: string
  code: string
  referrer_id: string
  referred_id: string
  redeemed_at: string
  reward_granted_at: string | null
  referrer: { name: string | null; email: string | null } | null
  referred: { name: string | null; email: string | null } | null
}

interface Props { onOpenSidebar: () => void }

type RewardFilter = 'all' | 'pending' | 'rewarded'

export default function ReferralManager({ onOpenSidebar }: Props) {
  const [rows, setRows]     = useState<Redemption[]>([])
  const [codes, setCodes]   = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [rewardFilter, setRewardFilter] = useState<RewardFilter>('all')
  const { success: toastOk, error: toastErr } = useToast()
  const { confirm, dialog } = useConfirmDialog()

  useEffect(() => {
    void (async () => {
      try {
        const [{ data: redemptions }, { count }] = await Promise.all([
          supabase
            .from('referral_redemptions')
            .select('*, referrer:referrer_id(name, email), referred:referred_id(name, email)', { count: 'exact' })
            .order('redeemed_at', { ascending: false })
            .limit(200),
          supabase.from('referral_codes').select('*', { count: 'exact', head: true }),
        ])
        setRows((redemptions as Redemption[]) ?? [])
        setCodes(count ?? 0)
      } catch (err) {
        toastErr('Failed to load referral data.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const rewarded = rows.filter(r => r.reward_granted_at).length

  async function handleGrantReward(id: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { toastErr('Not authenticated.'); return }
      const res = await fetch('/api/admin/referral/grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ redemption_id: id }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(j.error ?? res.statusText)
      }
      setRows(prev => prev.map(r => r.id === id ? { ...r, reward_granted_at: new Date().toISOString() } : r))
      toastOk('Reward granted — subscription + content access created.')
      void logAdminAction({ action: 'grant_referral_reward', entityType: 'referral', entityId: id, entityLabel: id })
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Failed to grant reward.')
    }
  }

  async function handleReapplyReward(id: string) {
    const ok = await confirm({
      title: 'Re-apply subscription?',
      message: 'This will create a new 1-month subscription and content_access row for the referrer, even though reward_granted_at is already set. Use this to fix rows where the reward stamp was set manually but no subscription was ever created.',
    })
    if (!ok) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { toastErr('Not authenticated.'); return }
      const res = await fetch('/api/admin/referral/grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ redemption_id: id, force: true }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(j.error ?? res.statusText)
      }
      toastOk('Subscription re-applied successfully.')
      void logAdminAction({ action: 'reapply_referral_reward', entityType: 'referral', entityId: id, entityLabel: id })
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Failed to re-apply reward.')
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: 'Delete this redemption?',
      message: 'This will permanently remove this referral record.',
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return
    try {
      const { error } = await supabase.from('referral_redemptions').delete().eq('id', id)
      if (error) throw error
      setRows(prev => prev.filter(r => r.id !== id))
      toastOk('Redemption deleted.')
      void logAdminAction({ action: 'delete_referral', entityType: 'referral', entityId: id, entityLabel: id })
    } catch (err) {
      toastErr('Failed to delete redemption.')
    }
  }

  const filteredRows = useMemo(() => {
    let list = rows
    if (rewardFilter === 'pending') list = list.filter(r => !r.reward_granted_at)
    if (rewardFilter === 'rewarded') list = list.filter(r => !!r.reward_granted_at)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r => {
        const referrer = r.referrer
        const referred = r.referred
        return (
          (referrer?.name ?? '').toLowerCase().includes(q) ||
          (referrer?.email ?? '').toLowerCase().includes(q) ||
          (referred?.name ?? '').toLowerCase().includes(q) ||
          (referred?.email ?? '').toLowerCase().includes(q)
        )
      })
    }
    return list
  }, [rows, search, rewardFilter])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {dialog}
      {/* Header */}
      <div className="flex items-center gap-3 px-6 lg:px-8 py-5 border-b border-gray-200 bg-white">
        <button onClick={onOpenSidebar} className="lg:hidden p-1 text-gray-500">☰</button>
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
          <Share2 className="w-5 h-5 text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-gray-900 text-[17px]">Referrals</h1>
          <p className="text-gray-500 text-[12px]">{rows.length} redemption{rows.length !== 1 ? 's' : ''} · {codes} codes issued</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Codes issued',    value: codes,                icon: Users,        color: 'bg-amber-50 text-amber-700' },
            { label: 'Conversions',     value: rows.length,          icon: Gift,         color: 'bg-green-50 text-green-700' },
            { label: 'Rewards granted', value: rewarded,             icon: CheckCircle2, color: 'bg-blue-50 text-blue-700'  },
          ].map(s => (
            <div key={s.label} className={`${s.color} rounded-2xl p-4`}>
              <p className="text-[11px] font-bold uppercase tracking-wide opacity-70">{s.label}</p>
              <p className="text-[28px] font-black mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Search + filter tabs */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex gap-1">
            {(['all', 'pending', 'rewarded'] as RewardFilter[]).map(f => (
              <button key={f} onClick={() => setRewardFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-bold capitalize transition ${
                  rewardFilter === f ? 'bg-green-600 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}>
                {f}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="flex-1 min-w-[180px] border border-gray-200 rounded-xl px-3 py-1.5 text-[13px] font-medium text-gray-700 focus:outline-none focus:border-green-400"
          />
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-20 text-[14px]">Loading…</div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Share2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-bold text-[15px]">{rows.length === 0 ? 'No referrals yet' : 'No referrals match this filter.'}</p>
            {rows.length === 0 && <p className="text-[13px] mt-1">Referral activity will appear here as users share their codes.</p>}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-bold text-gray-500 uppercase text-[11px] tracking-wide">Referrer</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-500 uppercase text-[11px] tracking-wide">New member</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-500 uppercase text-[11px] tracking-wide hidden sm:table-cell">Code</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-500 uppercase text-[11px] tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-500 uppercase text-[11px] tracking-wide">Reward</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-500 uppercase text-[11px] tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, i) => {
                  const referrer = r.referrer
                  const referred = r.referred
                  return (
                    <tr key={r.id} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                      <td className="px-4 py-3 text-gray-700">{referrer?.name ?? referrer?.email ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{referred?.name ?? referred?.email ?? '—'}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="bg-amber-100 text-amber-700 font-mono font-bold text-[11px] px-2 py-0.5 rounded">{r.code}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {new Date(r.redeemed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        {r.reward_granted_at ? (
                          <span className="flex items-center gap-1 text-green-600 font-bold text-[11px]"><CheckCircle2 className="w-3 h-3" /> Granted</span>
                        ) : (
                          <span className="text-gray-400 text-[11px]">Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {!r.reward_granted_at ? (
                            <button
                              onClick={() => handleGrantReward(r.id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                              title="Grant reward (creates subscription + content access)"
                            >
                              <Gift size={14} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReapplyReward(r.id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:bg-amber-50 text-gray-300 hover:text-amber-500"
                              title="Re-apply subscription (use if reward was stamped but subscription was never created)"
                            >
                              <Gift size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:bg-red-50 text-gray-400 hover:text-red-500"
                            title="Delete redemption"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
