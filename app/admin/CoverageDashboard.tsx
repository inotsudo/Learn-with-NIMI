'use client'
import React, { useCallback, useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import { AlertCircle, RefreshCw, Check, X } from 'lucide-react'
import {
  ACCENT, CATEGORY_ORDER, CATEGORY_META, FALLBACK_META,
  LANGUAGES, LANGUAGE_META, COVERAGE_META, currentVersion, translationCoverage,
  type MissionRow, type Lang,
} from './missionMeta'
import { Skeleton, SkeletonTable } from './Skeleton'

interface CoverageDashboardProps {
  onNavigate: (table: string) => void
}

interface LevelRow {
  level_number: number
  framework_name: string | null
  age_range_label: string | null
}

interface UnitPill {
  unit_number: number
  title: string
}

const accent = ACCENT.sky

function pctBadgeClass(pct: number) {
  if (pct >= 80) return 'bg-emerald-50 text-emerald-600'
  if (pct >= 50) return 'bg-amber-50 text-amber-600'
  return 'bg-red-50 text-red-500'
}

function hasLang(m: MissionRow, lang: Lang) {
  return (currentVersion(m, lang)?.title ?? '').trim().length > 0
}

function lessonPct(m: MissionRow | undefined): number {
  if (!m) return 0
  return Math.round((translationCoverage(m).count / LANGUAGES.length) * 100)
}

function LangBadge({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${ok ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
      {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
    </span>
  )
}

export default function CoverageDashboard({ onNavigate }: CoverageDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [levels, setLevels] = useState<LevelRow[]>([])
  const [unitsByLevel, setUnitsByLevel] = useState<Record<number, UnitPill[]>>({})
  const [slots, setSlots] = useState<Record<string, string>>({})
  const [missionsById, setMissionsById] = useState<Record<string, MissionRow>>({})
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [
        { data: levelsData, error: lvlErr },
        { data: unitsData, error: unitsErr },
        { data: lmData, error: lmErr },
        { data: missionsData, error: missionsErr },
      ] = await Promise.all([
        supabase.from('curriculum_levels').select('level_number, framework_name, age_range_label').order('level_number'),
        supabase.from('curriculum_units').select('level_number, unit_number, title'),
        supabase.from('level_missions').select('level_number, unit_number, category_slug, mission_id'),
        supabase.from('missions').select('id, mission_versions(language, title, is_current)'),
      ])
      if (lvlErr) throw lvlErr
      if (unitsErr) throw unitsErr
      if (lmErr) throw lmErr
      if (missionsErr) throw missionsErr

      const titleByKey: Record<string, string> = {}
      for (const row of unitsData ?? []) {
        titleByKey[`${row.level_number}:${row.unit_number}`] = row.title ?? ''
      }

      const unitSetByLevel: Record<number, Set<number>> = {}
      for (const row of unitsData ?? []) {
        (unitSetByLevel[row.level_number] ??= new Set()).add(row.unit_number)
      }

      const nextSlots: Record<string, string> = {}
      for (const row of lmData ?? []) {
        nextSlots[`${row.level_number}:${row.unit_number}:${row.category_slug}`] = row.mission_id
        ;(unitSetByLevel[row.level_number] ??= new Set()).add(row.unit_number)
      }

      const nextUnitsByLevel: Record<number, UnitPill[]> = {}
      for (const [levelStr, unitSet] of Object.entries(unitSetByLevel)) {
        const level = Number(levelStr)
        nextUnitsByLevel[level] = Array.from(unitSet).sort((a, b) => a - b).map(unit_number => ({
          unit_number,
          title: titleByKey[`${level}:${unit_number}`] ?? '',
        }))
      }

      const nextMissionsById: Record<string, MissionRow> = {}
      for (const m of (missionsData ?? []) as unknown as MissionRow[]) {
        nextMissionsById[m.id] = m
      }

      setLevels(levelsData ?? [])
      setUnitsByLevel(nextUnitsByLevel)
      setSlots(nextSlots)
      setMissionsById(nextMissionsById)
      setSelectedLevel(prev => {
        if (prev !== null && (levelsData ?? []).some(l => l.level_number === prev)) return prev
        return levelsData?.[0]?.level_number ?? null
      })
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load coverage data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData, reloadKey])

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-10 w-full rounded-full" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-full rounded-full" />
        <Skeleton className="h-6 w-48" />
        <SkeletonTable rows={CATEGORY_ORDER.length} cols={5} />
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
          <p className="text-sm font-bold text-gray-700">Couldn&apos;t load coverage data</p>
          <p className="text-xs text-gray-400 mt-1">{loadError}</p>
          <button onClick={() => setReloadKey(k => k + 1)} className={`mt-4 inline-flex items-center gap-2 text-white text-xs font-bold px-4 py-2 rounded-full transition ${accent.button}`}>
            <RefreshCw className="w-3.5 h-3.5" /> Try again
          </button>
        </div>
      </div>
    )
  }

  const activeLevel = selectedLevel ?? levels[0]?.level_number
  const unitsForLevel = unitsByLevel[activeLevel] ?? []
  const activeUnit = selectedUnit ?? unitsForLevel[0]?.unit_number ?? null
  const activeUnitMeta = unitsForLevel.find(u => u.unit_number === activeUnit)

  const unitPct = (level: number, unit: number) => {
    const total = CATEGORY_ORDER.reduce((sum, slug) => {
      const missionId = slots[`${level}:${unit}:${slug}`]
      const mission = missionId ? missionsById[missionId] : undefined
      return sum + lessonPct(mission)
    }, 0)
    return Math.round(total / CATEGORY_ORDER.length)
  }

  const levelPct = (level: number) => {
    const units = unitsByLevel[level] ?? []
    if (units.length === 0) return 0
    const total = units.reduce((sum, u) => sum + unitPct(level, u.unit_number), 0)
    return Math.round(total / units.length)
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-gray-800">Coverage</h3>
        <p className="text-gray-500 text-sm">See translation coverage across English, French &amp; Kinyarwanda — percentages roll up from each lesson to its Unit and Level.</p>
      </div>

      {levels.length === 0 ? (
        <div className="text-center text-gray-400 text-sm py-8">No curriculum levels yet — add one from the Levels tab first.</div>
      ) : (
        <>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {levels.map(lvl => {
              const pct = levelPct(lvl.level_number)
              const isActive = activeLevel === lvl.level_number
              return (
                <button
                  key={lvl.level_number}
                  onClick={() => { setSelectedLevel(lvl.level_number); setSelectedUnit(null) }}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-bold transition whitespace-nowrap ${
                    isActive ? `text-white shadow-sm ${accent.button}` : 'text-gray-500 bg-white border border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  Level {lvl.level_number}
                  {lvl.framework_name && (
                    <span className={isActive ? 'opacity-80' : 'text-gray-400'}> · {lvl.framework_name}</span>
                  )}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-white/20' : pctBadgeClass(pct)}`}>
                    {pct}%
                  </span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between flex-wrap gap-1">
            <h4 className="text-sm font-bold text-gray-700">Level {activeLevel}</h4>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${pctBadgeClass(levelPct(activeLevel))}`}>
              Coverage: {levelPct(activeLevel)}%
            </span>
          </div>

          {unitsForLevel.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-8">No units yet for Level {activeLevel} — add one from the Units tab first.</div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {unitsForLevel.map(u => {
                  const pct = unitPct(activeLevel, u.unit_number)
                  const isActive = activeUnit === u.unit_number
                  return (
                    <button
                      key={u.unit_number}
                      onClick={() => setSelectedUnit(u.unit_number)}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-bold transition whitespace-nowrap ${
                        isActive ? `text-white shadow-sm ${accent.button}` : 'text-gray-500 bg-white border border-gray-100 hover:bg-gray-50'
                      }`}
                    >
                      Unit {u.unit_number}
                      {u.title && (
                        <span className={isActive ? 'opacity-80' : 'text-gray-400'}> · {u.title}</span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-white/20' : pctBadgeClass(pct)}`}>
                        {pct}%
                      </span>
                    </button>
                  )
                })}
              </div>

              {activeUnit !== null && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <h4 className="text-sm font-bold text-gray-700">
                      Unit {activeUnit}{activeUnitMeta?.title ? ` · ${activeUnitMeta.title}` : ''}
                    </h4>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${pctBadgeClass(unitPct(activeLevel, activeUnit))}`}>
                      Coverage: {unitPct(activeLevel, activeUnit)}%
                    </span>
                  </div>

                  <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-400 text-xs font-bold uppercase tracking-wide border-b border-gray-100">
                          <th className="py-2.5 px-3">Category</th>
                          {LANGUAGES.map(lang => (
                            <th key={lang} className="py-2.5 px-3 text-center">{LANGUAGE_META[lang].flag} {lang.toUpperCase()}</th>
                          ))}
                          <th className="py-2.5 px-3">Coverage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {CATEGORY_ORDER.map(slug => {
                          const meta = CATEGORY_META[slug] ?? FALLBACK_META
                          const missionId = slots[`${activeLevel}:${activeUnit}:${slug}`]
                          const mission = missionId ? missionsById[missionId] : undefined

                          const categoryCell = (
                            <span className={`inline-flex items-center gap-2 font-semibold ${mission ? 'text-gray-700' : 'text-gray-400'}`}>
                              <span className={`w-7 h-7 rounded-full flex items-center justify-center ${meta.accent ? ACCENT[meta.accent].tile : ''}`}>
                                <meta.icon className="w-3.5 h-3.5" />
                              </span>
                              {meta.label}
                            </span>
                          )

                          if (!mission) {
                            return (
                              <tr key={slug}>
                                <td className="py-2.5 px-3">{categoryCell}</td>
                                {LANGUAGES.map(lang => (
                                  <td key={lang} className="py-2.5 px-3 text-center"><LangBadge ok={false} /></td>
                                ))}
                                <td className="py-2.5 px-3">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-500">0%</span>
                                </td>
                              </tr>
                            )
                          }

                          const coverage = translationCoverage(mission)
                          const pct = lessonPct(mission)

                          return (
                            <tr
                              key={slug}
                              onClick={() => onNavigate(`mission:${slug}:${mission.id}`)}
                              className="cursor-pointer hover:bg-gray-50 transition"
                            >
                              <td className="py-2.5 px-3">{categoryCell}</td>
                              {LANGUAGES.map(lang => (
                                <td key={lang} className="py-2.5 px-3 text-center"><LangBadge ok={hasLang(mission, lang)} /></td>
                              ))}
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${COVERAGE_META[coverage.level].badge}`}>
                                  {pct}%
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
