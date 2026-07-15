'use client'

import { useEffect, useRef, useState } from 'react'
import { Upload, RefreshCw, Image as ImageIcon } from 'lucide-react'
import supabase from '@/lib/supabaseClient'
import { useToast } from './Toast'

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'rw', label: 'Kinyarwanda', flag: '🇷🇼' },
] as const

type LangCode = 'en' | 'fr' | 'rw'

interface StoryRow {
  id: string
  slug: string
  title: string
  theme_emoji?: string | null
}

interface BadgeRow {
  slug: string
  image_url: string | null
  label: string | null
}

interface Props {
  onOpenSidebar: () => void
}

export default function BadgesManager({ onOpenSidebar }: Props) {
  const { toast } = useToast()
  const [stories, setStories] = useState<StoryRow[]>([])
  const [badgeMap, setBadgeMap] = useState<Record<string, BadgeRow>>({})
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingSlug, setPendingSlug] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const [{ data: storyData }, { data: badgeData }] = await Promise.all([
      supabase.from('stories').select('id, slug, title, theme_emoji').order('sort_order'),
      supabase.from('badge_images').select('slug, image_url, label'),
    ])
    setStories((storyData ?? []) as StoryRow[])
    const map: Record<string, BadgeRow> = {}
    for (const b of (badgeData ?? []) as BadgeRow[]) {
      map[b.slug] = b
    }
    setBadgeMap(map)
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const handleUpload = async (badgeSlug: string, file: File) => {
    setUploading(badgeSlug)
    try {
      const ext = file.name.split('.').pop() ?? 'png'
      const path = `${badgeSlug}.${ext}`

      await supabase.storage.from('badges').remove([path])

      const { error: upErr } = await supabase.storage
        .from('badges')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (upErr) { toast(upErr.message, 'error'); return }

      const { data: { publicUrl } } = supabase.storage.from('badges').getPublicUrl(path)

      const { error: dbErr } = await supabase
        .from('badge_images')
        .upsert({ slug: badgeSlug, image_url: publicUrl, updated_at: new Date().toISOString() })

      if (dbErr) { toast(dbErr.message, 'error'); return }

      toast(`Badge updated: ${badgeSlug}`, 'success')
      await load()
    } finally {
      setUploading(null)
    }
  }

  const triggerUpload = (slug: string) => {
    setPendingSlug(slug)
    fileInputRef.current?.click()
  }

  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !pendingSlug) return
    e.target.value = ''
    await handleUpload(pendingSlug, file)
    setPendingSlug(null)
  }

  const uploadedCount = stories.reduce((sum, s) => {
    return sum + LANGUAGES.filter(l => badgeMap[`${s.slug}-${l.code}`]?.image_url).length
  }, 0)
  const totalSlots = stories.length * 3

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/svg+xml,image/jpeg,image/webp"
        className="hidden"
        onChange={onFileChosen}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">🏅 Badge Images</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Each story has 3 badges — one per language. Upload a PNG or SVG for each slot.
          </p>
          {!loading && (
            <p className="text-xs text-gray-400 mt-1">
              {uploadedCount} / {totalSlots} images uploaded
            </p>
          )}
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Story list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white border border-gray-100 rounded-xl p-5 animate-pulse space-y-3">
              <div className="h-5 bg-gray-100 rounded w-40" />
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map(j => <div key={j} className="h-32 bg-gray-100 rounded-xl" />)}
              </div>
            </div>
          ))}
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ImageIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No stories found</p>
          <p className="text-sm mt-1">Add stories first, then come back to upload badge images.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {stories.map(story => {
            const allUploaded = LANGUAGES.every(l => badgeMap[`${story.slug}-${l.code}`]?.image_url)
            const noneUploaded = LANGUAGES.every(l => !badgeMap[`${story.slug}-${l.code}`]?.image_url)
            return (
              <div key={story.slug} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {/* Story header */}
                <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50">
                  <span className="text-xl">{story.theme_emoji ?? '📖'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-800 text-sm">{story.title}</p>
                    <p className="text-[11px] text-gray-400 font-mono">{story.slug}</p>
                  </div>
                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                    allUploaded
                      ? 'bg-green-100 text-green-700'
                      : noneUploaded
                        ? 'bg-gray-100 text-gray-400'
                        : 'bg-amber-100 text-amber-700'
                  }`}>
                    {LANGUAGES.filter(l => badgeMap[`${story.slug}-${l.code}`]?.image_url).length} / 3
                  </span>
                </div>

                {/* 3 language slots */}
                <div className="grid grid-cols-3 gap-0 divide-x divide-gray-100">
                  {LANGUAGES.map(lang => {
                    const badgeSlug = `${story.slug}-${lang.code}`
                    const badge = badgeMap[badgeSlug]
                    const isUploading = uploading === badgeSlug
                    const hasImage = !!badge?.image_url

                    return (
                      <div key={lang.code} className="p-4 flex flex-col items-center gap-3">
                        {/* Lang label */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{lang.flag}</span>
                          <span className="text-xs font-black text-gray-700">{lang.label}</span>
                        </div>

                        {/* Image preview */}
                        <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
                          {hasImage ? (
                            <img
                              src={badge!.image_url!}
                              alt={badgeSlug}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <ImageIcon className="w-7 h-7 text-gray-300" />
                          )}
                        </div>

                        {/* Upload button */}
                        <button
                          onClick={() => triggerUpload(badgeSlug)}
                          disabled={isUploading}
                          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-black rounded-lg transition disabled:opacity-50 ${
                            hasImage
                              ? 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                              : 'text-white bg-green-600 hover:bg-green-700'
                          }`}
                        >
                          {isUploading ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Upload className="w-3 h-3" />
                          )}
                          {hasImage ? 'Replace' : 'Upload'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
