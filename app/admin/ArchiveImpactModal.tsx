'use client'
import React from 'react'
import { AlertTriangle, Boxes } from 'lucide-react'

export interface ArchiveUsage {
  level_number: number
  unit_number: number
}

interface ArchiveImpactModalProps {
  missionLabel: string
  usages: ArchiveUsage[]
  onCancel: () => void
  onArchiveAnyway: () => void
  onReplaceLesson: () => void
}

export default function ArchiveImpactModal({ missionLabel, usages, onCancel, onArchiveAnyway, onReplaceLesson }: ArchiveImpactModalProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="archive-impact-title"
      >
        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-red-50 text-red-500">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 id="archive-impact-title" className="text-base font-bold text-gray-800 mb-1.5">
          Archive &quot;{missionLabel}&quot;?
        </h3>
        <p className="text-sm text-gray-500 leading-relaxed">
          This lesson is still assigned in the curriculum. Archiving it now will remove it from every Level/Unit below until you assign a replacement.
        </p>

        <div className="mt-3 space-y-1.5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Used In</p>
          {usages.map((u, i) => (
            <div key={i} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm font-semibold text-gray-700">
              <Boxes className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              Level {u.level_number} / Unit {u.unit_number}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 mt-5 flex-wrap">
          <button onClick={onCancel} className="px-4 py-2 rounded-full text-sm font-bold text-gray-600 hover:bg-gray-100 transition">
            Cancel
          </button>
          <button onClick={onReplaceLesson} className="px-4 py-2 rounded-full text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition">
            Replace Lesson
          </button>
          <button onClick={onArchiveAnyway} className="px-4 py-2 rounded-full text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition">
            Archive Anyway
          </button>
        </div>
      </div>
    </div>
  )
}
