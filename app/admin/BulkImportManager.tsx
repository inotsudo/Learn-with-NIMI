'use client'
import React, { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import supabase from '@/lib/supabaseClient'
import { Download, Upload, AlertCircle, AlertTriangle, CheckCircle2, FileSpreadsheet, X } from 'lucide-react'
import { ACCENT, CATEGORY_ORDER, LANGUAGES, CONTENT_STATUSES } from './missionMeta'
import { useToast } from './Toast'

const TEMPLATE_COLUMNS = ['level', 'unit', 'category', 'language', 'title', 'content', 'status']

// Type-specific content skeletons pre-filled in the download templates so
// content editors can see the expected JSON shape for each mission type.
const CONTENT_SKELETON: Record<string, Record<string, unknown>> = {
  sing:  { lyrics: ['Verse 1 here', 'Verse 2 here', 'Verse 3 here'] },
  move:  { prompts: [{ emoji: '🏃', label: 'Action here' }, { emoji: '🤸', label: 'Another action' }] },
  color: { instructions: 'Drawing prompt here' },
  watch: { instructions: 'What to watch or discover' },
  read:  { text: 'Story or history text here' },
  story: { pages: [{ text: 'Page 1 text here' }, { text: 'Page 2 text here' }] },
}

const IMPORT_STATUSES = CONTENT_STATUSES.filter(s => s !== 'archived')

interface CurriculumLevelRow {
  level_number: number
  age_range_label: string
  framework_name: string
  primary_focus: string
}

interface ParsedRow {
  level_number: number | null
  unit_number: number | null
  category_slug: string
  language: string
  title: string
  content_json: Record<string, unknown> | null
  status: string
  errors: string[]
}

interface ImportResult {
  missions_created: number
  level_missions_linked: number
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

function validateRow(row: Record<string, unknown>, seen: Set<string>, levelNumbers: Set<number>): ParsedRow {
  const errors: string[] = []

  const level_number  = toNumberOrNull(row.level)
  const unit_number   = toNumberOrNull(row.unit)
  const category_slug = String(row.category ?? '').trim()
  const language      = String(row.language ?? '').trim()
  const title         = String(row.title ?? '').trim()
  const status        = String(row.status ?? '').trim()

  let content_json: Record<string, unknown> | null = null
  const contentRaw = toStringOrNull(row.content)
  if (!contentRaw) {
    errors.push('content is required')
  } else {
    try {
      const parsed = typeof contentRaw === 'string' ? JSON.parse(contentRaw) : contentRaw
      if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
        errors.push('content must be a JSON object (not an array or primitive)')
      } else {
        content_json = parsed as Record<string, unknown>
      }
    } catch {
      errors.push('content is not valid JSON — paste a JSON object e.g. {"lyrics":["Line 1"]}')
    }
  }

  if (level_number === null || !Number.isInteger(level_number) || level_number <= 0) {
    errors.push('level must be a positive integer')
  } else if (!levelNumbers.has(level_number)) {
    errors.push(`level ${level_number} does not exist in curriculum_levels`)
  }

  if (unit_number === null || !Number.isInteger(unit_number) || unit_number <= 0) {
    errors.push('unit must be a positive integer')
  }

  if (!category_slug || !(CATEGORY_ORDER as string[]).includes(category_slug)) {
    errors.push(`unknown category "${category_slug || '(missing)'}" — must be one of: ${CATEGORY_ORDER.join(', ')}`)
  }

  if (!(LANGUAGES as readonly string[]).includes(language)) {
    errors.push(`invalid language "${language || '(missing)'}" — must be en, fr, or rw`)
  }

  if (!title) {
    errors.push('title is required')
  }

  if (!(IMPORT_STATUSES as readonly string[]).includes(status)) {
    errors.push(`status must be draft, review, or published (got "${status || '(missing)'}")`)
  }

  if (level_number && unit_number && category_slug && language && errors.length === 0) {
    const key = `${level_number}:${unit_number}:${category_slug}:${language}`
    if (seen.has(key)) {
      errors.push(`duplicate (level, unit, category, language) "${key}" within this file`)
    }
    seen.add(key)
  }

  return { level_number, unit_number, category_slug, language, title, content_json, status, errors }
}

export default function BulkImportManager() {
  const { success, error: toastError } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
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
    const titleRow = `Level ${level.level_number}${focusParts.length ? ` — ${focusParts.join(' — ')}` : ''} (delete this row before importing)`
    const aoa: (string | number)[][] = [[titleRow], TEMPLATE_COLUMNS]
    for (const slug of CATEGORY_ORDER) {
      const type = categoryTypes[slug] ?? 'read'
      const skeleton = JSON.stringify(CONTENT_SKELETON[type] ?? {})
      for (const lang of LANGUAGES) {
        aoa.push([level.level_number, 1, slug, lang, '', skeleton, 'draft'])
      }
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    // Auto-widen the content column (index 5)
    ws['!cols'] = [{ wch: 8 }, { wch: 6 }, { wch: 12 }, { wch: 10 }, { wch: 30 }, { wch: 60 }, { wch: 10 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `Level ${level.level_number}`.slice(0, 31))
    XLSX.writeFile(wb, `level_${level.level_number}_import_template.xlsx`)
  }

  const handleDownloadTemplate = () => {
    const header = TEMPLATE_COLUMNS.join(',')
    const exampleRows = [
      [1, 1, 'morning', 'en', 'Morning Song', JSON.stringify(CONTENT_SKELETON.sing), 'draft'],
      [1, 1, 'morning', 'fr', 'Chanson du Matin', JSON.stringify(CONTENT_SKELETON.sing), 'draft'],
    ]
    const csvRows = exampleRows.map(r =>
      r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    )
    const csv = `${header}\n${csvRows.join('\n')}\n`
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
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const firstSheetName = wb.SheetNames[0]
      if (!firstSheetName) throw new Error('No sheets found in this file.')
      const sheet = wb.Sheets[firstSheetName]
      // skip row 1 if it looks like a level title row (doesn't have 'level' in cell A1)
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
      if (raw.length === 0) throw new Error('No data rows found. Did you forget to delete the title row?')
      const levelNumbers = new Set(levels.map(l => l.level_number))
      const seen = new Set<string>()
      const parsed = raw.map(row => validateRow(row, seen, levelNumbers))
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
  }

  const validRows = rows.filter(r => r.errors.length === 0)
  const invalidCount = rows.length - validRows.length

  const handleImport = async () => {
    if (validRows.length === 0) return
    setImporting(true)
    try {
      const payload = validRows.map(r => ({
        level_number:  r.level_number,
        unit_number:   r.unit_number,
        category_slug: r.category_slug,
        language:      r.language,
        title:         r.title,
        content_json:  r.content_json ?? {},
        status:        r.status,
      }))
      const { data, error } = await supabase.rpc('admin_bulk_import_missions', { p_rows: payload })
      if (error) throw error
      const result = data as ImportResult
      const msg = [
        result.missions_created > 0 ? `${result.missions_created} mission${result.missions_created === 1 ? '' : 's'} created` : null,
        `${result.level_missions_linked} slot${result.level_missions_linked === 1 ? '' : 's'} linked`,
        `${result.versions_created} version${result.versions_created === 1 ? '' : 's'} created`,
        result.versions_updated > 0 ? `${result.versions_updated} updated` : null,
      ].filter(Boolean).join(', ')
      success(`Import complete — ${msg}.`)
      setRows([])
      setFileName(null)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Import failed.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-gray-800">Bulk Import</h3>
        <p className="text-gray-500 text-sm">
          Upload a CSV or XLSX file to create or update lessons at scale. Every row must include
          a <span className="font-semibold">level</span>, <span className="font-semibold">unit</span>, and{' '}
          <span className="font-semibold">category</span> — this guarantees the lesson is
          immediately visible in the curriculum with no orphaned content. Set{' '}
          <span className="font-semibold">status</span> to <em>published</em> to make lessons
          live on import, or leave it as <em>draft</em> to review first. Use the per-level
          templates below — delete the first title row before importing.
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
            <Download size={14} /> Level {level.level_number} Template{level.framework_name ? ` (${level.framework_name})` : ''}
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
                  <th className="py-2.5 px-3 text-center">Lvl</th>
                  <th className="py-2.5 px-3 text-center">Unit</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Lang</th>
                  <th className="py-2.5 px-3">Title</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Validation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row, idx) => (
                  <tr key={idx} className={row.errors.length > 0 ? 'bg-red-50/40' : ''}>
                    <td className="py-2.5 px-3 text-gray-400">{idx + 1}</td>
                    <td className="py-2.5 px-3 text-center text-gray-700">{row.level_number ?? '—'}</td>
                    <td className="py-2.5 px-3 text-center text-gray-700">{row.unit_number ?? '—'}</td>
                    <td className="py-2.5 px-3 font-semibold text-gray-700">{row.category_slug || '—'}</td>
                    <td className="py-2.5 px-3 text-gray-700">{row.language || '—'}</td>
                    <td className="py-2.5 px-3 text-gray-700 max-w-[200px] truncate">{row.title || '—'}</td>
                    <td className="py-2.5 px-3 text-gray-700">{row.status || '—'}</td>
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
