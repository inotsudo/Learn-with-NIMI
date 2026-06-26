'use client'

import { useSearchParams } from 'next/navigation'
import { Eye, X } from 'lucide-react'

export function usePreviewMode() {
  const params = useSearchParams()
  return params.get('preview') === 'true'
}

export default function PreviewBanner() {
  const isPreview = usePreviewMode()
  if (!isPreview) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-amber-900 px-4 py-2 flex items-center justify-center gap-3 shadow-lg">
      <Eye size={16} />
      <span className="text-[13px] font-bold">Preview Mode — Viewing as Child</span>
      <span className="text-[11px] font-medium bg-amber-600/30 px-2 py-0.5 rounded">Read-only · No progress saved</span>
      <button onClick={() => window.close()} className="ml-4 flex items-center gap-1 bg-amber-600/30 hover:bg-amber-600/50 px-3 py-1 rounded-lg text-[12px] font-bold transition">
        <X size={14} /> Exit Preview
      </button>
    </div>
  )
}
