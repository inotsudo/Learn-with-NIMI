'use client'
import { useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import { Share2, Gift, Users, CheckCircle2 } from 'lucide-react'

interface Redemption {
  id: string
  code: string
  redeemed_at: string
  reward_granted_at: string | null
  referrer: { name: string | null; email: string | null } | null
  referred: { name: string | null; email: string | null } | null
}

interface Props { onOpenSidebar: () => void }

export default function ReferralManager({ onOpenSidebar }: Props) {
  const [rows, setRows]     = useState<Redemption[]>([])
  const [codes, setCodes]   = useState<number>(0)
  const [loading, setLoading] = useState(true)

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
        setRows((redemptions as any[]) ?? [])
        setCodes(count ?? 0)
      } catch (err) {
        console.error('[ReferralManager] load failed:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const rewarded = rows.filter(r => r.reward_granted_at).length

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
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

        {loading ? (
          <div className="text-center text-gray-400 py-20 text-[14px]">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Share2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-bold text-[15px]">No referrals yet</p>
            <p className="text-[13px] mt-1">Referral activity will appear here as users share their codes.</p>
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
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const referrer = r.referrer as any
                  const referred = r.referred as any
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
