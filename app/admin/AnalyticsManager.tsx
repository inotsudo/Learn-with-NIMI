'use client'
import React, { useEffect, useState, useMemo, useCallback } from 'react'
import supabase from '@/lib/supabaseClient'
import {
  BarChart3, Menu, Sparkles, Star, Users, TrendingUp, Globe, ArrowUpRight, AlertCircle, RefreshCw,
  Layers, Award, FileText, FileSpreadsheet,
} from 'lucide-react'
import { ACCENT, LANGUAGES, LANGUAGE_META, CATEGORY_ORDER, CATEGORY_META, FALLBACK_META, CONTENT_STATUSES, type Lang } from './missionMeta'
import type { ActivityCategory } from '@/app/_activityData'
import { Skeleton, SkeletonHeaderBanner, SkeletonStatCards, SkeletonBarChart, SkeletonTable, SkeletonCardGrid, SkeletonList } from './Skeleton'
import StatCard from './StatCard'
import LearnerAnalyticsTab from './LearnerAnalyticsTab'
import CurriculumAnalyticsTab from './CurriculumAnalyticsTab'
import LanguageAnalyticsTab from './LanguageAnalyticsTab'
import AchievementAnalyticsTab from './AchievementAnalyticsTab'
import ContentAnalyticsTab from './ContentAnalyticsTab'
import RevenueAnalyticsTab from './RevenueAnalyticsTab'
import { exportXLSX } from './exportUtils'
import {
  computeLearnerAnalytics, computeCurriculumAnalytics, computeLanguageAnalytics,
  computeAchievementAnalytics, computeContentAnalytics,
  type AdminChildRow, type AdminProgressRow, type AdminMissionVersionRow, type AdminLanguageSwitchRow,
} from '@/lib/adminAnalytics'
import type { ChildAchievement, LevelMissionRow } from '@/lib/queries'

interface AnalyticsManagerProps {
  onNavigate: (table: string) => void
  onOpenSidebar?: () => void
}

interface ProgressRow {
  id: string
  child_id: string
  mission_id: string
  completed_at: string | null
  language: Lang
  stars_earned: number
  children: { name: string; avatar_url: string | null } | null
  missions: { category_slug: string; mission_versions: { language: Lang; title: string }[] } | null
}

const accent = ACCENT.emerald

import { DollarSign } from 'lucide-react'

const TABS = [
  { key: 'overview',     label: 'Overview',     icon: BarChart3 },
  { key: 'revenue',      label: 'Revenue',       icon: DollarSign },
  { key: 'learners',     label: 'Learners',      icon: Users },
  { key: 'curriculum',   label: 'Curriculum',    icon: Layers },
  { key: 'languages',    label: 'Languages',     icon: Globe },
  { key: 'achievements', label: 'Achievements',  icon: Award },
  { key: 'content',      label: 'Content',       icon: FileText },
] as const

type TabKey = typeof TABS[number]['key']

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

function initials(name: string) {
  return name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()
}

