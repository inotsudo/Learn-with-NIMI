// NIMIPIKO — Admin analytics export tools (Phase BI)
//
// Shared CSV/XLSX download helpers, extracted from the Blob/anchor-click
// pattern already used by BulkImportManager's CSV template download.

import * as XLSX from 'xlsx'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportCSV(filename: string, rows: Record<string, unknown>[]) {
  const sheet = XLSX.utils.json_to_sheet(rows)
  const csv = XLSX.utils.sheet_to_csv(sheet)
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename)
}

export function exportXLSX(filename: string, sheets: { name: string; rows: Record<string, unknown>[] }[]) {
  const wb = XLSX.utils.book_new()
  for (const { name, rows } of sheets) {
    const sheet = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, sheet, name.slice(0, 31))
  }
  XLSX.writeFile(wb, filename)
}
