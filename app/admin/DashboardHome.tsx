'use client'
import React, { useEffect, useState } from 'react'
import supabase from "@/lib/supabaseClient";
import {
  Baby, Activity, CheckCircle2, AlertTriangle, XCircle, Award, BookOpen,
  TrendingUp, TrendingDown, Minus, Trophy, UserPlus, Plus, PenTool,
  type LucideIcon,
} from 'lucide-react'
import { ACCENT, LANGUAGES, CATEGORY_ORDER, CATEGORY_META, FALLBACK_META, type AccentKey, type Lang } from './missionMeta'
import { Skeleton, SkeletonStatCards, SkeletonCardGrid, SkeletonTable, SkeletonList } from './Skeleton'

type LangState = 'complete' | 'partial' | 'missing'

interface AdventureCard {
  categorySlug: string
  title: string
  stars: number
  missionsCount: number
  languages: Record<Lang, LangState>
}

interface CoverageRow {
  categorySlug: string
  label: string
  total: number
  published: Record<Lang, number>
}

interface Trend {
  icon?: LucideIcon
  text: string
  color: string
}

interface StatCardData {
  label: string
  value: number
  icon: LucideIcon
  accent: AccentKey
  trend: Trend
}

interface ActivityItem {
  id: string
  icon: LucideIcon
  accent: AccentKey
  parts: { text: string; bold?: boolean }[]
  meta: string
  timestamp: string
}

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function trendFromDelta(delta: number): Trend {
  if (delta > 0) return { icon: TrendingUp, text: `+${delta} vs yesterday`, color: 'text-emerald-600' }
  if (delta < 0) return { icon: TrendingDown, text: `${delta} vs yesterday`, color: 'text-red-500' }
  return { icon: Minus, text: 'No change vs yesterday', color: 'text-gray-400' }
}

function weeklyTrend(count: number): Trend {
  if (count > 0) return { icon: TrendingUp, text: `+${count} this week`, color: 'text-emerald-600' }
  return { icon: Minus, text: 'No new this week', color: 'text-gray-400' }
}

function coverageColor(published: number, total: number) {
  if (total === 0) return 'text-gray-400'
  if (published === 0) return 'text-red-500'
  if (published === total) return 'text-emerald-600'
  return 'text-amber-600'
}

