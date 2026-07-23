'use client'
import React, { useCallback, useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import { AlertCircle, RefreshCw, Rocket, ExternalLink } from 'lucide-react'
import {
  ACCENT, CATEGORY_ORDER, CATEGORY_META, FALLBACK_META,
  STATUS_META, currentVersion,
  type MissionRow,
} from './missionMeta'
import { Skeleton, SkeletonTable } from './Skeleton'
import { useConfirmDialog } from './ConfirmDialog'
import { useToast } from './Toast'

interface PublishingCenterProps {
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

function readinessClass(count: number) {
  return count === CATEGORY_ORDER.length ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
}

export default function PublishingCenter({ onNavigate }: PublishingCenterProps) {
  const { error: toastError } = useToast()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [levels, setLevels] = useState<LevelRow[]>([])
  const [unitsByLevel, setUnitsByLevel] = useState<Record<number, UnitPill[]>>({})
  const [slots, setSlots] = useState<Record<string, string>>({})
  const [missionsById, setMissionsById] = useState<Record<string, MissionRow>>({})
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null)
  const [mutatingSlug, setMutatingSlug] = useState<string | null>(null)
  const [bulkPublishing, setBulkPublishing] = useState(false)
  const { confirm, dialog } = useConfirmDialog()

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
        supabase.from('missions').select('id, mission_versions(id, language, title, status, is_current)'),
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
      setLoadError(err instanceof Error ? err.message : 'Failed to load publishing data.')
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
        <SkeletonTable rows={CATEGORY_ORDER.length} cols={3} />
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
          <p className="text-sm font-bold text-gray-700">Couldn&apos;t load publishing data</p>
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

  const publishedCount = (level: number, unit: number) =>
    CATEGORY_ORDER.filter(slug => {
      const missionId = slots[`${level}:${unit}:${slug}`]
      const mission = missionId ? missionsById[missionId] : undefined
      return mission ? currentVersion(mission, 'en')?.status === 'published' : false
    }).length

  const readyToPublish = (level: number, unit: number) =>
    CATEGORY_ORDER.filter(slug => {
      const missionId = slots[`${level}:${unit}:${slug}`]
      const mission = missionId ? missionsById[missionId] : undefined
      const en = mission ? currentVersion(mission, 'en') : undefined
      return !!en && en.status === 'review' && en.title.trim().length > 0
    })

  const setVersionStatus = async (slug: string, versionId: string, status: 'draft' | 'review') => {
    setMutatingSlug(slug)
    try {
      const { error } = await supabase.from('mission_versions').update({ status }).eq('id', versionId)
      if (error) throw error
      await fetchData()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to update status.')
    } finally {
      setMutatingSlug(null)
    }
  }

  const handlePublishOne = async (slug: string, versionId: string) => {
    setMutatingSlug(slug)
    try {
      const { error } = await supabase.rpc('publish_mission_version_revision', { p_version_id: versionId })
      if (error) throw error
      await fetchData()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to publish mission.')
    } finally {
      setMutatingSlug(null)
    }
  }

  const handlePublishAll = async () => {
    if (activeUnit === null) return
    const ready = readyToPublish(activeLevel, activeUnit)
    if (ready.length === 0) return
    const ok = await confirm({
      title: `Publish ${ready.length} lesson${ready.length === 1 ? '' : 's'}?`,
      message: `This makes ${ready.length === 1 ? 'it' : 'them'} visible to learners in Unit ${activeUnit} immediately.`,
      confirmLabel: 'Publish All',
      danger: false,
    })
    if (!ok) return
    setBulkPublishing(true)
    try {
      for (const slug of ready) {
        const missionId = slots[`${activeLevel}:${activeUnit}:${slug}`]
        const mission = missionsById[missionId]
        const en = currentVersion(mission, 'en')!
        const { error } = await supabase.rpc('publish_mission_version_revision', { p_version_id: en.id })
        if (error) throw error
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to publish lessons.')
    } finally {
      setBulkPublishing(false)
      await fetchData()
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-gray-800">Publishing</h3>
        <p className="text-gray-500 text-sm">Pick a Level and Unit to see how close it is to fully published — move lessons from Draft to In Review to Published without opening each one individually.</p>
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
                  const published = publishedCount(activeLevel, u.unit_number)
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
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-white/20' : readinessClass(published)}`}>
                        {published}/{CATEGORY_ORDER.length}
                      </span>
                    </button>
                  )
                })}
              </div>

              {activeUnit !== null && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-sm font-bold text-gray-700">
                      Unit {activeUnit}{activeUnitMeta?.title ? ` · ${activeUnitMeta.title}` : ''}
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${readinessClass(publishedCount(activeLevel, activeUnit))}`}>
                        Readiness: {publishedCount(activeLevel, activeUnit)}/{CATEGORY_ORDER.length} Published · {Math.round(publishedCount(activeLevel, activeUnit) / CATEGORY_ORDER.length * 100)}%
                      </span>
                      {readyToPublish(activeLevel, activeUnit).length > 0 && (
                        <button
                          onClick={handlePublishAll}
                          disabled={bulkPublishing}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-sm transition disabled:opacity-50"
                        >
                          <Rocket className="w-3.5 h-3.5" /> {bulkPublishing ? 'Publishing...' : `Publish All Ready (${readyToPublish(activeLevel, activeUnit).length})`}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-400 text-xs font-bold uppercase tracking-wide border-b border-gray-100">
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Actions</th>
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
                                <td className="py-2.5 px-3" colSpan={2}>
                                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-500">
                                    🚫 Missing
                                  </span>
                                </td>
                              </tr>
                            )
                          }

                          const en = currentVersion(mission, 'en')
                          const status = en?.status ?? 'draft'
                          const isMutating = mutatingSlug === slug

                          return (
                            <tr key={slug}>
                              <td className="py-2.5 px-3">{categoryCell}</td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_META[status].badge}`}>
                                  {STATUS_META[status].label}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {!en && (
                                    <span className="text-xs text-gray-400 italic">Add English content first</span>
                                  )}
                                  {en && status === 'draft' && (
                                    <button
                                      onClick={() => setVersionStatus(slug, en.id, 'review')}
                                      disabled={isMutating}
                                      className="px-2.5 py-1 rounded-full text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition disabled:opacity-50"
                                    >
                                      {isMutating ? '...' : 'Send to Review'}
                                    </button>
                                  )}
                                  {en && status === 'review' && (
                                    <>
                                      <button
                                        onClick={() => setVersionStatus(slug, en.id, 'draft')}
                                        disabled={isMutating}
                                        className="px-2.5 py-1 rounded-full text-xs font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 transition disabled:opacity-50"
                                      >
                                        Back to Draft
                                      </button>
                                      <button
                                        onClick={() => handlePublishOne(slug, en.id)}
                                        disabled={isMutating || !en.title.trim()}
                                        title={!en.title.trim() ? 'Add an English title first' : undefined}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        <Rocket className="w-3 h-3" /> {isMutating ? 'Publishing...' : 'Publish'}
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={() => onNavigate(`mission:${slug}:${mission.id}`)}
                                    className="ml-auto p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                                    title="Open in Mission Editor"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </button>
                                </div>
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

      {dialog}
    </div>
  )
}
