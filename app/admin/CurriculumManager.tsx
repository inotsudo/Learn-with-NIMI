'use client'
import React, { useState } from 'react'
import { GraduationCap, Menu, Layers, Boxes, ListChecks, Rocket, Globe, Grid3x3, Upload, ExternalLink, Languages as LanguagesIcon } from 'lucide-react'
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5 flex-shrink-0">
        <div className="flex items-start gap-3.5 min-w-0">
          <button
            onClick={onOpenSidebar}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-gray-500"
          >
            <Menu size={17} />
          </button>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm bg-white ${accent.text}`}>
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[22px] font-extrabold text-gray-900 flex items-center gap-2">
              Curriculum <span className="text-lg">🎓</span>
            </h1>
            <p className="text-[13px] text-gray-500 mt-0.5">
              Manage levels, categories &amp; bulk-import multilingual mission content
            </p>
            <p className="text-xs text-gray-400 mt-1.5">
              <button onClick={() => onNavigate('Dashboard')} className="font-bold hover:underline text-gray-600">Dashboard</button>
              <span className="mx-1.5 text-gray-300">/</span>
              <span className="font-bold text-gray-500">Curriculum</span>
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1.5 mt-5 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-bold transition whitespace-nowrap flex-shrink-0 ${
                tab === t.key ? `text-white shadow-sm ${accent.button}` : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="p-6 lg:p-8 max-w-7xl mx-auto overflow-y-auto flex-1">
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