interface DashboardProps {
  onNavigate?: (table: string) => void
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [loading, setLoading] = useState(true)
  const [statCards, setStatCards] = useState<StatCardData[]>([])
  const [adventures, setAdventures] = useState<AdventureCard[]>([])
  const [coverage, setCoverage] = useState<CoverageRow[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true)
      try {
        const now = new Date()
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const startOfYesterday = new Date(startOfToday)
        startOfYesterday.setDate(startOfYesterday.getDate() - 1)
        const sevenDaysAgo = new Date(now)
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const [
          { data: missions },
          { data: children },
          { data: progress },
          { data: achievements },
          { data: stories },
        ] = await Promise.all([
          supabase.from('missions').select('id, category_slug, stars, mission_versions(language, title, published)').order('category_slug'),
          supabase.from('children').select('id, name, created_at'),
          supabase.from('child_progress')
            .select('id, child_id, completed_at, language, stars_earned, children(name), missions(category_slug, mission_versions(title, language))')
            .order('completed_at', { ascending: false })
            .limit(50),
          supabase.from('child_achievements')
            .select('id, slug, language, earned_at, children(name)')
            .order('earned_at', { ascending: false }),
          supabase.from('stories').select('id, title, is_active, created_at').order('created_at', { ascending: false }),
        ])

        // --- Group missions/mission_versions by category ---
        const grouped: Record<string, { title?: string; stars: number; total: number; published: Record<Lang, number> }> = {}
        for (const m of missions ?? []) {
          const slug = m.category_slug as string
          if (!grouped[slug]) grouped[slug] = { stars: 0, total: 0, published: { en: 0, fr: 0, rw: 0 } }
          const g = grouped[slug]
          g.total += 1
          g.stars += m.stars ?? 0
          const versions = (m.mission_versions ?? []) as any[]
          if (!g.title) g.title = versions.find(v => v.language === 'en')?.title
          for (const lang of LANGUAGES) {
            if (versions.some(v => v.language === lang && v.published)) g.published[lang] += 1
          }
        }

        const adventureCards: AdventureCard[] = CATEGORY_ORDER
          .filter(slug => grouped[slug])
          .map(slug => {
            const g = grouped[slug]
            const languages: Record<Lang, LangState> = { en: 'missing', fr: 'missing', rw: 'missing' }
            for (const lang of LANGUAGES) {
              const pub = g.published[lang]
              languages[lang] = pub === 0 ? 'missing' : pub === g.total ? 'complete' : 'partial'
            }
            return {
              categorySlug: slug,
              title: g.title ?? slug,
              stars: g.stars,
              missionsCount: g.total,
              languages,
            }
          })
        setAdventures(adventureCards)

        const coverageRows: CoverageRow[] = CATEGORY_ORDER
          .filter(slug => grouped[slug])
          .map(slug => ({
            categorySlug: slug,
            label: CATEGORY_META[slug]?.label ?? slug,
            total: grouped[slug].total,
            published: grouped[slug].published,
          }))
        setCoverage(coverageRows)

        // --- Stat cards ---
        const childrenRows = children ?? []
        const progressRows = progress ?? []
        const achievementRows = achievements ?? []
        const storyRows = stories ?? []

        const todayRows = progressRows.filter(p => p.completed_at && new Date(p.completed_at) >= startOfToday)
        const yesterdayRows = progressRows.filter(p => p.completed_at && new Date(p.completed_at) >= startOfYesterday && new Date(p.completed_at) < startOfToday)

        const activeToday = new Set(todayRows.map(p => p.child_id)).size
        const activeYesterday = new Set(yesterdayRows.map(p => p.child_id)).size
        const missionsToday = todayRows.length
        const missionsYesterday = yesterdayRows.length

        const newChildrenThisWeek = childrenRows.filter(c => c.created_at && new Date(c.created_at) >= sevenDaysAgo).length
        const certsThisWeek = achievementRows.filter(a => a.earned_at && new Date(a.earned_at) >= sevenDaysAgo).length
        const publishedStories = storyRows.filter(s => s.is_active).length
        const draftStories = storyRows.filter(s => !s.is_active).length

        setStatCards([
          {
            label: 'Total Children',
            value: childrenRows.length,
            icon: Baby,
            accent: 'violet',
            trend: weeklyTrend(newChildrenThisWeek),
          },
          {
            label: 'Active Today',
            value: activeToday,
            icon: Activity,
            accent: 'blue',
            trend: trendFromDelta(activeToday - activeYesterday),
          },
          {
            label: 'Missions Completed Today',
            value: missionsToday,
            icon: CheckCircle2,
            accent: 'emerald',
            trend: trendFromDelta(missionsToday - missionsYesterday),
          },
          {
            label: 'Certificates Issued',
            value: achievementRows.length,
            icon: Award,
            accent: 'amber',
            trend: weeklyTrend(certsThisWeek),
          },
          {
            label: 'Stories Published',
            value: publishedStories,
            icon: BookOpen,
            accent: 'pink',
            trend: { text: `${draftStories} in draft`, color: 'text-gray-400' },
          },
        ])

        // --- Recent activity (merge 4 sources) ---
        const items: ActivityItem[] = []

        for (const s of storyRows.filter(s => s.is_active)) {
          items.push({
            id: `story-${s.id}`,
            icon: BookOpen,
            accent: 'indigo',
            parts: [{ text: 'New story ' }, { text: `"${s.title}"`, bold: true }, { text: ' published' }],
            meta: timeAgo(s.created_at),
            timestamp: s.created_at,
          })
        }

        for (const a of achievementRows) {
          const childName = (a.children as any)?.name ?? 'A learner'
          items.push({
            id: `cert-${a.id}`,
            icon: Award,
            accent: 'emerald',
            parts: [{ text: childName, bold: true }, { text: ' earned ' }, { text: `"${a.slug}"`, bold: true }, { text: ' certificate' }],
            meta: `${(a.language ?? '').toUpperCase()} · ${timeAgo(a.earned_at)}`,
            timestamp: a.earned_at,
          })
        }

        for (const p of progressRows) {
          const versions = (p.missions as any)?.mission_versions ?? []
          const title = versions.find((v: any) => v.language === p.language)?.title
            ?? versions.find((v: any) => v.language === 'en')?.title
            ?? (p.missions as any)?.category_slug
            ?? 'a mission'
          const childName = (p.children as any)?.name ?? 'A learner'
          items.push({
            id: `progress-${p.id}`,
            icon: Trophy,
            accent: 'amber',
            parts: [{ text: childName, bold: true }, { text: ' completed ' }, { text: `"${title}"`, bold: true }],
            meta: `${(p.language ?? '').toUpperCase()} · ${p.stars_earned}★ · ${timeAgo(p.completed_at)}`,
            timestamp: p.completed_at,
          })
        }

        for (const c of childrenRows) {
          items.push({
            id: `child-${c.id}`,
            icon: UserPlus,
            accent: 'sky',
            parts: [{ text: 'New explorer profile created: ' }, { text: c.name, bold: true }],
            meta: timeAgo(c.created_at),
            timestamp: c.created_at,
          })
        }

        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        setActivity(items.slice(0, 6))
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [])

