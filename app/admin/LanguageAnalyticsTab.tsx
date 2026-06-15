'use client'
import React from 'react'
import { Globe, Repeat, Users, ArrowRightLeft, Download } from 'lucide-react'
import { ACCENT, LANGUAGE_META } from './missionMeta'
import StatCard from './StatCard'
import { exportCSV } from './exportUtils'
import type { LanguageAnalytics } from '@/lib/adminAnalytics'

const accent = ACCENT.indigo

export default function LanguageAnalyticsTab({ analytics }: { analytics: LanguageAnalytics }) {
  const { usage, totalSwitches, childrenWhoSwitched, switchesPerActiveLearner, topSwitchPairs } = analytics

  const handleExport = () => {
    exportCSV('language-analytics.csv', usage.map(u => ({
      language: u.language,
      active_children: u.activeChildren,
      learners: u.learners,
      completions: u.completions,
    })))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Language Analytics</h3>
          <p className="text-gray-500 text-sm">Usage and switching behavior across English, French &amp; Kinyarwanda</p>
        </div>
        <button
          onClick={handleExport}
          className={`inline-flex items-center gap-1.5 text-xs font-bold text-white px-3.5 py-2 rounded-full transition ${accent.button}`}
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* Usage cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {usage.map(({ language, activeChildren, learners, completions }) => {
          const meta = LANGUAGE_META[language]
          return (
            <div key={language} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${accent.tile}`}>
                  <Globe className="w-4 h-4" />
                </div>
                <span className="font-bold text-gray-800">{meta.flag} {meta.label}</span>
              </div>
              <p className="text-3xl font-extrabold text-gray-800 mb-1">{activeChildren}</p>
              <p className="text-xs text-gray-500">children set to this language · {learners} learners · {completions} completions</p>
            </div>
          )
        })}
      </div>

      {/* Switch frequency */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard icon={Repeat} label="Total Language Switches" value={totalSwitches} accentKey="violet" />
        <StatCard icon={Users} label="Children Who Switched" value={childrenWhoSwitched} accentKey="amber" />
        <StatCard icon={ArrowRightLeft} label="Switches / Active Learner" value={switchesPerActiveLearner.toFixed(2)} accentKey="emerald" />
      </div>

      {/* Top switch pairs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-base font-bold text-gray-800 mb-4">Top Language Switches</h3>
        {topSwitchPairs.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-4">No language switches recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {topSwitchPairs.map(pair => (
              <div key={`${pair.from}-${pair.to}`} className="flex items-center justify-between p-3 rounded-2xl border border-gray-100">
                <span className="font-semibold text-gray-700 text-sm">
                  {LANGUAGE_META[pair.from].flag} {LANGUAGE_META[pair.from].label} → {LANGUAGE_META[pair.to].flag} {LANGUAGE_META[pair.to].label}
                </span>
                <span className="text-sm font-bold text-gray-800">{pair.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
