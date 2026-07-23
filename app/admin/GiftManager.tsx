'use client'
import React, { useCallback, useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import { Gift, CheckCircle, Clock, Menu } from 'lucide-react'

interface GiftRow {
  id: string
  recipient_email: string
  recipient_name: string | null
  redeemed_at: string | null
  created_at: string
  products: { name: string } | null
  giver: { name: string; email: string } | null
}

export default function GiftManager({ onOpenSidebar }: { onOpenSidebar?: () => void }) {
  const [gifts, setGifts] = useState<GiftRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('gift_subscriptions')
        .select('id, recipient_email, recipient_name, redeemed_at, created_at, products(name), giver:parents!giver_parent_id(name, email)')
        .order('created_at', { ascending: false })
      setGifts((data ?? []) as unknown as GiftRow[])
    } catch (err) {
      console.error('[GiftManager] load failed:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const total    = gifts.length
  const redeemed = gifts.filter(g => g.redeemed_at).length
  const pending  = total - redeemed

  const filtered = gifts.filter(g =>
    g.recipient_email.toLowerCase().includes(search.toLowerCase()) ||
    (g.recipient_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (g.giver?.name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onOpenSidebar} className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-gray-500">
            <Menu size={17} />
          </button>
          <div>
            <h1 className="text-[22px] font-extrabold text-gray-900">Gift Subscriptions</h1>
            <p className="text-[13px] text-gray-500">{total} gifts · {redeemed} claimed · {pending} pending</p>
          </div>
        </div>
        <input
          type="text" placeholder="Search..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-ds-border bg-ds-input rounded-lg px-3 py-2 text-sm text-ds-text focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] w-44 transition placeholder:text-gray-400"
        />
      </div>

      {/* Stat pills */}
      <div className="px-6 py-3 flex gap-3 border-b border-ds-border bg-gray-50 flex-shrink-0">
        {[
          { label: 'Total gifts', value: total, color: 'text-ds-text' },
          { label: 'Claimed', value: redeemed, color: 'text-green-600' },
          { label: 'Pending', value: pending, color: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-ds-border rounded-xl px-4 py-2 text-center min-w-[80px]">
            <p className={`font-black text-lg ${s.color}`}>{s.value}</p>
            <p className="text-gray-400 text-[10px] font-semibold">{s.label}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-2">
        {loading ? (
          <div className="text-center text-gray-400 py-16 text-sm font-semibold">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Gift className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-semibold text-sm">No gift subscriptions yet</p>
          </div>
        ) : (
          filtered.map(g => (
            <div key={g.id} className="bg-white border border-ds-border rounded-2xl p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${g.redeemed_at ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-500'}`}>
                {g.redeemed_at ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-ds-text text-[14px]">{g.recipient_name ?? g.recipient_email}</p>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${g.redeemed_at ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {g.redeemed_at ? 'CLAIMED' : 'PENDING'}
                  </span>
                  {g.products && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
                      {g.products.name}
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-[12px] mt-0.5">
                  {g.recipient_email} · from {g.giver?.name ?? 'Unknown'}
                </p>
                {g.redeemed_at && (
                  <p className="text-green-600 text-[11px] font-semibold mt-0.5">
                    Claimed {new Date(g.redeemed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                )}
              </div>
              <p className="text-gray-400 text-[11px] flex-shrink-0">
                {new Date(g.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
