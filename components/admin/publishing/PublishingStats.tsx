'use client'

import { BookOpen, CheckCircle2, AlertTriangle, Clock } from 'lucide-react'

interface Props {
  published: number
  ready: number
  review: number
  missing: number
}

export default function PublishingStats({ published, ready, review, missing }: Props) {
  const cards = [
    { icon: BookOpen, label: 'Stories Published', value: published, color: 'bg-emerald-50 text-emerald-600' },
    { icon: CheckCircle2, label: 'Ready To Publish', value: ready, color: 'bg-blue-50 text-blue-600' },
    { icon: Clock, label: 'In Review', value: review, color: 'bg-amber-50 text-amber-600' },
    { icon: AlertTriangle, label: 'Missing Assets', value: missing, color: 'bg-red-50 text-red-600' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(c => (
        <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${c.color}`}>
            <c.icon size={18} />
          </div>
          <p className="text-[24px] font-extrabold text-gray-900">{c.value}</p>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{c.label}</p>
        </div>
      ))}
    </div>
  )
}
