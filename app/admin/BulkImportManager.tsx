'use client'
import React, { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import supabase from '@/lib/supabaseClient'
import { Download, Upload, AlertCircle, AlertTriangle, CheckCircle2, FileSpreadsheet, X } from 'lucide-react'
import { ACCENT, CATEGORY_ORDER, MISSION_TYPES, LANGUAGES, type MissionType, type Lang } from './missionMeta'

const TEMPLATE_COLUMNS = ['category_slug', 'sequence', 'type', 'stars', 'duration_minutes', 'language', 'title', 'subtitle', 'tip_text', 'media_url', 'content_json']

interface CurriculumLevelRow {
  level_number: number
  age_range_label: string
  framework_name: string
  primary_focus: string
}

interface ParsedRow {
  category_slug: string
  sequence: number | null
  type: string
  stars: number | null
  duration_minutes: number | null
  language: string
  title: string
  subtitle: string | null
  tip_text: string | null
  media_url: string | null
  content_json: Record<string, unknown> | null
  errors: string[]
}

interface ImportResult {
  missions_created: number
  versions_created: number
  versions_updated: number
}

const accent = ACCENT.amber

function toStringOrNull(v: unknown): string | null {
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

function toNumberOrNull(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function validateRow(row: Record<string, unknown>, seen: Set<string>): ParsedRow {
  const errors: string[] = []

  const category_slug = String(row.category_slug ?? '').trim()
  const sequence = toNumberOrNull(row.sequence)
  const type = String(row.type ?? '').trim()
  const stars = toNumberOrNull(row.stars)
  const duration_minutes = toNumberOrNull(row.duration_minutes)
  const language = String(row.language ?? '').trim()
  const title = String(row.title ?? '').trim()
  const subtitle = toStringOrNull(row.subtitle)
  const tip_text = toStringOrNull(row.tip_text)
  const media_url = toStringOrNull(row.media_url)

  let content_json: Record<string, unknown> | null = null
  const contentRaw = row.content_json
  if (contentRaw !== undefined && contentRaw !== null && String(contentRaw).trim() !== '') {
    try {
      const parsed = typeof contentRaw === 'string' ? JSON.parse(contentRaw) : contentRaw
      if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
        errors.push('content_json must be a JSON object')
      } else {
        content_json = parsed as Record<string, unknown>
      }
    } catch {
      errors.push('content_json is not valid JSON')
    }
  }

  if (!category_slug || !(CATEGORY_ORDER as string[]).includes(category_slug)) {
    errors.push(`unknown category_slug "${category_slug || '(missing)'}"`)
  }
  if (sequence === null || !Number.isInteger(sequence) || sequence <= 0) {
    errors.push('sequence must be a positive integer')
  }
  if (!(MISSION_TYPES as readonly string[]).includes(type)) {
    errors.push(`invalid type "${type || '(missing)'}"`)
  }
  if (!(LANGUAGES as readonly string[]).includes(language)) {
    errors.push(`invalid language "${language || '(missing)'}"`)
  }
  if (!title) {
    errors.push('title is required')
  }

  if (category_slug && sequence !== null && language) {
    const key = `${category_slug}:${sequence}:${language}`
    if (seen.has(key)) {
      errors.push(`duplicate (category_slug, sequence, language) "${key}" within this file`)
    }
    seen.add(key)
  }

  return { category_slug, sequence, type, stars, duration_minutes, language, title, subtitle, tip_text, media_url, content_json, errors }
}

export default function BulkImportManager() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [levels, setLevels] = useState<CurriculumLevelRow[]>([])
  const [categoryTypes, setCategoryTypes] = useState<Record<string, string>>({})

  useEffect(() => {
    (async () => {
      const [{ data: levelRows }, { data: categoryRows }] = await Promise.all([
        supabase.from('curriculum_levels').select('level_number, age_range_label, framework_name, primary_focus').order('level_number'),
        supabase.from('categories').select('slug, default_type'),
      ])
      setLevels(levelRows ?? [])
      const types: Record<string, string> = {}
      for (const c of categoryRows ?? []) types[c.slug] = c.default_type
      setCategoryTypes(types)
    })()
  }, [])

  const handleDownloadLevelTemplate = (level: CurriculumLevelRow) => {
    const focusParts = [level.framework_name, level.age_range_label, level.primary_focus].filter(Boolean)
    const titleRow = `Level ${level.level_number}${focusParts.length ? ` — ${focusParts.join(' — ')}` : ''}`
    const aoa: (string | number)[][] = [[titleRow], TEMPLATE_COLUMNS]
    for (const slug of CATEGORY_ORDER) {
      for (const lang of LANGUAGES) {
        aoa.push([slug, level.level_number, categoryTypes[slug] ?? '', '', '', lang, '', '', '', '', ''])
      }
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `Level ${level.level_number}`.slice(0, 31))
    XLSX.writeFile(wb, `level_${level.level_number}_import_template.xlsx`)
  }

  const handleDownloadTemplate = () => {
    const header = TEMPLATE_COLUMNS.join(',')
    const example = [
      'morning', '4', 'sing', '10', '10', 'en', 'New Morning Song', 'A bright start to the day', 'Sing along with Nimi!', '', '{}',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    const csv = `${header}\n${example}\n`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mission_import_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setParseError(null)
    setImportError(null)
    setImportResult(null)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const firstSheetName = wb.SheetNames[0]
      if (!firstSheetName) throw new Error('No sheets found in this file.')
      const sheet = wb.Sheets[firstSheetName]
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
      if (raw.length === 0) throw new Error('No data rows found in this file.')
      const seen = new Set<string>()
      const parsed = raw.map(row => validateRow(row, seen))
      setRows(parsed)
      setFileName(file.name)
    } catch (err) {
      setRows([])
      setFileName(null)
      setParseError(err instanceof Error ? err.message : 'Failed to parse file.')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleClear = () => {
    setRows([])
    setFileName(null)
    setParseError(null)
    setImportError(null)
    setImportResult(null)
  }

  const validRows = rows.filter(r => r.errors.length === 0)
  const invalidCount = rows.length - validRows.length

  const handleImport = async () => {
    if (validRows.length === 0) return
    setImporting(true)
    setImportError(null)
    setImportResult(null)
    try {
      const payload = validRows.map(r => ({
        category_slug: r.category_slug,
        sequence: r.sequence,
        type: r.type,
        stars: r.stars ?? 10,
        duration_minutes: r.duration_minutes ?? 10,
        language: r.language,
        title: r.title,
        subtitle: r.subtitle,
        tip_text: r.tip_text,
        media_url: r.media_url,
        content_json: r.content_json ?? {},
      }))
      const { data, error } = await supabase.rpc('admin_bulk_import_missions', { p_rows: payload })
      if (error) throw error
      setImportResult(data as ImportResult)
      setRows([])
      setFileName(null)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-gray-800">Bulk Import</h3>
        <p className="text-gray-500 text-sm">
          Upload a CSV or XLSX file to create or update many missions at once. New missions start inactive and
          new content starts as <span className="font-semibold">Draft</span> — review and publish them from
          the Daily Adventures tab afterwards. The per-level templates below pre-fill all {CATEGORY_ORDER.length}{' '}
          categories × {LANGUAGES.length} languages for that level — delete the framework title row (row 1)
          before importing.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={handleDownloadTemplate} className="flex items-center gap-1.5 border border-gray-200 hover:bg-gray-50 text-gray-700 px-3.5 py-2 rounded-full text-sm font-bold transition">
          <Download size={14} /> Download CSV Template
        </button>
        {levels.map(level => (
          <button
            key={level.level_number}
            onClick={() => handleDownloadLevelTemplate(level)}
            className="flex items-center gap-1.5 border border-gray-200 hover:bg-gray-50 text-gray-700 px-3.5 py-2 rounded-full text-sm font-bold transition"
          >
            <Download size={14} /> Download Level {level.level_number} Template{level.framework_name ? ` (${level.framework_name})` : ''}
          </button>
        ))}
        <button onClick={() => fileInputRef.current?.click()} className={`flex items-center gap-1.5 text-white px-3.5 py-2 rounded-full text-sm font-bold shadow-sm transition ${accent.button}`}>
          <Upload size={14} /> Choose File
        </button>
        {fileName && (
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full">
            <FileSpreadsheet className="w-3.5 h-3.5" /> {fileName}
            <button onClick={handleClear} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
          </span>
        )}
        <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="hidden" />
      </div>

      {parseError && (
        <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-xl px-3.5 py-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{parseError}</span>
        </div>
      )}

      {importError && (
        <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-xl px-3.5 py-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{importError}</span>
        </div>
      )}

      {importResult && (
        <div className="flex items-start gap-2 text-xs text-emerald-600 bg-emerald-50 rounded-xl px-3.5 py-2.5">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="flex-1">
            Import complete — {importResult.missions_created} new mission{importResult.missions_created === 1 ? '' : 's'} created,{' '}
            {importResult.versions_created} content version{importResult.versions_created === 1 ? '' : 's'} created,{' '}
            {importResult.versions_updated} updated.
          </span>
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> {validRows.length} valid
              </span>
              {invalidCount > 0 && (
                <span className="inline-flex items-center gap-1.5 text-red-600 bg-red-50 px-2.5 py-1 rounded-full font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" /> {invalidCount} with errors
                </span>
              )}
            </div>
            <button
              onClick={handleImport}
              disabled={importing || validRows.length === 0}
              className={`flex items-center gap-1.5 text-white px-4 py-2 rounded-full text-sm font-bold shadow-sm transition disabled:opacity-50 ${accent.button}`}
            >
              {importing ? 'Importing…' : `Import ${validRows.length} valid row${validRows.length === 1 ? '' : 's'}`}
            </button>
          </div>

          <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 text-xs font-bold uppercase tracking-wide border-b border-gray-100">
                  <th className="py-2.5 px-3">Row</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-center">Seq</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Language</th>
                  <th className="py-2.5 px-3">Title</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row, idx) => (
                  <tr key={idx} className={row.errors.length > 0 ? 'bg-red-50/40' : ''}>
                    <td className="py-2.5 px-3 text-gray-400">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-gray-700">{row.category_slug || '—'}</td>
                    <td className="py-2.5 px-3 text-center text-gray-700">{row.sequence ?? '—'}</td>
                    <td className="py-2.5 px-3 text-gray-700">{row.type || '—'}</td>
                    <td className="py-2.5 px-3 text-gray-700">{row.language || '—'}</td>
                    <td className="py-2.5 px-3 text-gray-700 max-w-[220px] truncate">{row.title || '—'}</td>
                    <td className="py-2.5 px-3">
                      {row.errors.length === 0 ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-bold">
                          <CheckCircle2 className="w-3 h-3" /> OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-xs font-bold" title={row.errors.join('; ')}>
                          <AlertTriangle className="w-3 h-3" /> {row.errors.join('; ')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
