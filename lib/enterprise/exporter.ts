// lib/enterprise/exporter.ts — CSV / JSON export helpers for school data
//
// Called by /api/enterprise/export — produces exportable payloads from
// raw DB rows without any fetch logic (keeps export route thin).

export interface LearnerProgressRow {
  child_id:      string;
  display_name:  string;
  language:      string;
  total_xp:      number;
  level:         number;
  lessons_done:  number;
  missions_done: number;
  stars:         number;
  last_active:   string | null;
}

export interface ExportOptions {
  format:     'csv' | 'json';
  schoolId:   string;
  generatedAt?: string;
}

// ── CSV utilities ─────────────────────────────────────────────────────────────

function escapeCsv(val: unknown): string {
  const s = val == null ? '' : String(val);
  // Wrap in quotes if the value contains comma, newline, or double-quote
  if (s.includes(',') || s.includes('\n') || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsvRow(fields: unknown[]): string {
  return fields.map(escapeCsv).join(',');
}

// ── exportLearnerProgress ─────────────────────────────────────────────────────

const PROGRESS_CSV_HEADER = [
  'child_id', 'display_name', 'language',
  'total_xp', 'level', 'lessons_done', 'missions_done', 'stars', 'last_active',
];

export function exportLearnerProgress(
  rows:    LearnerProgressRow[],
  options: ExportOptions,
): { body: string; contentType: string; filename: string } {
  const ts = (options.generatedAt ?? new Date().toISOString()).replace(/[:.]/g, '-').slice(0, 19);

  if (options.format === 'json') {
    return {
      body:        JSON.stringify({ school_id: options.schoolId, generated_at: options.generatedAt, rows }, null, 2),
      contentType: 'application/json',
      filename:    `nimipiko_progress_${options.schoolId}_${ts}.json`,
    };
  }

  // CSV
  const lines = [
    toCsvRow(PROGRESS_CSV_HEADER),
    ...rows.map(r => toCsvRow([
      r.child_id, r.display_name, r.language,
      r.total_xp, r.level, r.lessons_done, r.missions_done, r.stars,
      r.last_active ?? '',
    ])),
  ];

  return {
    body:        lines.join('\r\n'),
    contentType: 'text/csv; charset=utf-8',
    filename:    `nimipiko_progress_${options.schoolId}_${ts}.csv`,
  };
}

// ── exportSchema ──────────────────────────────────────────────────────────────
// Documents the column names and types so integrators know what they're getting.

export function exportSchema(report: 'learner_progress'): Record<string, string> {
  if (report === 'learner_progress') {
    return {
      child_id:      'UUID — internal learner identifier',
      display_name:  'string — learner display name',
      language:      'string — ISO 639-1 language code (en / fr / rw)',
      total_xp:      'integer — cumulative XP earned',
      level:         'integer — current level',
      lessons_done:  'integer — completed lesson count',
      missions_done: 'integer — completed mission count',
      stars:         'integer — total stars collected',
      last_active:   'ISO 8601 timestamp or empty',
    };
  }
  return {};
}
