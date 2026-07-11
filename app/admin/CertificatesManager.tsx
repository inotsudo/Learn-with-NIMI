'use client'
import React, { useEffect, useState, useMemo, useCallback } from 'react'
import supabase from '@/lib/supabaseClient'
import {
  Award, Menu, ChevronDown, Trophy, Medal, Users, Sparkles, ArrowUpRight, AlertCircle, RefreshCw,
} from 'lucide-react'
import { ACCENT, LANGUAGES, LANGUAGE_META, CATEGORY_ORDER, CATEGORY_META, FALLBACK_META, type Lang, type AccentKey } from './missionMeta'
import { Skeleton, SkeletonHeaderBanner, SkeletonStatCards, SkeletonTable, SkeletonCardGrid, SkeletonList } from './Skeleton'

interface CertificatesManagerProps {
  onNavigate: (table: string) => void
  onOpenSidebar?: () => void
}

interface AchievementRow {
  id: string
  child_id: string
  language: Lang
  type: string
  slug: string
  earned_at: string | null
  children: { name: string; avatar_url: string | null } | null
}

const accent = ACCENT.amber

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
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

function describeAchievement(row: { type: string; slug: string; language: string }) {
  if (row.type === 'certificate') {
    return { label: 'Program Completion Certificate', icon: Award, accentKey: 'amber' as AccentKey }
  }
  const categorySlug = row.slug.replace(`-master-${row.language}`, '')
  const meta = CATEGORY_META[categorySlug] ?? FALLBACK_META
  return { label: `${meta.label} Master`, icon: meta.icon, accentKey: meta.accent }
}

function StatCard({ icon: Icon, label, value, accentKey }: { icon: React.ElementType; label: string; value: number; accentKey: AccentKey }) {
  const a = ACCENT[accentKey]
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${a.tile}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-extrabold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
    </div>
  )
}

