'use client'
import React, { useState, useRef, useEffect, useCallback } from 'react'
import supabase from '@/lib/supabaseClient'
import { getStorageUrl } from '@/lib/queries'
import { smartUpload, type UploadProgress } from '@/lib/uploadWithProgress'
import {
  Upload, CheckCircle2, AlertCircle, Image as ImageIcon,
  Video, Music, Users as UsersIcon, Play, Eye, ChevronDown,
  BookOpen, FileText, Palette, PersonStanding, Mic, Film,
  Plus, Trash2, FileArchive,
} from 'lucide-react'
import FlipFlopImporter from './FlipFlopImporter'
import ColoringImporter from './ColoringImporter'
import PersonalizationEditor from './PersonalizationEditor'
import { useToast } from './Toast'
import { useConfirmDialog } from './ConfirmDialog'
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
  story_page_versions: { id: string; language: string; audio_url: string | null; image_url: string | null; text: string | null }[];
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
const MISSION_HINTS: Record<string, string> = {
  story_pdf:    'Printable story PDF learners can download. Any page size, optimised for home printing.',
  move_explore: 'Video or audio guide for a movement activity tied to the story. MP4 or MP3.',
  sing_along:   'Song audio learners sing with. MP3 or AAC, with lyrics matching the story theme.',
  bonus_video:  'Extra video content — behind the scenes, author note, or cultural deep-dive. MP4.',
}
const INTRO_FIELDS = [
  { key: 'intro_video_url',     label: 'Intro Video',        icon: Video,     color: 'bg-red-100 text-red-600',    accept: 'video/*',                hint: 'Short welcome clip shown before the story opens. MP4, 30–90 s recommended.' },
  { key: 'theme_song_url',      label: 'Theme Song',         icon: Music,     color: 'bg-pink-100 text-pink-600',  accept: 'audio/*',                hint: 'Background music looped during the story. MP3 or AAC, 1–3 min.' },
  { key: 'meet_characters_url', label: 'Meet Nimi & Piko',   icon: UsersIcon, color: 'bg-blue-100 text-blue-600', accept: 'video/*',                hint: 'Optional character intro video. MP4, 30–60 s. Can be shared across stories.' },
  { key: 'story_intro_url',     label: 'Story Introduction', icon: Play,      color: 'bg-purple-100 text-purple-600', accept: 'video/*,audio/*,image/*', hint: 'Audio narration or video of the story opener. MP4, MP3, or a static image.' },
]

/* ── Auto-save text input ── */
function AutoSaveInput({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => Promise<void> }) {
  const [val, setVal] = useState(value)
  const [saved, setSaved] = useState(false)
  const [saveErr, setSaveErr] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const save = useCallback(async (v: string) => {
    try {
      await onSave(v)
      setSaved(true)
      setSaveErr(null)
      setTimeout(() => setSaved(false), 1500)
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'Save failed')
    }
  }, [onSave])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  const handleChange = (v: string) => {
    setVal(v)
    setSaveErr(null)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => save(v), 800)
  }
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <label className="text-[12px] sm:text-[13px] font-bold text-gray-500">{label}</label>
        {saved   && <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5"><CheckCircle2 size={10} /> Saved</span>}
        {saveErr && <span className="text-[10px] text-red-500 font-bold truncate max-w-[180px]">{saveErr}</span>}
      </div>
      <input type="text" value={val} onChange={e => handleChange(e.target.value)}
        className={`w-full border rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-[13px] sm:text-[14px] font-medium text-gray-800 focus:outline-none transition ${
          saveErr ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-green-400'
        }`} />
    </div>
  )
}

