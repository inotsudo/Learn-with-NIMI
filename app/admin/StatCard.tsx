'use client'
import React from 'react'
import { ACCENT, type AccentKey } from './missionMeta'

export default function StatCard({ icon: Icon, label, value, accentKey }: { icon: React.ElementType; label: string; value: string | number; accentKey: AccentKey }) {
  const a = ACCENT[accentKey]
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${a.tile}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-extrabold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
    </div>
  )
}
