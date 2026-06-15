'use client'
import React from 'react'
import { Users, UserCheck, Sun, CalendarDays, Download } from 'lucide-react'
import { ACCENT } from './missionMeta'
import StatCard from './StatCard'
import { exportCSV } from './exportUtils'
import type { LearnerAnalytics } from '@/lib/adminAnalytics'

const accent = ACCENT.indigo

export default function LearnerAnalyticsTab({ analytics }: { analytics: LearnerAnalytics }) {
  const { totalLearners, activeLearners, dailyActiveLearners, weeklyActiveLearners } = analytics

  const handleExport = () => {
    exportCSV('learner-analytics.csv', [
      { metric: 'Total Learners', value: totalLearners },
      { metric: 'Active Learners', value: activeLearners },
      { metric: 'Daily Active Learners', value: dailyActiveLearners },
      { metric: 'Weekly Active Learners', value: weeklyActiveLearners },
    ])
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Learner Analytics</h3>
          <p className="text-gray-500 text-sm">Platform-wide engagement snapshot</p>
        </div>
        <button
          onClick={handleExport}
          className={`inline-flex items-center gap-1.5 text-xs font-bold text-white px-3.5 py-2 rounded-full transition ${accent.button}`}
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Learners" value={totalLearners} accentKey="indigo" />
        <StatCard icon={UserCheck} label="Active Learners" value={activeLearners} accentKey="emerald" />
        <StatCard icon={Sun} label="Daily Active" value={dailyActiveLearners} accentKey="amber" />
        <StatCard icon={CalendarDays} label="Weekly Active" value={weeklyActiveLearners} accentKey="violet" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-sm text-gray-500 space-y-1.5">
        <p><span className="font-bold text-gray-700">Active learners</span> have completed at least one mission, ever.</p>
        <p><span className="font-bold text-gray-700">Daily active</span> completed a mission today; <span className="font-bold text-gray-700">weekly active</span> completed one in the last 7 days.</p>
      </div>
    </div>
  )
}
