'use client'
import React, { useState, useRef, useEffect, useCallback } from 'react'
import supabase from '@/lib/supabaseClient'
import { getStorageUrl } from '@/lib/queries'
import { smartUpload, type UploadProgress } from '@/lib/uploadWithProgress'
import {
  Upload, CheckCircle2, AlertCircle, Image as ImageIcon,
  Video, Music, Users as UsersIcon, Play, Eye, Rocket,
  BookOpen, FileText, Palette, PersonStanding, Mic, Film,
  Plus, Trash2, FileArchive,
} from 'lucide-react'
import FlipFlopImporter from './FlipFlopImporter'
import ColoringImporter from './ColoringImporter'
import PersonalizationEditor from './PersonalizationEditor'
import { useToast } from './Toast'
import { computeReadiness } from '@/lib/storyReadiness'
import ReadinessRing from '@/components/admin/story-readiness/ReadinessRing'
import {
  LANGUAGES, LANGUAGE_META, SLOT_KEYS, SLOT_META,
  type Lang, type StoryRow, type SlotKey,
} from './missionMeta'

interface MissionVersionData {
  id: string; language: string; title: string; subtitle: string | null;
  media_url: string | null; status: string; published: boolean;
}

interface FlipFlopPage {
  id: string; page_number: number; image_url: string | null;
  story_page_versions: { id: string; language: string; audio_url: string | null; image_url: string | null }[];
}

interface ColoringPage {
  id: string; story_id?: string; page_number: number; template_image_url: string | null;
}

interface SlotData { story_id: string; slot_key: string; mission_id: string; sort_order: number }

interface StoryEditorProps { story: StoryRow; onSaved: () => void; defaultLang?: Lang }

const MISSION_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  flipflop_audio: BookOpen, story_pdf: FileText, coloring: Palette,
  move_explore: PersonStanding, sing_along: Mic, bonus_video: Film,
}
const MISSION_COLORS: Record<string, string> = {
  flipflop_audio: 'bg-blue-100 text-blue-600', story_pdf: 'bg-amber-100 text-amber-600',
  coloring: 'bg-pink-100 text-pink-600', move_explore: 'bg-green-100 text-green-600',
  sing_along: 'bg-purple-100 text-purple-600', bonus_video: 'bg-red-100 text-red-600',
}
const MISSION_ACCEPT: Record<string, string> = {
  flipflop_audio: 'audio/*', story_pdf: '.pdf,application/pdf', coloring: 'image/*',
  move_explore: 'video/*,audio/*', sing_along: 'audio/*', bonus_video: 'video/*',
}
const INTRO_FIELDS = [
  { key: 'intro_video_url', label: 'Intro Video', icon: Video, color: 'bg-red-100 text-red-600', accept: 'video/*' },
  { key: 'theme_song_url', label: 'Theme Song', icon: Music, color: 'bg-pink-100 text-pink-600', accept: 'audio/*' },
  { key: 'meet_characters_url', label: 'Meet Nimi & Piko', icon: UsersIcon, color: 'bg-blue-100 text-blue-600', accept: 'video/*' },
  { key: 'story_intro_url', label: 'Story Introduction', icon: Play, color: 'bg-purple-100 text-purple-600', accept: 'video/*,audio/*,image/*' },
]

