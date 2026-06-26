'use client'

import { computeReadiness, type ReadinessResult } from '@/lib/storyReadiness'
import ReadinessRing from './ReadinessRing'
import ReadinessChecklist from './ReadinessChecklist'
import ReadinessBadge from './ReadinessBadge'

interface Props {
  story: {
    id: string
    title: string
    slug: string
    cover_url?: string | null
    story_versions?: any[]
    story_slots?: any[]
  }
  compact?: boolean
}

export default function StoryReadinessCard({ story, compact = false }: Props) {
  const r = computeReadiness(story)

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <ReadinessRing score={r.score} size={48} strokeWidth={5} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-gray-800 truncate">{story.title}</p>
          <ReadinessBadge status={r.status} statusLabel={r.statusLabel} statusColor={r.statusColor} />
        </div>
        <span className="text-[12px] font-bold text-gray-500">{r.completed}/{r.total}</span>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-start gap-6">
        <div className="shrink-0 text-center">
          <ReadinessRing score={r.score} />
          <div className="mt-2">
            <ReadinessBadge status={r.status} statusLabel={r.statusLabel} statusColor={r.statusColor} />
          </div>
          <p className="text-[11px] text-gray-400 mt-1">{r.completed}/{r.total} complete</p>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[16px] font-extrabold text-gray-800 mb-4">{story.title}</h3>
          <ReadinessChecklist items={r.items} />
        </div>
      </div>
    </div>
  )
}

export { computeReadiness }
export type { ReadinessResult }