function Avatar({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  if (avatarUrl && avatarUrl.startsWith('http')) {
    return <img src={avatarUrl} alt={name} className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-white shadow-sm"  loading="lazy" />
  }
  if (avatarUrl) {
    return (
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-base ${accent.tile}`}>
        <span className="leading-none">{avatarUrl}</span>
      </div>
    )
  }
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs ${accent.tile}`}>
      {initials(name)}
    </div>
  )
}

function missionTitle(row: ProgressRow) {
  const versions = row.missions?.mission_versions ?? []
  return versions.find(v => v.language === row.language)?.title ?? versions[0]?.title ?? 'Mission'
}

export default function AnalyticsManager({ onNavigate, onOpenSidebar }: AnalyticsManagerProps) {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [rows, setRows] = useState<ProgressRow[]>([])
  const [totalChildren, setTotalChildren] = useState(0)
  const [langFilter, setLangFilter] = useState<'all' | Lang>('all')
  const [tab, setTab] = useState<TabKey>('overview')

  const [children, setChildren] = useState<AdminChildRow[]>([])
  const [achievements, setAchievements] = useState<ChildAchievement[]>([])
  const [missionVersions, setMissionVersions] = useState<AdminMissionVersionRow[]>([])
  const [levelMissions, setLevelMissions] = useState<LevelMissionRow[]>([])
  const [languageSwitches, setLanguageSwitches] = useState<AdminLanguageSwitchRow[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [
        { data: progress, error: progressErr },
        { data: childrenRows, error: childrenErr },
        { data: achievementRows, error: achievementsErr },
        { data: versionRows, error: versionsErr },
        { data: levelMissionRows, error: levelMissionsErr },
        { data: switchRows, error: switchesErr },
      ] = await Promise.all([
        supabase
          .from('child_progress')
          .select('id, child_id, mission_id, completed_at, language, stars_earned, children(name, avatar_url), missions(category_slug, mission_versions(title, language))')
          .order('completed_at', { ascending: false }),
        supabase.from('children').select('id, language, created_at'),
        supabase.from('child_achievements').select('id, child_id, language, type, slug, earned_at'),
        supabase.from('mission_versions').select('mission_id, language, status'),
        supabase.from('level_missions').select('level_number, category_slug, mission_id'),
        supabase.from('language_switch_log').select('child_id, from_language, to_language, switched_at'),
      ])
      if (progressErr) throw progressErr
      if (childrenErr) throw childrenErr
      if (achievementsErr) throw achievementsErr
      if (versionsErr) throw versionsErr
      if (levelMissionsErr) throw levelMissionsErr
      if (switchesErr) throw switchesErr

      setRows((progress ?? []) as unknown as ProgressRow[])
      setTotalChildren((childrenRows ?? []).length)
      setChildren((childrenRows ?? []) as unknown as AdminChildRow[])
      setAchievements((achievementRows ?? []) as unknown as ChildAchievement[])
      setMissionVersions((versionRows ?? []) as unknown as AdminMissionVersionRow[])
      setLevelMissions((levelMissionRows ?? []) as unknown as LevelMissionRow[])
      setLanguageSwitches((switchRows ?? []) as unknown as AdminLanguageSwitchRow[])
    } catch (err) {
      console.error(err)
      setLoadError(err instanceof Error ? err.message : 'Failed to load analytics.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const adminProgress = useMemo<AdminProgressRow[]>(() => {
    return rows
      .filter(r => r.completed_at && r.missions?.category_slug)
      .map(r => ({
        child_id: r.child_id,
        language: r.language,
        category: r.missions!.category_slug as ActivityCategory,
        mission_id: r.mission_id,
        stars_earned: r.stars_earned,
        completed_at: r.completed_at as string,
      }))
  }, [rows])

  const learnerAnalytics = useMemo(() => computeLearnerAnalytics(children, adminProgress), [children, adminProgress])
  const curriculumAnalytics = useMemo(() => computeCurriculumAnalytics(adminProgress, levelMissions), [adminProgress, levelMissions])
  const languageAnalytics = useMemo(() => computeLanguageAnalytics(children, adminProgress, languageSwitches), [children, adminProgress, languageSwitches])
  const achievementAnalytics = useMemo(() => computeAchievementAnalytics(achievements), [achievements])
  const contentAnalytics = useMemo(() => computeContentAnalytics(missionVersions), [missionVersions])

  const handleExportFullReport = useCallback(() => {
    exportXLSX('nimipiko-analytics-report.xlsx', [
      { name: 'Learners', rows: [
        { metric: 'Total Learners', value: learnerAnalytics.totalLearners },
        { metric: 'Active Learners', value: learnerAnalytics.activeLearners },
        { metric: 'Daily Active Learners', value: learnerAnalytics.dailyActiveLearners },
        { metric: 'Weekly Active Learners', value: learnerAnalytics.weeklyActiveLearners },
      ] },
      { name: 'Curriculum Levels', rows: curriculumAnalytics.levelStats.map(s => ({
        level: s.level, reached: s.reached, completed: s.completed, completion_rate_pct: Math.round(s.completionRate * 100),
      })) },
      { name: 'Curriculum Categories', rows: curriculumAnalytics.categoryStats.map(c => ({
        category: c.category, learners: c.learners, completion_rate_pct: Math.round(c.completionRate * 100),
      })) },
      { name: 'Languages', rows: languageAnalytics.usage.map(u => ({
        language: u.language, active_children: u.activeChildren, learners: u.learners, completions: u.completions,
      })) },
      { name: 'Language Switches', rows: languageAnalytics.topSwitchPairs.map(p => ({
        from: p.from, to: p.to, count: p.count,
      })) },
      { name: 'Certificates', rows: achievementAnalytics.certificatesBySlug.map(s => ({ slug: s.slug, count: s.count })) },
      { name: 'Badges', rows: achievementAnalytics.badgesBySlug.map(s => ({ slug: s.slug, count: s.count })) },
      { name: 'Content Status', rows: CONTENT_STATUSES.map(status => ({
        status, count: contentAnalytics.statusCounts[status],
      })) },
      { name: 'Translation Coverage', rows: contentAnalytics.translationCoverage.map(c => ({
        language: c.language, published: c.published, total_missions: c.totalMissions, coverage_pct: Math.round(c.pct),
      })) },
    ])
  }, [learnerAnalytics, curriculumAnalytics, languageAnalytics, achievementAnalytics, contentAnalytics])

  const totalCompletions = rows.length
  const totalStars = rows.reduce((sum, r) => sum + r.stars_earned, 0)
  const activeLearners = new Set(rows.map(r => r.child_id)).size
  const avgStars = totalCompletions ? totalStars / totalCompletions : 0

  const activityTrend = useMemo(() => {
    const days: { dateKey: string; label: string; full: string; count: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      days.push({
        dateKey: d.toISOString().slice(0, 10),
        label: String(d.getDate()),
        full: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        count: 0,
      })
    }
    for (const row of rows) {
      if (!row.completed_at) continue
      const key = row.completed_at.slice(0, 10)
      const day = days.find(d => d.dateKey === key)
      if (day) day.count += 1
    }
    return days
  }, [rows])

  const maxTrendCount = Math.max(1, ...activityTrend.map(d => d.count))

  const categoryCoverage = useMemo(() => {
    return CATEGORY_ORDER.map(slug => {
      const counts: Record<Lang, number> = { en: 0, fr: 0, rw: 0 }
      let stars = 0
      for (const row of rows) {
        if (row.missions?.category_slug === slug) {
          counts[row.language] += 1
          stars += row.stars_earned
        }
      }
      return { slug, counts, stars }
    })
  }, [rows])

  const languageBreakdown = useMemo(() => {
    return LANGUAGES.map(lang => {
      const langRows = rows.filter(r => r.language === lang)
      const stars = langRows.reduce((sum, r) => sum + r.stars_earned, 0)
      const pct = totalCompletions ? Math.round((langRows.length / totalCompletions) * 100) : 0
      return { lang, count: langRows.length, stars, pct }
    })
  }, [rows, totalCompletions])

  const topLearners = useMemo(() => {
    const map = new Map<string, { name: string; avatar_url: string | null; completions: number; stars: number }>()
    for (const row of rows) {
      const entry = map.get(row.child_id) ?? {
        name: row.children?.name ?? 'Unknown',
        avatar_url: row.children?.avatar_url ?? null,
        completions: 0,
        stars: 0,
      }
      entry.completions += 1
      entry.stars += row.stars_earned
      map.set(row.child_id, entry)
    }
    return Array.from(map.entries())
      .map(([child_id, v]) => ({ child_id, ...v }))
      .sort((a, b) => b.stars - a.stars)
      .slice(0, 10)
  }, [rows])

  const filteredRows = useMemo(() => {
    return rows.filter(r => langFilter === 'all' || r.language === langFilter).slice(0, 30)
  }, [rows, langFilter])

  if (loading) {
    return (
      <div>
        <SkeletonHeaderBanner />
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
          <SkeletonStatCards count={4} cols="sm:grid-cols-4" />
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-3 w-56 mb-4" />
            <SkeletonBarChart />
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <Skeleton className="h-5 w-56 mb-4" />
            <SkeletonTable rows={6} cols={6} />
          </div>
          <div>
            <Skeleton className="h-6 w-56 mb-4" />
            <SkeletonCardGrid count={3} cols="sm:grid-cols-3" />
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <Skeleton className="h-5 w-32 mb-4" />
            <SkeletonList rows={5} />
          </div>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-400 flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-gray-700">Couldn&apos;t load analytics</p>
        <p className="text-xs text-gray-400 mt-1 max-w-sm">{loadError}</p>
        <button
          onClick={fetchData}
          className={`mt-4 inline-flex items-center gap-2 text-white text-xs font-bold px-4 py-2 rounded-full transition ${accent.button}`}
        >
          <RefreshCw className="w-3.5 h-3.5" /> Try again
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5 flex-shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenSidebar}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-gray-500"
            >
              <Menu size={17} />
            </button>
            <div>
              <h1 className="text-[22px] font-extrabold text-gray-900">Analytics &amp; Insights</h1>
              <p className="text-[13px] text-gray-500">Engagement trends and learning progress across NIMIPIKO</p>
            </div>
          </div>
          <button
            onClick={handleExportFullReport}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 px-3.5 py-2 rounded-full shadow-sm hover:bg-gray-50 transition whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export Full Report (XLSX)
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto mt-4">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-bold transition whitespace-nowrap ${
                tab === t.key ? `text-white shadow-sm ${accent.button}` : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
        {tab === 'revenue' && <RevenueAnalyticsTab />}
        {tab === 'learners' && <LearnerAnalyticsTab analytics={learnerAnalytics} />}
        {tab === 'curriculum' && <CurriculumAnalyticsTab analytics={curriculumAnalytics} />}
        {tab === 'languages' && <LanguageAnalyticsTab analytics={languageAnalytics} />}
        {tab === 'achievements' && <AchievementAnalyticsTab analytics={achievementAnalytics} />}
        {tab === 'content' && <ContentAnalyticsTab analytics={contentAnalytics} />}
        {tab === 'overview' && (
        <>
        {/* Overview stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={Sparkles} label="Missions Completed" value={totalCompletions} accentKey="emerald" />
          <StatCard icon={Star} label="Stars Earned" value={totalStars} accentKey="amber" />
          <StatCard icon={Users} label="Active Learners" value={`${activeLearners}/${totalChildren}`} accentKey="emerald" />
          <StatCard icon={TrendingUp} label="Avg Stars / Mission" value={avgStars.toFixed(1)} accentKey="teal" />
        </div>

        {/* Activity Trend */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-bold text-gray-800 mb-1">Activity Trend</h3>
          <p className="text-gray-500 text-sm mb-4">Missions completed per day, last 14 days</p>
          <div className="flex items-end gap-1.5 h-32">
            {activityTrend.map(day => (
              <div key={day.dateKey} className="flex-1 h-full flex flex-col items-center justify-end gap-1.5">
                <div
                  title={`${day.count} completion${day.count === 1 ? '' : 's'} on ${day.full}`}
                  className={`w-full rounded-t-md transition-all ${day.count > 0 ? accent.button.split(' ')[0] : 'bg-gray-100'}`}
                  style={{ height: `${Math.max((day.count / maxTrendCount) * 100, day.count > 0 ? 8 : 2)}%` }}
                />
                <span className="text-[10px] text-gray-400">{day.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Completions by Category */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-bold text-gray-800 mb-1">Completions by Category</h3>
          <p className="text-gray-500 text-sm mb-4">Missions completed per category, by language</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 text-xs font-bold uppercase tracking-wide border-b border-gray-100">
                  <th className="py-2 pr-2">Category</th>
                  <th className="py-2 px-2 text-center">EN</th>
                  <th className="py-2 px-2 text-center">FR</th>
                  <th className="py-2 px-2 text-center">RW</th>
                  <th className="py-2 px-2 text-center">Stars</th>
                  <th className="py-2 pl-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {categoryCoverage.map(row => {
                  const meta = CATEGORY_META[row.slug] ?? FALLBACK_META
                  const rowAccent = ACCENT[meta.accent]
                  return (
                    <tr key={row.slug}>
                      <td className="py-2.5 pr-2">
                        <div className="flex items-center gap-2 font-semibold text-gray-700">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${rowAccent.tile}`}>
                            <meta.icon className="w-3.5 h-3.5" />
                          </div>
                          {meta.label}
                        </div>
                      </td>
                      {LANGUAGES.map(lang => (
                        <td key={lang} className="py-2.5 px-2 text-center font-bold text-gray-700">
                          {row.counts[lang]}
                        </td>
                      ))}
                      <td className="py-2.5 px-2 text-center font-bold text-gray-700">
                        {row.stars} ⭐
                      </td>
                      <td className="py-2.5 pl-2 text-right">
                        <button
                          onClick={() => onNavigate(`mission:${row.slug}`)}
                          className={`text-xs font-bold text-white px-3 py-1.5 rounded-full transition whitespace-nowrap ${rowAccent.button}`}
                        >
                          View Missions
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Completions by Language */}
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-4">Completions by Language</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {languageBreakdown.map(({ lang, count, stars, pct }) => {
              const meta = LANGUAGE_META[lang]
              return (
                <div key={lang} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${accent.tile}`}>
                      <Globe className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-gray-800">{meta.flag} {meta.label}</span>
                  </div>
                  <p className="text-3xl font-extrabold text-gray-800 mb-1">{count}</p>
                  <p className="text-xs text-gray-500">{stars}⭐ earned · {pct}% of all completions</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top Learners */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-bold text-gray-800 mb-4">Top Learners</h3>
          {topLearners.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-4">No activity yet.</p>
          ) : (
            <div className="space-y-2">
              {topLearners.map((learner, i) => (
                <div key={learner.child_id} className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 hover:bg-gray-50 transition">
                  <span className="w-7 flex-shrink-0 text-center text-lg">
                    {i < 3 ? ['🥇', '🥈', '🥉'][i] : <span className="text-sm font-bold text-gray-400">#{i + 1}</span>}
                  </span>
                  <Avatar avatarUrl={learner.avatar_url} name={learner.name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{learner.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {learner.completions} mission{learner.completions === 1 ? '' : 's'} · {learner.stars}⭐
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigate(`children:${learner.child_id}`)}
                    className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-100 transition whitespace-nowrap"
                  >
                    View Profile <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <h3 className="text-base font-bold text-gray-800">Recent Activity</h3>
            <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
              <button
                onClick={() => setLangFilter('all')}
                className={`text-xs font-bold px-3 py-1 rounded-full transition ${
                  langFilter === 'all' ? `text-white ${accent.button}` : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All
              </button>
              {LANGUAGES.map(lang => (
                <button
                  key={lang}
                  onClick={() => setLangFilter(lang)}
                  className={`text-xs font-bold px-3 py-1 rounded-full transition ${
                    langFilter === lang ? `text-white ${accent.button}` : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {LANGUAGE_META[lang].flag}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {filteredRows.map(row => {
              const meta = CATEGORY_META[row.missions?.category_slug ?? ''] ?? FALLBACK_META
              const rowAccent = ACCENT[meta.accent]
              return (
                <div key={row.id} className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 hover:bg-gray-50 transition">
                  <Avatar avatarUrl={row.children?.avatar_url ?? null} name={row.children?.name ?? '?'} />
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${rowAccent.tile}`}>
                    <meta.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{row.children?.name ?? 'Unknown learner'}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {missionTitle(row)} · {LANGUAGE_META[row.language].flag} · {row.stars_earned}⭐ · {row.completed_at ? timeAgo(row.completed_at) : '—'}
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigate(`children:${row.child_id}`)}
                    className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-100 transition whitespace-nowrap"
                  >
                    View Learner <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              )
            })}
            {filteredRows.length === 0 && (
              <div className="py-8 text-center text-gray-400 text-sm">No completions yet.</div>
            )}
          </div>
        </div>
        </>
        )}
      </div>
      </div>
    </div>
  )
}
