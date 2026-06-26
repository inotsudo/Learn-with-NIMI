'use client'

import { CheckCircle2, AlertCircle } from 'lucide-react'
import type { ReadinessItem } from '@/lib/storyReadiness'

interface Props {
  items: ReadinessItem[]
}

export default function ReadinessChecklist({ items }: Props) {
  const assets = items.filter(i => i.group === 'assets')
  const activities = items.filter(i => i.group === 'activities')

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Story Assets</p>
        <div className="space-y-1.5">
          {assets.map(item => (
            <div key={item.key} className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${
              item.done ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-gray-100'
            }`}>
              {item.done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span className={`text-[13px] font-medium flex-1 ${item.done ? 'text-gray-700' : 'text-gray-500'}`}>{item.label}</span>
              <span className={`text-[10px] font-bold ${item.done ? 'text-emerald-600' : 'text-amber-500'}`}>
                {item.done ? 'Completed' : 'Missing'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Adventure Activities</p>
        <div className="space-y-1.5">
          {activities.map(item => (
            <div key={item.key} className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${
              item.done ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-gray-100'
            }`}>
              {item.done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span className={`text-[13px] font-medium flex-1 ${item.done ? 'text-gray-700' : 'text-gray-500'}`}>{item.label}</span>
              <span className={`text-[10px] font-bold ${item.done ? 'text-emerald-600' : 'text-amber-500'}`}>
                {item.done ? 'Completed' : 'Missing'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