  const quickActions: { label: string; table: string; icon: LucideIcon; accent: AccentKey }[] = [
    { label: 'Create Mission', table: `mission:${CATEGORY_ORDER[0]}`, icon: Plus, accent: 'violet' },
    { label: 'Create Story', table: 'stories', icon: BookOpen, accent: 'pink' },
    { label: 'Create Coloring Page', table: 'coloring_pages', icon: PenTool, accent: 'orange' },
    { label: 'View Certificates', table: 'child_achievements', icon: Award, accent: 'emerald' },
    { label: 'Add Child', table: 'children', icon: Baby, accent: 'blue' },
  ]

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
        <SkeletonStatCards count={5} cols="sm:grid-cols-2 lg:grid-cols-5" />
        <div>
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-24" />
          </div>
          <SkeletonCardGrid count={4} cols="sm:grid-cols-2 lg:grid-cols-4" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <Skeleton className="h-5 w-40 mb-4" />
            <SkeletonTable rows={5} cols={4} />
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <Skeleton className="h-5 w-32 mb-4" />
            <SkeletonList rows={4} />
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <Skeleton className="h-5 w-44 mb-4" />
          <SkeletonTable rows={6} cols={6} />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-3 ${ACCENT[card.accent].tile}`}>
              <card.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-extrabold text-gray-800">{card.value}</p>
            <p className="text-gray-500 text-sm font-semibold mb-1.5">{card.label}</p>
            <p className={`text-xs font-bold flex items-center gap-1 ${card.trend.color}`}>
              {card.trend.icon && <card.trend.icon className="w-3 h-3" />}
              {card.trend.text}
            </p>
          </div>
        ))}
      </div>

      {/* Daily Adventures Overview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Daily Adventures Overview</h3>
          <span className="text-sm font-semibold text-gray-400">{adventures.length} categories</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {adventures.map((card, idx) => {
            const meta = CATEGORY_META[card.categorySlug] ?? FALLBACK_META
            const accent = ACCENT[meta.accent]
            return (
              <div key={card.categorySlug} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${accent.tile}`}>
                      <meta.icon className="w-6 h-6" />
                    </div>
                    <span className={`absolute -top-2 -left-2 w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center ${accent.badge}`}>
                      {idx + 1}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-500">⭐ {card.stars}</span>
                </div>
                <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wide mb-0.5">{meta.label}</p>
                <p className="text-sm font-bold text-gray-800 mb-1 truncate" title={card.title}>{card.title}</p>
                <p className="text-xs text-gray-400 mb-3">{card.missionsCount} Mission{card.missionsCount === 1 ? '' : 's'}</p>
                <div className="flex items-center gap-1.5 mb-4">
                  {LANGUAGES.map(lang => {
                    const state = card.languages[lang]
                    const cls = state === 'complete' ? 'bg-emerald-50 text-emerald-600' : state === 'partial' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-500'
                    const Icon = state === 'complete' ? CheckCircle2 : state === 'partial' ? AlertTriangle : XCircle
                    return (
                      <span key={lang} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${cls}`}>
                        <Icon className="w-3 h-3" />
                        {lang}
                      </span>
                    )
                  })}
                </div>
                <button
                  onClick={() => onNavigate?.(`mission:${card.categorySlug}`)}
                  className={`mt-auto w-full text-center text-white text-sm font-bold py-2 rounded-xl transition ${accent.button}`}
                >
                  Manage
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Translation Coverage + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-bold text-gray-800 mb-1">Translation Coverage</h3>
          <p className="text-gray-500 text-sm mb-4">Published mission content per language, by category</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 text-xs font-bold uppercase tracking-wide border-b border-gray-100">
                  <th className="py-2 pr-2">Category</th>
                  <th className="py-2 px-2 text-center">EN</th>
                  <th className="py-2 px-2 text-center">FR</th>
                  <th className="py-2 px-2 text-center">RW</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {coverage.map(row => (
                  <tr key={row.categorySlug}>
                    <td className="py-2.5 pr-2 font-semibold text-gray-700">{row.label}</td>
                    {LANGUAGES.map(lang => (
                      <td key={lang} className={`py-2.5 px-2 text-center font-bold ${coverageColor(row.published[lang], row.total)}`}>
                        {row.published[lang]}/{row.total}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Complete</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> In Progress</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Missing</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-bold text-gray-800 mb-1">Recent Activity</h3>
          <p className="text-gray-500 text-sm mb-4">Latest updates across the platform</p>
          {activity.length === 0 ? (
            <p className="text-gray-400 text-sm py-6 text-center">No activity yet — updates will show up here.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {activity.map(item => (
                <div key={item.id} className="flex items-center gap-3 py-2.5">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${ACCENT[item.accent].tile}`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">
                      {item.parts.map((part, i) => part.bold
                        ? <span key={i} className="font-semibold">{part.text}</span>
                        : <span key={i}>{part.text}</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.meta}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content Pipeline */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-base font-bold text-gray-800 mb-1">Content Pipeline</h3>
        <p className="text-gray-500 text-sm mb-4">Translation progress and next steps per Daily Adventure</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 text-xs font-bold uppercase tracking-wide border-b border-gray-100">
                <th className="py-2 pr-2">Category</th>
                <th className="py-2 px-2 text-center">Total Missions</th>
                <th className="py-2 px-2 text-center">EN</th>
                <th className="py-2 px-2 text-center">FR</th>
                <th className="py-2 px-2 text-center">RW</th>
                <th className="py-2 px-2">Progress</th>
                <th className="py-2 pl-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {coverage.map(row => {
                const pct = row.total ? Math.round(((row.published.en + row.published.fr + row.published.rw) / (row.total * 3)) * 100) : 0
                return (
                  <tr key={row.categorySlug}>
                    <td className="py-2.5 pr-2 font-semibold text-gray-700">{row.label}</td>
                    <td className="py-2.5 px-2 text-center text-gray-500">{row.total}</td>
                    <td className="py-2.5 px-2 text-center text-gray-500">{row.published.en}</td>
                    <td className="py-2.5 px-2 text-center text-gray-500">{row.published.fr}</td>
                    <td className="py-2.5 px-2 text-center text-gray-500">{row.published.rw}</td>
                    <td className="py-2.5 px-2 min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-bold text-gray-500 w-9 text-right">{pct}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 pl-2 text-right">
                      <button
                        onClick={() => onNavigate?.(`mission:${row.categorySlug}`)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 transition whitespace-nowrap"
                      >
                        Continue
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-base font-bold text-gray-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {quickActions.map(action => (
            <button
              key={action.label}
              onClick={() => onNavigate?.(action.table)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition group"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${ACCENT[action.accent].tile}`}>
                <action.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-gray-600 text-center">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
