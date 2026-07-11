'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useMotionValue } from 'framer-motion'
import { CheckCircle2, Crown, Save, X } from 'lucide-react'
import supabase from '@/lib/supabaseClient'
import { getStorageUrl } from '@/lib/queries'
import type { PagePhotoConfig, PersonalizationConfig, StoryPageRow, StoryRow } from './missionMeta'

// ── Preview dimensions (PDF is 612×792 pts; we show it at 1/3 scale) ──
const PREVIEW_W = 204   // 612 / 3
const PREVIEW_H = 264   // 792 / 3
const PDF_W     = 612
const SCALE     = PREVIEW_W / PDF_W   // 1/3

const DEFAULT_CONFIG: PagePhotoConfig = { x: 200, y: 300, size: 150 }

// Convert PDF coordinates → screen coordinates (top-left of circle)
function toScreen(c: PagePhotoConfig): { x: number; y: number; size: number } {
  const size = c.size * SCALE
  return {
    x:    c.x * SCALE,
    y:    PREVIEW_H - (c.y + c.size) * SCALE,  // flip Y (PDF origin = bottom-left)
    size,
  }
}

// Convert screen position (top-left of circle) → PDF coordinates
function toPdf(screenX: number, screenY: number, screenSize: number): PagePhotoConfig {
  return {
    x:    Math.round(screenX / SCALE),
    y:    Math.round((PREVIEW_H - screenY - screenSize) / SCALE),
    size: Math.round(screenSize / SCALE),
  }
}

