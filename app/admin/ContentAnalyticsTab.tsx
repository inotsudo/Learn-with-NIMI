'use client'
import React from 'react'
import { FileText, Download } from 'lucide-react'
import { ACCENT, LANGUAGE_META, CONTENT_STATUSES, STATUS_META, type ContentStatus, type AccentKey } from './missionMeta'
import StatCard from './StatCard'
import { exportCSV } from './exportUtils'
import type { ContentAnalytics } from '@/lib/adminAnalytics'

const accent = ACCENT.indigo

const STATUS_BAR_COLOR: Record<ContentStatus, string> = {
  draft: 'bg-gray-300',
  review: 'bg-blue-400',
  published: 'bg-emerald-400',
  archived: 'bg-zinc-400',
}

const STATUS_ACCENT: Record<ContentStatus, AccentKey> = {
  draft: 'indigo',
  review: 'blue',
  published: 'emerald',
  archived: 'rose',
}

export default function ContentAnalyticsTab({ analytics }: { analytics: ContentAnalytics }) {
  const { statusCounts, translationCoverage } = analytics

  const handleExport = () => {
    exportCSV('content-analytics.csv', translationCoverage.map(c => ({
      language: c.language,
      published_missions: c.published,
      total_missions: c.totalMissions,
      coverage_pct: Math.round(c.pct),
    })))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Content Analytics</h3>
          <p className="text-gray-500 text-sm">Content pipeline status &amp; translation coverage</p>
        </div>
        <button
          onClick={handleExport}
          className={`inline-flex items-center gap-1.5 text-xs font-bold text-white px-3.5 py-2 rounded-full transition ${accent.button}`}
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {CONTENT_STATUSES.map(status => (
          <StatCard key={status} icon={FileText} label={STATUS_META[status].label} value={statusCounts[status]} accentKey={STATUS_ACCENT[status]} />
        ))}
      </div>

      {/* Status pipeline bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-base font-bold text-gray-800 mb-1">Content Pipeline</h3>
        <p className="text-gray-500 text-sm mb-4">{statusCounts.total} mission version{statusCounts.total === 1 ? '' : 's'} across all languages</p>
        <div className="h-4 rounded-full bg-gray-100 overflow-hidden flex">
          {CONTENT_STATUSES.map(status => (
            <div
              key={status}
              className={STATUS_BAR_COLOR[status]}
              style={{ width: `${statusCounts.total > 0 ? (statusCounts[status] / statusCounts.total) * 100 : 0}%` }}
              title={`${STATUS_META[status].label}: ${statusCounts[status]}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          {CONTENT_STATUSES.map(status => (
            <span key={status} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
              <span className={`w-2.5 h-2.5 rounded-full ${STATUS_BAR_COLOR[status]}`} />
              {STATUS_META[status].label} ({statusCounts[status]})
            </span>
          ))}
        </div>
      </div>

      {/* Translation coverage */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-base font-bold text-gray-800 mb-1">Translation Coverage</h3>
        <p className="text-gray-500 text-sm mb-4">Share of all missions published per language</p>
        <div className="space-y-3">
          {translationCoverage.map(c => {
            const meta = LANGUAGE_META[c.language]
            return (
              <div key={c.language}>
                <div className="flex items-center justify-between text-xs font-bold text-gray-600 mb-1">
                  <span>{meta.flag} {meta.label}</span>
                  <span>{c.published}/{c.totalMissions} ({Math.round(c.pct)}%)</span>
                </div>
                <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full rounded-full ${accent.button.split(' ')[0]}`} style={{ width: `${Math.round(c.pct)}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
