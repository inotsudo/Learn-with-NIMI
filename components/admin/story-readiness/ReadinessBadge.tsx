'use client'

interface Props {
  status: string
  statusLabel: string
  statusColor: string
}

const COLORS: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-700',
  blue: 'bg-blue-100 text-blue-700',
  amber: 'bg-amber-100 text-amber-600',
  gray: 'bg-gray-100 text-gray-500',
}

export default function ReadinessBadge({ statusLabel, statusColor }: Props) {
  return (
    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${COLORS[statusColor] ?? COLORS.gray}`}>
      {statusLabel}
    </span>
  )
}
