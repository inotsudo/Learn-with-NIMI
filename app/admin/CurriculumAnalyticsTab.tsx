'use client'
import React from 'react'
import { Layers, Clock, Footprints, Download } from 'lucide-react'
import { ACCENT, CATEGORY_META, FALLBACK_META } from './missionMeta'
import StatCard from './StatCard'
import { exportCSV } from './exportUtils'
import type { CurriculumAnalytics } from '@/lib/adminAnalytics'

const accent = ACCENT.emerald

export default function CurriculumAnalyticsTab({ analytics }: { analytics: CurriculumAnalytics }) {
  const { maxLevel, totalJourneys, levelStats, categoryStats, avgTimeToCompleteLevel1Days, dropOff } = analytics

  const handleExport = () => {
    exportCSV('curriculum-analytics-levels.csv', levelStats.map(s => ({
      level: s.level,
      reached: s.reached,
      completed: s.completed,
      completion_rate_pct: Math.round(s.completionRate * 100),
      drop_off_rate_pct: Math.round((dropOff.find(d => d.level === s.level)?.dropOffRate ?? 0) * 100),
    })))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Curriculum Analytics</h3>
          <p className="text-gray-500 text-sm">{totalJourneys} learner journey{totalJourneys === 1 ? '' : 's'} across {maxLevel} level{maxLevel === 1 ? '' : 's'}</p>
        </div>
        <button
          onClick={handleExport}
          className={`inline-flex items-center gap-1.5 text-xs font-bold text-white px-3.5 py-2 rounded-full transition ${accent.button}`}
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Layers} label="Curriculum Levels" value={maxLevel} accentKey="emerald" />
        <StatCard icon={Footprints} label="Learner Journeys" value={totalJourneys} accentKey="emerald" />
        <StatCard
          icon={Clock}
          label="Avg. Days to Complete Level 1"
          value={avgTimeToCompleteLevel1Days != null ? avgTimeToCompleteLevel1Days.toFixed(1) : '—'}
          accentKey="amber"
        />
      </div>

      {/* Per-level completion */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-base font-bold text-gray-800 mb-1">Completion Rate per Level</h3>
        <p className="text-gray-500 text-sm mb-4">Share of journeys that reached a level and went on to complete it</p>
        {levelStats.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-4">No level data yet.</p>
        ) : (
          <div className="space-y-3">
            {levelStats.map(s => (
              <div key={s.level}>
                <div className="flex items-center justify-between text-xs font-bold text-gray-600 mb-1">
                  <span>Level {s.level}</span>
                  <span>{s.completed}/{s.reached} ({Math.round(s.completionRate * 100)}%)</span>
                </div>
                <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full rounded-full ${accent.button.split(' ')[0]}`} style={{ width: `${Math.round(s.completionRate * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Per-category completion */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-base font-bold text-gray-800 mb-1">Completion Rate per Category</h3>
        <p className="text-gray-500 text-sm mb-4">Share of journeys that completed each category&apos;s Level-1 mission</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 text-xs font-bold uppercase tracking-wide border-b border-gray-100">
                <th className="py-2 pr-2">Category</th>
                <th className="py-2 px-2 text-center">Learners</th>
                <th className="py-2 px-2 text-center">Completion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {categoryStats.map(row => {
                const meta = CATEGORY_META[row.category] ?? FALLBACK_META
                const rowAccent = ACCENT[meta.accent]
                return (
                  <tr key={row.category}>
                    <td className="py-2.5 pr-2">
                      <div className="flex items-center gap-2 font-semibold text-gray-700">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${rowAccent.tile}`}>
                          <meta.icon className="w-3.5 h-3.5" />
                        </div>
                        {meta.label}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-gray-700">{row.learners}</td>
                    <td className="py-2.5 px-2 text-center font-bold text-gray-700">{Math.round(row.completionRate * 100)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drop-off funnel */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-base font-bold text-gray-800 mb-1">Drop-off Funnel</h3>
        <p className="text-gray-500 text-sm mb-4">Learners reaching each level vs. those who completed it</p>
        {dropOff.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-4">No level data yet.</p>
        ) : (
          <div className="space-y-3">
            {dropOff.map(d => (
              <div key={d.level} className="flex items-center gap-3">
                <span className="w-16 flex-shrink-0 text-xs font-bold text-gray-600">Level {d.level}</span>
                <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden flex">
                  <div className="h-full bg-emerald-400" style={{ width: `${d.reached > 0 ? (d.completed / d.reached) * 100 : 0}%` }} />
                  <div className="h-full bg-rose-300" style={{ width: `${d.reached > 0 ? d.dropOffRate * 100 : 0}%` }} />
                </div>
                <span className="w-48 flex-shrink-0 text-xs text-gray-500 text-right">
                  {d.reached} reached · {d.completed} completed · {Math.round(d.dropOffRate * 100)}% drop-off
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
