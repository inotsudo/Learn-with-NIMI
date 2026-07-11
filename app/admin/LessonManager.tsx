'use client'
import React, { useCallback, useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import { AlertCircle, Download, RefreshCw } from 'lucide-react'
import {
  ACCENT, CATEGORY_ORDER, CATEGORY_META, FALLBACK_META,
  STATUS_META, COVERAGE_META, currentVersion, translationCoverage,
  type MissionRow,
} from './missionMeta'
import { Skeleton, SkeletonTable } from './Skeleton'
import { exportXLSX } from './exportUtils'

interface LessonManagerProps {
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

const accent = ACCENT.green

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function lastUpdated(m: MissionRow): string | null {
  if (!m.mission_versions || m.mission_versions.length === 0) return null
  return m.mission_versions.reduce((max, v) => (v.created_at > max ? v.created_at : max), m.mission_versions[0].created_at)
}

export default function LessonManager({ onNavigate }: LessonManagerProps) {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [levels, setLevels] = useState<LevelRow[]>([])
  const [unitsByLevel, setUnitsByLevel] = useState<Record<number, UnitPill[]>>({})
  const [slots, setSlots] = useState<Record<string, string>>({})
  const [missionsById, setMissionsById] = useState<Record<string, MissionRow>>({})
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const handleExportUnit = async (level: number, unit: number, unitTitle: string) => {
    setExporting(true)
    setExportError(null)
    try {
      const { data, error } = await supabase.rpc('export_unit_content', { p_level_number: level, p_unit_number: unit })
      if (error) throw error
      const rows = (data as { rows: Record<string, unknown>[] }).rows ?? []
      if (rows.length === 0) {
        setExportError('No published content to export for this unit.')
        return
      }
      const filename = `level${level}-unit${unit}${unitTitle ? `-${unitTitle.toLowerCase().replace(/\s+/g, '-')}` : ''}.xlsx`
      exportXLSX(filename, [{ name: `L${level} U${unit}`, rows }])
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed.')
    } finally {
      setExporting(false)
    }
  }

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
        supabase.from('missions').select('id, active, mission_versions(language, title, status, is_current, created_at)'),
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
      setLoadError(err instanceof Error ? err.message : 'Failed to load lessons.')
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
        <Skeleton className="h-10 w-full rounded-full" />
        <SkeletonTable rows={CATEGORY_ORDER.length} cols={4} />
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
          <p className="text-sm font-bold text-gray-700">Couldn&apos;t load lessons</p>
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

  const filledCount = (level: number, unit: number) =>
    CATEGORY_ORDER.filter(slug => slots[`${level}:${unit}:${slug}`]).length

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-gray-800">Lessons</h3>
        <p className="text-gray-500 text-sm">Pick a Level and Unit to see its 8 daily-adventure lessons, their language coverage, status and when they were last edited — gaps show up as &ldquo;Missing&rdquo;.</p>
      </div>

      {levels.length === 0 ? (
        <div className="text-center text-gray-400 text-sm py-8">No curriculum levels yet — add one from the Levels tab first.</div>
      ) : (
        <>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {levels.map(lvl => (
              <button
                key={lvl.level_number}
                onClick={() => { setSelectedLevel(lvl.level_number); setSelectedUnit(null) }}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-bold transition whitespace-nowrap ${
                  activeLevel === lvl.level_number ? `text-white shadow-sm ${accent.button}` : 'text-gray-500 bg-white border border-gray-100 hover:bg-gray-50'
                }`}
              >
                Level {lvl.level_number}
                {lvl.framework_name && (
                  <span className={activeLevel === lvl.level_number ? 'opacity-80' : 'text-gray-400'}> · {lvl.framework_name}</span>
                )}
              </button>
            ))}
          </div>

          {unitsForLevel.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-8">No units yet for Level {activeLevel} — add one from the Units tab first.</div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {unitsForLevel.map(u => {
                  const filled = filledCount(activeLevel, u.unit_number)
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
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        isActive ? 'bg-white/20' : filled < CATEGORY_ORDER.length ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {filled}/{CATEGORY_ORDER.length}
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
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-semibold">
                        {filledCount(activeLevel, activeUnit)}/{CATEGORY_ORDER.length} lessons defined
                      </span>
                      <button
                        onClick={() => handleExportUnit(activeLevel, activeUnit, activeUnitMeta?.title ?? '')}
                        disabled={exporting}
                        className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-white border border-gray-100 text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
                        title="Export published content for this unit as XLSX"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {exporting ? 'Exporting…' : 'Export Unit'}
                      </button>
                    </div>
                  </div>
                  {exportError && (
                    <p className="text-xs text-red-500 font-semibold">{exportError}</p>
                  )}

                  <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-400 text-xs font-bold uppercase tracking-wide border-b border-gray-100">
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Language Coverage</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Last Updated</th>
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
                                <td className="py-2.5 px-3" colSpan={3}>
                                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-500">
                                    🚫 Missing
                                  </span>
                                </td>
                              </tr>
                            )
                          }

                          const coverage = translationCoverage(mission)
                          const en = currentVersion(mission, 'en')
                          const status = en?.status ?? 'draft'
                          const updated = lastUpdated(mission)

                          return (
                            <tr
                              key={slug}
                              onClick={() => onNavigate(`mission:${slug}:${mission.id}`)}
                              className="cursor-pointer hover:bg-gray-50 transition"
                            >
                              <td className="py-2.5 px-3">{categoryCell}</td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${COVERAGE_META[coverage.level].badge}`}>
                                  {COVERAGE_META[coverage.level].label}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_META[status].badge}`}>
                                  {STATUS_META[status].label}
                                </span>
                                {!mission.active && (
                                  <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-400">
                                    Inactive
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-gray-500">{formatDate(updated)}</td>
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
