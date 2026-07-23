'use client'
import React, { useCallback, useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import { AlertCircle, RefreshCw, Plus, Search, BookOpen, ChevronUp, ChevronDown, Archive } from 'lucide-react'
import { ACCENT } from './missionMeta'
import { useConfirmDialog } from './ConfirmDialog'
import { useToast } from './Toast'
import { Skeleton, SkeletonList } from './Skeleton'

type UnitStatus = 'draft' | 'active' | 'archived'

const UNIT_STATUSES: UnitStatus[] = ['draft', 'active', 'archived']

const UNIT_STATUS_META: Record<UnitStatus, { label: string; badge: string }> = {
  draft:    { label: 'Draft',    badge: 'bg-gray-100 text-gray-500' },
  active:   { label: 'Active',   badge: 'bg-emerald-50 text-emerald-600' },
  archived: { label: 'Archived', badge: 'bg-zinc-100 text-zinc-500' },
}

// Capacity-planning target (Phase BK) — informational only, not enforced.
const RECOMMENDED_UNITS_PER_LEVEL = 52

interface LevelRow {
  level_number: number
  framework_name: string | null
  age_range_label: string | null
}

interface UnitRow {
  level_number: number
  unit_number: number
  title: string
  theme_emoji: string
  description: string
  status: UnitStatus
  lessonCount: number
}

type EditableField = 'title' | 'theme_emoji' | 'description'

const accent = ACCENT.green

export default function UnitManager() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [levels, setLevels] = useState<LevelRow[]>([])
  const [unitsByLevel, setUnitsByLevel] = useState<Record<number, UnitRow[]>>({})
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const { confirm, dialog } = useConfirmDialog()
  const { error: toastErr } = useToast()

  const fetchData = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [{ data: levelsData, error: lvlErr }, { data: unitsData, error: unitsErr }, { data: lmData, error: lmErr }] = await Promise.all([
        supabase.from('curriculum_levels').select('level_number, framework_name, age_range_label').order('level_number'),
        supabase.from('curriculum_units').select('level_number, unit_number, title, theme_emoji, description, status'),
        supabase.from('level_missions').select('level_number, unit_number'),
      ])
      if (lvlErr) throw lvlErr
      if (unitsErr) throw unitsErr
      if (lmErr) throw lmErr

      const lessonCounts: Record<string, number> = {}
      for (const row of lmData ?? []) {
        const key = `${row.level_number}:${row.unit_number}`
        lessonCounts[key] = (lessonCounts[key] ?? 0) + 1
      }

      const metaByKey: Record<string, UnitRow> = {}
      for (const row of unitsData ?? []) {
        const key = `${row.level_number}:${row.unit_number}`
        metaByKey[key] = {
          level_number: row.level_number,
          unit_number: row.unit_number,
          title: row.title ?? '',
          theme_emoji: row.theme_emoji ?? '',
          description: row.description ?? '',
          status: (row.status ?? 'draft') as UnitStatus,
          lessonCount: lessonCounts[key] ?? 0,
        }
      }

      const allKeys = new Set<string>([...Object.keys(metaByKey), ...Object.keys(lessonCounts)])
      const byLevel: Record<number, UnitRow[]> = {}
      for (const key of allKeys) {
        const [levelStr, unitStr] = key.split(':')
        const level_number = Number(levelStr)
        const unit_number = Number(unitStr)
        const row = metaByKey[key] ?? {
          level_number, unit_number,
          title: '', theme_emoji: '', description: '', status: 'draft' as UnitStatus,
          lessonCount: lessonCounts[key] ?? 0,
        }
        if (!byLevel[level_number]) byLevel[level_number] = []
        byLevel[level_number].push(row)
      }
      for (const level of Object.keys(byLevel)) {
        byLevel[Number(level)].sort((a, b) => a.unit_number - b.unit_number)
      }

      setUnitsByLevel(byLevel)
      setLevels(levelsData ?? [])
      setSelectedLevel(prev => {
        if (prev !== null && (levelsData ?? []).some(l => l.level_number === prev)) return prev
        return levelsData?.[0]?.level_number ?? null
      })
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load units.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData, reloadKey])

  const saveUnit = async (unit: UnitRow) => {
    setBusy(true)
    try {
      const { error } = await supabase
        .from('curriculum_units')
        .upsert({
          level_number: unit.level_number,
          unit_number: unit.unit_number,
          title: unit.title,
          theme_emoji: unit.theme_emoji,
          description: unit.description,
          status: unit.status,
        }, { onConflict: 'level_number,unit_number' })
      if (error) throw error
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Failed to save unit.')
    } finally {
      setBusy(false)
    }
  }

  const handleFieldChange = (unit: UnitRow, field: EditableField, value: string) => {
    setUnitsByLevel(prev => ({
      ...prev,
      [unit.level_number]: (prev[unit.level_number] ?? []).map(u => u.unit_number === unit.unit_number ? { ...u, [field]: value } : u),
    }))
  }

  const handleStatusChange = async (unit: UnitRow, status: UnitStatus) => {
    const updated = { ...unit, status }
    setUnitsByLevel(prev => ({
      ...prev,
      [unit.level_number]: (prev[unit.level_number] ?? []).map(u => u.unit_number === unit.unit_number ? updated : u),
    }))
    await saveUnit(updated)
  }

  const handleArchive = async (unit: UnitRow) => {
    const ok = await confirm({
      title: `Archive Unit ${unit.unit_number}${unit.title ? `: ${unit.title}` : ''}?`,
      message: unit.lessonCount > 0
        ? `This marks the unit as retired in the roadmap. It still has ${unit.lessonCount} lesson${unit.lessonCount === 1 ? '' : 's'} assigned — archiving does not affect those lessons or learner progress.`
        : `This marks the unit as retired in the roadmap. You can bring it back later by changing its status.`,
      confirmLabel: 'Archive',
      danger: false,
    })
    if (!ok) return
    await handleStatusChange(unit, 'archived')
  }

  const handleAddUnit = async (levelNumber: number) => {
    setBusy(true)
    try {
      const existing = unitsByLevel[levelNumber] ?? []
      const nextUnit = existing.length > 0 ? Math.max(...existing.map(u => u.unit_number)) + 1 : 1
      const { error } = await supabase.from('curriculum_units').insert({
        level_number: levelNumber,
        unit_number: nextUnit,
        title: '',
        theme_emoji: '',
        description: '',
        status: 'draft',
      })
      if (error) throw error
      await fetchData()
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Failed to add unit.')
    } finally {
      setBusy(false)
    }
  }

  const handleReorder = async (unit: UnitRow, direction: 'up' | 'down') => {
    const units = unitsByLevel[unit.level_number] ?? []
    const idx = units.findIndex(u => u.unit_number === unit.unit_number)
    const otherIdx = direction === 'up' ? idx - 1 : idx + 1
    if (idx === -1 || otherIdx < 0 || otherIdx >= units.length) return
    const a = units[idx]
    const b = units[otherIdx]
    if (a.lessonCount > 0 || b.lessonCount > 0) return

    setBusy(true)
    try {
      const aFields = { title: a.title, theme_emoji: a.theme_emoji, description: a.description, status: a.status }
      const bFields = { title: b.title, theme_emoji: b.theme_emoji, description: b.description, status: b.status }
      const { error: errA } = await supabase.from('curriculum_units')
        .upsert({ level_number: a.level_number, unit_number: a.unit_number, ...bFields }, { onConflict: 'level_number,unit_number' })
      if (errA) throw errA
      const { error: errB } = await supabase.from('curriculum_units')
        .upsert({ level_number: b.level_number, unit_number: b.unit_number, ...aFields }, { onConflict: 'level_number,unit_number' })
      if (errB) throw errB
      await fetchData()
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Failed to reorder units.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-10 w-full rounded-full" />
        <SkeletonList rows={5} avatar={false} />
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
          <p className="text-sm font-bold text-gray-700">Couldn&apos;t load units</p>
          <p className="text-xs text-gray-400 mt-1">{loadError}</p>
          <button onClick={() => setReloadKey(k => k + 1)} className={`mt-4 inline-flex items-center gap-2 text-white text-xs font-bold px-4 py-2 rounded-full transition ${accent.button}`}>
            <RefreshCw className="w-3.5 h-3.5" /> Try again
          </button>
        </div>
      </div>
    )
  }

  const activeLevel = selectedLevel ?? levels[0]?.level_number
  const allUnits = unitsByLevel[activeLevel] ?? []
  const archivedCount = allUnits.filter(u => u.status === 'archived').length
  const visibleUnits = allUnits.filter(u => {
    if (!showArchived && u.status === 'archived') return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      return u.title.toLowerCase().includes(q) || String(u.unit_number).includes(q)
    }
    return true
  })
  const nextUnitNumber = allUnits.length > 0 ? Math.max(...allUnits.map(u => u.unit_number)) + 1 : 1

  return (
    <div className="space-y-4">

      <div>
        <h3 className="text-base font-bold text-gray-800">Units</h3>
        <p className="text-gray-500 text-sm">Plan the Unit roadmap for each Level — name, theme &amp; describe each Unit ahead of building its lessons.</p>
      </div>

      {levels.length === 0 ? (
        <div className="text-center text-gray-400 text-sm py-8">No curriculum levels yet — add one from the Levels tab first.</div>
      ) : (
        <>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {levels.map(lvl => (
              <button
                key={lvl.level_number}
                onClick={() => { setSelectedLevel(lvl.level_number); setSearch(''); setShowArchived(false) }}
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

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex-1 min-w-[200px] flex items-center bg-gray-50 border border-gray-100 rounded-full px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-gray-200 transition">
              <Search size={15} className="text-gray-400 mr-2 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search units by title or number..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
              />
            </div>
            {archivedCount > 0 && (
              <button
                onClick={() => setShowArchived(s => !s)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold border transition flex-shrink-0 ${
                  showArchived ? 'bg-zinc-100 text-zinc-600 border-zinc-200' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'
                }`}
              >
                <Archive size={12} /> {showArchived ? 'Hide' : 'Show'} Archived ({archivedCount})
              </button>
            )}
            <button
              onClick={() => handleAddUnit(activeLevel)}
              disabled={busy}
              className={`flex items-center gap-1.5 text-white px-3.5 py-2 rounded-full text-sm font-bold shadow-sm transition disabled:opacity-50 flex-shrink-0 ${accent.button}`}
            >
              <Plus size={14} /> Add Unit {nextUnitNumber}
            </button>
          </div>

          {nextUnitNumber > RECOMMENDED_UNITS_PER_LEVEL && (
            <p className="text-xs text-amber-600">
              ⚠ Level {activeLevel} already has {allUnits.length} units — the curriculum plan targets {RECOMMENDED_UNITS_PER_LEVEL} per level.
            </p>
          )}

          <div className="space-y-3">
            {visibleUnits.map(unit => {
              const idx = allUnits.findIndex(u => u.unit_number === unit.unit_number)
              const prevUnit = allUnits[idx - 1]
              const nextUnit = allUnits[idx + 1]
              const canMoveUp = idx > 0 && unit.lessonCount === 0 && prevUnit.lessonCount === 0
              const canMoveDown = idx < allUnits.length - 1 && unit.lessonCount === 0 && nextUnit.lessonCount === 0
              const lockedReorder = unit.lessonCount > 0
                || (idx > 0 && prevUnit.lessonCount > 0)
                || (idx < allUnits.length - 1 && nextUnit.lessonCount > 0)

              return (
                <div key={unit.unit_number} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-extrabold text-white flex-shrink-0 ${accent.badge}`}>
                      {unit.unit_number}
                    </span>
                    <input
                      value={unit.title}
                      onChange={e => handleFieldChange(unit, 'title', e.target.value)}
                      onBlur={() => saveUnit(unit)}
                      disabled={busy}
                      placeholder={`Unit ${unit.unit_number}`}
                      className="flex-1 min-w-[160px] font-bold text-gray-800 border border-transparent hover:border-gray-200 focus:border-green-500 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-200 transition"
                    />
                    <input
                      value={unit.theme_emoji}
                      onChange={e => handleFieldChange(unit, 'theme_emoji', e.target.value)}
                      onBlur={() => saveUnit(unit)}
                      disabled={busy}
                      placeholder="🐾"
                      title="Theme"
                      className="w-16 text-center text-lg border border-transparent hover:border-gray-200 focus:border-green-500 rounded-lg px-2 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-200 transition flex-shrink-0"
                    />
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-full flex-shrink-0 ${unit.lessonCount > 0 ? `${accent.soft} ${accent.text}` : 'bg-gray-100 text-gray-400'}`}>
                      <BookOpen size={12} /> {unit.lessonCount} lesson{unit.lessonCount === 1 ? '' : 's'}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleReorder(unit, 'up')}
                        disabled={busy || !canMoveUp}
                        title={lockedReorder ? "Can't reorder — this or the adjacent unit has assigned lessons" : undefined}
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-100 text-gray-400 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      >
                        <ChevronUp size={15} />
                      </button>
                      <button
                        onClick={() => handleReorder(unit, 'down')}
                        disabled={busy || !canMoveDown}
                        title={lockedReorder ? "Can't reorder — this or the adjacent unit has assigned lessons" : undefined}
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-100 text-gray-400 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      >
                        <ChevronDown size={15} />
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={unit.description}
                    onChange={e => handleFieldChange(unit, 'description', e.target.value)}
                    onBlur={() => saveUnit(unit)}
                    disabled={busy}
                    placeholder="What will learners explore in this unit?"
                    rows={2}
                    className="w-full text-sm text-gray-600 border border-transparent hover:border-gray-200 focus:border-green-500 rounded-lg px-2.5 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-200 transition resize-none"
                  />

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <select
                      value={unit.status}
                      onChange={e => handleStatusChange(unit, e.target.value as UnitStatus)}
                      disabled={busy}
                      className={`text-xs font-bold px-2.5 py-1.5 rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-green-200 transition disabled:opacity-50 ${UNIT_STATUS_META[unit.status].badge}`}
                    >
                      {UNIT_STATUSES.map(s => <option key={s} value={s}>{UNIT_STATUS_META[s].label}</option>)}
                    </select>
                    {unit.status !== 'archived' && (
                      <button
                        onClick={() => handleArchive(unit)}
                        disabled={busy}
                        className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-full transition disabled:opacity-50"
                      >
                        <Archive size={12} /> Archive
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            {visibleUnits.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-8">
                {search.trim() ? 'No units match your search.' : `No units yet — click "Add Unit 1" to start planning Level ${activeLevel}.`}
              </div>
            )}
          </div>
        </>
      )}
      {dialog}
    </div>
  )
}
