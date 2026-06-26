'use client'

interface Props {
  score: number
  size?: number
  strokeWidth?: number
  hideLabel?: boolean
}

export default function ReadinessRing({ score, size = 120, strokeWidth = 8, hideLabel }: Props) {
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - score / 100)
  const color = score === 100 ? '#22c55e' : score >= 90 ? '#3b82f6' : score >= 50 ? '#f59e0b' : '#9ca3af'

  const scoreFontSize = size <= 36 ? 10 : size <= 60 ? 14 : size <= 80 ? 18 : 24
  const labelFontSize = size <= 36 ? 0 : size <= 60 ? 7 : 9

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-extrabold text-gray-900 leading-none" style={{ fontSize: scoreFontSize }}>{score}%</span>
        {!hideLabel && labelFontSize > 0 && (
          <span className="text-gray-400 font-semibold" style={{ fontSize: labelFontSize }}>Readiness</span>
        )}
      </div>
    </div>
  )
}
