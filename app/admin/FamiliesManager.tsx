'use client'
import React, { useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import { Search, Menu, ChevronDown, ChevronRight, Users, Baby, Crown, Gift, X } from 'lucide-react'
import { useToast } from './Toast'

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

interface FamilyRow {
  parent_id: string
  parent_name: string
  parent_email: string
  children: { id: string; name: string; avatar_url: string | null; age: number | null; language: string; created_at: string }[]
  subscription: SubRow | null
}

type FilterMode = 'all' | 'club' | 'free'

export default function FamiliesManager({ onNavigate, onOpenSidebar }: Props) {
  const [families, setFamilies] = useState<FamilyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterMode>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [grantingId, setGrantingId] = useState<string | null>(null)
  const [grantMonths, setGrantMonths] = useState(1)
  const [grantingFor, setGrantingFor] = useState<string | null>(null)
  const { error: toastErr } = useToast()

  useEffect(() => {
    void (async () => {
      try {
        const [{ data: parents }, { data: children }, { data: subs }] = await Promise.all([
          supabase.from('parents').select('id, name, email').order('name'),
          supabase.from('children').select('id, name, avatar_url, age, language, created_at, parent_id').order('name'),
          supabase.from('nimipiko_subscriptions').select('parent_id, status, amount, currency, billing_interval, current_period_end, cancel_at_period_end, payment_provider').eq('status', 'active'),
        ])

        const subMap = new Map<string, SubRow>()
        for (const s of subs ?? []) subMap.set(s.parent_id, s)

        const result: FamilyRow[] = (parents ?? []).map(p => ({
          parent_id: p.id,
          parent_name: p.name ?? 'Unknown',
          parent_email: p.email ?? '',
          children: (children ?? []).filter(c => c.parent_id === p.id),
          subscription: subMap.get(p.id) ?? null,
        }))
        setFamilies(result)
      } catch (err) {
        console.error('[FamiliesManager] load failed:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const clubCount = families.filter(f => f.subscription !== null).length

  async function handleGrantAccess(parentId: string, months: number) {
    setGrantingFor(parentId)
    try {
      const periodEnd = new Date()
      periodEnd.setMonth(periodEnd.getMonth() + months)
      const { data: clubProduct } = await supabase.from('products').select('id').eq('slug', 'nimipiko-club').maybeSingle()
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
      const { data: newSub } = await supabase.from('nimipiko_subscriptions').select('*').eq('parent_id', parentId).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle()
      setFamilies(prev => prev.map(f => f.parent_id === parentId ? { ...f, subscription: newSub } : f))
    } catch (err) {
      console.error('[FamiliesManager] handleGrantAccess failed:', err)
      toastErr(err instanceof Error ? err.message : 'Failed to grant access. Please try again.')
    } finally {
      setGrantingFor(null)
      setGrantingId(null)
    }
  }

  const filtered = families.filter(f => {
    if (filter === 'club' && !f.subscription) return false
    if (filter === 'free' && f.subscription) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return f.parent_name.toLowerCase().includes(q) || f.parent_email.toLowerCase().includes(q) || f.children.some(c => c.name.toLowerCase().includes(q))
  })

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-5 flex-shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={onOpenSidebar} className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-gray-500">
              <Menu size={17} />
            </button>
            <div>
              <h1 className="text-[22px] font-extrabold text-gray-900">Families</h1>
              <p className="text-[13px] text-gray-500">{families.length} families · <span className="text-green-600 font-bold">{clubCount} Club subscribers</span></p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              {(['all', 'club', 'free'] as FilterMode[]).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-[12px] font-bold capitalize transition ${filter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
                  {f === 'club' ? '👑 Club' : f === 'free' ? '🔓 Free' : 'All'}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search families..." value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 bg-ds-input border border-ds-border rounded-xl text-[13px] font-medium text-ds-text focus:outline-none focus:ring-2 focus:ring-green-500 w-48" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4 space-y-3">
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-[14px] font-bold text-gray-400">No families found.</p>
          </div>
        ) : filtered.map(f => {
          const isOpen = expandedId === f.parent_id
          return (
            <div key={f.parent_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button onClick={() => setExpandedId(isOpen ? null : f.parent_id)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition text-left">
                <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-black text-[16px] shrink-0">
                  {f.parent_name[0]?.toUpperCase() ?? 'P'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-gray-800">{f.parent_name}</p>
                  <p className="text-[11px] text-gray-400">{f.parent_email}</p>
                </div>
                {f.subscription ? (
                  <span className="text-[11px] font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
                    <Crown size={11} /> Club
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full shrink-0">Free</span>
                )}
                <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Baby size={12} /> {f.children.length}
                </span>
                {isOpen ? <ChevronDown size={16} className="text-gray-400 shrink-0" /> : <ChevronRight size={16} className="text-gray-400 shrink-0" />}
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 px-5 py-3 bg-gray-50/30 space-y-3">
                  {/* Subscription detail */}
                  {f.subscription ? (
                    <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                      <Crown size={18} className="text-green-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-black text-green-800">NIMIPIKO Club Active</p>
                        <p className="text-[10px] text-green-600">
                          {f.subscription.currency} {f.subscription.amount.toLocaleString()} / {f.subscription.billing_interval}
                          {' · '}Renews {new Date(f.subscription.current_period_end).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {f.subscription.cancel_at_period_end && ' · ⚠ Cancels at period end'}
                          {' · '}via {f.subscription.payment_provider === 'cybersource' ? 'Card' : 'MTN MoMo'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <p className="text-[11px] text-gray-400 font-bold">Free plan — no active subscription</p>
                        {grantingId === f.parent_id ? (
                          <div className="flex items-center gap-2">
                            <select value={grantMonths} onChange={e => setGrantMonths(Number(e.target.value))}
                              className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 bg-white">
                              {[1,2,3,6,12].map(m => <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>)}
                            </select>
                            <button onClick={() => handleGrantAccess(f.parent_id, grantMonths)} disabled={grantingFor === f.parent_id}
                              className="text-[11px] font-bold bg-green-600 text-white hover:bg-green-700 px-3 py-1.5 rounded-lg transition disabled:opacity-60">
                              {grantingFor === f.parent_id ? 'Granting…' : 'Confirm Grant'}
                            </button>
                            <button onClick={() => setGrantingId(null)} className="text-gray-400 hover:text-gray-600 transition"><X size={14} /></button>
                          </div>
                        ) : (
                          <button onClick={() => setGrantingId(f.parent_id)}
                            className="flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-100 hover:bg-green-200 px-3 py-1.5 rounded-lg transition">
                            <Gift size={11} /> Grant Club Access
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Children */}
                  {f.children.length === 0 ? (
                    <p className="text-[12px] text-gray-400 py-1">No children registered yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {f.children.map(c => (
                        <div key={c.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3">
                          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-[14px] font-black shrink-0 border border-ds-border">
                            {c.avatar_url && !c.avatar_url.startsWith('http') ? c.avatar_url : c.name[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-gray-800">{c.name}</p>
                            <p className="text-[10px] text-gray-400">
                              Age: {c.age ?? '—'} · {c.language?.toUpperCase()} · Joined {new Date(c.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
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
    </div>
  )
}
