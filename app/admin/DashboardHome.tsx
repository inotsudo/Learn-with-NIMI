'use client'
import React, { useCallback, useEffect, useState } from 'react'
import supabase from "@/lib/supabaseClient"
import {
  BookOpen, CheckCircle2, AlertTriangle, Users, Award, Trophy,
  Plus, Upload, ArrowRight, DollarSign, CreditCard,
  TrendingUp, TrendingDown, Send, ChevronRight,
  AlertCircle, RefreshCw, WifiOff,
} from 'lucide-react'
import { computeReadiness, type ReadinessResult } from '@/lib/storyReadiness'
import ReadinessRing from '@/components/admin/story-readiness/ReadinessRing'
import ReadinessBadge from '@/components/admin/story-readiness/ReadinessBadge'

interface DashboardProps { onNavigate?: (table: string) => void }

interface StoryRow {
  id: string; title: string; slug: string; status: string; sort_order: number;
  age_min?: number | null; age_max?: number | null; published_at?: string | null;
  cover_url?: string | null;
  slots_filled: number;
}

interface RevenueStats {
  activeSubscriptions: number;
  mrr: number;
  totalRevenue: number;
  newThisMonth: number;
  hasData: boolean;
}

interface ActivityStats {
  newChildrenThisWeek: number;
  newChildrenLastWeek: number;
  certsThisMonth: number;
  certsLastMonth: number;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Sk({ className }: { className: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-xl ${className}`} />
}

function LoadingSkeleton() {
  return (
    <div className="p-5 sm:p-7 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5"><Sk className="h-4 w-32" /><Sk className="h-7 w-48" /></div>
        <Sk className="h-9 w-28 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Sk key={i} className="h-[88px]" />)}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Sk key={i} className="h-[88px]" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_296px] gap-4">
        <Sk className="h-80" />
        <div className="space-y-4"><Sk className="h-52" /><Sk className="h-24" /></div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Sk key={i} className="h-[68px]" />)}
      </div>
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, sub, color, badge, trend, onClick,
}: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color: string; badge?: string;
  trend?: { value: number; label: string }; onClick?: () => void;
}) {
  const isPos = trend ? trend.value >= 0 : null
  const TI = isPos ? TrendingUp : TrendingDown

  if (onClick) {
    return (
      <button type="button" onClick={onClick}
        className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3 shadow-sm hover:shadow-md hover:border-gray-200 transition-all cursor-pointer text-left">
        <div className="flex items-start justify-between gap-2">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
            <Icon size={16} />
          </div>
          {badge && (
            <span className="text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full leading-none">
              {badge}
            </span>
          )}
        </div>
        <div>
          <p className="text-[22px] font-extrabold text-gray-900 leading-none tabular-nums">{value}</p>
          <p className="text-[11px] font-medium text-gray-400 mt-1">{label}</p>
          {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-[10px] font-bold ${isPos ? 'text-emerald-600' : 'text-red-500'}`}>
            <TI size={10} />
            <span>{Math.abs(trend.value)} {trend.label}</span>
          </div>
        )}
      </button>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon size={16} />
        </div>
        {badge && (
          <span className="text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full leading-none">
            {badge}
          </span>
        )}
      </div>
      <div>
        <p className="text-[22px] font-extrabold text-gray-900 leading-none tabular-nums">{value}</p>
        <p className="text-[11px] font-medium text-gray-400 mt-1">{label}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-[10px] font-bold ${isPos ? 'text-emerald-600' : 'text-red-500'}`}>
          <TI size={10} />
          <span>{Math.abs(trend.value)} {trend.label}</span>
        </div>
      )}
    </div>
  )
}

// ── Alert banner for published stories missing slots ──────────────────────────
function AlertBanner({ stories, onNavigate }: { stories: StoryRow[]; onNavigate?: (t: string) => void }) {
  const bad = stories.filter(s => s.slots_filled < 6 && s.status === 'published')
  if (bad.length === 0) return null
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <AlertCircle size={15} className="text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-amber-900">
          {bad.length} published {bad.length === 1 ? 'story is' : 'stories are'} missing content slots
        </p>
        <p className="text-[11px] text-amber-700 mt-0.5 mb-2.5">
          These stories are live but don&apos;t have all 6 mission slots filled.
        </p>
        <div className="flex flex-wrap gap-2">
          {bad.slice(0, 4).map(s => (
            <button key={s.id} type="button" onClick={() => onNavigate?.(`stories:${s.id}`)}
              className="text-[11px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 px-2.5 py-1 rounded-lg transition flex items-center gap-1">
              {s.title}
              <span className="text-amber-500 ml-0.5">({s.slots_filled}/6)</span>
            </button>
          ))}
          {bad.length > 4 && (
            <button type="button" onClick={() => onNavigate?.('stories')}
              className="text-[11px] font-bold text-amber-700 hover:text-amber-900 px-2 py-1 transition">
              +{bad.length - 4} more
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Error banner ──────────────────────────────────────────────────────────────
function ErrorBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
      <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
        <WifiOff size={15} className="text-red-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-red-800">Could not load dashboard data</p>
        <p className="text-[11px] text-red-600 mt-0.5">Check your connection or Supabase access, then try again.</p>
      </div>
      <button type="button" onClick={onRetry}
        className="flex items-center gap-1.5 text-[12px] font-bold text-red-600 hover:text-red-700 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-xl transition flex-shrink-0">
        <RefreshCw size={12} /> Retry
      </button>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function formatAge(min?: number | null, max?: number | null): string {
  if (min == null && max == null) return 'All ages'
  if (min != null && max != null) return `Age ${min}–${max}`
  if (min != null) return `Age ${min}+`
  return `Up to age ${max}`
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard({ onNavigate }: DashboardProps) {
  const [loading,     setLoading]     = useState(true)
  const [refreshing,  setRefreshing]  = useState(false)
  const [loadError,   setLoadError]   = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const [stats,    setStats]    = useState({ published: 0, ready: 0, missing: 0, children: 0, certs: 0, challenges: 0 })
  const [revenue,  setRevenue]  = useState<RevenueStats>({ activeSubscriptions: 0, mrr: 0, totalRevenue: 0, newThisMonth: 0, hasData: false })
  const [activity, setActivity] = useState<ActivityStats>({ newChildrenThisWeek: 0, newChildrenLastWeek: 0, certsThisMonth: 0, certsLastMonth: 0 })
  const [stories,  setStories]  = useState<StoryRow[]>([])
  const [storyReadiness, setStoryReadiness] = useState<{ title: string; slug: string; id: string; result: ReadinessResult }[]>([])

  const load = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    setLoadError(false)
    try {
      const now            = new Date()
      const monthStart     = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const weekStart      = new Date(now); weekStart.setDate(now.getDate() - 7)
      const lastWeekStart  = new Date(now); lastWeekStart.setDate(now.getDate() - 14)

      const [
        { data: storiesData,       error: e1 },
        { data: childrenData,      error: e2 },
        { data: achievementsData },
        { data: slotsData,         error: e4 },
        { data: missionVersions },
        { data: subsData },
        { data: ordersData },
        { count: challengeCount },
        { data: storyVersions },
        { data: recentChildren },
        { data: prevWeekChildren },
      ] = await Promise.all([
        supabase.from('stories').select('id, title, slug, status, sort_order, age_min, age_max, published_at, cover_url').order('sort_order'),
        supabase.from('children').select('id'),
        supabase.from('child_achievements').select('id, type, earned_at'),
        supabase.from('story_slots').select('story_id, slot_key, mission_id'),
        supabase.from('mission_versions').select('id, mission_id, published, language'),
        supabase.from('nimipiko_subscriptions').select('id, amount, currency, status, created_at').eq('status', 'active'),
        supabase.from('orders').select('amount, currency, payment_status, completed_at'),
        supabase.from('weekly_challenges').select('*', { count: 'exact', head: true }),
        supabase.from('story_versions').select('story_id, intro_video_url, theme_song_url, meet_characters_url, story_intro_url'),
        supabase.from('children').select('id, created_at').gte('created_at', weekStart.toISOString()),
        supabase.from('children').select('id, created_at')
          .gte('created_at', lastWeekStart.toISOString())
          .lt('created_at', weekStart.toISOString()),
      ])

      // Surface error if any critical query failed
      if (e1 || e2 || e4) {
        setLoadError(true)
        return
      }

      const allStories      = storiesData ?? []
      const allSlots        = slotsData ?? []
      const allVersions     = missionVersions ?? []
      const allAchievements = achievementsData ?? []

      const storyRows: StoryRow[] = allStories.map(s => {
        const storySlots = allSlots.filter(sl => sl.story_id === s.id)
        const filled = storySlots.filter(sl =>
          allVersions.some(v => v.mission_id === sl.mission_id && v.published)
        ).length
        return { ...s, slots_filled: filled }
      })

      const published = storyRows.filter(s => s.status === 'published').length
      const ready     = storyRows.filter(s => s.slots_filled === 6).length
      const missing   = storyRows.filter(s => s.slots_filled < 6).length
      const certs     = allAchievements.filter(a => a.type === 'certificate').length
      setStats({ published, ready, missing, children: (childrenData ?? []).length, certs, challenges: challengeCount ?? 0 })

      const certsThisMonth = allAchievements.filter(a =>
        a.type === 'certificate' && a.earned_at && new Date(a.earned_at) >= monthStart
      ).length
      const certsLastMonth = allAchievements.filter(a =>
        a.type === 'certificate' && a.earned_at &&
        new Date(a.earned_at) >= lastMonthStart && new Date(a.earned_at) < monthStart
      ).length
      setActivity({
        newChildrenThisWeek: (recentChildren ?? []).length,
        newChildrenLastWeek: (prevWeekChildren ?? []).length,
        certsThisMonth,
        certsLastMonth,
      })

      const toUSD       = (amt: number, currency: string) => currency === 'RWF' ? amt / 1350 : amt
      const activeSubs  = subsData ?? []
      const orders      = (ordersData ?? []).filter(o => o.payment_status === 'completed')
      const mrr         = activeSubs.reduce((sum, s) => sum + toUSD(s.amount, s.currency), 0)
      const totalRev    = orders.reduce((sum, o) => sum + toUSD(o.amount, o.currency), 0)
      const newThisMonth = activeSubs.filter(s => new Date(s.created_at) >= monthStart).length
      setRevenue({ activeSubscriptions: activeSubs.length, mrr, totalRevenue: totalRev, newThisMonth, hasData: orders.length > 0 || activeSubs.length > 0 })
      setStories(storyRows)

      const readinessData = allStories.map(s => {
        const sv = (storyVersions ?? []).filter(v => v.story_id === s.id)
        const ss = allSlots.filter(sl => sl.story_id === s.id)
        const r  = computeReadiness({ cover_url: s.cover_url, story_versions: sv, story_slots: ss })
        return { title: s.title, slug: s.slug, id: s.id, result: r }
      })
      setStoryReadiness(readinessData)
      setLastRefresh(new Date())
    } catch (err) {
      console.error('[Dashboard]', err)
      setLoadError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) return <LoadingSkeleton />

  const avgReadiness = storyReadiness.length > 0
    ? Math.round(storyReadiness.reduce((sum, s) => sum + s.result.score, 0) / storyReadiness.length) : 0

  // Correct delta: week-over-week change, not raw count
  const childrenTrend = activity.newChildrenThisWeek - activity.newChildrenLastWeek
  const certsTrend    = activity.certsThisMonth - activity.certsLastMonth

  const readyCount     = storyReadiness.filter(s => s.result.status === 'ready').length
  const inProgCount    = storyReadiness.filter(s => s.result.status === 'in_progress' || s.result.status === 'nearly_ready').length
  const needsWorkCount = storyReadiness.filter(s => s.result.status === 'draft').length

  const needsAttention = storyReadiness
    .filter(s => s.result.score < 100)
    .sort((a, b) => a.result.score - b.result.score)

  return (
    <div className="p-5 sm:p-7 lg:p-8 max-w-7xl mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] font-semibold text-gray-400 mb-0.5 tracking-wide">{formatDate()}</p>
          <h1 className="text-[20px] sm:text-[22px] font-extrabold text-gray-900">{getGreeting()} 👋</h1>
        </div>
        <div className="flex items-center gap-2">
          <button type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 font-semibold text-[12px] rounded-xl px-3 py-2 transition disabled:opacity-40"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button type="button"
            onClick={() => onNavigate?.('stories')}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold text-[12px] sm:text-[13px] rounded-xl px-4 py-2 shadow-sm shadow-green-200 transition"
          >
            <Plus size={13} /> New Story
          </button>
        </div>
      </div>

      {/* ── Error banner ── */}
      {loadError && <ErrorBanner onRetry={() => void load(true)} />}

      {/* ── Alert banner ── */}
      {!loadError && <AlertBanner stories={stories} onNavigate={onNavigate} />}

      {/* ── Content stats ── */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Content</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={BookOpen}      label="Published stories" value={stats.published}
            color="text-green-600 bg-green-50" sub={`${stats.ready} fully ready`}
            onClick={() => onNavigate?.('stories')} />
          <StatCard icon={CheckCircle2}  label="All slots filled"  value={stats.ready}
            color="text-emerald-600 bg-emerald-50"
            badge={stats.ready < stats.published ? 'Action needed' : undefined}
            onClick={() => onNavigate?.('stories')} />
          <StatCard icon={AlertTriangle} label="Missing content"   value={stats.missing}
            color="text-amber-600 bg-amber-50" sub={`${stats.published - stats.ready} published`}
            onClick={() => onNavigate?.('stories')} />
          <StatCard icon={Trophy}        label="Weekly challenges" value={stats.challenges}
            color="text-violet-600 bg-violet-50"
            onClick={() => onNavigate?.('weekly_challenges')} />
        </div>
      </div>

      {/* ── Learner & revenue stats ── */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Learners &amp; Revenue</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Users}      label="Total children"       value={stats.children}
            color="text-blue-600 bg-blue-50"
            trend={{ value: childrenTrend, label: 'vs last week' }}
            onClick={() => onNavigate?.('children')} />
          <StatCard icon={Award}      label="Certificates issued"  value={stats.certs}
            color="text-rose-600 bg-rose-50"
            trend={{ value: certsTrend, label: 'vs last month' }}
            onClick={() => onNavigate?.('child_achievements')} />
          <StatCard icon={CreditCard} label="Active subscriptions" value={revenue.activeSubscriptions}
            color="text-indigo-600 bg-indigo-50" sub={`${revenue.newThisMonth} new this month`}
            onClick={() => onNavigate?.('nimipiko_subscriptions')} />
          <StatCard icon={DollarSign} label="Total revenue"        value={revenue.hasData ? `$${revenue.totalRevenue.toFixed(0)}` : '—'}
            color="text-teal-600 bg-teal-50"
            sub={revenue.hasData ? `$${revenue.mrr.toFixed(0)}/mo MRR` : 'No orders yet'}
            onClick={() => onNavigate?.('orders')} />
        </div>
      </div>

      {/* ── Stories + Readiness ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_296px] gap-4">

        {/* Stories list */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div>
              <h2 className="text-[14px] font-extrabold text-gray-800">Stories</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">{stories.length} total · sorted by play order</p>
            </div>
            <button type="button" onClick={() => onNavigate?.('stories')}
              className="text-[12px] font-bold text-green-600 hover:text-green-700 flex items-center gap-1 transition">
              View all <ChevronRight size={12} />
            </button>
          </div>

          {stories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3 text-center px-6">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
                <BookOpen size={20} className="text-gray-300" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-gray-500">No stories yet</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Create your first story to get started</p>
              </div>
              <button type="button" onClick={() => onNavigate?.('stories')}
                className="mt-1 text-[12px] font-bold bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl transition flex items-center gap-1.5">
                <Plus size={13} /> Create Story
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {stories.slice(0, 7).map(s => {
                const pct         = Math.round((s.slots_filled / 6) * 100)
                const isPublished = s.status === 'published'
                const isComplete  = s.slots_filled === 6
                return (
                  <button key={s.id} type="button" onClick={() => onNavigate?.(`stories:${s.id}`)}
                    className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/70 transition text-left group">
                    <div className="w-7 h-7 rounded-lg bg-gray-50 group-hover:bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-[11px] flex-shrink-0 transition">
                      {s.sort_order}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-gray-800 truncate">{s.title}</p>
                      <p className="text-[11px] text-gray-400">
                        {formatAge(s.age_min, s.age_max)}
                        {s.published_at && (
                          <>
                            <span className="mx-1.5 text-gray-200">·</span>
                            Published {new Date(s.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <div className="hidden sm:flex items-center gap-1.5">
                        <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isComplete ? 'bg-emerald-500' : pct >= 50 ? 'bg-green-400' : 'bg-amber-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-gray-400 w-7 text-right">{s.slots_filled}/6</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg leading-none ${
                        isPublished && isComplete ? 'bg-emerald-50 text-emerald-700'
                        : isPublished             ? 'bg-amber-50 text-amber-600'
                        :                           'bg-gray-100 text-gray-500'
                      }`}>
                        {isPublished ? (isComplete ? 'Live ✓' : 'Live') : 'Draft'}
                      </span>
                    </div>
                  </button>
                )
              })}

              {stories.length > 7 && (
                <button type="button" onClick={() => onNavigate?.('stories')}
                  className="w-full px-5 py-3.5 text-[12px] font-bold text-green-600 hover:text-green-700 hover:bg-green-50/40 flex items-center justify-center gap-1 transition">
                  View {stories.length - 7} more stories <ArrowRight size={12} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Readiness + needs attention */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[14px] font-extrabold text-gray-800">Content Readiness</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">{storyReadiness.length} stories scored</p>
              </div>
              <div className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                avgReadiness >= 80 ? 'bg-emerald-50 text-emerald-700'
                : avgReadiness >= 50 ? 'bg-amber-50 text-amber-700'
                : 'bg-red-50 text-red-600'
              }`}>
                {avgReadiness}% avg
              </div>
            </div>

            <div className="flex justify-center mb-5">
              <ReadinessRing score={avgReadiness} size={108} strokeWidth={8} />
            </div>

            <div className="space-y-2.5">
              {[
                { color: 'bg-emerald-500', label: 'Ready',       count: readyCount },
                { color: 'bg-green-400',   label: 'In Progress', count: inProgCount },
                { color: 'bg-amber-400',   label: 'Needs Work',  count: needsWorkCount },
              ].map(r => (
                <div key={r.label} className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${r.color}`} />
                  <span className="text-[12px] text-gray-500 flex-1">{r.label}</span>
                  <span className="text-[13px] font-bold text-gray-700">{r.count}</span>
                </div>
              ))}
            </div>
          </div>

          {needsAttention.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Needs Attention</p>
              <div className="space-y-0.5">
                {needsAttention.slice(0, 5).map(s => (
                  <button key={s.slug} type="button" onClick={() => onNavigate?.(`stories:${s.id}`)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl hover:bg-gray-50 transition text-left">
                    <ReadinessRing score={s.result.score} size={28} strokeWidth={3} />
                    <span className="text-[12px] font-medium text-gray-700 flex-1 truncate">{s.title}</span>
                    <ReadinessBadge status={s.result.status} statusLabel={s.result.statusLabel} statusColor={s.result.statusColor} />
                  </button>
                ))}
                {needsAttention.length > 5 && (
                  <button type="button" onClick={() => onNavigate?.('stories')}
                    className="w-full text-[11px] font-bold text-green-600 hover:text-green-700 pt-2 pb-0.5 transition text-center">
                    +{needsAttention.length - 5} more stories
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Quick Actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Plus,   label: 'Create Story',      desc: 'Add a new story',         table: 'stories',           color: 'text-green-600 bg-green-50' },
            { icon: Upload, label: 'Upload Media',       desc: 'Manage files & assets',   table: 'Buckets',           color: 'text-blue-600 bg-blue-50' },
            { icon: Send,   label: 'Send Notification', desc: 'Notify parent devices',    table: 'notifications',     color: 'text-violet-600 bg-violet-50' },
            { icon: Trophy, label: 'New Challenge',      desc: 'Create weekly challenge', table: 'weekly_challenges', color: 'text-amber-600 bg-amber-50' },
          ].map(a => (
            <button key={a.label} type="button" onClick={() => onNavigate?.(a.table)}
              className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 hover:border-gray-200 hover:shadow-md transition text-left group shadow-sm">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${a.color} group-hover:scale-105 transition-transform`}>
                <a.icon size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] sm:text-[13px] font-bold text-gray-800 truncate">{a.label}</p>
                <p className="text-[10px] text-gray-400 truncate">{a.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="text-[10px] text-gray-300 text-center pt-1 pb-2">
        Last updated {lastRefresh.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  )
}