/* ── Slug editor with sanitization and URL preview ── */
function SlugInput({ storyId, initialSlug, onSaved }: { storyId: string; initialSlug: string; onSaved: () => void }) {
  const [slug, setSlug] = useState(initialSlug)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const sanitize = (v: string) =>
    v.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '')

  const handleChange = (raw: string) => {
    const clean = sanitize(raw)
    setSlug(clean)
    setError(null)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      if (!clean) { setError('Slug cannot be empty'); return }
      const { error: dbErr } = await supabase.from('stories').update({ slug: clean }).eq('id', storyId)
      if (dbErr) { setError('Slug already in use'); return }
      onSaved()
      setSaved(true); setTimeout(() => setSaved(false), 1500)
    }, 800)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <label className="text-[12px] sm:text-[13px] font-bold text-gray-500">URL Slug</label>
        {saved && <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5"><CheckCircle2 size={10} /> Saved</span>}
        {error && <span className="text-[10px] text-red-500 font-bold">{error}</span>}
      </div>
      <input
        type="text"
        value={slug}
        onChange={e => handleChange(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-[13px] sm:text-[14px] font-medium text-gray-800 focus:outline-none focus:border-green-400 transition font-mono"
        placeholder="my-story-slug"
      />
      <p className="mt-1 text-[11px] text-gray-400">/stories/<span className="text-gray-600">{slug || '…'}</span></p>
    </div>
  )
}

/* ── File uploader with real progress ── */
function FileUploader({ label, url, accept, bucket, pathPrefix, dbSave, onDone, hint }: {
  label: string; url: string | null; accept: string
  bucket: string; pathPrefix: string
  dbSave: (storagePath: string | null) => Promise<void>
  onDone: () => void
  hint?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<(UploadProgress & { status: string }) | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const { error: toastErr } = useToast()
  const fileName = url?.split('/').pop() ?? ''
  const fileExt = fileName.split('.').pop()?.toLowerCase() ?? ''
  const isAudio = ['mp3', 'aac', 'wav', 'ogg', 'm4a', 'flac'].includes(fileExt)
  const isVideo = ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(fileExt)
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'].includes(fileExt)

  const handleFile = async (f: File) => {
    const ext = f.name.split('.').pop()
    const path = `${pathPrefix}-${Date.now()}.${ext}`
    setUploadError(null)
    setProgress({ percent: 0, loaded: 0, total: f.size, status: 'Starting...' })

    const { error, storagePath } = await smartUpload(bucket, path, f, setProgress)
    if (!error) {
      try {
        await dbSave(storagePath)
        onDone()
        setTimeout(() => setProgress(null), 2000)
      } catch (saveErr) {
        setProgress(null)
        const msg = saveErr instanceof Error ? saveErr.message : 'Failed to save after upload'
        setUploadError(msg)
        toastErr(`Save failed: ${msg}`)
      }
    } else {
      setProgress(null)
      setUploadError(error.message)
      toastErr(`Upload failed: ${error.message}`)
    }
  }

  const handleRemove = async () => {
    try {
      await dbSave(null)
      onDone()
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Remove failed')
    }
  }

  const uploading = progress !== null && progress.percent < 100

  return (
    <div>
      {uploading ? (
        <div className="rounded-xl px-3 sm:px-4 py-3 bg-green-50 border border-green-200">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin shrink-0" />
            <span className="text-[12px] sm:text-[13px] font-bold text-green-700">{progress.status}</span>
          </div>
          <div className="w-full bg-green-100 rounded-full h-2.5 sm:h-2">
            <div className="h-full bg-green-500 rounded-full transition-all duration-300" style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
      ) : uploadError ? (
        <div className="rounded-xl px-3 sm:px-4 py-3 bg-red-50 border border-red-200">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] sm:text-[13px] font-bold text-red-600">Upload failed</p>
              <p className="text-[11px] text-red-400 mt-0.5 break-words">{uploadError}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button type="button" onClick={() => ref.current?.click()}
              className="text-[11px] font-bold text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-lg px-3 py-1.5 transition">
              Try again
            </button>
            <button type="button" onClick={() => setUploadError(null)}
              className="text-[11px] font-medium text-gray-400 hover:text-gray-600 px-2 py-1.5 transition">
              Dismiss
            </button>
          </div>
        </div>
      ) : progress?.percent === 100 ? (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 sm:px-4 py-3">
          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          <span className="text-[12px] sm:text-[13px] text-emerald-700 font-bold">Uploaded successfully!</span>
        </div>
      ) : url ? (
        <div className="space-y-2">
          {isAudio && (
            <audio controls src={getStorageUrl(url)} className="w-full h-10 rounded-lg" />
          )}
          {isVideo && (
            <video controls src={getStorageUrl(url)} className="w-full rounded-xl max-h-48 bg-black object-contain" />
          )}
          {isImage && (
            <img src={getStorageUrl(url)} alt="" className="w-full rounded-xl max-h-40 object-cover" />
          )}
          <div className="flex flex-wrap items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 sm:px-4 py-3">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            <span className="text-[11px] sm:text-[12px] text-emerald-700 font-medium truncate flex-1 min-w-0" title={fileName}>{fileName}</span>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => ref.current?.click()}
                className="text-[11px] font-bold text-green-600 bg-white border border-green-200 hover:bg-green-50 rounded-lg px-3 py-2 transition">Replace</button>
              <button type="button" onClick={handleRemove}
                className="text-[11px] font-bold text-red-500 bg-white border border-red-200 hover:bg-red-50 rounded-lg px-3 py-2 transition">Remove</button>
            </div>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl py-5 sm:py-6 flex flex-col items-center gap-1.5 text-gray-400 hover:border-green-300 hover:text-green-500 hover:bg-green-50/30 transition min-h-[56px]">
          <Upload size={22} />
          <span className="text-[12px] sm:text-[13px] font-bold">Upload {label}</span>
        </button>
      )}
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      {hint && !url && !uploadError && !uploading && (
        <p className="mt-1.5 text-[11px] text-gray-400 leading-relaxed">{hint}</p>
      )}
    </div>
  )
}

const REQUIRED_STORY_FIELDS = new Set(['title', 'slug'])