/* ── Auto-save text input ── */
function AutoSaveInput({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => Promise<void> }) {
  const [val, setVal] = useState(value)
  const [saved, setSaved] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const save = useCallback(async (v: string) => {
    await onSave(v); setSaved(true); setTimeout(() => setSaved(false), 1500)
  }, [onSave])
  const handleChange = (v: string) => {
    setVal(v)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => save(v), 800)
  }
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <label className="text-[12px] sm:text-[13px] font-bold text-gray-500">{label}</label>
        {saved && <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5"><CheckCircle2 size={10} /> Saved</span>}
      </div>
      <input type="text" value={val} onChange={e => handleChange(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-[13px] sm:text-[14px] font-medium text-gray-800 focus:outline-none focus:border-green-400 transition" />
    </div>
  )
}

/* ── File uploader with real progress ── */
function FileUploader({ label, url, accept, bucket, pathPrefix, dbSave, onDone }: {
  label: string; url: string | null; accept: string
  bucket: string; pathPrefix: string
  dbSave: (storagePath: string | null) => Promise<void>
  onDone: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<(UploadProgress & { status: string }) | null>(null)
  const fileName = url?.split('/').pop() ?? ''

  const handleFile = async (f: File) => {
    const ext = f.name.split('.').pop()
    const path = `${pathPrefix}-${Date.now()}.${ext}`
    setProgress({ percent: 0, loaded: 0, total: f.size, status: 'Starting...' })

    const { error, storagePath } = await smartUpload(bucket, path, f, setProgress)
    if (!error) {
      await dbSave(storagePath)
      onDone()
    } else {
      setProgress({ percent: 0, loaded: 0, total: 0, status: `Failed: ${error.message}` })
    }
    setTimeout(() => setProgress(null), 2000)
  }

  const handleRemove = async () => {
    await dbSave(null)
    onDone()
  }

  const uploading = progress !== null && progress.percent < 100 && !progress.status.startsWith('Failed')

  return (
    <div>
      {uploading || (progress && progress.status.startsWith('Failed')) ? (
        <div className={`rounded-xl px-3 sm:px-4 py-3 ${progress?.status.startsWith('Failed') ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
          <div className="flex items-center gap-2.5 mb-2">
            {progress?.status.startsWith('Failed') ? (
              <AlertCircle size={16} className="text-red-500 shrink-0" />
            ) : (
              <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin shrink-0" />
            )}
            <span className={`text-[12px] sm:text-[13px] font-bold ${progress?.status.startsWith('Failed') ? 'text-red-600' : 'text-green-700'}`}>
              {progress?.status}
            </span>
          </div>
          {!progress?.status.startsWith('Failed') && (
            <div className="w-full bg-green-100 rounded-full h-2.5 sm:h-2">
              <div className="h-full bg-green-500 rounded-full transition-all duration-300" style={{ width: `${progress?.percent ?? 0}%` }} />
            </div>
          )}
        </div>
      ) : progress?.percent === 100 ? (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 sm:px-4 py-3">
          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          <span className="text-[12px] sm:text-[13px] text-emerald-700 font-bold">Uploaded successfully!</span>
        </div>
      ) : url ? (
        <div className="flex flex-wrap items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 sm:px-4 py-3">
          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          <span className="text-[11px] sm:text-[12px] text-emerald-700 font-medium truncate flex-1 min-w-0" title={fileName}>{fileName}</span>
          <div className="flex gap-1.5">
            <button onClick={() => ref.current?.click()}
              className="text-[11px] font-bold text-green-600 bg-white border border-green-200 hover:bg-green-50 rounded-lg px-3 py-2 transition">Replace</button>
            <button onClick={handleRemove}
              className="text-[11px] font-bold text-red-500 bg-white border border-red-200 hover:bg-red-50 rounded-lg px-3 py-2 transition">Remove</button>
          </div>
        </div>
      ) : (
        <button onClick={() => ref.current?.click()}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl py-5 sm:py-6 flex flex-col items-center gap-1.5 text-gray-400 hover:border-green-300 hover:text-green-500 hover:bg-green-50/30 transition min-h-[56px]">
          <Upload size={22} />
          <span className="text-[12px] sm:text-[13px] font-bold">Upload {label}</span>
        </button>
      )}
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
    </div>
  )
}

/* ── Main Editor ── */
export default function StoryEditor({ story, onSaved, defaultLang }: StoryEditorProps) {
  const { success: toastOk } = useToast()
  const [activeLang, setActiveLang] = useState<Lang>(defaultLang ?? 'en')
  const [coverUrl, setCoverUrl] = useState(story.cover_url ?? '')
  const [missionVersions, setMissionVersions] = useState<Record<string, MissionVersionData[]>>({})
  const [allStoryVersions, setAllStoryVersions] = useState<Record<Lang, { id: string } & Record<string, unknown>>>({} as Record<Lang, { id: string } & Record<string, unknown>>)
  const [publishing, setPublishing] = useState(false)
  const [flipflopPages, setFlipflopPages] = useState<FlipFlopPage[]>([])
  const [coloringPages, setColoringPages] = useState<ColoringPage[]>([])
  const [showFlipflopImporter, setShowFlipflopImporter] = useState(false)
  const [showColoringImporter, setShowColoringImporter] = useState(false)

  const [slots, setSlots] = useState<SlotData[]>((story.story_slots ?? []) as SlotData[])
  const version = allStoryVersions[activeLang]
  const readiness = computeReadiness({ ...story, cover_url: coverUrl })

  const loadContent = useCallback(async () => {
    let currentSlots = story.story_slots ?? []
    if (currentSlots.length === 0) {
      const { data } = await supabase.from('story_slots').select('story_id, slot_key, mission_id, sort_order').eq('story_id', story.id).order('sort_order')
      currentSlots = data ?? []
    }
    setSlots(currentSlots)

    const vMap: Record<string, MissionVersionData[]> = {}
    for (const sk of SLOT_KEYS) {
      const slot = currentSlots.find((s: SlotData) => s.slot_key === sk)
      if (slot?.mission_id) {
        const { data } = await supabase.from('mission_versions').select('*').eq('mission_id', slot.mission_id).order('language')
        if (data) vMap[sk] = data
      }
    }
    setMissionVersions(vMap)

    const { data: svs } = await supabase.from('story_versions').select('*').eq('story_id', story.id)
    const svMap = {} as Record<Lang, { id: string } & Record<string, unknown>>
    for (const sv of (svs ?? [])) { svMap[sv.language as Lang] = sv as { id: string } & Record<string, unknown> }
    setAllStoryVersions(svMap)

    const { data: pages } = await supabase.from('story_pages').select('id, page_number, image_url, story_page_versions(id, language, audio_url, image_url)').eq('story_id', story.id).order('page_number')
    setFlipflopPages(pages ?? [])

    const { data: cpages } = await supabase.from('coloring_pages').select('id, page_number, template_image_url').eq('story_id', story.id).order('page_number')
    setColoringPages(cpages ?? [])
  }, [story.id])

  useEffect(() => { loadContent() }, [loadContent])

  const defaultLangInitRef = useRef(false)
  useEffect(() => {
    if (!defaultLang) return
    if (defaultLangInitRef.current) toastOk(`${LANGUAGE_META[defaultLang].flag} Switched to ${LANGUAGE_META[defaultLang].label}`)
    defaultLangInitRef.current = true
    setActiveLang(defaultLang)
  }, [defaultLang])

  const reloadMissionVersions = async (slotKey: string) => {
    const slot = slots.find((s: SlotData) => s.slot_key === slotKey)
    if (!slot?.mission_id) return
    const { data } = await supabase.from('mission_versions').select('*').eq('mission_id', slot.mission_id).order('language')
    if (data) setMissionVersions(prev => ({ ...prev, [slotKey]: data }))
  }

  const saveField = async (field: string, value: string) => {
    await supabase.from('stories').update({ [field]: value || null }).eq('id', story.id)
    onSaved()
  }

  const toggleIsFree = async () => {
    await supabase.from('stories').update({ is_free: !story.is_free }).eq('id', story.id)
    onSaved()
  }

  const getOrCreateVersion = async (lang: Lang = activeLang): Promise<string | undefined> => {
    if (allStoryVersions[lang]?.id) return allStoryVersions[lang].id
    const { data } = await supabase.from('story_versions')
      .insert({ story_id: story.id, language: lang, title: story.title, published: false })
      .select('id').single()
    if (data) {
      setAllStoryVersions(prev => ({ ...prev, [lang]: { id: data.id } as { id: string } & Record<string, unknown> }))
    }
    onSaved()
    return data?.id
  }

  const getOrCreateMissionVersion = async (slotKey: string, lang: Lang): Promise<string | undefined> => {
    const existing = (missionVersions[slotKey] ?? []).find(v => v.language === lang)
    if (existing) return existing.id
    const slot = slots.find(s => s.slot_key === slotKey)
    if (!slot?.mission_id) return
    const meta = SLOT_META[slotKey as SlotKey]
    const { data } = await supabase.from('mission_versions')
      .insert({ mission_id: slot.mission_id, language: lang, title: meta.label, revision_number: 1, status: 'draft', published: false, is_current: true })
      .select('id').single()
    await reloadMissionVersions(slotKey)
    return data?.id
  }

  const publishLang = async () => {
    setPublishing(true)
    await supabase.from('stories').update({ status: 'published' }).eq('id', story.id)
    for (const sk of SLOT_KEYS) {
      const langVer = (missionVersions[sk] ?? []).find(v => v.language === activeLang)
      if (langVer && langVer.status !== 'published') {
        await supabase.from('mission_versions').update({ status: 'published' }).eq('id', langVer.id)
      }
    }
    // Ensure a story_versions row exists before publishing (gap fix: was silently skipped if no content had been uploaded yet)
    const svId = await getOrCreateVersion(activeLang)
    if (svId) await supabase.from('story_versions').update({ status: 'published', published: true }).eq('id', svId)
    await loadContent()
    onSaved()
    toastOk(`${LANGUAGE_META[activeLang].label} version published!`)
    setPublishing(false)
  }

  const versionRecord = version as Record<string, unknown> | undefined
  const introCount = INTRO_FIELDS.filter(f => versionRecord?.[f.key]).length
  const langMissionVer = (sk: string) => (missionVersions[sk] ?? []).find(v => v.language === activeLang)
  const singleFileMissions = ['story_pdf', 'move_explore', 'sing_along', 'bonus_video'] as const
  const missionCount = singleFileMissions.filter(sk => langMissionVer(sk)?.media_url).length
    + (flipflopPages.length >= 5 ? 1 : 0)
    + (coloringPages.length > 0 ? 1 : 0)

  const langReadiness = (() => {
    const total = 4 + 4 + 1 // 4 intros + 4 single missions + flipflop (coloring shared)
    let done = introCount
    done += singleFileMissions.filter(sk => langMissionVer(sk)?.media_url).length
    const audioPages = flipflopPages.filter(p => (p.story_page_versions ?? []).some(v => v.language === activeLang && v.audio_url))
    if (flipflopPages.length > 0 && audioPages.length >= flipflopPages.length * 0.5) done += 1
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
  })()

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-12 px-3 sm:px-4 lg:px-0">

      {/* Language tabs + progress */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Language switcher */}
        <div className="flex border-b border-gray-100">
          {LANGUAGES.map(lang => {
            const meta = LANGUAGE_META[lang]
            const sv = allStoryVersions[lang]
            const isPublished = !!(sv && (sv as Record<string, unknown>).published)
            return (
              <button key={lang} onClick={() => setActiveLang(lang)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-semibold transition border-b-2 ${
                  activeLang === lang ? 'border-green-600 text-green-600 bg-green-50/30' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}>
                <span>{meta.flag}</span>
                <span className="hidden sm:inline">{meta.label}</span>
                {isPublished && <CheckCircle2 size={12} className="text-emerald-500" />}
                {sv && !isPublished && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
              </button>
            )
          })}
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5">
          <ReadinessRing score={langReadiness.pct} size={48} strokeWidth={5} hideLabel />
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] sm:text-[16px] font-extrabold text-gray-800 truncate">{story.title} — {LANGUAGE_META[activeLang].label}</h2>
            <p className="text-[12px] text-gray-500">{langReadiness.done}/{langReadiness.total} items for this language</p>
            <div className="mt-1.5 w-full bg-gray-100 rounded-full h-2">
              <div className={`h-full rounded-full transition-all ${langReadiness.pct === 100 ? 'bg-emerald-500' : langReadiness.pct >= 50 ? 'bg-green-500' : 'bg-amber-400'}`}
                style={{ width: `${langReadiness.pct}%` }} />
            </div>
          </div>
          <button onClick={() => window.open(`/stories/${story.slug}?preview=true`, '_blank')}
            className="flex items-center gap-1.5 text-[11px] sm:text-[12px] font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl px-3 sm:px-4 py-2.5 transition shrink-0">
            <Eye size={14} /> Preview
          </button>
        </div>
      </div>

      {/* 1. Story Details */}
      <Section number={1} title="Story Details" subtitle="Basic information" done={!!(story.title && coverUrl)}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] lg:grid-cols-[1fr_240px] gap-4 sm:gap-5">
            <div className="space-y-4 order-2 sm:order-1">
              <AutoSaveInput label="Story Title" value={story.title} onSave={v => saveField('title', v)} />
              <AutoSaveInput label="Description" value={story.theme_title ?? ''} onSave={v => saveField('theme_title', v)} />
              <div className="grid grid-cols-2 gap-3">
                <AutoSaveInput label="Age Min" value={String(story.age_min ?? '')} onSave={v => saveField('age_min', v)} />
                <AutoSaveInput label="Age Max" value={String(story.age_max ?? '')} onSave={v => saveField('age_max', v)} />
              </div>
              {/* Free / Premium toggle */}
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-[13px] font-bold text-gray-700">
                    {story.is_free ? '🆓 Free story' : '👑 Premium story'}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {story.is_free ? 'Accessible without a subscription' : 'Requires active NIMIPIKO Club subscription'}
                  </p>
                </div>
                <button
                  onClick={toggleIsFree}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${story.is_free ? 'bg-emerald-400' : 'bg-gray-300'}`}
                  aria-label="Toggle free / premium"
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${story.is_free ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
            <div className="order-1 sm:order-2">
              <label className="text-[12px] font-bold text-gray-500 block mb-1.5">Cover Image</label>
              <FileUploader label="Cover" url={coverUrl || null} accept="image/*"
                bucket="storyBook" pathPrefix={`covers/${story.id}`}
                dbSave={async (p) => {
                  setCoverUrl(p ?? '')
                  await supabase.from('stories').update({ cover_url: p }).eq('id', story.id)
                }}
                onDone={onSaved} />
            </div>
          </div>
        </div>
      </Section>

      {/* 2. Intro Media — per language */}
      <Section number={2} title={`Story Introduction — ${LANGUAGE_META[activeLang].label}`} subtitle="Title, description & welcome media" done={introCount === 4}
        badge={`${introCount}/4`}>
        {/* Per-language title + description */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <AutoSaveInput
            label={`Title (${LANGUAGE_META[activeLang].label})`}
            value={(versionRecord?.title as string) ?? story.title}
            onSave={async (v) => {
              const vid = await getOrCreateVersion(activeLang)
              if (vid) { await supabase.from('story_versions').update({ title: v }).eq('id', vid); await loadContent() }
            }}
          />
          <AutoSaveInput
            label={`Description (${LANGUAGE_META[activeLang].label})`}
            value={(versionRecord?.description as string) ?? ''}
            onSave={async (v) => {
              const vid = await getOrCreateVersion(activeLang)
              if (vid) { await supabase.from('story_versions').update({ description: v || null }).eq('id', vid); await loadContent() }
            }}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {INTRO_FIELDS.map(field => {
            const url = (versionRecord?.[field.key] as string) ?? ''
            const Icon = field.icon
            return (
              <div key={field.key} className={`rounded-xl border p-4 ${url ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-lg ${field.color} flex items-center justify-center`}><Icon size={16} /></div>
                  <span className="text-[13px] font-bold text-gray-700">{field.label}</span>
                  {url && <CheckCircle2 size={14} className="text-emerald-500 ml-auto" />}
                </div>
                <FileUploader label={field.label} url={url || null} accept={field.accept}
                  bucket="storyBook" pathPrefix={`intro/${story.id}-${activeLang}-${field.key}`}
                  dbSave={async (p) => {
                    const vid = await getOrCreateVersion(activeLang)
                    if (vid) {
                      await supabase.from('story_versions').update({ [field.key]: p }).eq('id', vid)
                      await loadContent()
                    }
                  }}
                  onDone={onSaved} />
              </div>
            )
          })}
        </div>
      </Section>

      {/* 3. FlipFlop Book — images shared, audio per language */}
      <Section number={3} title={`FlipFlop Audio Book — ${LANGUAGE_META[activeLang].label}`} subtitle="Images shared, audio per language" done={flipflopPages.length >= 5}
        badge={`${flipflopPages.length} pages`}>
        {flipflopPages.length > 0 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {flipflopPages.map(page => (
                <FlipFlopPageCard key={page.id} page={page} storyId={story.id} lang={activeLang} onUpdated={loadContent} />
              ))}
            </div>
            <button onClick={() => setShowFlipflopImporter(true)}
              className="flex items-center gap-1.5 text-[12px] font-bold text-green-600 bg-green-50 hover:bg-green-100 rounded-xl px-4 py-2.5 transition">
              <Plus size={14} /> Bulk Import Pages
            </button>
          </div>
        ) : (
          <div className="text-center py-6">
            <BookOpen size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-[13px] text-gray-500 mb-3">No pages yet. Import your story pages and audio.</p>
            <button onClick={() => setShowFlipflopImporter(true)}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold text-[13px] rounded-xl px-6 py-3 transition">
              <FileArchive size={16} /> Import Pages & Audio
            </button>
          </div>
        )}
      </Section>

      {/* 4. Other Activities — per language */}
      <Section number={4} title={`Other Activities — ${LANGUAGE_META[activeLang].label}`} subtitle="PDF, Coloring, Movement, Singing, Video" done={missionCount >= 5}
        badge={`${missionCount}/5`}>
        <div className="space-y-3">
          {/* Coloring — multi-page with inline edit */}
          <div className={`rounded-xl border p-4 ${coloringPages.length > 0 ? 'border-emerald-200 bg-emerald-50/20' : 'border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center shrink-0"><Palette size={18} /></div>
              <div className="flex-1">
                <span className="text-[10px] font-bold text-gray-400">Mission 3</span>
                <p className="text-[14px] font-bold text-gray-800">Coloring Activity</p>
              </div>
              {coloringPages.length > 0 && (
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">{coloringPages.length} templates</span>
              )}
            </div>
            {coloringPages.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-2">
                  {coloringPages.map(cp => (
                    <ColoringPageCard key={cp.id} page={cp} onUpdated={loadContent} />
                  ))}
                </div>
                <button onClick={() => setShowColoringImporter(true)}
                  className="text-[11px] font-bold text-pink-600 bg-pink-50 hover:bg-pink-100 rounded-lg px-3 py-1.5 transition">
                  <Plus size={12} className="inline mr-1" />Bulk Import
                </button>
              </div>
            ) : (
              <button onClick={() => setShowColoringImporter(true)}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl py-4 flex flex-col items-center gap-1.5 text-gray-400 hover:border-pink-300 hover:text-pink-500 transition">
                <Upload size={18} />
                <span className="text-[12px] font-bold">Import Coloring Templates</span>
              </button>
            )}
          </div>

          {/* Single-file missions: PDF, Move, Sing, Video */}
          {(['story_pdf', 'move_explore', 'sing_along', 'bonus_video'] as SlotKey[]).map((slotKey, i) => {
            const meta = SLOT_META[slotKey]
            const slot = slots.find((s: SlotData) => s.slot_key === slotKey)
            const langVer = langMissionVer(slotKey)
            const Icon = MISSION_ICONS[slotKey] ?? BookOpen
            const color = MISSION_COLORS[slotKey] ?? 'bg-gray-100 text-gray-600'
            const accept = MISSION_ACCEPT[slotKey] ?? '*/*'
            const missionNum = slotKey === 'story_pdf' ? 2 : slotKey === 'move_explore' ? 4 : slotKey === 'sing_along' ? 5 : 6

            return (
              <div key={slotKey} className={`rounded-xl border p-4 ${langVer?.media_url ? 'border-emerald-200 bg-emerald-50/20' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0`}><Icon size={18} /></div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-gray-400">Mission {missionNum}</span>
                    <p className="text-[14px] font-bold text-gray-800">{meta.label}</p>
                  </div>
                  {langVer?.media_url && <CheckCircle2 size={16} className="text-emerald-500" />}
                </div>
                {slot ? (
                  <FileUploader label={meta.label} url={langVer?.media_url ?? null} accept={accept}
                    bucket="storyBook" pathPrefix={`missions/${slot.mission_id}/${activeLang}`}
                    dbSave={async (p) => {
                      let vid = langVer?.id
                      if (!vid) vid = await getOrCreateMissionVersion(slotKey, activeLang)
                      if (vid) await supabase.from('mission_versions').update({ media_url: p }).eq('id', vid)
                    }}
                    onDone={() => reloadMissionVersions(slotKey)} />
                ) : (
                  <p className="text-[12px] text-amber-600 flex items-center gap-1.5 bg-amber-50 rounded-lg px-3 py-2">
                    <AlertCircle size={14} /> Not configured yet
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </Section>

      {/* Importers */}
      {showFlipflopImporter && (
        <FlipFlopImporter storyId={story.id} storyTitle={story.title} language={activeLang}
          onDone={() => { loadContent(); setShowFlipflopImporter(false) }}
          onClose={() => setShowFlipflopImporter(false)} />
      )}
      {showColoringImporter && (
        <ColoringImporter storyId={story.id} storyTitle={story.title}
          onDone={() => { loadContent(); setShowColoringImporter(false) }}
          onClose={() => setShowColoringImporter(false)} />
      )}

      {/* Masterpiece personalization */}
      <PersonalizationEditor story={story} onSaved={onSaved} />

      {/* Publish */}
      {/* Publish — per language */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
        {langReadiness.pct === 100 ? (
          <div className="text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3"><Rocket size={22} className="text-emerald-600" /></div>
            <h3 className="text-[16px] sm:text-[18px] font-extrabold text-gray-800">{LANGUAGE_META[activeLang].label} Ready!</h3>
            <p className="text-[12px] sm:text-[13px] text-gray-500 mt-1 mb-4">All {LANGUAGE_META[activeLang].label} content is uploaded.</p>
            <button onClick={publishLang} disabled={publishing}
              className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[14px] sm:text-[15px] rounded-xl px-8 py-3.5 shadow-sm transition disabled:opacity-50">
              {publishing ? 'Publishing...' : `Publish ${LANGUAGE_META[activeLang].label}`}
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3"><AlertCircle size={22} className="text-amber-600" /></div>
            <h3 className="text-[16px] sm:text-[18px] font-extrabold text-gray-800">{LANGUAGE_META[activeLang].label} — Not Ready</h3>
            <p className="text-[12px] sm:text-[13px] text-gray-500 mt-1">{langReadiness.total - langReadiness.done} items remaining for {LANGUAGE_META[activeLang].label}</p>
            {/* Language status overview */}
            <div className="mt-4 flex justify-center gap-3">
              {LANGUAGES.map(lang => {
                const sv = allStoryVersions[lang]
                const isPublished = !!(sv && (sv as Record<string, unknown>).published)
                return (
                  <div key={lang} className={`text-center px-3 py-2 rounded-lg border ${isPublished ? 'border-emerald-200 bg-emerald-50' : sv ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
                    <p className="text-[10px] font-bold text-gray-500">{LANGUAGE_META[lang].flag} {LANGUAGE_META[lang].label}</p>
                    <p className={`text-[10px] font-bold ${isPublished ? 'text-emerald-600' : sv ? 'text-amber-600' : 'text-gray-400'}`}>
                      {isPublished ? 'Published' : sv ? 'Draft' : 'Not started'}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ number, title, subtitle, done, badge, children }: {
  number: number; title: string; subtitle: string; done: boolean; badge?: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 flex items-center gap-2.5 sm:gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-black shrink-0 ${
          done ? 'bg-emerald-100 text-emerald-600' : 'bg-green-100 text-green-600'
        }`}>
          {done ? <CheckCircle2 size={16} /> : number}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] sm:text-[15px] font-extrabold text-gray-800">{title}</h3>
          <p className="text-[11px] sm:text-[12px] text-gray-400">{subtitle}</p>
        </div>
        {badge && (
          <span className={`text-[10px] sm:text-[11px] font-bold px-2.5 sm:px-3 py-1 rounded-full shrink-0 ${done ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>{badge}</span>
        )}
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  )
}

/* ── FlipFlop Page Card (image + audio per page) ── */
function FlipFlopPageCard({ page, storyId, lang, onUpdated }: { page: FlipFlopPage; storyId: string; lang: Lang; onUpdated: () => void }) {
  const imgRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState('')
  const { error: toastErr } = useToast()
  const langVer = (page.story_page_versions ?? []).find(v => v.language === lang)
  const hasAudio = !!langVer?.audio_url
  // Per-language image; fall back to shared image for pre-095 pages
  const displayImage = langVer?.image_url ?? page.image_url

  const uploadImage = async (f: File) => {
    setBusy('image')
    const { error, storagePath } = await smartUpload('storyBook', `pages/${page.id}-${lang}-${Date.now()}.${f.name.split('.').pop()}`, f)
    if (!error) {
      const dbErr = langVer
        ? (await supabase.from('story_page_versions').update({ image_url: storagePath }).eq('id', langVer.id)).error
        : (await supabase.from('story_page_versions').insert({ story_page_id: page.id, language: lang, text: '', image_url: storagePath, audio_url: null, published: true })).error
      if (dbErr) { toastErr(`Save failed: ${dbErr.message}`) } else { onUpdated() }
    }
    setBusy('')
  }

  const uploadAudio = async (f: File) => {
    setBusy('audio')
    const ext = f.name.split('.').pop()
    const { error, storagePath } = await smartUpload('storyBook', `pages/audio-${page.id}-${Date.now()}.${ext}`, f)
    if (!error) {
      const { error: dbErr } = langVer
        ? await supabase.from('story_page_versions').update({ audio_url: storagePath }).eq('id', langVer.id)
        : await supabase.from('story_page_versions').insert({ story_page_id: page.id, language: lang, text: '', audio_url: storagePath, published: true })
      if (dbErr) { toastErr(`Save failed: ${dbErr.message}`) } else { onUpdated() }
    }
    setBusy('')
  }

  const deletePage = async () => {
    if (!confirm(`Delete page #${page.page_number}? This cannot be undone.`)) return
    const { error: e1 } = await supabase.from('story_page_versions').delete().eq('story_page_id', page.id)
    if (e1) { toastErr(`Delete failed: ${e1.message}`); return }
    const { error: e2 } = await supabase.from('story_pages').delete().eq('id', page.id)
    if (e2) { toastErr(`Delete failed: ${e2.message}`); return }
    onUpdated()
  }

  const removeAudio = async () => {
    if (!langVer) return
    const { error } = await supabase.from('story_page_versions').update({ audio_url: null }).eq('id', langVer.id)
    if (error) { toastErr(`Remove failed: ${error.message}`); return }
    onUpdated()
  }

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden bg-white group relative">
      {/* Image area */}
      <div className="aspect-[3/4] bg-gray-100 relative cursor-pointer" onClick={() => imgRef.current?.click()}>
        {busy === 'image' ? (
          <div className="w-full h-full flex items-center justify-center"><div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : displayImage ? (
          <>
            <img src={getStorageUrl(displayImage)} alt={`Page ${page.page_number}`} className="w-full h-full object-cover"  loading="lazy" />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
              <span className="text-white text-[11px] font-bold bg-black/50 rounded-lg px-3 py-1.5">Replace</span>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 hover:text-green-400 transition">
            <ImageIcon size={28} />
            <span className="text-[11px] font-bold mt-1">Upload Image</span>
          </div>
        )}
        <div className="absolute top-1.5 left-1.5 bg-white/90 backdrop-blur-sm rounded-md px-2 py-0.5 text-[10px] font-bold text-gray-600 shadow-sm">#{page.page_number}</div>
        {hasAudio && <div className="absolute top-1.5 right-1.5 bg-emerald-500 rounded-md px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">🔊</div>}
      </div>
      <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f) }} />

      {/* Bottom controls */}
      <div className="p-2.5 space-y-2">
        {/* Audio */}
        {busy === 'audio' ? (
          <div className="flex items-center gap-2 bg-green-50 rounded-lg px-2.5 py-2">
            <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin shrink-0" />
            <span className="text-[11px] text-green-600 font-medium">Uploading...</span>
          </div>
        ) : hasAudio ? (
          <div className="flex items-center gap-1.5 bg-emerald-50 rounded-lg px-2.5 py-2">
            <Music size={12} className="text-emerald-500 shrink-0" />
            <span className="text-[10px] text-emerald-700 font-medium truncate flex-1">{langVer?.audio_url?.split('/').pop()}</span>
            <button onClick={() => audioRef.current?.click()} className="text-[10px] font-bold text-green-600 hover:underline shrink-0">Replace</button>
            <button onClick={removeAudio} className="text-[10px] font-bold text-red-500 hover:underline shrink-0">Remove</button>
          </div>
        ) : (
          <button onClick={() => audioRef.current?.click()}
            className="w-full flex items-center justify-center gap-1.5 border border-dashed border-gray-200 rounded-lg py-2.5 text-gray-400 hover:text-green-500 hover:border-green-300 transition min-h-[36px]">
            <Music size={12} />
            <span className="text-[11px] font-bold">Add Audio</span>
          </button>
        )}
        <input ref={audioRef} type="file" accept="audio/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadAudio(f) }} />

        {/* Delete */}
        <button onClick={deletePage}
          className="w-full flex items-center justify-center gap-1 text-[10px] font-bold text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg py-2 transition min-h-[32px]">
          <Trash2 size={11} /> Delete Page
        </button>
      </div>
    </div>
  )
}

/* ── Coloring Page Card ── */
function ColoringPageCard({ page, onUpdated }: { page: ColoringPage; onUpdated: () => void }) {
  const imgRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const { error: toastErr } = useToast()

  const replaceImage = async (f: File) => {
    setBusy(true)
    const { error, storagePath } = await smartUpload('storyBook', `coloring/${page.story_id ?? 'x'}/page-${page.page_number}-${Date.now()}.${f.name.split('.').pop()}`, f)
    if (!error) {
      const { error: dbErr } = await supabase.from('coloring_pages').update({ template_image_url: storagePath }).eq('id', page.id)
      if (dbErr) { toastErr(`Save failed: ${dbErr.message}`) } else { onUpdated() }
    }
    setBusy(false)
  }

  const deletePage = async () => {
    if (!confirm('Delete this coloring template? This cannot be undone.')) return
    const { error } = await supabase.from('coloring_pages').delete().eq('id', page.id)
    if (error) { toastErr(`Delete failed: ${error.message}`); return }
    onUpdated()
  }

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden bg-white group relative">
      <div className="aspect-[3/4] bg-gray-50 relative cursor-pointer" onClick={() => imgRef.current?.click()}>
        {busy ? (
          <div className="w-full h-full flex items-center justify-center"><div className="w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : page.template_image_url ? (
          <>
            <img src={getStorageUrl(page.template_image_url)} alt={`Coloring ${page.page_number}`} className="w-full h-full object-cover"  loading="lazy" />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
              <span className="text-white text-[11px] font-bold bg-black/50 rounded-lg px-2.5 py-1">Replace</span>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
            <Palette size={20} />
            <span className="text-[9px] font-bold mt-0.5">Upload</span>
          </div>
        )}
      </div>
      <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) replaceImage(f) }} />
      <button onClick={deletePage}
        className="w-full py-2 text-[10px] font-bold text-red-400 hover:text-red-600 hover:bg-red-50 transition flex items-center justify-center gap-1 min-h-[32px]">
        <Trash2 size={10} /> Remove
      </button>
    </div>
  )
}
