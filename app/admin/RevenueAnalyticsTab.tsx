'use client'
import React, { useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import { DollarSign, CreditCard, TrendingUp, TrendingDown, Users, Phone, BarChart3 } from 'lucide-react'
import { useToast } from './Toast'

interface SubRow {
  id: string
  status: string
  amount: number
  currency: string
  payment_provider: string
  cancel_at_period_end: boolean
  created_at: string
  current_period_end: string
}

interface OrderRow {
  amount: number
  currency: string
  payment_status: string
  completed_at: string | null
}

function toUSD(amount: number, currency: string) {
  return currency === 'RWF' ? amount / 1350 : amount
}

function fmtUSD(n: number) {
  return `$${n.toFixed(0)}`
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function monthLabel(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

export default function RevenueAnalyticsTab() {
  const { error: toastErr } = useToast()
  const [subs, setSubs] = useState<SubRow[]>([])
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const [{ data: s }, { data: o }] = await Promise.all([
          supabase.from('nimipiko_subscriptions').select('id, status, amount, currency, payment_provider, cancel_at_period_end, created_at, current_period_end').order('created_at'),
          supabase.from('orders').select('amount, currency, payment_status, completed_at').order('completed_at'),
        ])
        setSubs((s ?? []) as SubRow[])
        setOrders((o ?? []) as OrderRow[])
      } catch (err) {
        toastErr('Failed to load revenue data.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) {
    return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
  }

  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const lastMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1))

  const activeSubs = subs.filter(s => s.status === 'active')
  const cancellingAtEnd = activeSubs.filter(s => s.cancel_at_period_end)
  const newThisMonth = activeSubs.filter(s => new Date(s.created_at) >= thisMonthStart)
  const newLastMonth = activeSubs.filter(s => new Date(s.created_at) >= lastMonthStart && new Date(s.created_at) < thisMonthStart)

  const mrr = activeSubs.reduce((sum, s) => sum + toUSD(s.amount, s.currency), 0)
  const completedOrders = orders.filter(o => o.payment_status === 'completed')
  const totalRevenue = completedOrders.reduce((sum, o) => sum + toUSD(o.amount, o.currency), 0)
  const revenueThisMonth = completedOrders.filter(o => o.completed_at && new Date(o.completed_at) >= thisMonthStart).reduce((sum, o) => sum + toUSD(o.amount, o.currency), 0)
  const revenueLastMonth = completedOrders.filter(o => o.completed_at && new Date(o.completed_at) >= lastMonthStart && new Date(o.completed_at) < thisMonthStart).reduce((sum, o) => sum + toUSD(o.amount, o.currency), 0)

  const cardSubs = activeSubs.filter(s => s.payment_provider === 'cybersource').length
  const momoSubs = activeSubs.filter(s => s.payment_provider === 'mtn_momo').length

  const churnRate = subs.length > 0 ? ((subs.filter(s => s.status === 'cancelled' || s.status === 'expired').length / subs.length) * 100) : 0

  // Monthly revenue trend (last 6 months)
  const months: { label: string; revenue: number; subs: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const mStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - i, 1))
    const mEnd = startOfMonth(new Date(now.getFullYear(), now.getMonth() - i + 1, 1))
    const rev = completedOrders.filter(o => o.completed_at && new Date(o.completed_at) >= mStart && new Date(o.completed_at) < mEnd).reduce((sum, o) => sum + toUSD(o.amount, o.currency), 0)
    const newSubs = subs.filter(s => new Date(s.created_at) >= mStart && new Date(s.created_at) < mEnd).length
    months.push({ label: monthLabel(mStart), revenue: rev, subs: newSubs })
  }
  const maxRev = Math.max(...months.map(m => m.revenue), 1)

  const revenueChange = revenueLastMonth > 0 ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth * 100) : 0

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: CreditCard,  label: 'Active Subscribers',  value: activeSubs.length,          color: 'text-violet-600 bg-violet-50' },
          { icon: DollarSign,  label: 'MRR (est. USD)',       value: fmtUSD(mrr),                color: 'text-green-600 bg-green-50', sub: '/mo' },
          { icon: TrendingUp,  label: 'Total Revenue',        value: fmtUSD(totalRevenue),       color: 'text-emerald-600 bg-emerald-50' },
          { icon: Users,       label: 'New This Month',       value: newThisMonth.length,        color: 'text-blue-600 bg-blue-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>
              <s.icon size={18} />
            </div>
            <div>
              <p className="text-[20px] font-extrabold text-gray-900 leading-none tabular-nums">
                {s.value}<span className="text-[11px] font-medium text-gray-400">{s.sub ?? ''}</span>
              </p>
              <p className="text-[11px] font-medium text-gray-400 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue trend chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[15px] font-bold text-gray-800">Revenue Trend</h3>
            <p className="text-gray-400 text-[12px]">USD equivalent, last 6 months</p>
          </div>
          <div className={`flex items-center gap-1 text-[12px] font-bold px-2.5 py-1 rounded-full ${revenueChange >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
            {revenueChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(revenueChange).toFixed(0)}% vs last month
          </div>
        </div>
        <div className="flex items-end gap-2 h-36">
          {months.map(m => (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-bold text-gray-500">{m.revenue > 0 ? fmtUSD(m.revenue) : ''}</span>
              <div className="w-full rounded-t-lg bg-green-500 transition-all min-h-[4px]"
                style={{ height: `${Math.max((m.revenue / maxRev) * 100, m.revenue > 0 ? 6 : 2)}%` }} />
              <span className="text-[10px] text-gray-400">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Payment methods */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-[14px] font-bold text-gray-800 mb-3">Payment Methods</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[12px] font-bold text-gray-600 mb-1">
                <span className="flex items-center gap-1.5"><CreditCard size={12} className="text-blue-500" /> Card (CyberSource)</span>
                <span>{cardSubs}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${activeSubs.length > 0 ? (cardSubs / activeSubs.length) * 100 : 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[12px] font-bold text-gray-600 mb-1">
                <span className="flex items-center gap-1.5"><Phone size={12} className="text-yellow-500" /> MTN MoMo</span>
                <span>{momoSubs}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${activeSubs.length > 0 ? (momoSubs / activeSubs.length) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Growth */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-[14px] font-bold text-gray-800 mb-3">Subscriber Growth</h3>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[12px] text-gray-500">New this month</span>
              <span className="font-black text-gray-900 text-[14px]">{newThisMonth.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[12px] text-gray-500">New last month</span>
              <span className="font-bold text-gray-600 text-[14px]">{newLastMonth.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[12px] text-gray-500">Cancelling at end</span>
              <span className="font-bold text-orange-600 text-[14px]">{cancellingAtEnd.length}</span>
            </div>
          </div>
        </div>

        {/* Churn */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-[14px] font-bold text-gray-800 mb-3">Subscription Health</h3>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[12px] text-gray-500">Total created</span>
              <span className="font-black text-gray-900 text-[14px]">{subs.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[12px] text-gray-500">Currently active</span>
              <span className="font-bold text-green-600 text-[14px]">{activeSubs.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[12px] text-gray-500">Churn rate</span>
              <span className={`font-bold text-[14px] ${churnRate > 20 ? 'text-red-600' : 'text-gray-600'}`}>{churnRate.toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
