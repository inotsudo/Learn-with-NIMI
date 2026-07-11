'use client'
import React, { useEffect, useState } from 'react'
import supabase from "@/lib/supabaseClient"
import {
  BookOpen, CheckCircle2, AlertTriangle, Users, Award, Trophy,
  Plus, Upload, Rocket, Bell, ArrowRight, DollarSign, CreditCard, TrendingUp,
} from 'lucide-react'
import { computeReadiness, type ReadinessResult } from '@/lib/storyReadiness'
import ReadinessRing from '@/components/admin/story-readiness/ReadinessRing'
import ReadinessBadge from '@/components/admin/story-readiness/ReadinessBadge'

interface DashboardProps { onNavigate?: (table: string) => void }

interface StoryRow {
  id: string; title: string; slug: string; status: string; sort_order: number;
  age_min?: number; age_max?: number; published_at?: string;
  slots_filled: number;
}

interface RevenueStats {
  activeSubscriptions: number;
  mrr: number;
  totalRevenue: number;
  newThisMonth: number;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ published: 0, ready: 0, missing: 0, children: 0, certs: 0, challenges: 0 })
  const [revenue, setRevenue] = useState<RevenueStats>({ activeSubscriptions: 0, mrr: 0, totalRevenue: 0, newThisMonth: 0 })
  const [stories, setStories] = useState<StoryRow[]>([])
  const [storyReadiness, setStoryReadiness] = useState<{ title: string; slug: string; result: ReadinessResult }[]>([])

  useEffect(() => {
    void (async () => {
      try {
        const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
        const [
          { data: storiesData }, { data: childrenData }, { data: achievementsData },
          { data: slotsData }, { data: missionVersions },
          { data: subsData }, { data: ordersData },
        ] = await Promise.all([
          supabase.from('stories').select('id, title, slug, status, sort_order, age_min, age_max, published_at, cover_url').order('sort_order'),
          supabase.from('children').select('id'),
          supabase.from('child_achievements').select('id, type'),
          supabase.from('story_slots').select('story_id, slot_key, mission_id'),
          supabase.from('mission_versions').select('id, mission_id, published, language'),
          supabase.from('nimipiko_subscriptions').select('id, amount, currency, status, created_at').eq('status', 'active'),
          supabase.from('orders').select('amount, currency, payment_status, completed_at'),
        ])

        const allStories = storiesData ?? []
        const allSlots = slotsData ?? []
        const allVersions = missionVersions ?? []
        const allAchievements = achievementsData ?? []

        const storyRows: StoryRow[] = allStories.map(s => {
          const storySlots = allSlots.filter(sl => sl.story_id === s.id)
          const filled = storySlots.filter(sl => allVersions.some(v => v.mission_id === sl.mission_id && v.published)).length
          return { ...s, slots_filled: filled }
        })

        const published = storyRows.filter(s => s.status === 'published').length
        const ready = storyRows.filter(s => s.slots_filled === 6).length
        const missing = storyRows.filter(s => s.slots_filled < 6).length
        const certs = allAchievements.filter(a => a.type === 'certificate').length

        const { count: challengeCount } = await supabase.from('weekly_challenges').select('*', { count: 'exact', head: true })
        setStats({ published, ready, missing, children: (childrenData ?? []).length, certs, challenges: challengeCount ?? 0 })

        // Revenue stats — convert all to USD equivalent (RWF ÷ 1350)
        const toUSD = (amt: number, currency: string) => currency === 'RWF' ? amt / 1350 : amt
        const activeSubs = subsData ?? []
        const orders = (ordersData ?? []).filter(o => o.payment_status === 'completed')
        const mrr = activeSubs.reduce((sum, s) => sum + toUSD(s.amount, s.currency), 0)
        const totalRevenue = orders.reduce((sum, o) => sum + toUSD(o.amount, o.currency), 0)
        const newThisMonth = activeSubs.filter(s => new Date(s.created_at) >= monthStart).length
        setRevenue({ activeSubscriptions: activeSubs.length, mrr, totalRevenue, newThisMonth })
        setStories(storyRows)

        const { data: storyVersions } = await supabase.from('story_versions').select('story_id, intro_video_url, theme_song_url, meet_characters_url, story_intro_url')
        const readinessData = allStories.map(s => {
          const sv = (storyVersions ?? []).filter(v => v.story_id === s.id)
          const ss = allSlots.filter(sl => sl.story_id === s.id)
          const r = computeReadiness({ cover_url: s.cover_url, story_versions: sv, story_slots: ss })
          return { title: s.title, slug: s.slug, result: r }
        })
        setStoryReadiness(readinessData)
      } catch (err) {
        console.error('[Dashboard]', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-5">
          <div className="h-8 bg-gray-100 rounded-lg w-48" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-[88px] bg-gray-50 rounded-xl" />)}
          </div>
          <div className="h-72 bg-gray-50 rounded-xl" />
        </div>
      </div>
    )
  }

  const avgReadiness = storyReadiness.length > 0 ? Math.round(storyReadiness.reduce((sum, s) => sum + s.result.score, 0) / storyReadiness.length) : 0

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[20px] sm:text-[22px] font-extrabold text-gray-900">Dashboard</h1>
        <button onClick={() => onNavigate?.('stories')}
          className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold text-[12px] sm:text-[13px] rounded-lg px-4 py-2.5 shadow-sm transition">
          <Plus size={15} /> New Story
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {[
          { icon: BookOpen,      label: 'Published',    value: stats.published, color: 'text-green-600 bg-green-50' },
          { icon: CheckCircle2,  label: 'Ready',        value: stats.ready,     color: 'text-emerald-600 bg-emerald-50' },
          { icon: AlertTriangle, label: 'Incomplete',    value: stats.missing,   color: 'text-amber-600 bg-amber-50' },
          { icon: Users,         label: 'Children',     value: stats.children,  color: 'text-blue-600 bg-blue-50' },
          { icon: Award,         label: 'Certificates', value: stats.certs,     color: 'text-rose-600 bg-rose-50' },
          { icon: Trophy,        label: 'Challenges',   value: stats.challenges, color: 'text-gray-600 bg-gray-100' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3.5 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${s.color}`}>
              <s.icon size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[20px] font-extrabold text-gray-900 leading-none">{s.value}</p>
              <p className="text-[11px] font-medium text-gray-400 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { icon: CreditCard,  label: 'Active Subs',     value: revenue.activeSubscriptions, suffix: '', color: 'text-violet-600 bg-violet-50' },
          { icon: DollarSign,  label: 'MRR (est.)',       value: `$${revenue.mrr.toFixed(0)}`, suffix: '/mo', color: 'text-green-600 bg-green-50' },
          { icon: TrendingUp,  label: 'Total Revenue',    value: `$${revenue.totalRevenue.toFixed(0)}`, suffix: '', color: 'text-emerald-600 bg-emerald-50' },
          { icon: Users,       label: 'New This Month',   value: revenue.newThisMonth, suffix: '', color: 'text-blue-600 bg-blue-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3.5 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${s.color}`}>
              <s.icon size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[19px] font-extrabold text-gray-900 leading-none tabular-nums">
                {s.value}<span className="text-[11px] font-medium text-gray-400">{s.suffix}</span>
              </p>
              <p className="text-[11px] font-medium text-gray-400 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Stories + Readiness */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">

        {/* Stories Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-gray-50">
            <h2 className="text-[14px] sm:text-[15px] font-extrabold text-gray-800">Stories</h2>
            <button onClick={() => onNavigate?.('stories')} className="text-[12px] font-semibold text-green-600 hover:text-green-700 flex items-center gap-1 transition">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {stories.slice(0, 5).map(s => {
              const pct = Math.round((s.slots_filled / 6) * 100)
              const isPublished = s.status === 'published'
              return (
                <button key={s.id} onClick={() => onNavigate?.(`stories:${s.id}`)}
                  className="w-full flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-gray-50/50 transition text-left">
                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600 font-bold text-[12px] flex-shrink-0">
                    {s.sort_order}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-gray-800 truncate">{s.title}</p>
                    <p className="text-[11px] text-gray-400">Age {s.age_min ?? '—'}–{s.age_max ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <div className="hidden sm:flex items-center gap-1.5">
                      <div className="w-14 bg-gray-100 rounded-full h-1.5">
                        <div className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-500' : 'bg-green-400'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] font-bold text-gray-500 w-8">{s.slots_filled}/6</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                      isPublished ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {isPublished ? 'Live' : 'Draft'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Readiness */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] sm:text-[15px] font-extrabold text-gray-800">Readiness</h2>
            <span className="text-[11px] font-bold text-gray-400">{storyReadiness.length} stories</span>
          </div>
          <div className="flex justify-center mb-4">
            <ReadinessRing score={avgReadiness} size={110} strokeWidth={8} />
          </div>
          <div className="space-y-1.5 mb-4">
            {[
              { color: 'bg-emerald-500', label: 'Ready', count: storyReadiness.filter(s => s.result.status === 'ready').length },
              { color: 'bg-green-500', label: 'In Progress', count: storyReadiness.filter(s => s.result.status === 'in_progress' || s.result.status === 'nearly_ready').length },
              { color: 'bg-amber-400', label: 'Needs Work', count: storyReadiness.filter(s => s.result.status === 'draft').length },
            ].map(r => (
              <div key={r.label} className="flex items-center gap-2.5">
                <div className={`w-2 h-2 rounded-full ${r.color}`} />
                <span className="text-[12px] text-gray-500 flex-1">{r.label}</span>
                <span className="text-[13px] font-bold text-gray-700">{r.count}</span>
              </div>
            ))}
          </div>

          {storyReadiness.filter(s => s.result.score < 100).length > 0 && (
            <div className="border-t border-gray-100 pt-3 space-y-1.5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Needs Attention</p>
              {storyReadiness
                .filter(s => s.result.score < 100)
                .sort((a, b) => a.result.score - b.result.score)
                .slice(0, 4)
                .map(s => (
                  <button key={s.slug} onClick={() => onNavigate?.(`stories:${s.slug}`)}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 transition text-left">
                    <ReadinessRing score={s.result.score} size={28} strokeWidth={3} />
                    <span className="text-[12px] font-medium text-gray-700 flex-1 truncate">{s.title}</span>
                    <ReadinessBadge status={s.result.status} statusLabel={s.result.statusLabel} statusColor={s.result.statusColor} />
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { icon: Plus,         label: 'Create Story',     table: 'stories',            color: 'text-green-600 bg-green-50' },
          { icon: Upload,       label: 'Upload Media',     table: 'Buckets',            color: 'text-blue-600 bg-blue-50' },
          { icon: Rocket,       label: 'Publish',          table: 'stories',            color: 'text-emerald-600 bg-emerald-50' },
          { icon: Trophy,       label: 'New Challenge',    table: 'weekly_challenges',  color: 'text-gray-600 bg-gray-100' },
        ].map(a => (
          <button key={a.label} onClick={() => onNavigate?.(a.table)}
            className="bg-white rounded-xl border border-gray-100 p-3.5 flex items-center gap-3 hover:border-gray-200 hover:shadow-sm transition text-left">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${a.color}`}>
              <a.icon size={16} />
            </div>
            <span className="text-[12px] sm:text-[13px] font-bold text-gray-700">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
