'use client'
import React from 'react'

/** Base pulsing placeholder block. Compose with width/height classes. */
export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} style={style} />
}

/** Bar-chart placeholder, e.g. the Analytics activity trend. */
export function SkeletonBarChart({ bars = 14 }: { bars?: number }) {
  const heights = [40, 65, 30, 80, 55, 25, 70, 45, 90, 35, 60, 50, 75, 20]
  return (
    <div className="flex items-end gap-1.5 h-32">
      {Array.from({ length: bars }).map((_, i) => (
        <Skeleton key={i} className="flex-1 rounded-t-md" style={{ height: `${heights[i % heights.length]}%` }} />
      ))}
    </div>
  )
}

/** Header banner placeholder used by page.tsx's generic dynamic-import fallback. */
export function SkeletonHeaderBanner() {
  return (
    <header className="border-b border-gray-100 px-4 sm:px-6 py-5 bg-gray-50">
      <div className="flex items-center gap-3.5">
        <Skeleton className="w-12 h-12 rounded-2xl flex-shrink-0" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
    </header>
  )
}

/** Row of stat cards, e.g. Dashboard / Analytics / Certificates summary tiles. */
export function SkeletonStatCards({ count = 4, cols = 'sm:grid-cols-2 lg:grid-cols-4' }: { count?: number; cols?: string }) {
  return (
    <div className={`grid grid-cols-2 ${cols} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <Skeleton className="w-9 h-9 rounded-xl" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  )
}

/** Grid of content cards, e.g. adventure/story/coloring-book tiles. */
export function SkeletonCardGrid({ count = 4, cols = 'sm:grid-cols-2 lg:grid-cols-4' }: { count?: number; cols?: string }) {
  return (
    <div className={`grid grid-cols-1 ${cols} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}

/** Vertical list of avatar+text rows, e.g. directories (administrators, achievements, activity). */
export function SkeletonList({ rows = 5, avatar = true }: { rows?: number; avatar?: boolean }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          {avatar && <Skeleton className="w-11 h-11 rounded-full flex-shrink-0" />}
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Header row + body rows, e.g. coverage/leaderboard tables and TableView. */
export function SkeletonTable({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2.5">
      <div className="flex gap-4">
        {Array.from({ length: cols }).map((_, i) => <Skeleton key={i} className="h-3 flex-1" />)}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }).map((_, c) => <Skeleton key={c} className="h-7 flex-1" />)}
        </div>
      ))}
    </div>
  )
}

/** Two-pane list + detail layout shared by Children/Parents/Settings/Rewards/Mission/Story/Coloring managers. */
export function SkeletonSplitPane({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
      <div className="w-full lg:w-[400px] flex-shrink-0 border-b lg:border-b-0 lg:border-r border-gray-100 bg-white p-3 space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl">
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
          </div>
        ))}
      </div>
      <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-to-b from-gray-50 to-white">
        <Skeleton className="w-20 h-20 rounded-2xl" />
      </div>
    </div>
  )
}

/** Stacked label+input placeholders, e.g. AdminProfile form fields. */
export function SkeletonForm({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      ))}
    </div>
  )
}
