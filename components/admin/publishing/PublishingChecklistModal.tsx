'use client'

import { X } from 'lucide-react'
import { computeReadiness } from '@/lib/storyReadiness'
import ReadinessRing from '@/components/admin/story-readiness/ReadinessRing'
import ReadinessChecklist from '@/components/admin/story-readiness/ReadinessChecklist'
import ReadinessBadge from '@/components/admin/story-readiness/ReadinessBadge'

interface Props {
  story: any
  onClose: () => void
}

export default function PublishingChecklistModal({ story, onClose }: Props) {
  const r = computeReadiness(story)

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-ds-card border border-ds-border max-w-lg w-full max-h-[85vh] overflow-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
            <div>
              <h2 className="text-[16px] font-extrabold text-gray-800">Story Checklist</h2>
              <p className="text-[12px] text-gray-400">{story.title}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition">
              <X size={16} />
            </button>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <ReadinessRing score={r.score} size={100} strokeWidth={8} />
              <div>
                <ReadinessBadge status={r.status} statusLabel={r.statusLabel} statusColor={r.statusColor} />
                <p className="text-[13px] text-gray-500 mt-1">{r.completed}/{r.total} requirements completed</p>
                {r.score === 100 && <p className="text-[12px] text-emerald-600 font-bold mt-1">Ready to publish! 🎉</p>}
                {r.score < 100 && <p className="text-[12px] text-amber-600 font-medium mt-1">Complete {r.total - r.completed} more item{r.total - r.completed === 1 ? '' : 's'} to publish</p>}
              </div>
            </div>
            <ReadinessChecklist items={r.items} />
          </div>
        </div>
      </div>
    </>
  )
}