// ── Single page placement card ──────────────────────────────────────────
function PagePlacementCard({
  page,
  config,
  onChange,
  onRemove,
  isConfigured,
}: {
  page: StoryPageRow
  config: PagePhotoConfig
  onChange: (c: PagePhotoConfig) => void
  onRemove: () => void
  isConfigured: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sc = toScreen(config)
  const mx = useMotionValue(sc.x)
  const my = useMotionValue(sc.y)

  // Keep motion values in sync when config changes externally
  useEffect(() => {
    const s = toScreen(config)
    mx.set(s.x)
    my.set(s.y)
  }, [config.x, config.y, config.size]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDragEnd = useCallback(() => {
    const rawX = mx.get()
    const rawY = my.get()
    const screenSize = config.size * SCALE
    // Clamp within preview bounds
    const clampedX = Math.max(0, Math.min(rawX, PREVIEW_W - screenSize))
    const clampedY = Math.max(0, Math.min(rawY, PREVIEW_H - screenSize))
    onChange(toPdf(clampedX, clampedY, screenSize))
  }, [mx, my, config.size, onChange])

  const imageUrl = page.image_url ? getStorageUrl(page.image_url) : null

  return (
    <div className="flex flex-col items-center gap-2 min-w-[220px]">
      <div className="flex items-center justify-between w-full px-1">
        <p className="text-[11px] font-black text-gray-500 uppercase tracking-wide">Page {page.page_number}</p>
        {isConfigured && (
          <button onClick={onRemove} title="Remove photo from this page"
            className="flex items-center gap-0.5 text-[10px] text-red-400 hover:text-red-600 font-bold transition">
            <X size={11} /> Remove
          </button>
        )}
      </div>

      {/* Preview container */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-xl border-2 border-gray-200 bg-gray-100 shrink-0"
        style={{ width: PREVIEW_W, height: PREVIEW_H }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={`Page ${page.page_number}`}
            className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm font-bold">
            No image
          </div>
        )}

        {/* Draggable photo circle */}
        <motion.div
          drag
          dragMomentum={false}
          dragConstraints={containerRef}
          dragElastic={0}
          style={{
            x: mx, y: my,
            width:  config.size * SCALE,
            height: config.size * SCALE,
            position: 'absolute',
            top: 0, left: 0,
          }}
          onDragEnd={handleDragEnd}
          className="cursor-grab active:cursor-grabbing z-10"
          whileDrag={{ scale: 1.06 }}
        >
          <div
            className="w-full h-full rounded-full border-[3px] border-white shadow-lg overflow-hidden flex items-center justify-center"
            style={{ background: 'rgba(251,191,36,0.25)', backdropFilter: 'blur(2px)' }}
          >
            <span className="text-2xl">👤</span>
          </div>
          {/* Drag handle hint */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-400 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full whitespace-nowrap pointer-events-none">
            drag me
          </div>
        </motion.div>
      </div>

      {/* Size slider */}
      <div className="w-full px-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold text-gray-400">Size</span>
          <span className="text-[10px] font-black text-gray-600">{config.size}pt</span>
        </div>
        <input
          type="range" min={60} max={300} step={5} value={config.size}
          onChange={e => {
            const newSize = Number(e.target.value)
            onChange({ ...config, size: newSize })
          }}
          className="w-full accent-amber-400 h-1.5 rounded-full"
        />
      </div>

      {/* Coordinate readout */}
      <div className="flex gap-3 text-[10px] text-gray-400 font-mono">
        <span>x:{config.x}</span>
        <span>y:{config.y}</span>
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────
interface Props {
  story: StoryRow
  onSaved: () => void
}

export default function PersonalizationEditor({ story, onSaved }: Props) {
  const [isPersonalizable, setIsPersonalizable] = useState(story.is_personalizable ?? false)
  const [pageConfigs, setPageConfigs] = useState<Record<string, PagePhotoConfig>>(() => {
    return story.personalization_config?.pages ?? {}
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const pages = story.story_pages.slice().sort((a, b) => a.page_number - b.page_number)

  const getConfig = (pageNumber: number): PagePhotoConfig =>
    pageConfigs[String(pageNumber)] ?? { ...DEFAULT_CONFIG }

  const setConfig = (pageNumber: number, c: PagePhotoConfig) => {
    setPageConfigs(prev => ({ ...prev, [String(pageNumber)]: c }))
  }

  const removeConfig = (pageNumber: number) => {
    setPageConfigs(prev => {
      const next = { ...prev }
      delete next[String(pageNumber)]
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    const personalizationConfig: PersonalizationConfig = { pages: pageConfigs }
    await supabase.from('stories').update({
      is_personalizable: isPersonalizable,
      personalization_config: isPersonalizable ? personalizationConfig : null,
    }).eq('id', story.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    onSaved()
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-amber-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center">
            <Crown size={16} className="text-amber-600" />
          </div>
          <div>
            <h3 className="font-extrabold text-gray-800 text-[14px]">Masterpiece Personalization</h3>
            <p className="text-[11px] text-gray-400">Configure where the child&apos;s photo appears on each page</p>
          </div>
        </div>

        {/* Toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="text-[12px] font-bold text-gray-500">{isPersonalizable ? 'Enabled' : 'Disabled'}</span>
          <button
            onClick={() => setIsPersonalizable(v => !v)}
            className={`w-10 h-6 rounded-full transition-colors relative ${isPersonalizable ? 'bg-amber-400' : 'bg-gray-200'}`}
          >
            <motion.div
              animate={{ x: isPersonalizable ? 18 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-md"
            />
          </button>
        </label>
      </div>

      {/* Content */}
      {isPersonalizable && (
        <div className="p-5 space-y-4">
          {pages.length === 0 ? (
            <p className="text-center text-gray-400 text-[13px] py-6">
              No story pages yet. Add pages in the Flip-Flop section above first.
            </p>
          ) : (
            <>
              <p className="text-[12px] text-gray-500 leading-relaxed">
                Drag the circle on each page to position where the child&apos;s circular photo will appear.
                Adjust the size slider. Only pages you configure here will show the photo.
              </p>

              {/* Page cards — horizontal scroll */}
              <div className="flex gap-4 overflow-x-auto pb-3 -mx-2 px-2">
                {pages.map(page => (
                  <PagePlacementCard
                    key={page.id}
                    page={page}
                    config={getConfig(page.page_number)}
                    onChange={c => setConfig(page.page_number, c)}
                    onRemove={() => removeConfig(page.page_number)}
                    isConfigured={String(page.page_number) in pageConfigs}
                  />
                ))}
              </div>

              {/* Cover page note */}
              <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                💡 The cover page always shows the child&apos;s photo centred — no configuration needed.
              </p>
            </>
          )}

          {/* Save button */}
          <div className="flex justify-end pt-2">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-white font-black text-[13px] px-5 py-2.5 rounded-xl shadow transition disabled:opacity-60">
              {saved
                ? <><CheckCircle2 size={15} /> Saved!</>
                : saving
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                  : <><Save size={15} /> Save Placement</>
              }
            </button>
          </div>
        </div>
      )}

      {!isPersonalizable && (
        <div className="px-5 py-4 text-center">
          <p className="text-[12px] text-gray-400">
            Enable personalization to configure photo placement per page.
          </p>
          <button onClick={handleSave} disabled={saving}
            className="mt-3 text-[12px] font-bold text-amber-500 hover:text-amber-700 transition">
            Save disabled state →
          </button>
        </div>
      )}
    </div>
  )
}
