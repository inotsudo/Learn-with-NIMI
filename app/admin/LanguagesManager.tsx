'use client'
import React, { useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import {
  Menu, PenTool,
} from 'lucide-react'
import { ACCENT, LANGUAGES, LANGUAGE_META, CATEGORY_ORDER, CATEGORY_META, FALLBACK_META, CONTENT_STATUSES, STATUS_META, type Lang, type ContentStatus } from './missionMeta'
import { Skeleton, SkeletonStatCards, SkeletonTable } from './Skeleton'

interface LanguagesManagerProps {
  onNavigate: (table: string) => void
  onOpenSidebar?: () => void
}

interface MissionCoverageRow {
  categorySlug: string
  label: string
  total: number
  published: Record<Lang, number>
}

interface StoryCoverageRow {
  id: string
  title: string
  themeEmoji: string | null
  totalPages: number
  covered: Record<Lang, number>
}

function coverageColor(published: number, total: number) {
  if (total === 0) return 'text-gray-400'
  if (published === 0) return 'text-red-500'
  if (published === total) return 'text-emerald-600'
  return 'text-amber-600'
}

// Inline interfaces for Supabase join shapes
interface MissionVersionRow {
  language: Lang
  published: boolean
  status: ContentStatus
}

interface StoryPageVersionRow {
  language: Lang
  text: string | null
  audio_url: string | null
  published: boolean
}

interface StoryPageRow {
  id: string
  story_page_versions: StoryPageVersionRow[]
}

interface StoryDataRow {
  id: string
  title: string
  theme_emoji: string | null
  sort_order: number | null
  story_pages: StoryPageRow[]
}

export default function LanguagesManager({ onNavigate, onOpenSidebar }: LanguagesManagerProps) {
  const [loading, setLoading] = useState(true)
  const [missionRows, setMissionRows] = useState<MissionCoverageRow[]>([])
  const [storyRows, setStoryRows] = useState<StoryCoverageRow[]>([])
  const [workflowCounts, setWorkflowCounts] = useState<Record<Lang, Record<ContentStatus, number>>>({
    en: { draft: 0, review: 0, published: 0, archived: 0 },
    fr: { draft: 0, review: 0, published: 0, archived: 0 },
    rw: { draft: 0, review: 0, published: 0, archived: 0 },
  })

  const accent = ACCENT.sky

  useEffect(() => {
    const fetchCoverage = async () => {
      setLoading(true)
      try {
      const [{ data: missions }, { data: stories }] = await Promise.all([
        supabase.from('missions').select('id, category_slug, mission_versions(language, published, status)').order('category_slug'),
        supabase.from('stories').select('id, title, theme_emoji, sort_order, story_pages(id, story_page_versions(language, text, audio_url, published))').order('sort_order'),
      ])

      const grouped: Record<string, { total: number; published: Record<Lang, number> }> = {}
      const workflow: Record<Lang, Record<ContentStatus, number>> = {
        en: { draft: 0, review: 0, published: 0, archived: 0 },
        fr: { draft: 0, review: 0, published: 0, archived: 0 },
        rw: { draft: 0, review: 0, published: 0, archived: 0 },
      }
      for (const m of missions ?? []) {
        const slug = m.category_slug as string
        if (!grouped[slug]) grouped[slug] = { total: 0, published: { en: 0, fr: 0, rw: 0 } }
        grouped[slug].total += 1
        const versions = (m.mission_versions ?? []) as MissionVersionRow[]
        for (const lang of LANGUAGES) {
          if (versions.some(v => v.language === lang && v.published)) grouped[slug].published[lang] += 1
          const status = (versions.find(v => v.language === lang)?.status ?? 'draft') as ContentStatus
          workflow[lang][status] += 1
        }
      }
      setWorkflowCounts(workflow)
      setMissionRows(
        CATEGORY_ORDER
          .filter(slug => grouped[slug])
          .map(slug => ({ categorySlug: slug, label: CATEGORY_META[slug]?.label ?? slug, total: grouped[slug].total, published: grouped[slug].published }))
      )

      setStoryRows(
        (stories ?? []).map((s: StoryDataRow) => {
          const pages = s.story_pages ?? []
          const covered: Record<Lang, number> = { en: 0, fr: 0, rw: 0 }
          for (const p of pages) {
            const versions: StoryPageVersionRow[] = p.story_page_versions ?? []
            for (const lang of LANGUAGES) {
              const v = versions.find((v: StoryPageVersionRow) => v.language === lang)
              if (v?.published && (v.text || v.audio_url)) covered[lang] += 1
            }
          }
          return { id: s.id, title: s.title, themeEmoji: s.theme_emoji, totalPages: pages.length, covered }
        })
      )

      } catch (err) {
        console.error('[LanguagesManager] fetchCoverage failed:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchCoverage()
  }, [])

  const missionsTotal = missionRows.reduce((sum, r) => sum + r.total, 0)
  const pagesTotal = storyRows.reduce((sum, r) => sum + r.totalPages, 0)
  const overview = LANGUAGES.map(lang => {
    const missionsPublished = missionRows.reduce((sum, r) => sum + r.published[lang], 0)
    const pagesCovered = storyRows.reduce((sum, r) => sum + r.covered[lang], 0)
    const combinedTotal = missionsTotal + pagesTotal
    const combinedDone = missionsPublished + pagesCovered
    const pct = combinedTotal ? Math.round((combinedDone / combinedTotal) * 100) : 0
    return { lang, pct, missionsPublished, missionsTotal, pagesCovered, pagesTotal }
  })

  if (loading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        <div className="bg-white border-b border-gray-100 px-6 py-5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onOpenSidebar} className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-gray-500">
              <Menu size={17} />
            </button>
            <div className="space-y-1.5">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-4 w-80" />
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto px-6 py-6 max-w-7xl mx-auto w-full space-y-8">
          <div>
            <Skeleton className="h-6 w-48 mb-4" />
            <SkeletonStatCards count={3} cols="sm:grid-cols-3" />
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <Skeleton className="h-5 w-64 mb-4" />
            <SkeletonTable rows={6} cols={5} />
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <Skeleton className="h-5 w-64 mb-4" />
            <SkeletonTable rows={4} cols={5} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSidebar}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-gray-500"
          >
            <Menu size={17} />
          </button>
          <div>
            <h1 className="text-[22px] font-extrabold text-gray-900">Languages &amp; Translations</h1>
            <p className="text-[13px] text-gray-500">Translation coverage across English, French &amp; Kinyarwanda</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto px-6 py-6 max-w-7xl mx-auto w-full space-y-8">
        {/* Language Overview */}
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-4">Language Overview</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {overview.map(o => {
              const meta = LANGUAGE_META[o.lang]
              return (
                <div key={o.lang} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{meta.flag}</span>
                    <span className="font-bold text-gray-800">{meta.label}</span>
                  </div>
                  <p className="text-3xl font-extrabold text-gray-800 mb-2">{o.pct}%</p>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-3">
                    <div className={`h-full rounded-full ${accent.badge}`} style={{ width: `${o.pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-500">
                    {o.missionsPublished}/{o.missionsTotal} missions · {o.pagesCovered}/{o.pagesTotal} story pages
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Missions Translation Coverage */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-bold text-gray-800 mb-1">Missions Translation Coverage</h3>
          <p className="text-gray-500 text-sm mb-4">Published mission content per language, by Daily Adventure category</p>
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
                {missionRows.map(row => {
                  const meta = CATEGORY_META[row.categorySlug] ?? FALLBACK_META
                  const rowAccent = ACCENT[meta.accent]
                  return (
                    <tr key={row.categorySlug}>
                      <td className="py-2.5 pr-2">
                        <div className="flex items-center gap-2 font-semibold text-gray-700">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${rowAccent.tile}`}>
                            <meta.icon className="w-3.5 h-3.5" />
                          </div>
                          {row.label}
                        </div>
                      </td>
                      {LANGUAGES.map(lang => (
                        <td key={lang} className={`py-2.5 px-2 text-center font-bold ${coverageColor(row.published[lang], row.total)}`}>
                          {row.published[lang]}/{row.total}
                        </td>
                      ))}
                      <td className="py-2.5 pl-2 text-right">
                        <button
                          onClick={() => onNavigate(`mission:${row.categorySlug}`)}
                          className={`text-xs font-bold text-white px-3 py-1.5 rounded-full transition whitespace-nowrap ${rowAccent.button}`}
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Complete</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> In Progress</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Missing</span>
          </div>
        </div>

        {/* Content Workflow Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-bold text-gray-800 mb-1">Content Workflow Breakdown</h3>
          <p className="text-gray-500 text-sm mb-4">Mission content lifecycle status, by language</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 text-xs font-bold uppercase tracking-wide border-b border-gray-100">
                  <th className="py-2 pr-2">Language</th>
                  {CONTENT_STATUSES.map(s => (
                    <th key={s} className="py-2 px-2 text-center">{STATUS_META[s].label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {LANGUAGES.map(lang => (
                  <tr key={lang}>
                    <td className="py-2.5 pr-2 font-semibold text-gray-700">
                      <span className="mr-1.5">{LANGUAGE_META[lang].flag}</span>{LANGUAGE_META[lang].label}
                    </td>
                    {CONTENT_STATUSES.map(s => (
                      <td key={s} className="py-2.5 px-2 text-center">
                        <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_META[s].badge}`}>
                          {workflowCounts[lang][s]}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stories & FlipFlop Books Translation Coverage */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-bold text-gray-800 mb-1">Stories &amp; FlipFlop Books Translation Coverage</h3>
          <p className="text-gray-500 text-sm mb-4">Published narration text/audio per language, by story</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 text-xs font-bold uppercase tracking-wide border-b border-gray-100">
                  <th className="py-2 pr-2">Story</th>
                  <th className="py-2 px-2 text-center">Pages</th>
                  <th className="py-2 px-2 text-center">EN</th>
                  <th className="py-2 px-2 text-center">FR</th>
                  <th className="py-2 px-2 text-center">RW</th>
                  <th className="py-2 pl-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {storyRows.map(row => (
                  <tr key={row.id}>
                    <td className="py-2.5 pr-2 font-semibold text-gray-700">
                      <span className="mr-1.5">{row.themeEmoji ?? '📖'}</span>{row.title}
                    </td>
                    <td className="py-2.5 px-2 text-center text-gray-500">{row.totalPages}</td>
                    {LANGUAGES.map(lang => (
                      <td key={lang} className={`py-2.5 px-2 text-center font-bold ${coverageColor(row.covered[lang], row.totalPages)}`}>
                        {row.covered[lang]}/{row.totalPages}
                      </td>
                    ))}
                    <td className="py-2.5 pl-2 text-right">
                      <button
                        onClick={() => onNavigate(`stories:${row.id}`)}
                        className={`text-xs font-bold text-white px-3 py-1.5 rounded-full transition whitespace-nowrap ${ACCENT.blue.button}`}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
                {storyRows.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-gray-400">No stories yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Coloring Books info card */}
        <div className={`rounded-2xl border p-6 flex items-center gap-4 flex-wrap ${ACCENT.rose.soft} ${ACCENT.rose.border}`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-white ${ACCENT.rose.text}`}>
            <PenTool className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-800 mb-0.5">Coloring Books</p>
            <p className="text-sm text-gray-500">Coloring page templates are shared across all languages — no translation needed.</p>
          </div>
          <button
            onClick={() => onNavigate('coloring_pages')}
            className={`text-sm font-bold text-white px-4 py-2 rounded-full shadow-sm transition whitespace-nowrap ${ACCENT.rose.button}`}
          >
            Manage Coloring Books
          </button>
        </div>
      </div>
    </div>
  )
}

