'use client'
import React from 'react'
import { Award, Medal, Crown, Download } from 'lucide-react'
import { ACCENT } from './missionMeta'
import StatCard from './StatCard'
import { exportCSV } from './exportUtils'
import type { AchievementAnalytics, SlugCount } from '@/lib/adminAnalytics'

const accent = ACCENT.indigo
const MAX_BARS = 12

function SlugBar({ slug, count, max, color }: { slug: string; count: number; max: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-bold text-gray-600 mb-1 gap-2">
        <span className="truncate font-mono">{slug}</span>
        <span className="flex-shrink-0">{count}</span>
      </div>
      <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${max > 0 ? (count / max) * 100 : 0}%` }} />
      </div>
    </div>
  )
}

function SlugList({ slugs, color, emptyLabel }: { slugs: SlugCount[]; color: string; emptyLabel: string }) {
  if (slugs.length === 0) return <p className="text-center text-gray-400 text-sm py-4">{emptyLabel}</p>
  const max = Math.max(1, ...slugs.map(s => s.count))
  const shown = slugs.slice(0, MAX_BARS)
  return (
    <div className="space-y-3">
      {shown.map(s => <SlugBar key={s.slug} slug={s.slug} count={s.count} max={max} color={color} />)}
      {slugs.length > MAX_BARS && (
        <p className="text-xs text-gray-400 text-center pt-1">+{slugs.length - MAX_BARS} more types (see CSV export)</p>
      )}
    </div>
  )
}

export default function AchievementAnalyticsTab({ analytics }: { analytics: AchievementAnalytics }) {
  const { certificatesEarned, certificatesBySlug, badgesEarned, badgesBySlug, trilingualChampionCount } = analytics

  const handleExport = () => {
    exportCSV('achievement-analytics.csv', [
      ...certificatesBySlug.map(s => ({ type: 'certificate', slug: s.slug, count: s.count })),
      ...badgesBySlug.map(s => ({ type: 'badge', slug: s.slug, count: s.count })),
    ])
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Achievement Analytics</h3>
          <p className="text-gray-500 text-sm">Certificates, badges &amp; Trilingual Champions earned platform-wide</p>
        </div>
        <button
          onClick={handleExport}
          className={`inline-flex items-center gap-1.5 text-xs font-bold text-white px-3.5 py-2 rounded-full transition ${accent.button}`}
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Award} label="Certificates Earned" value={certificatesEarned} accentKey="amber" />
        <StatCard icon={Medal} label="Badges Earned" value={badgesEarned} accentKey="emerald" />
        <StatCard icon={Crown} label="Trilingual Champions" value={trilingualChampionCount} accentKey="violet" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-base font-bold text-gray-800 mb-1">Certificates by Type</h3>
        <p className="text-gray-500 text-sm mb-4">Language Explorer certificates earned per slug</p>
        <SlugList slugs={certificatesBySlug} color="bg-amber-400" emptyLabel="No certificates earned yet." />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-base font-bold text-gray-800 mb-1">Badges by Type</h3>
        <p className="text-gray-500 text-sm mb-4">Explorer &amp; Category Master badges earned per slug</p>
        <SlugList slugs={badgesBySlug} color="bg-emerald-400" emptyLabel="No badges earned yet." />
      </div>
    </div>
  )
}
