'use client'
import React, { useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import { getCachedAdmin } from './adminAuth'
import { GraduationCap, Menu, ChevronDown, Layers, Boxes, ListChecks, Rocket, Globe, Grid3x3, Upload, ExternalLink, Languages as LanguagesIcon } from 'lucide-react'
import { ACCENT, CATEGORY_ORDER, CATEGORY_META, FALLBACK_META } from './missionMeta'
import LevelEditor from './LevelEditor'
import UnitManager from './UnitManager'
import LessonManager from './LessonManager'
import PublishingCenter from './PublishingCenter'
import CoverageDashboard from './CoverageDashboard'
import CategoriesOverview from './CategoriesOverview'
import BulkImportManager from './BulkImportManager'

interface CurriculumManagerProps {
  onNavigate: (table: string) => void
  onOpenSidebar?: () => void
}

const accent = ACCENT.green

const TABS = [
  { key: 'levels', label: 'Levels', icon: Layers },
  { key: 'units', label: 'Units', icon: Boxes },
  { key: 'lessons', label: 'Lessons', icon: ListChecks },
  { key: 'publishing', label: 'Publishing', icon: Rocket },
  { key: 'coverage', label: 'Coverage', icon: Globe },
  { key: 'categories', label: 'Categories', icon: Grid3x3 },
  { key: 'import', label: 'Bulk Import', icon: Upload },
  { key: 'links', label: 'Quick Links', icon: ExternalLink },
] as const

type TabKey = typeof TABS[number]['key']

export default function CurriculumManager({ onNavigate, onOpenSidebar }: CurriculumManagerProps) {
  const [tab, setTab] = useState<TabKey>('levels')
  const [admin, setAdmin] = useState<{ name: string; role: string } | null>(null)

  useEffect(() => {
    void getCachedAdmin().then(d => { if (d) setAdmin(d) })
  }, [])

  return (
    <div>
      {/* Header */}
      <header className={`border-b border-gray-100 px-4 sm:px-6 py-5 ${accent.soft}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3.5 min-w-0">
            <button
              onClick={onOpenSidebar}
              className="lg:hidden flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-100 hover:bg-gray-50 text-gray-600 shadow-sm transition mt-0.5"
            >
              <Menu size={17} />
            </button>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm bg-white ${accent.text}`}>
              <GraduationCap className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                Curriculum <span className="text-lg">🎓</span>
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">
                Manage levels, categories &amp; bulk-import multilingual mission content
              </p>
              <p className="text-xs text-gray-400 mt-1.5">
                <button onClick={() => onNavigate('Dashboard')} className={`font-bold hover:underline ${accent.text}`}>Dashboard</button>
                <span className="mx-1.5 text-gray-300">/</span>
                <span className="font-bold text-gray-500">Curriculum</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-100 pl-1.5 pr-3 py-1.5 rounded-full shadow-sm">
            <img src="/nimi-logo-circle.png" alt="Profile" className="w-7 h-7 rounded-full object-cover flex-shrink-0 ring-2 ring-white"  loading="lazy" />
            <div className="hidden sm:block leading-tight">
              <p className="text-sm font-semibold text-gray-700">{admin?.name ?? 'Admin'}</p>
              <p className="text-[10px] text-gray-400 uppercase font-bold">{admin?.role ?? 'admin'}</p>
            </div>
            <ChevronDown size={14} className="text-gray-400" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1.5 mt-5 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-bold transition whitespace-nowrap ${
                tab === t.key ? `text-white shadow-sm ${accent.button}` : 'text-gray-500 hover:bg-white/70'
              }`}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Body */}
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {tab === 'levels' && <LevelEditor />}
        {tab === 'units' && <UnitManager />}
        {tab === 'lessons' && <LessonManager onNavigate={onNavigate} />}
        {tab === 'publishing' && <PublishingCenter onNavigate={onNavigate} />}
        {tab === 'coverage' && <CoverageDashboard onNavigate={onNavigate} />}
        {tab === 'categories' && <CategoriesOverview />}
        {tab === 'import' && <BulkImportManager />}
        {tab === 'links' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-gray-800">Quick Links</h3>
              <p className="text-gray-500 text-sm">Jump straight to the per-category mission content or the translation dashboard.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {CATEGORY_ORDER.map(slug => {
                const meta = CATEGORY_META[slug] ?? FALLBACK_META
                const catAccent = ACCENT[meta.accent]
                return (
                  <button
                    key={slug}
                    onClick={() => onNavigate('mission:' + slug)}
                    className="flex items-center gap-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-left hover:shadow-md transition"
                  >
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${catAccent.tile}`}>
                      <meta.icon className="w-5 h-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-gray-800 truncate">{meta.label}</span>
                      <span className="block text-xs text-gray-400">Daily Adventures → Mission Content</span>
                    </span>
                  </button>
                )
              })}
              <button
                onClick={() => onNavigate('mission_versions')}
                className="flex items-center gap-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-left hover:shadow-md transition"
              >
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${ACCENT.sky.tile}`}>
                  <LanguagesIcon className="w-5 h-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-gray-800 truncate">Languages &amp; Translations</span>
                  <span className="block text-xs text-gray-400">Coverage &amp; content workflow dashboard</span>
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
