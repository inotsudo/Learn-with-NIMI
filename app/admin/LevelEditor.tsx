'use client'
import React, { useCallback, useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import { AlertCircle, Plus, Trash2, RefreshCw } from 'lucide-react'
import { ACCENT, CATEGORY_ORDER, CATEGORY_META, FALLBACK_META, STATUS_META, type ContentStatus } from './missionMeta'
import { useConfirmDialog } from './ConfirmDialog'
import { Skeleton, SkeletonTable } from './Skeleton'

interface MissionOption {
  id: string
  sequence: number
  title: string
  status: ContentStatus
}

interface LevelCell {
  missionId: string
  title: string
  sequence: number
  status: ContentStatus
}

interface LevelFramework {
  ageRangeLabel: string
  frameworkName: string
  primaryFocus: string
}

const EMPTY_FRAMEWORK: LevelFramework = { ageRangeLabel: '', frameworkName: '', primaryFocus: '' }

const accent = ACCENT.indigo

export default function LevelEditor() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [actionError, setActionError] = useState<string | null>(null)
  const [grid, setGrid] = useState<Record<number, Record<string, LevelCell | undefined>>>({})
  const [optionsByCategory, setOptionsByCategory] = useState<Record<string, MissionOption[]>>({})
  const [frameworks, setFrameworks] = useState<Record<number, LevelFramework>>({})
  const [maxLevel, setMaxLevel] = useState(0)
  const [busy, setBusy] = useState(false)
  const { confirm, dialog } = useConfirmDialog()

  const fetchData = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [{ data: lm, error: lmErr }, { data: missions, error: mErr }, { data: levels, error: lvlErr }] = await Promise.all([
        supabase.from('level_missions').select('level_number, category_slug, mission_id'),
        supabase.from('missions').select('id, category_slug, sequence, mission_versions(language, title, status)').order('sequence'),
        supabase.from('curriculum_levels').select('level_number, age_range_label, framework_name, primary_focus').order('level_number'),
      ])
      if (lmErr) throw lmErr
      if (mErr) throw mErr
      if (lvlErr) throw lvlErr

      const fw: Record<number, LevelFramework> = {}
      for (const row of levels ?? []) {
        fw[row.level_number] = { ageRangeLabel: row.age_range_label, frameworkName: row.framework_name, primaryFocus: row.primary_focus }
      }
      setFrameworks(fw)

      const missionById: Record<string, LevelCell> = {}
      const options: Record<string, MissionOption[]> = {}
      for (const slug of CATEGORY_ORDER) options[slug] = []
      for (const m of missions ?? []) {
        const en = (m.mission_versions as any[])?.find(v => v.language === 'en')
        const title = en?.title ?? 'Untitled'
        const status = (en?.status ?? 'draft') as ContentStatus
        missionById[m.id] = { missionId: m.id, title, sequence: m.sequence, status }
        if (options[m.category_slug]) {
          options[m.category_slug].push({ id: m.id, sequence: m.sequence, title, status })
        }
      }
      for (const slug of CATEGORY_ORDER) options[slug].sort((a, b) => a.sequence - b.sequence)
      setOptionsByCategory(options)

      const g: Record<number, Record<string, LevelCell | undefined>> = {}
      let max = 0
      for (const row of lm ?? []) {
        max = Math.max(max, row.level_number)
        if (!g[row.level_number]) g[row.level_number] = {}
        g[row.level_number][row.category_slug] = missionById[row.mission_id]
      }
      setGrid(g)
      setMaxLevel(max)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load curriculum levels.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData, reloadKey])

  const handleFrameworkFieldChange = (level: number, field: keyof LevelFramework, value: string) => {
    setFrameworks(prev => ({ ...prev, [level]: { ...(prev[level] ?? EMPTY_FRAMEWORK), [field]: value } }))
  }

  const handleFrameworkBlur = async (level: number) => {
    setActionError(null)
    setBusy(true)
    try {
      const fw = frameworks[level] ?? EMPTY_FRAMEWORK
      const { error } = await supabase
        .from('curriculum_levels')
        .upsert({ level_number: level, age_range_label: fw.ageRangeLabel, framework_name: fw.frameworkName, primary_focus: fw.primaryFocus })
      if (error) throw error
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to save framework details.')
    } finally {
      setBusy(false)
    }
  }

  const handleCellChange = async (levelNumber: number, categorySlug: string, missionId: string) => {
    setActionError(null)
    setBusy(true)
    try {
      const { error } = await supabase
        .from('level_missions')
        .update({ mission_id: missionId })
        .eq('level_number', levelNumber)
        .eq('category_slug', categorySlug)
      if (error) throw error
      await fetchData()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update mission.')
    } finally {
      setBusy(false)
    }
  }

  const handleAddLevel = async () => {
    setActionError(null)
    setBusy(true)
    try {
      const nextLevel = maxLevel + 1
      const rows = CATEGORY_ORDER.map(slug => ({
        level_number: nextLevel,
        category_slug: slug,
        mission_id: grid[1]?.[slug]?.missionId,
      }))
      if (rows.some(r => !r.mission_id)) {
        throw new Error("Level 1 is missing a mission for one or more categories — can't derive defaults for the new level.")
      }
      const { error } = await supabase.from('level_missions').insert(rows)
      if (error) throw error
      const { error: fwError } = await supabase
        .from('curriculum_levels')
        .upsert({ level_number: nextLevel, age_range_label: '', framework_name: '', primary_focus: '' }, { onConflict: 'level_number', ignoreDuplicates: true })
      if (fwError) throw fwError
      await fetchData()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to add level.')
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteLevel = async () => {
    if (maxLevel <= 1) return
    const { count } = await supabase
      .from('child_achievements')
      .select('*', { count: 'exact', head: true })
      .like('slug', `level-${maxLevel}-complete-%`)
    const ok = await confirm({
      title: `Delete Level ${maxLevel}?`,
      message: count
        ? `${count} learner${count === 1 ? '' : 's'} already earned a Level ${maxLevel} Explorer Badge. Deleting this level does not remove their badge, but no one will be able to progress past Level ${maxLevel - 1} anymore. This cannot be undone.`
        : `No learners have completed Level ${maxLevel} yet. This removes all ${CATEGORY_ORDER.length} category assignments for this level. This cannot be undone.`,
    })
    if (!ok) return
    setActionError(null)
    setBusy(true)
    try {
      const { error } = await supabase.from('level_missions').delete().eq('level_number', maxLevel)
      if (error) throw error
      const { error: fwError } = await supabase.from('curriculum_levels').delete().eq('level_number', maxLevel)
      if (fwError) throw fwError
      await fetchData()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete level.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <SkeletonTable rows={maxLevel || 3} cols={CATEGORY_ORDER.length + 1} />
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
          <p className="text-sm font-bold text-gray-700">Couldn&apos;t load curriculum levels</p>
          <p className="text-xs text-gray-400 mt-1">{loadError}</p>
          <button onClick={() => setReloadKey(k => k + 1)} className={`mt-4 inline-flex items-center gap-2 text-white text-xs font-bold px-4 py-2 rounded-full transition ${accent.button}`}>
            <RefreshCw className="w-3.5 h-3.5" /> Try again
          </button>
        </div>
      </div>
    )
  }

  const levels = Array.from({ length: maxLevel }, (_, i) => i + 1)

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-xl px-3.5 py-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{actionError}</span>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-base font-bold text-gray-800">Levels</h3>
          <p className="text-gray-500 text-sm">Assign which mission a learner sees per category at each level — they must complete all {CATEGORY_ORDER.length} categories to advance.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDeleteLevel} disabled={busy || maxLevel <= 1} className="flex items-center gap-1.5 text-red-500 border border-red-200 hover:bg-red-50 px-3.5 py-2 rounded-full text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed">
            <Trash2 size={14} /> Delete Level {maxLevel}
          </button>
          <button onClick={handleAddLevel} disabled={busy} className={`flex items-center gap-1.5 text-white px-3.5 py-2 rounded-full text-sm font-bold shadow-sm transition disabled:opacity-50 ${accent.button}`}>
            <Plus size={14} /> Add Level {maxLevel + 1}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 text-xs font-bold uppercase tracking-wide border-b border-gray-100">
              <th className="py-2.5 px-3">Level</th>
              {CATEGORY_ORDER.map(slug => {
                const meta = CATEGORY_META[slug] ?? FALLBACK_META
                return (
                  <th key={slug} className="py-2.5 px-3 text-left">
                    <span className="inline-flex items-center gap-1.5">
                      <meta.icon className="w-3.5 h-3.5" /> {meta.label}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {levels.map(level => {
              const fw = frameworks[level] ?? EMPTY_FRAMEWORK
              return (
              <React.Fragment key={level}>
                <tr className="bg-indigo-50/60">
                  <td colSpan={CATEGORY_ORDER.length + 1} className="py-1.5 px-3">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-extrabold text-white flex-shrink-0 ${accent.badge}`}>{level}</span>
                      <input
                        value={fw.frameworkName}
                        onChange={e => handleFrameworkFieldChange(level, 'frameworkName', e.target.value)}
                        onBlur={() => handleFrameworkBlur(level)}
                        disabled={busy}
                        placeholder="Framework name (e.g. Toddler Framework)"
                        className="font-bold text-gray-700 border border-transparent hover:border-gray-200 focus:border-indigo-300 rounded-lg px-2 py-1 bg-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition min-w-[200px]"
                      />
                      <span className="text-gray-400">·</span>
                      <input
                        value={fw.ageRangeLabel}
                        onChange={e => handleFrameworkFieldChange(level, 'ageRangeLabel', e.target.value)}
                        onBlur={() => handleFrameworkBlur(level)}
                        disabled={busy}
                        placeholder="Age range (e.g. Ages 1–2)"
                        className="text-gray-600 border border-transparent hover:border-gray-200 focus:border-indigo-300 rounded-lg px-2 py-1 bg-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition min-w-[140px]"
                      />
                      <span className="text-gray-400">·</span>
                      <input
                        value={fw.primaryFocus}
                        onChange={e => handleFrameworkFieldChange(level, 'primaryFocus', e.target.value)}
                        onBlur={() => handleFrameworkBlur(level)}
                        disabled={busy}
                        placeholder="Primary focus (e.g. Sensory & Motor Development)"
                        className="text-gray-600 border border-transparent hover:border-gray-200 focus:border-indigo-300 rounded-lg px-2 py-1 bg-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition flex-1 min-w-[220px]"
                      />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-extrabold text-white ${accent.badge}`}>{level}</span>
                  </td>
                  {CATEGORY_ORDER.map(slug => {
                    const cell = grid[level]?.[slug]
                    return (
                      <td key={slug} className="py-2 px-3 min-w-[180px]">
                        <select
                          value={cell?.missionId ?? ''}
                          onChange={e => handleCellChange(level, slug, e.target.value)}
                          disabled={busy}
                          className="w-full border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition disabled:opacity-50"
                        >
                          {!cell && <option value="">— none —</option>}
                          {optionsByCategory[slug]?.map(opt => (
                            <option key={opt.id} value={opt.id}>
                              #{opt.sequence} {opt.title} ({STATUS_META[opt.status].label})
                            </option>
                          ))}
                        </select>
                      </td>
                    )
                  })}
                </tr>
              </React.Fragment>
              )
            })}
            {levels.length === 0 && (
              <tr><td colSpan={CATEGORY_ORDER.length + 1} className="py-8 text-center text-gray-400">No levels yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {dialog}
    </div>
  )
}