/* ── Main Editor ── */
export default function StoryEditor({ story, onSaved, defaultLang }: StoryEditorProps) {
  const { success: toastOk, error: toastErr } = useToast()
  const { confirm: confirmAction, dialog: confirmEl } = useConfirmDialog()
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

  // Compute readiness from local editor state — keeps the ring accurate after in-session uploads
  const readiness = React.useMemo(() => {
    const svFromState = Object.values(allStoryVersions) as Record<string, unknown>[]
    const storyVersionsForReadiness = svFromState.length > 0
      ? svFromState.map(sv => sv as { language?: string; intro_video_url?: string | null; theme_song_url?: string | null; meet_characters_url?: string | null; story_intro_url?: string | null })
      : (story.story_versions ?? [])
    const synthesizedSlots = SLOT_KEYS.map(sk => {
      const slot = slots.find(s => s.slot_key === sk)
      return slot ? {
        ...slot,
        missions: {
          id: slot.mission_id,
          mission_versions: (missionVersions[sk] ?? []).map(v => ({ id: v.id, language: v.language, media_url: v.media_url }))
        }
      } : null
    }).filter(Boolean) as typeof slots
    return computeReadiness({
      cover_url: coverUrl,
      story_pages: flipflopPages,
      coloring_pages: coloringPages,
      story_versions: storyVersionsForReadiness,
      story_slots: synthesizedSlots,
    })
  }, [coverUrl, flipflopPages, coloringPages, allStoryVersions, missionVersions, slots, story.story_versions])
  // Tracks in-flight story_versions inserts per language so concurrent callers
  // share one promise instead of racing duplicate inserts
  const creatingVersionRef = useRef<Partial<Record<Lang, Promise<string | undefined>>>>({})

  const loadContent = useCallback(async () => {
    setContentLoading(true)
    try {
      const { data: freshSlots, error: slotsErr } = await supabase
        .from('story_slots')
        .select('story_id, slot_key, mission_id, sort_order')
        .eq('story_id', story.id)
        .order('sort_order')
      if (slotsErr) throw slotsErr
      const currentSlots = freshSlots ?? []
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

      const { data: svs, error: svsErr } = await supabase.from('story_versions').select('*').eq('story_id', story.id)
      if (svsErr) throw svsErr
      const svMap = {} as Record<Lang, { id: string } & Record<string, unknown>>
      for (const sv of (svs ?? [])) { svMap[sv.language as Lang] = sv as { id: string } & Record<string, unknown> }
      setAllStoryVersions(svMap)

      const { data: pages } = await supabase.from('story_pages').select('id, page_number, image_url, story_page_versions(id, language, audio_url, image_url, text)').eq('story_id', story.id).order('page_number')
      setFlipflopPages(pages ?? [])

      const { data: cpages } = await supabase.from('coloring_pages').select('id, page_number, template_image_url').eq('story_id', story.id).order('page_number')
      setColoringPages(cpages ?? [])
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Failed to load story content')
    } finally {
      setContentLoading(false)
    }
  }, [story.id, toastErr])

  useEffect(() => { loadContent() }, [loadContent])

  const defaultLangInitRef = useRef(false)
  useEffect(() => {
    if (!defaultLang) return
    if (defaultLangInitRef.current) toastOk(`${LANGUAGE_META[defaultLang].flag} Switched to ${LANGUAGE_META[defaultLang].label}`)
    defaultLangInitRef.current = true
    setActiveLang(defaultLang)
  }, [defaultLang])

  const [contentLoading, setContentLoading] = useState(false)

  const reloadMissionVersions = async (slotKey: string) => {
    const slot = slots.find((s: SlotData) => s.slot_key === slotKey)
    if (!slot?.mission_id) return
    const { data, error } = await supabase.from('mission_versions').select('*').eq('mission_id', slot.mission_id).order('language')
    if (error) { toastErr(`Reload failed: ${error.message}`); return }
    if (data) setMissionVersions(prev => ({ ...prev, [slotKey]: data }))
  }

  const saveField = async (field: string, value: string) => {
    if (REQUIRED_STORY_FIELDS.has(field) && !value.trim()) {
      throw new Error(`${field.charAt(0).toUpperCase() + field.slice(1)} cannot be empty`)
    }
    const { error } = await supabase.from('stories').update({ [field]: value || null }).eq('id', story.id)
    if (error) throw new Error(error.message)
    onSaved()
  }

  const toggleIsFree = async () => {
    const { error } = await supabase.from('stories').update({ is_free: !story.is_free }).eq('id', story.id)
    if (error) { toastErr(`Save failed: ${error.message}`); return }
    onSaved()
  }

  const getOrCreateVersion = async (lang: Lang = activeLang): Promise<string | undefined> => {
    // Fast path — version already exists
    if (allStoryVersions[lang]?.id) return allStoryVersions[lang].id

    // Second caller while insert is in flight — share the same promise, don't race a new insert
    if (creatingVersionRef.current[lang]) return creatingVersionRef.current[lang]

    const promise = (async () => {
      const { data, error } = await supabase.from('story_versions')
        .insert({ story_id: story.id, language: lang, title: story.title, published: false })
        .select('id').single()
      if (error) throw new Error(`Could not create ${lang} version: ${error.message}`)
      if (data) {
        setAllStoryVersions(prev => ({ ...prev, [lang]: { id: data.id } as { id: string } & Record<string, unknown> }))
      }
      onSaved()
      return data?.id
    })()

    creatingVersionRef.current[lang] = promise
    try {
      return await promise
    } finally {
      delete creatingVersionRef.current[lang]
    }
  }

  const getOrCreateMissionVersion = async (slotKey: string, lang: Lang): Promise<string | undefined> => {
    const existing = (missionVersions[slotKey] ?? []).find(v => v.language === lang)
    if (existing) return existing.id
    const slot = slots.find(s => s.slot_key === slotKey)
    if (!slot?.mission_id) return
    const meta = SLOT_META[slotKey as SlotKey]
    const { data, error } = await supabase.from('mission_versions')
      .insert({ mission_id: slot.mission_id, language: lang, title: meta.label, revision_number: 1, status: 'draft', published: false, is_current: true })
      .select('id').single()
    if (error) { toastErr(`Could not create mission version: ${error.message}`); return }
    await reloadMissionVersions(slotKey)
    return data?.id
  }

  // Mark a single language version as ready (does NOT make story globally live)
  const markLangReady = async () => {
    const ok = await confirmAction({
      title: `Mark ${LANGUAGE_META[activeLang].label} ready?`,
      message: `This confirms all ${LANGUAGE_META[activeLang].label} content is complete and correct. You can unmark it later if needed.`,
      danger: false,
    })
    if (!ok) return
    setPublishing(true)
    try {
      for (const sk of SLOT_KEYS) {
        const langVer = (missionVersions[sk] ?? []).find(v => v.language === activeLang)
        if (langVer && langVer.status !== 'published') {
          await supabase.from('mission_versions').update({ status: 'published' }).eq('id', langVer.id)
        }
      }
      const svId = await getOrCreateVersion(activeLang)
      if (svId) await supabase.from('story_versions').update({ status: 'published', published: true }).eq('id', svId)
      await loadContent()
      onSaved()
      toastOk(`${LANGUAGE_META[activeLang].label} marked as ready`)
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Could not mark language ready')
    } finally {
      setPublishing(false)
    }
  }

  const unmarkLangReady = async (lang: Lang) => {
    const sv = allStoryVersions[lang]
    if (!sv?.id) return
    setPublishing(true)
    try {
      await supabase.from('story_versions').update({ published: false, status: 'draft' }).eq('id', sv.id)
      await loadContent(); onSaved()
      toastOk(`${LANGUAGE_META[lang].label} reset to draft`)
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Could not unmark language')
    } finally {
      setPublishing(false)
    }
  }

  // Make story globally visible to learners
  const goLive = async () => {
    const readyLangs = LANGUAGES.filter(l => allStoryVersions[l] && (allStoryVersions[l] as Record<string, unknown>).published)
    const ok = await confirmAction({
      title: 'Publish this story?',
      message: `"${story.title}" will become visible to all learners in ${readyLangs.map(l => LANGUAGE_META[l].label).join(', ')}. This cannot be undone without taking the story offline.`,
      danger: false,
    })
    if (!ok) return
    setPublishing(true)
    try {
      await supabase.from('stories').update({ status: 'published', published_at: new Date().toISOString() }).eq('id', story.id)
      await loadContent()
      onSaved()
      toastOk(`"${story.title}" is now live!`)
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Could not publish story')
    } finally {
      setPublishing(false)
    }
  }

  // Pull story offline without removing any content
  const takeOffline = async () => {
    setPublishing(true)
    try {
      await supabase.from('stories').update({ status: 'draft' }).eq('id', story.id)
      await loadContent(); onSaved()
      toastOk(`"${story.title}" taken offline`)
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Could not take story offline')
    } finally {
      setPublishing(false)
    }
  }

  const sendToReview = async () => {
    setPublishing(true)
    try {
      await supabase.from('stories').update({ status: 'review' }).eq('id', story.id)
      await loadContent(); onSaved()
      toastOk(`"${story.title}" sent to review`)
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Could not send to review')
    } finally {
      setPublishing(false)
    }
  }

  const retireStory = async () => {
    setPublishing(true)
    try {
      await supabase.from('stories').update({ status: 'retired' }).eq('id', story.id)
      await loadContent(); onSaved()
      toastOk(`"${story.title}" retired`)
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Could not retire story')
    } finally {
      setPublishing(false)
    }
  }

  const versionRecord = version as Record<string, unknown> | undefined
  const introCount = INTRO_FIELDS.filter(f => versionRecord?.[f.key]).length
  const langMissionVer = (sk: string) => (missionVersions[sk] ?? []).find(v => v.language === activeLang)
  const singleFileMissions = ['story_pdf', 'move_explore', 'sing_along', 'bonus_video'] as const
  const singleFileDone = singleFileMissions.filter(sk => langMissionVer(sk)?.media_url).length
  const coloringDone   = coloringPages.length > 0 ? 1 : 0

  // Section 4 completion (5 max): 4 single-file missions + coloring.
  // Coloring templates are shared across languages but still count here — the
  // learner needs them regardless of language for Section 4 to be complete.
  const section4Count = singleFileDone + coloringDone

  // Per-language readiness (9 max): 4 intro fields + 4 single-file missions + FlipFlop audio.
  // Coloring is intentionally excluded — templates are shared across all languages
  // so they are not a per-language requirement. If this ever changes, add coloringDone here too.
  const langReadiness = (() => {
    const total = INTRO_FIELDS.length + singleFileMissions.length + 1  // 4 + 4 + 1 = 9
    let done = introCount + singleFileDone
    const audioPages = flipflopPages.filter(p =>
      (p.story_page_versions ?? []).some(v => v.language === activeLang && v.audio_url)
    )
    if (flipflopPages.length > 0 && audioPages.length >= flipflopPages.length * 0.5) done += 1
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
  })()

  const anyLangPublished = LANGUAGES.some(lang => {
    const sv = allStoryVersions[lang]
    return !!(sv && (sv as Record<string, unknown>).published)
  })

  const [showChecklist, setShowChecklist] = useState(false)

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-12 px-3 sm:px-4 lg:px-0">
      {confirmEl}

      {/* Language tabs + progress */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Refresh indicator — thin bar shown during silent reloads */}
        <div className={`h-0.5 bg-green-500 transition-all duration-300 ${contentLoading ? 'opacity-100' : 'opacity-0'}`} />
        {/* Language switcher */}
        <div className="flex border-b border-gray-100">
          {LANGUAGES.map(lang => {
            const meta = LANGUAGE_META[lang]
            const sv = allStoryVersions[lang]
            const isPublished = !!(sv && (sv as Record<string, unknown>).published)
            return (
              <button type="button" key={lang} onClick={() => setActiveLang(lang)}
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

        {/* Tab legend */}
        <div className="flex items-center gap-4 px-4 pt-2 pb-0">
          <span className="flex items-center gap-1 text-[10px] text-gray-400"><CheckCircle2 size={10} className="text-emerald-500" /> Marked ready</span>
          <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /> In progress</span>
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
          <button
            type="button"
            onClick={() => window.open(`/stories/${story.slug}?preview=true`, '_blank')}
            title={story.status !== 'published' ? 'Story is in draft — learner page may show "not found"' : 'Open in learner view'}
            className={`flex items-center gap-1.5 text-[11px] sm:text-[12px] font-bold rounded-xl px-3 sm:px-4 py-2.5 transition shrink-0 ${
              story.status === 'published'
                ? 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                : 'text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200'
            }`}>
            <Eye size={14} />
            {story.status === 'published' ? 'Preview' : 'Preview (Draft)'}
          </button>
        </div>
      </div>

      {/* 1. Story Details */}
      <Section number={1} title="Story Details" subtitle="Basic information" done={!!(story.title && coverUrl)}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] lg:grid-cols-[1fr_240px] gap-4 sm:gap-5">
            <div className="space-y-4 order-2 sm:order-1">
              <AutoSaveInput label="Story Title" value={story.title} onSave={v => saveField('title', v)} />
              <SlugInput storyId={story.id} initialSlug={story.slug} onSaved={onSaved} />
              <AutoSaveInput label="Tagline" value={story.theme_title ?? ''} onSave={v => saveField('theme_title', v)} />
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
            key={`title-${activeLang}`}
            label={`Title (${LANGUAGE_META[activeLang].label})`}
            value={(versionRecord?.title as string) ?? story.title}
            onSave={async (v) => {
              const vid = await getOrCreateVersion(activeLang)
              if (vid) { await supabase.from('story_versions').update({ title: v }).eq('id', vid); await loadContent() }
            }}
          />
          <AutoSaveInput
            key={`desc-${activeLang}`}
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
                <FileUploader label={field.label} url={url || null} accept={field.accept} hint={field.hint}
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
      <Section number={3} title={`FlipFlop Audio Book — ${LANGUAGE_META[activeLang].label}`} subtitle="Page images are shared across all languages; audio narration is uploaded per language" done={flipflopPages.length > 0}
        badge={`${flipflopPages.length} pages`}>
        {flipflopPages.length > 0 ? (
          <div className="space-y-3">
            <p className="text-[11px] text-gray-400">
              Each card below is one page. Click a card image to replace it. Add audio narration for <strong>{LANGUAGE_META[activeLang].label}</strong> using the audio button on each card. The caption field stores the page text shown to learners.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {flipflopPages.map((page, idx) => (
                <FlipFlopPageCard key={page.id} page={page} lang={activeLang} onUpdated={loadContent}
                  index={idx} total={flipflopPages.length}
                  onReorder={async (dir) => {
                    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
                    if (swapIdx < 0 || swapIdx >= flipflopPages.length) return
                    const neighbor = flipflopPages[swapIdx]
                    const [r1, r2] = await Promise.all([
                      supabase.from('story_pages').update({ page_number: neighbor.page_number }).eq('id', page.id),
                      supabase.from('story_pages').update({ page_number: page.page_number }).eq('id', neighbor.id),
                    ])
                    if (r1.error || r2.error) throw new Error(r1.error?.message ?? r2.error?.message ?? 'Reorder failed')
                    loadContent()
                  }}
                />
              ))}
            </div>
            <button type="button" onClick={() => setShowFlipflopImporter(true)}
              className="flex items-center gap-1.5 text-[12px] font-bold text-green-600 bg-green-50 hover:bg-green-100 rounded-xl px-4 py-2.5 transition">
              <Plus size={14} /> Bulk Import Pages
            </button>
          </div>
        ) : (
          <div className="text-center py-6 space-y-3">
            <BookOpen size={32} className="mx-auto text-gray-300" />
            <div>
              <p className="text-[13px] font-semibold text-gray-700">No pages yet</p>
              <p className="text-[12px] text-gray-400 mt-1 max-w-sm mx-auto">
                A FlipFlop book is a page-by-page audio story — each page has an illustration and spoken narration per language. Import a ZIP of numbered images; audio is added per language afterwards.
              </p>
            </div>
            <button type="button" onClick={() => setShowFlipflopImporter(true)}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold text-[13px] rounded-xl px-6 py-3 transition">
              <FileArchive size={16} /> Import Pages (ZIP or images)
            </button>
          </div>
        )}
      </Section>

      {/* 4. Other Activities — per language */}
      <Section number={4} title={`Other Activities — ${LANGUAGE_META[activeLang].label}`} subtitle="PDF, Coloring, Movement, Singing, Video" done={section4Count >= 5}
        badge={`${section4Count}/5`}>
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
                <button type="button" onClick={() => setShowColoringImporter(true)}
                  className="text-[11px] font-bold text-pink-600 bg-pink-50 hover:bg-pink-100 rounded-lg px-3 py-1.5 transition">
                  <Plus size={12} className="inline mr-1" />Bulk Import
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setShowColoringImporter(true)}
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
                  <div className="space-y-3">
                    <FileUploader label={meta.label} url={langVer?.media_url ?? null} accept={accept} hint={MISSION_HINTS[slotKey]}
                      bucket="storyBook" pathPrefix={`missions/${slot.mission_id}/${activeLang}`}
                      dbSave={async (p) => {
                        let vid = langVer?.id
                        if (!vid) vid = await getOrCreateMissionVersion(slotKey, activeLang)
                        if (vid) await supabase.from('mission_versions').update({ media_url: p }).eq('id', vid)
                      }}
                      onDone={() => reloadMissionVersions(slotKey)} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <AutoSaveInput
                        key={`mv-title-${slotKey}-${activeLang}`}
                        label={`Title (${LANGUAGE_META[activeLang].label})`}
                        value={langVer?.title ?? meta.label}
                        onSave={async (v) => {
                          let vid = langVer?.id
                          if (!vid) vid = await getOrCreateMissionVersion(slotKey, activeLang)
                          if (vid) { await supabase.from('mission_versions').update({ title: v }).eq('id', vid); await reloadMissionVersions(slotKey) }
                        }}
                      />
                      <AutoSaveInput
                        key={`mv-subtitle-${slotKey}-${activeLang}`}
                        label={`Subtitle (${LANGUAGE_META[activeLang].label})`}
                        value={langVer?.subtitle ?? ''}
                        onSave={async (v) => {
                          let vid = langVer?.id
                          if (!vid) vid = await getOrCreateMissionVersion(slotKey, activeLang)
                          if (vid) { await supabase.from('mission_versions').update({ subtitle: v || null }).eq('id', vid); await reloadMissionVersions(slotKey) }
                        }}
                      />
                    </div>
                  </div>
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

      {/* Getting started guide — shown only for brand-new stories */}
      {readiness.score < 20 && (
        <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4">
          <p className="text-[13px] font-extrabold text-green-800 mb-2.5">👋 How to publish a story</p>
          <ol className="space-y-2">
            {[
              ['Section 1', 'Fill in title, slug, tagline, and upload a cover image.'],
              ['Section 2', 'For each language tab, upload the 4 intro media files (video, song, characters, intro).'],
              ['Section 3', 'Import the FlipFlop page images, then add audio narration per language.'],
              ['Section 4', 'Upload the PDF, coloring templates, and the movement/sing/bonus files.'],
              ['Publish panel', 'Once a language tab shows 100%, click "Mark Ready". When at least one language is ready, "Go Live" becomes active.'],
            ].map(([step, desc], i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="w-5 h-5 rounded-full bg-green-200 text-green-800 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <span className="text-[12px] text-green-900"><strong>{step}:</strong> {desc}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Masterpiece personalization */}
      <PersonalizationEditor story={story} onSaved={onSaved} />

      {/* Readiness checklist */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <button type="button" onClick={() => setShowChecklist(p => !p)}
          className="w-full flex items-center justify-between px-5 sm:px-6 py-4 text-left hover:bg-gray-50/50 transition">
          <div>
            <h3 className="text-[14px] font-extrabold text-gray-800">Content Checklist</h3>
            <p className="text-[12px] text-gray-400 mt-0.5">
              {readiness.completed}/{readiness.total} required items complete
              {readiness.score === 100 && ' — all done ✓'}
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <ReadinessRing score={readiness.score} size={36} strokeWidth={4} hideLabel />
            <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${showChecklist ? 'rotate-180' : ''}`} />
          </div>
        </button>
        {showChecklist && (
          <div className="border-t border-gray-100 px-5 sm:px-6 py-4">
            {(['assets', 'activities'] as const).map(group => (
              <div key={group} className="mb-4 last:mb-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">{group === 'assets' ? 'Media Assets' : 'Activities'}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {readiness.items.filter(i => i.group === group).map(item => (
                    <div key={item.key} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${
                      item.done ? 'border-emerald-100 bg-emerald-50/40' : 'border-gray-100 bg-gray-50/60'
                    }`}>
                      {item.done
                        ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                        : <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 shrink-0" />}
                      <span className={`text-[12px] font-medium flex-1 ${item.done ? 'text-emerald-700' : 'text-gray-600'}`}>{item.label}</span>
                      {item.optional && <span className="text-[9px] font-bold text-gray-300 shrink-0">OPTIONAL</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Publish — two-step: mark language ready, then go live */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Language versions */}
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="text-[14px] font-extrabold text-gray-800">Language Versions</h3>
            <p className="text-[11px] text-gray-400 text-right max-w-[200px] leading-snug">Mark each language ready when its content is complete, then Go Live to publish the story.</p>
          </div>
          <div className="space-y-2">
            {LANGUAGES.map(lang => {
              const sv = allStoryVersions[lang]
              const isPublished = !!(sv && (sv as Record<string, unknown>).published)
              const isActive = lang === activeLang
              return (
                <div key={lang} className={`flex items-center gap-3 p-3 rounded-xl border ${
                  isPublished ? 'border-emerald-200 bg-emerald-50/40'
                  : isActive ? 'border-green-200 bg-green-50/30'
                  : 'border-gray-100 bg-gray-50/60'
                }`}>
                  <span className="text-base">{LANGUAGE_META[lang].flag}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-gray-700">{LANGUAGE_META[lang].label}</p>
                    {isActive && (
                      <div className="mt-1.5 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${langReadiness.pct === 100 ? 'bg-emerald-500' : langReadiness.pct >= 50 ? 'bg-green-400' : 'bg-amber-400'}`}
                          style={{ width: `${langReadiness.pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                  {isPublished ? (
                    <button type="button" onClick={() => unmarkLangReady(lang)} disabled={publishing}
                      title="Reset this language back to draft"
                      className="group flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-red-500 shrink-0 transition disabled:opacity-50">
                      <CheckCircle2 size={12} className="group-hover:hidden" />
                      <span className="hidden group-hover:inline text-[10px]">✕</span>
                      <span className="group-hover:hidden">Ready</span>
                      <span className="hidden group-hover:inline">Unmark</span>
                    </button>
                  ) : isActive && langReadiness.pct === 100 ? (
                    <button type="button" onClick={markLangReady} disabled={publishing}
                      className="text-[11px] font-bold bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50 shrink-0">
                      {publishing ? 'Saving…' : 'Mark Ready'}
                    </button>
                  ) : (
                    <span className="text-[11px] text-gray-400 shrink-0">
                      {isActive ? `${langReadiness.pct}%` : sv ? 'In progress' : 'Not started'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Go Live / Take Offline / Review / Retire */}
        <div className="px-5 sm:px-6 py-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-[14px] font-extrabold text-gray-800">Story Visibility</h3>
              <p className="text-[12px] text-gray-400 mt-0.5">
                {story.status === 'published'
                  ? `Live${story.published_at ? ` since ${new Date(story.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}`
                  : story.status === 'review' ? 'Awaiting editorial review'
                  : story.status === 'retired' ? 'Retired — not visible to learners'
                  : anyLangPublished ? 'Ready to go live' : 'Mark at least one language ready first'}
              </p>
            </div>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
              story.status === 'published' ? 'bg-emerald-100 text-emerald-700'
              : story.status === 'review'   ? 'bg-blue-100 text-blue-700'
              : story.status === 'retired'  ? 'bg-zinc-100 text-zinc-500'
              :                               'bg-gray-100 text-gray-500'
            }`}>
              {story.status === 'published' ? '🟢 Live'
               : story.status === 'review'  ? '🔵 In Review'
               : story.status === 'retired' ? '🔘 Retired'
               :                              '⭕ Draft'}
            </span>
          </div>

          {story.status === 'published' ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={takeOffline} disabled={publishing}
                className="text-[12px] font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 px-4 py-2.5 rounded-xl transition disabled:opacity-50">
                {publishing ? 'Saving…' : 'Take Offline'}
              </button>
              <button type="button" onClick={retireStory} disabled={publishing}
                className="text-[12px] font-bold text-zinc-600 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 px-4 py-2.5 rounded-xl transition disabled:opacity-50">
                {publishing ? 'Saving…' : 'Retire Story'}
              </button>
            </div>
          ) : story.status === 'review' ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={goLive} disabled={publishing || !anyLangPublished}
                className={`font-bold text-[13px] rounded-xl px-5 py-2.5 transition ${
                  anyLangPublished ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}>
                {publishing ? 'Publishing…' : '🚀 Approve & Go Live'}
              </button>
              <button type="button" onClick={takeOffline} disabled={publishing}
                className="text-[12px] font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2.5 rounded-xl transition disabled:opacity-50">
                Back to Draft
              </button>
            </div>
          ) : story.status === 'retired' ? (
            <button type="button" onClick={takeOffline} disabled={publishing}
              className="text-[12px] font-bold text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 px-4 py-2.5 rounded-xl transition disabled:opacity-50">
              {publishing ? 'Saving…' : 'Reactivate (→ Draft)'}
            </button>
          ) : (
            <div className="space-y-2">
              <button type="button" onClick={goLive} disabled={publishing || !anyLangPublished}
                className={`w-full font-bold text-[14px] rounded-xl px-6 py-3.5 transition ${
                  anyLangPublished
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}>
                {publishing ? 'Publishing…' : anyLangPublished ? '🚀 Go Live' : 'Mark a language ready first'}
              </button>
              <button type="button" onClick={sendToReview} disabled={publishing}
                className="w-full text-[12px] font-bold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 px-4 py-2.5 rounded-xl transition disabled:opacity-50">
                {publishing ? 'Saving…' : 'Send to Review'}
              </button>
            </div>
          )}
        </div>
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
function FlipFlopPageCard({ page, lang, onUpdated, index, total, onReorder }: {
  page: FlipFlopPage; lang: Lang; onUpdated: () => void
  index: number; total: number; onReorder: (dir: 'up' | 'down') => Promise<void>
}) {
  const imgRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState('')
  const [reordering, setReordering] = useState(false)
  const { error: toastErr } = useToast()
  const { confirm: confirmDialog, dialog: confirmEl } = useConfirmDialog()
  const langVer = (page.story_page_versions ?? []).find(v => v.language === lang)
  const hasAudio = !!langVer?.audio_url

  const handleReorder = async (dir: 'up' | 'down') => {
    setReordering(true)
    try {
      await onReorder(dir)
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Reorder failed')
    } finally {
      setReordering(false)
    }
  }
  // Per-language image; fall back to shared image for pre-095 pages
  const displayImage = langVer?.image_url ?? page.image_url

  const [caption, setCaption] = useState(langVer?.text ?? '')
  const captionTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    setCaption(langVer?.text ?? '')
  }, [langVer?.text])
  useEffect(() => () => { if (captionTimer.current) clearTimeout(captionTimer.current) }, [])

  const handleCaption = (v: string) => {
    setCaption(v)
    if (captionTimer.current) clearTimeout(captionTimer.current)
    captionTimer.current = setTimeout(async () => {
      if (langVer) {
        const { error } = await supabase.from('story_page_versions').update({ text: v || null }).eq('id', langVer.id)
        if (error) toastErr(`Caption save failed: ${error.message}`)
      } else {
        const { error } = await supabase.from('story_page_versions').insert({ story_page_id: page.id, language: lang, text: v || null, audio_url: null, published: true })
        if (error) { toastErr(`Caption save failed: ${error.message}`) } else { onUpdated() }
      }
    }, 800)
  }

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
    const ok = await confirmDialog({ title: `Delete page #${page.page_number}?`, message: 'This will remove the image and all audio versions. Cannot be undone.' })
    if (!ok) return
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
    <div className={`rounded-xl border border-gray-200 overflow-hidden bg-white group relative ${reordering ? 'opacity-50 pointer-events-none' : ''}`}>
      {confirmEl}
      {/* Reorder arrows */}
      <div className="absolute top-1.5 right-1.5 z-10 flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
        <button type="button" disabled={index === 0} onClick={() => handleReorder('up')}
          className="w-5 h-5 bg-white/90 rounded flex items-center justify-center text-gray-500 hover:text-green-600 disabled:opacity-30 disabled:pointer-events-none shadow-sm">
          <ChevronDown size={11} className="rotate-180" />
        </button>
        <button type="button" disabled={index === total - 1} onClick={() => handleReorder('down')}
          className="w-5 h-5 bg-white/90 rounded flex items-center justify-center text-gray-500 hover:text-green-600 disabled:opacity-30 disabled:pointer-events-none shadow-sm">
          <ChevronDown size={11} />
        </button>
      </div>
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
          <div className="space-y-1.5">
            <audio controls src={getStorageUrl(langVer!.audio_url!)} className="w-full h-8 rounded" />
            <div className="flex items-center gap-1.5">
              <Music size={11} className="text-emerald-500 shrink-0" />
              <span className="text-[10px] text-emerald-700 font-medium truncate flex-1">{langVer?.audio_url?.split('/').pop()}</span>
              <button type="button" onClick={() => audioRef.current?.click()} className="text-[10px] font-bold text-green-600 hover:underline shrink-0">Replace</button>
              <button type="button" onClick={removeAudio} className="text-[10px] font-bold text-red-500 hover:underline shrink-0">✕</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => audioRef.current?.click()}
            className="w-full flex items-center justify-center gap-1.5 border border-dashed border-gray-200 rounded-lg py-2.5 text-gray-400 hover:text-green-500 hover:border-green-300 transition min-h-[36px]">
            <Music size={12} />
            <span className="text-[11px] font-bold">Add Audio</span>
          </button>
        )}
        <input ref={audioRef} type="file" accept="audio/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadAudio(f) }} />

        {/* Caption / page text */}
        <textarea
          value={caption}
          onChange={e => handleCaption(e.target.value)}
          placeholder="Caption…"
          rows={2}
          className="w-full text-[11px] text-gray-700 border border-gray-200 rounded-lg px-2.5 py-2 resize-none focus:outline-none focus:border-green-400 transition placeholder:text-gray-300"
        />

        {/* Delete */}
        <button type="button" onClick={deletePage}
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
  const { confirm: confirmDialog, dialog: confirmEl } = useConfirmDialog()

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
    const ok = await confirmDialog({ title: 'Delete coloring template?', message: 'This cannot be undone.' })
    if (!ok) return
    const { error } = await supabase.from('coloring_pages').delete().eq('id', page.id)
    if (error) { toastErr(`Delete failed: ${error.message}`); return }
    onUpdated()
  }

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden bg-white group relative">
      {confirmEl}
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
      <button type="button" onClick={deletePage}
        className="w-full py-2 text-[10px] font-bold text-red-400 hover:text-red-600 hover:bg-red-50 transition flex items-center justify-center gap-1 min-h-[32px]">
        <Trash2 size={10} /> Remove
      </button>
    </div>
  )
}
