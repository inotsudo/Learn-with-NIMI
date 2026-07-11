'use client'

import { Search, Filter } from 'lucide-react'

export type PublishingFilter = 'all' | 'draft' | 'review' | 'published' | 'retired' | 'ready' | 'missing'

interface Props {
  filter: PublishingFilter
  onFilterChange: (f: PublishingFilter) => void
  search: string
  onSearchChange: (s: string) => void
}

const TABS: { key: PublishingFilter; label: string }[] = [
  { key: 'all', label: 'All Stories' },
  { key: 'draft', label: 'Draft' },
  { key: 'review', label: 'Review' },
  { key: 'published', label: 'Published' },
  { key: 'retired', label: 'Retired' },
  { key: 'ready', label: 'Ready To Publish' },
  { key: 'missing', label: 'Missing Assets' },
]

export default function PublishingFilters({ filter, onFilterChange, search, onSearchChange }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search stories..." value={search} onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-[13px] font-medium text-gray-700 focus:outline-none focus:border-green-500" />
        </div>
      </div>
      <div className="flex gap-1 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => onFilterChange(t.key)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition ${
              filter === t.key ? 'bg-green-50 text-green-700' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            }`}>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
