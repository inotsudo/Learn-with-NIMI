'use client'
import React, { useCallback, useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import { AlertCircle, RefreshCw, AlertTriangle } from 'lucide-react'
import { ACCENT, CATEGORY_ORDER, CATEGORY_META, FALLBACK_META, LANGUAGES, LANGUAGE_META, MISSION_TYPES, TYPE_META, type Lang, type MissionType } from './missionMeta'
import { useToast } from './Toast'
import { Skeleton, SkeletonTable } from './Skeleton'

interface MissionVersionPub {
  language: string
  published: boolean
}

interface CategoryRow {
  slug: string
  sort_order: number
  default_type: MissionType
}

interface CategoryStats {
  total: number
  published: Record<Lang, number>
  incomplete: number
}

const accent = ACCENT.sky

export default function CategoriesOverview() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [stats, setStats] = useState<Record<string, CategoryStats>>({})
  const [savingSlug, setSavingSlug] = useState<string | null>(null)
  const { error: toastErr } = useToast()

  const fetchData = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [{ data: cats, error: catErr }, { data: missions, error: mErr }] = await Promise.all([
        supabase.from('categories').select('slug, sort_order, default_type').order('sort_order'),
        supabase.from('missions').select('id, category_slug, mission_versions(language, published)'),
      ])
      if (catErr) throw catErr
      if (mErr) throw mErr

      const next: Record<string, CategoryStats> = {}
      for (const cat of cats ?? []) {
        next[cat.slug] = { total: 0, published: { en: 0, fr: 0, rw: 0 }, incomplete: 0 }
      }
      for (const m of missions ?? []) {
        const s = next[m.category_slug]
        if (!s) continue
        s.total += 1
        const versions = (m.mission_versions as MissionVersionPub[]) ?? []
        for (const lang of LANGUAGES) {
          if (versions.some(v => v.language === lang && v.published)) s.published[lang] += 1
        }
        if (versions.length < LANGUAGES.length) s.incomplete += 1
      }

      setCategories((cats ?? []) as CategoryRow[])
      setStats(next)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load categories.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData, reloadKey])

  const handleDefaultTypeChange = async (slug: string, defaultType: MissionType) => {
    setSavingSlug(slug)
    try {
      const { error } = await supabase.from('categories').update({ default_type: defaultType }).eq('slug', slug)
      if (error) throw error
      setCategories(prev => prev.map(c => (c.slug === slug ? { ...c, default_type: defaultType } : c)))
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Failed to update default type.')
    } finally {
      setSavingSlug(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <SkeletonTable rows={CATEGORY_ORDER.length} cols={6} />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 flex flex-col items-center text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-400 flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-gray-700">Couldn&apos;t load categories</p>
          <p className="text-xs text-gray-400 mt-1">{loadError}</p>
          <button onClick={() => setReloadKey(k => k + 1)} className={`mt-4 inline-flex items-center gap-2 text-white text-xs font-bold px-4 py-2 rounded-full transition ${accent.button}`}>
            <RefreshCw className="w-3.5 h-3.5" /> Try again
          </button>
        </div>
      </div>
    )
  }

  // Preserve the canonical CATEGORY_ORDER (matches the live 8-category frontend), falling back
  // to sort_order for any category not represented there.
  const ordered = [...categories].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a.slug)
    const bi = CATEGORY_ORDER.indexOf(b.slug)
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    return a.sort_order - b.sort_order
  })

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-gray-800">Categories</h3>
        <p className="text-gray-500 text-sm">The 8 daily-adventure categories. Slug and order are fixed in the learner app — only the default mission type can be changed here.</p>
      </div>

      <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 text-xs font-bold uppercase tracking-wide border-b border-gray-100">
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3 text-center">Order</th>
              <th className="py-2.5 px-3">Default Type</th>
              <th className="py-2.5 px-3 text-center"># Missions</th>
              {LANGUAGES.map(lang => (
                <th key={lang} className="py-2.5 px-3 text-center">{LANGUAGE_META[lang].flag} Published</th>
              ))}
              <th className="py-2.5 px-3 text-center">Incomplete Sets</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {ordered.map(cat => {
              const meta = CATEGORY_META[cat.slug] ?? FALLBACK_META
              const s = stats[cat.slug] ?? { total: 0, published: { en: 0, fr: 0, rw: 0 }, incomplete: 0 }
              return (
                <tr key={cat.slug}>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center gap-2 font-semibold text-gray-700">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center ${meta.accent ? ACCENT[meta.accent].tile : ''}`}>
                        <meta.icon className="w-3.5 h-3.5" />
                      </span>
                      {meta.label}
                      <span className="text-gray-400 text-xs font-normal">{cat.slug}</span>
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center text-gray-500">{cat.sort_order}</td>
                  <td className="py-2 px-3">
                    <select
                      value={cat.default_type}
                      onChange={e => handleDefaultTypeChange(cat.slug, e.target.value as MissionType)}
                      disabled={savingSlug === cat.slug}
                      className="border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition disabled:opacity-50"
                    >
                      {MISSION_TYPES.map(t => (
                        <option key={t} value={t}>{TYPE_META[t].emoji} {TYPE_META[t].label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2.5 px-3 text-center text-gray-700 font-semibold">{s.total}</td>
                  {LANGUAGES.map(lang => (
                    <td key={lang} className="py-2.5 px-3 text-center">
                      <span className="font-semibold text-gray-700">{s.published[lang]}</span>
                      <span className="text-gray-400">/{s.total}</span>
                    </td>
                  ))}
                  <td className="py-2.5 px-3 text-center">
                    {s.incomplete > 0 ? (
                      <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-xs font-bold">
                        <AlertTriangle className="w-3 h-3" /> {s.incomplete}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">
        &ldquo;Incomplete Sets&rdquo; counts missions that don&apos;t yet have a content version (in any status) for all 3 languages. A mission with no published version in a language falls back to its English version where available — see the Languages tab for the full coverage breakdown.
      </p>
    </div>
  )
}