export default function CertificatesManager({ onNavigate, onOpenSidebar }: CertificatesManagerProps) {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [admin, setAdmin] = useState<{ name: string; role: string } | null>(null)
  const [rows, setRows] = useState<AchievementRow[]>([])
  const [totalChildren, setTotalChildren] = useState(0)
  const [typeFilter, setTypeFilter] = useState<'all' | 'badge' | 'certificate'>('all')
  const [langFilter, setLangFilter] = useState<'all' | Lang>('all')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('admins').select('name, role').eq('id', user.id).maybeSingle()
        if (data) setAdmin({ name: data.name ?? 'Admin', role: data.role ?? 'admin' })
      }
    }
    init()
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [
        { data: achievements, error: achievementsErr },
        { data: children, error: childrenErr },
      ] = await Promise.all([
        supabase
          .from('child_achievements')
          .select('id, child_id, language, type, slug, earned_at, children(name, avatar_url)')
          .order('earned_at', { ascending: false }),
        supabase.from('children').select('id'),
      ])
      if (achievementsErr) throw achievementsErr
      if (childrenErr) throw childrenErr

      setRows((achievements ?? []) as unknown as AchievementRow[])
      setTotalChildren((children ?? []).length)
    } catch (err) {
      console.error(err)
      setLoadError(err instanceof Error ? err.message : 'Failed to load achievements.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const totalEarned = rows.length
  const totalBadges = rows.filter(r => r.type === 'badge').length
  const totalCertificates = rows.filter(r => r.type === 'certificate').length
  const uniqueLearners = new Set(rows.map(r => r.child_id)).size

  const categoryCoverage = useMemo(() => {
    return CATEGORY_ORDER.map(slug => {
      const counts: Record<Lang, number> = { en: 0, fr: 0, rw: 0 }
      for (const lang of LANGUAGES) {
        const targetSlug = `${slug}-master-${lang}`
        counts[lang] = new Set(
          rows.filter(r => r.type === 'badge' && r.language === lang && r.slug === targetSlug).map(r => r.child_id)
        ).size
      }
      return { slug, counts }
    })
  }, [rows])

  const programCerts = useMemo(() => {
    return LANGUAGES.map(lang => ({
      lang,
      count: new Set(
        rows.filter(r => r.type === 'certificate' && r.language === lang && r.slug === `program-complete-${lang}`).map(r => r.child_id)
      ).size,
    }))
  }, [rows])

  const filteredRows = useMemo(() => {
    return rows
      .filter(r => (typeFilter === 'all' || r.type === typeFilter) && (langFilter === 'all' || r.language === langFilter))
      .slice(0, 30)
  }, [rows, typeFilter, langFilter])

  if (loading) {
    return (
      <div>
        <SkeletonHeaderBanner />
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
          <SkeletonStatCards count={4} cols="sm:grid-cols-4" />
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <Skeleton className="h-5 w-56 mb-4" />
            <SkeletonTable rows={6} cols={5} />
          </div>
          <div>
            <Skeleton className="h-6 w-64 mb-4" />
            <SkeletonCardGrid count={3} cols="sm:grid-cols-3" />
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <Skeleton className="h-5 w-40 mb-4" />
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
        <p className="text-sm font-bold text-gray-700">Couldn&apos;t load achievements</p>
        <p className="text-xs text-gray-400 mt-1 max-w-sm">{loadError}</p>
        <button
          onClick={fetchData}
          className="mt-4 inline-flex items-center gap-2 text-white text-xs font-bold px-4 py-2 rounded-full transition bg-green-600 hover:bg-green-700"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Try again
        </button>
      </div>
    )
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
              <Award className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                Certificates &amp; Achievements <span className="text-lg">🏅</span>
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">
                Category-mastery badges &amp; program-completion certificates earned by learners
              </p>
              <p className="text-xs text-gray-400 mt-1.5">
                <button onClick={() => onNavigate('Dashboard')} className="font-bold hover:underline text-green-600">Dashboard</button>
                <span className="mx-1.5 text-gray-300">/</span>
                <span className="font-bold text-gray-500">Certificates</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-100 pl-1.5 pr-3 py-1.5 rounded-full shadow-sm">
            <img src="/nimi-logo-circle.png" alt="Profile" className="w-7 h-7 rounded-full object-cover flex-shrink-0 ring-2 ring-white"  loading="lazy" />
            <div className="hidden sm:block leading-tight">
              <p className="text-sm font-semibold text-gray-700">{admin?.name ?? 'Admin'}</p>
              <p className="text-[10px] text-gray-400 uppercase font-bold">{admin?.role ?? 'admin'}</p>
            </div>
            <ChevronDown size={14} className="text-gray-400" />
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
        {/* Overview stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={Sparkles} label="Total Earned" value={totalEarned} accentKey="amber" />
          <StatCard icon={Medal} label="Category Badges" value={totalBadges} accentKey="violet" />
          <StatCard icon={Trophy} label="Program Certificates" value={totalCertificates} accentKey="emerald" />
          <StatCard icon={Users} label="Learners w/ Achievements" value={uniqueLearners} accentKey="pink" />
        </div>

        {/* Category Mastery Badges */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-bold text-gray-800 mb-1">Category Mastery Badges</h3>
          <p className="text-gray-500 text-sm mb-4">
            Learners who completed every mission in a category, per language ({totalChildren} learner{totalChildren === 1 ? '' : 's'} total)
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 text-xs font-bold uppercase tracking-wide border-b border-gray-100">
                  <th className="py-2 pr-2">Category</th>
                  <th className="py-2 px-2 text-center">EN</th>
                  <th className="py-2 px-2 text-center">FR</th>
                  <th className="py-2 px-2 text-center">RW</th>
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
                          {row.counts[lang]}/{totalChildren}
                        </td>
                      ))}
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

        {/* Program Completion Certificates */}
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-4">Program Completion Certificates</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {programCerts.map(({ lang, count }) => {
              const meta = LANGUAGE_META[lang]
              return (
                <div key={lang} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${accent.tile}`}>
                      <Award className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-gray-800">{meta.flag} {meta.label}</span>
                  </div>
                  <p className="text-3xl font-extrabold text-gray-800 mb-1">{count}/{totalChildren}</p>
                  <p className="text-xs text-gray-500">learners completed the full program</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recently Earned */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <h3 className="text-base font-bold text-gray-800">Recently Earned</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
                {(['all', 'badge', 'certificate'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`text-xs font-bold px-3 py-1 rounded-full transition ${
                      typeFilter === t ? 'text-white bg-green-600 hover:bg-green-700' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t === 'all' ? 'All' : t === 'badge' ? 'Badges' : 'Certificates'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
                <button
                  onClick={() => setLangFilter('all')}
                  className={`text-xs font-bold px-3 py-1 rounded-full transition ${
                    langFilter === 'all' ? 'text-white bg-green-600 hover:bg-green-700' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  All
                </button>
                {LANGUAGES.map(lang => (
                  <button
                    key={lang}
                    onClick={() => setLangFilter(lang)}
                    className={`text-xs font-bold px-3 py-1 rounded-full transition ${
                      langFilter === lang ? 'text-white bg-green-600 hover:bg-green-700' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {LANGUAGE_META[lang].flag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {filteredRows.map(row => {
              const desc = describeAchievement(row)
              const descAccent = ACCENT[desc.accentKey]
              return (
                <div key={row.id} className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 hover:bg-gray-50 transition">
                  <Avatar avatarUrl={row.children?.avatar_url ?? null} name={row.children?.name ?? '?'} />
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${descAccent.tile}`}>
                    <desc.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{row.children?.name ?? 'Unknown learner'}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {desc.label} · {LANGUAGE_META[row.language].flag} · {formatDate(row.earned_at)}
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
              <div className="py-8 text-center text-gray-400 text-sm">No achievements match these filters yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
