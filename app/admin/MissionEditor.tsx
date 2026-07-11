'use client'
import React, { useState, useEffect, useRef } from 'react'
import supabase from '@/lib/supabaseClient'
import { getStorageUrl } from '@/lib/queries'
import { smartUpload } from '@/lib/uploadWithProgress'
import {
  Music, X, Play, Pause, Image as ImageIcon, Plus, Trash2, Copy as CopyIcon,
  Info, Upload, Settings2, FileText, Eye, CheckCircle2, AlertCircle, Lightbulb,
  History, Rocket, GitBranch, RotateCcw, BookOpen, HelpCircle, Volume2,
} from 'lucide-react'
import {
  ACCENT, LANGUAGES, LANGUAGE_META, MISSION_TYPES, TYPE_META, CATEGORY_ORDER, CATEGORY_META, FALLBACK_META,
  CONTENT_STATUSES, STATUS_META, type Lang, type MissionType, type MissionRow, type MissionVersionRow, type ContentStatus,
  type StoryRow,
} from './missionMeta'

interface VersionForm {
  id: string
  title: string
  subtitle: string
  tip_text: string
  media_url: string
  content_json: Record<string, any>
  status: ContentStatus
  revision_number: number
  is_current: boolean
  created_at: string
}

const EMPTY_VERSION: VersionForm = {
  id: '', title: '', subtitle: '', tip_text: '', media_url: '', content_json: {}, status: 'draft',
  revision_number: 1, is_current: true, created_at: '',
}

interface MissionEditorProps {
  mission: MissionRow
  onSaved: () => void
}

function basename(path: string) {
  const slash = path.lastIndexOf('/')
  return slash === -1 ? path : path.substring(slash + 1)
}

function isAudioFile(path: string) {
  return /\.(mp3|wav|ogg|m4a|aac)$/i.test(path)
}

function formatTime(sec: number) {
  if (!isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const inputClass = (ring: string) =>
  `w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-700 transition ${ring}`

export default function MissionEditor({ mission, onSaved }: MissionEditorProps) {
  const meta = CATEGORY_META[mission.category_slug] ?? FALLBACK_META
  const accent = ACCENT[meta.accent]

  const [general, setGeneral] = useState({
    sequence: mission.sequence,
    stars: mission.stars,
    duration_minutes: mission.duration_minutes,
    type: mission.type,
    category_slug: mission.category_slug,
  })
  const [activeLang, setActiveLang] = useState<Lang>('en')
  const [versionForms, setVersionForms] = useState<Record<Lang, VersionForm>>({ en: { ...EMPTY_VERSION }, fr: { ...EMPTY_VERSION }, rw: { ...EMPTY_VERSION } })
  const [revisionsByLang, setRevisionsByLang] = useState<Record<Lang, MissionVersionRow[]>>({ en: [], fr: [], rw: [] })
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishingAll, setPublishingAll] = useState(false)
  const [creatingRevision, setCreatingRevision] = useState(false)
  const [rollingBackId, setRollingBackId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [uploadingAudio, setUploadingAudio] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingVocabAudio, setUploadingVocabAudio] = useState<Record<number, boolean>>({})

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  // FlipFlop story pages state
  const [story, setStory] = useState<StoryRow | null>(null)
  const [storyLoading, setStoryLoading] = useState(false)
  const [storyError, setStoryError] = useState('')
  const [pageUploading, setPageUploading] = useState<string | null>(null)
  const [audioUploading, setAudioUploading] = useState<string | null>(null)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkProgress, setBulkProgress] = useState('')

  // Re-derive versionForms/revisionsByLang from mission.mission_versions
  // without touching activeLang/general — used after Publish/Rollback/
  // Create Revision so the editor reflects the new revision in place.
  const loadVersions = () => {
    const forms: Record<Lang, VersionForm> = { en: { ...EMPTY_VERSION }, fr: { ...EMPTY_VERSION }, rw: { ...EMPTY_VERSION } }
    const revisions: Record<Lang, MissionVersionRow[]> = { en: [], fr: [], rw: [] }
    for (const lang of LANGUAGES) {
      const langVersions = mission.mission_versions.filter(v => v.language === lang)
      revisions[lang] = [...langVersions].sort((a, b) => b.revision_number - a.revision_number)
      const current = langVersions.find(v => v.is_current)
      if (current) {
        forms[lang] = {
          id: current.id,
          title: current.title ?? '',
          subtitle: current.subtitle ?? '',
          tip_text: current.tip_text ?? '',
          media_url: current.media_url ?? '',
          content_json: current.content_json ?? {},
          status: current.status ?? 'draft',
          revision_number: current.revision_number,
          is_current: current.is_current,
          created_at: current.created_at,
        }
      }
    }
    setVersionForms(forms)
    setRevisionsByLang(revisions)
  }

  const resetForm = () => {
    setGeneral({
      sequence: mission.sequence,
      stars: mission.stars,
      duration_minutes: mission.duration_minutes,
      type: mission.type,
      category_slug: mission.category_slug,
    })
    loadVersions()
    setActiveLang('en')
    setMessage('')
    setError('')
  }

  // Changes whenever the underlying revisions actually change (Publish /
  // Rollback / Create Revision), but not on every keystroke.
  const versionsSignature = mission.mission_versions
    .map(v => `${v.id}:${v.revision_number}:${v.is_current}:${v.status}`)
    .sort()
    .join('|')

  useEffect(() => {
    resetForm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission.id])

  useEffect(() => {
    loadVersions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionsSignature])

  useEffect(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
  }, [activeLang, mission.id])

  // ── FlipFlop story helpers ───────────────────────────────────
  const fetchStory = async () => {
    if (!mission.story_id) { setStory(null); return }
    setStoryLoading(true)
    setStoryError('')
    const { data, error } = await supabase
      .from('stories')
      .select('id, slug, title, cover_url, sort_order, is_active, story_pages(id, story_id, page_number, image_url, story_page_versions(id, language, text, audio_url, published))')
      .eq('id', mission.story_id)
      .single()
    if (error) setStoryError(error.message)
    else setStory(data as unknown as StoryRow)
    setStoryLoading(false)
  }

  useEffect(() => {
    if (mission.category_slug === 'flipflop') fetchStory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission.id, mission.story_id])

  const handleCreateStory = async () => {
    setStoryError('')
    try {
      const slug = `story-${mission.id.slice(0, 8)}-${Date.now()}`
      const title = versionForms.en.title || 'Untitled Story'
      const { data: sd, error: sErr } = await withTimeout(
        supabase.from('stories').insert({ slug, title, sort_order: 1, is_active: false }).select('id').single()
      )
      if (sErr) throw sErr
      const { error: mErr } = await withTimeout(
        supabase.from('missions').update({ story_id: sd.id }).eq('id', mission.id)
      )
      if (mErr) throw mErr
      onSaved()
    } catch (err) {
      console.error('Create story error:', err)
      setStoryError(err instanceof Error ? err.message : String(err))
    }
  }

  const handlePageImageUpload = async (pageId: string, file: File) => {
    setPageUploading(pageId)
    setStoryError('')
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `stories/${mission.story_id}/img-${pageId.slice(0, 8)}-${Date.now()}.${ext}`
      const { error: upErr, storagePath } = await smartUpload('storyBook', path, file)
      if (upErr) throw upErr
      const { error: dbErr } = await withTimeout(
        supabase.from('story_pages').update({ image_url: storagePath }).eq('id', pageId)
      )
      if (dbErr) throw dbErr
      await fetchStory()
    } catch (err) {
      console.error('Page image upload error:', err)
      setStoryError(err instanceof Error ? err.message : String(err) || 'Image upload failed.')
    } finally {
      setPageUploading(null)
    }
  }

  const handlePageAudioUpload = async (pageId: string, lang: Lang, file: File) => {
    const key = `${pageId}-${lang}`
    setAudioUploading(key)
    setStoryError('')
    try {
      const ext = file.name.split('.').pop() ?? 'mp3'
      const path = `stories/${mission.story_id}/${lang}-${pageId.slice(0, 8)}-${Date.now()}.${ext}`
      const { error: upErr, storagePath } = await smartUpload('storyBook', path, file)
      if (upErr) throw upErr
      const { error: dbErr } = await withTimeout(
        supabase.from('story_page_versions')
          .upsert({ story_page_id: pageId, language: lang, audio_url: storagePath, published: true }, { onConflict: 'story_page_id,language' })
      )
      if (dbErr) throw dbErr
      await fetchStory()
    } catch (err) {
      console.error('Page audio upload error:', err)
      setStoryError(err instanceof Error ? err.message : String(err) || 'Audio upload failed.')
    } finally {
      setAudioUploading(null)
    }
  }

  const handleRemovePageAudio = async (pageId: string, lang: Lang) => {
    setStoryError('')
    try {
      const { error } = await withTimeout(
        supabase.from('story_page_versions').update({ audio_url: null }).eq('story_page_id', pageId).eq('language', lang)
      )
      if (error) throw error
      await fetchStory()
    } catch (err) {
      console.error('Remove audio error:', err)
      setStoryError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleBulkPageUpload = async (files: FileList) => {
    if (!story) return
    setBulkUploading(true)
    setStoryError('')
    const sorted = Array.from(files).sort((a, b) => a.name.localeCompare(b.name))
    const sortedPages = [...story.story_pages].sort((a, b) => a.page_number - b.page_number)
    const emptyPages = sortedPages.filter(p => !p.image_url)
    let currentMax = sortedPages.length > 0 ? Math.max(...sortedPages.map(p => p.page_number)) : 0

    for (let i = 0; i < sorted.length; i++) {
      const file = sorted[i]
      setBulkProgress(`${i + 1} / ${sorted.length}`)
      try {
        let pageId: string
        if (i < emptyPages.length) {
          pageId = emptyPages[i].id
        } else {
          currentMax += 1
          const { data: pd, error: pErr } = await withTimeout(
            supabase.from('story_pages').insert({ story_id: story.id, page_number: currentMax }).select('id').single()
          )
          if (pErr) throw pErr
          pageId = pd.id
        }
        const ext = file.name.split('.').pop() ?? 'jpg'
        const path = `stories/${mission.story_id}/img-${pageId.slice(0, 8)}-${Date.now()}.${ext}`
        const { error: upErr, storagePath } = await smartUpload('storyBook', path, file)
        if (upErr) throw upErr
        const { error: dbErr } = await withTimeout(
          supabase.from('story_pages').update({ image_url: storagePath }).eq('id', pageId)
        )
        if (dbErr) throw dbErr
      } catch (err) {
        console.error(`Bulk upload error on "${file.name}":`, err)
        setStoryError(`Failed on "${file.name}": ${err instanceof Error ? err.message : String(err)}`)
        break
      }
    }
    setBulkUploading(false)
    setBulkProgress('')
    await fetchStory()
  }

  const handleAddPage = async () => {
    if (!story) return
    setStoryError('')
    try {
      const nextNum = story.story_pages.length > 0
        ? Math.max(...story.story_pages.map(p => p.page_number)) + 1
        : 1
      const { error } = await withTimeout(
        supabase.from('story_pages').insert({ story_id: story.id, page_number: nextNum })
      )
      if (error) throw error
      await fetchStory()
    } catch (err) {
      console.error('Add page error:', err)
      setStoryError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleDeletePage = async (pageId: string) => {
    setStoryError('')
    try {
      const { error } = await withTimeout(
        supabase.from('story_pages').delete().eq('id', pageId)
      )
      if (error) throw error
      await fetchStory()
    } catch (err) {
      console.error('Delete page error:', err)
      setStoryError(err instanceof Error ? err.message : String(err))
    }
  }

  const vf = versionForms[activeLang]
  // Goal 2: published content is read-only — admins must "Create Revision
  // to Edit" first, which clones this row into an editable draft.
  const locked = vf.status === 'published'

  const updateVersionField = <K extends keyof VersionForm>(field: K, value: VersionForm[K]) => {
    setVersionForms(prev => ({ ...prev, [activeLang]: { ...prev[activeLang], [field]: value } }))
  }

  const updateContentJson = (key: string, value: unknown) => {
    setVersionForms(prev => ({ ...prev, [activeLang]: { ...prev[activeLang], content_json: { ...prev[activeLang].content_json, [key]: value } } }))
  }

  const handleCopyFromEnglish = () => {
    const en = versionForms.en
    setVersionForms(prev => ({
      ...prev,
      [activeLang]: { ...prev[activeLang], title: en.title, subtitle: en.subtitle, tip_text: en.tip_text, media_url: en.media_url, content_json: en.content_json },
    }))
  }

  const handleAudioUpload = async (file: File) => {
    setUploadingAudio(true)
    setError('')
    try {
      const ext = file.name.split('.').pop()
      const path = `missions/${mission.id}-${activeLang}-${Date.now()}.${ext}`
      const { error: uploadErr, storagePath } = await smartUpload('storyBook', path, file)
      if (uploadErr) throw uploadErr
      updateVersionField('media_url', storagePath)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploadingAudio(false)
    }
  }

  const handleCoverUpload = async (file: File) => {
    setUploadingCover(true)
    setError('')
    try {
      const ext = file.name.split('.').pop()
      const path = `covers/${mission.id}-${activeLang}-${Date.now()}.${ext}`
      const { error: uploadErr, storagePath } = await smartUpload('storyBook', path, file)
      if (uploadErr) throw uploadErr
      updateContentJson('cover_image_url', storagePath)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploadingCover(false)
    }
  }

  const saveMission = async () => {
    setMessage('')
    setError('')
    setSaving(true)
    try {
      const anyPublished = LANGUAGES.some(lang => (lang === activeLang ? vf.status : versionForms[lang].status) === 'published')

      const { error: missionErr } = await supabase.from('missions').update({
        sequence: general.sequence,
        stars: general.stars,
        duration_minutes: general.duration_minutes,
        type: general.type,
        category_slug: general.category_slug,
        active: anyPublished,
      }).eq('id', mission.id)
      if (missionErr) throw missionErr

      const fields = {
        title: vf.title,
        subtitle: vf.subtitle,
        tip_text: vf.tip_text,
        media_url: vf.media_url,
        content_json: vf.content_json,
        status: vf.status,
      }
      if (vf.id) {
        const { error: versionErr } = await supabase.from('mission_versions').update(fields).eq('id', vf.id)
        if (versionErr) throw versionErr
      } else {
        const { error: versionErr } = await supabase.from('mission_versions').insert({ mission_id: mission.id, language: activeLang, ...fields })
        if (versionErr) throw versionErr
      }

      setMessage('Saved!')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save mission.')
    } finally {
      setSaving(false)
    }
  }

  function withTimeout<T>(p: PromiseLike<T>, ms = 20_000): Promise<T> {
    let tid: ReturnType<typeof setTimeout>
    const timeout = new Promise<never>((_, rej) => {
      tid = setTimeout(() => rej(new Error('Request timed out — check your connection and try again.')), ms)
    })
    return Promise.race([Promise.resolve(p), timeout]).finally(() => clearTimeout(tid))
  }

  const publishVersion = async (lang: Lang) => {
    const lf = versionForms[lang]
    let versionId = lf.id
    const fields = {
      title: lf.title,
      subtitle: lf.subtitle,
      tip_text: lf.tip_text,
      media_url: lf.media_url,
      content_json: lf.content_json,
    }
    if (versionId) {
      const { error } = await withTimeout(supabase.from('mission_versions').update(fields).eq('id', versionId))
      if (error) throw error
    } else {
      const { data: ins, error } = await withTimeout(
        supabase.from('mission_versions')
          .insert({ mission_id: mission.id, language: lang, status: 'draft', ...fields })
          .select('id').single()
      )
      if (error) throw error
      versionId = ins.id
    }
    const { error: pubErr } = await withTimeout(
      supabase.rpc('publish_mission_version_revision', { p_version_id: versionId })
    )
    if (pubErr) throw pubErr
  }

  const handlePublishAll = async () => {
    setMessage('')
    setError('')
    setPublishingAll(true)
    const errs: string[] = []
    for (const lang of LANGUAGES) {
      const lf = versionForms[lang]
      if (lf.status === 'published') continue
      if (!lf.title.trim()) continue
      try {
        await publishVersion(lang)
      } catch (err) {
        errs.push(`${LANGUAGE_META[lang].label}: ${err instanceof Error ? err.message : 'failed'}`)
      }
    }
    setPublishingAll(false)
    if (errs.length > 0) {
      setError(errs.join(' · '))
    } else {
      setMessage('All languages published!')
      onSaved()
    }
  }

  // Goal 3: Publish — persists any unsaved content edits to the current
  // (non-live) revision, then promotes it via the symmetric publish RPC,
  // which demotes the previously-published sibling to 'archived'.
  const handlePublish = async () => {
    setMessage('')
    setError('')
    if (!vf.title.trim()) {
      setError(`Add a ${LANGUAGE_META[activeLang].label} title before publishing.`)
      return
    }
    setPublishing(true)
    try {
      await publishVersion(activeLang)
      setMessage('Mission published!')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish mission.')
    } finally {
      setPublishing(false)
    }
  }

  // Goal 2: Create Revision to Edit — clones the published row into a new
  // draft (is_current=true); the published row stays live for learners.
  const handleCreateRevision = async () => {
    setMessage('')
    setError('')
    setCreatingRevision(true)
    try {
      const { error: rpcErr } = await supabase.rpc('create_mission_version_revision', { p_version_id: vf.id })
      if (rpcErr) throw rpcErr
      setMessage('New draft revision created — edit and Publish when ready.')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create a new revision.')
    } finally {
      setCreatingRevision(false)
    }
  }

  // Goal 3: Rollback — same RPC as Publish, targeting an older revision.
  const handleRollback = async (versionId: string) => {
    setMessage('')
    setError('')
    setRollingBackId(versionId)
    try {
      const { error: rpcErr } = await supabase.rpc('publish_mission_version_revision', { p_version_id: versionId })
      if (rpcErr) throw rpcErr
      setMessage('Rolled back to the selected revision.')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to roll back.')
    } finally {
      setRollingBackId(null)
    }
  }

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) audio.pause()
    else audio.play()
    setIsPlaying(!isPlaying)
  }

  const lyrics = (vf.content_json.lyrics as string[]) ?? []
  const lyricsText = lyrics.join('\n')
  interface VisualPrompt { order?: number; emoji?: string; label?: string; image_url?: string; video_url?: string; audio_url?: string; difficulty?: string; estimated_minutes?: number }
  const prompts = (vf.content_json.prompts as VisualPrompt[]) ?? []
  const updatePrompts = (next: VisualPrompt[]) => updateContentJson('prompts', next)
  const coverUrl = vf.content_json.cover_image_url as string | undefined

  interface QuestionItem { text: string; options: string[]; correct: number; emoji?: string }
  interface VocabItem { word: string; meaning: string; emoji?: string; audio_url?: string | null }
  const questions = (vf.content_json.questions as QuestionItem[]) ?? []
  const vocabulary = (vf.content_json.vocabulary as VocabItem[]) ?? []
  const updateQuestions = (next: QuestionItem[]) => updateContentJson('questions', next)
  const updateVocabulary = (next: VocabItem[]) => updateContentJson('vocabulary', next)

  const handleVocabAudioUpload = async (idx: number, file: File) => {
    setUploadingVocabAudio(p => ({ ...p, [idx]: true }))
    setError('')
    try {
      const ext = file.name.split('.').pop()
      const path = `vocab/${mission.id}-${activeLang}-${idx}-${Date.now()}.${ext}`
      const { error: uploadErr, storagePath } = await smartUpload('storyBook', path, file)
      if (uploadErr) throw uploadErr
      updateVocabulary(vocabulary.map((v, i) => i === idx ? { ...v, audio_url: storagePath } : v))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audio upload failed.')
    } finally {
      setUploadingVocabAudio(p => ({ ...p, [idx]: false }))
    }
  }

  return (
    <div className="p-5 sm:p-7 max-w-5xl mx-auto space-y-5">
      {/* Toasts */}
      {message && (
        <div className="flex items-center gap-2 rounded-2xl px-4 py-3 bg-emerald-50 text-emerald-700 text-sm font-bold border border-emerald-100">
          <CheckCircle2 size={16} className="flex-shrink-0" /> {message}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-2xl px-4 py-3 bg-red-50 text-red-600 text-sm font-bold border border-red-100">
          <AlertCircle size={16} className="flex-shrink-0" /> {error}
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm bg-white ${accent.text}`}>
            <meta.icon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-gray-800 leading-tight">Editing Mission #{general.sequence}</h2>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold mt-1 ${STATUS_META[vf.status].badge}`}>
              {STATUS_META[vf.status].label} · {LANGUAGE_META[activeLang].label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resetForm} disabled={saving || publishing || publishingAll || creatingRevision} className="px-4 py-2.5 rounded-full text-sm font-bold text-gray-500 hover:bg-gray-100 transition disabled:opacity-50">
            Cancel
          </button>
          {vf.status === 'published' ? (
            <button onClick={handleCreateRevision} disabled={creatingRevision} className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-bold text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition disabled:opacity-50 disabled:hover:translate-y-0 ${accent.button}`}>
              <GitBranch size={15} /> {creatingRevision ? 'Creating Revision...' : 'Create Revision to Edit'}
            </button>
          ) : (
            <>
              <button onClick={() => saveMission()} disabled={saving || publishing || publishingAll} className={`px-5 py-2.5 rounded-full text-sm font-bold text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition disabled:opacity-50 disabled:hover:translate-y-0 ${accent.button}`}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={handlePublish} disabled={saving || publishing || publishingAll || !vf.title.trim()} className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition disabled:opacity-50 disabled:hover:translate-y-0">
                <Rocket size={15} /> {publishing ? 'Publishing...' : 'Publish'}
              </button>
              <button onClick={handlePublishAll} disabled={saving || publishing || publishingAll} className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition disabled:opacity-50 disabled:hover:translate-y-0">
                <Rocket size={15} /> {publishingAll ? 'Publishing All...' : 'Publish All Languages'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Language tabs */}
      <div className="flex items-center justify-between flex-wrap gap-2 bg-gray-50 rounded-2xl p-1.5 border border-gray-100">
        <div className="flex items-center gap-1 flex-wrap">
          {LANGUAGES.map(lang => (
            <button
              key={lang}
              onClick={() => setActiveLang(lang)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold transition ${
                activeLang === lang ? `bg-white shadow-sm ${accent.text}` : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{LANGUAGE_META[lang].flag}</span> {LANGUAGE_META[lang].label}
              {versionForms[lang].status === 'published' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />}
            </button>
          ))}
        </div>
        {activeLang !== 'en' && (
          <button onClick={handleCopyFromEnglish} disabled={locked} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed ${accent.soft} ${accent.text}`}>
            <CopyIcon size={13} /> Copy from English
          </button>
        )}
      </div>

      {/* General Information */}
      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${accent.tile}`}>
            <Settings2 size={15} />
          </div>
          <h3 className="text-sm font-extrabold text-gray-800">General Information</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Sequence Number</label>
            <input
              type="number"
              value={general.sequence}
              onChange={e => setGeneral(g => ({ ...g, sequence: Number(e.target.value) }))}
              className={inputClass(accent.ring)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">⭐ Stars</label>
            <input
              type="number"
              value={general.stars}
              onChange={e => setGeneral(g => ({ ...g, stars: Number(e.target.value) }))}
              className={inputClass(accent.ring)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Duration (min)</label>
            <input
              type="number"
              value={general.duration_minutes}
              onChange={e => setGeneral(g => ({ ...g, duration_minutes: Number(e.target.value) }))}
              className={inputClass(accent.ring)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Status</label>
            <select
              value={vf.status}
              onChange={e => updateVersionField('status', e.target.value as ContentStatus)}
              disabled={vf.status === 'published'}
              className={`${inputClass(accent.ring)} disabled:bg-gray-50 disabled:text-gray-400`}
            >
              {CONTENT_STATUSES.filter(s => vf.status === 'published' || s !== 'published').map(s => (
                <option key={s} value={s}>{STATUS_META[s].label}</option>
              ))}
            </select>
            {vf.status === 'published' && (
              <p className="text-[11px] text-gray-400 mt-1">Use Publish/Rollback to change.</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Mission Type</label>
            <select
              value={general.type}
              onChange={e => setGeneral(g => ({ ...g, type: e.target.value as MissionType }))}
              className={inputClass(accent.ring)}
            >
              {MISSION_TYPES.map(t => (
                <option key={t} value={t}>{TYPE_META[t].emoji} {TYPE_META[t].label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Category</label>
            <select
              value={general.category_slug}
              onChange={e => setGeneral(g => ({ ...g, category_slug: e.target.value }))}
              className={inputClass(accent.ring)}
            >
              {CATEGORY_ORDER.map(slug => (
                <option key={slug} value={slug}>{CATEGORY_META[slug].label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Content + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <section className="lg:col-span-3 bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${accent.tile}`}>
              <FileText size={15} />
            </div>
            <h3 className="text-sm font-extrabold text-gray-800">Content · {LANGUAGE_META[activeLang].label}</h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Title</label>
            <input
              type="text"
              value={vf.title}
              onChange={e => updateVersionField('title', e.target.value)}
              disabled={locked}
              className={`${inputClass(accent.ring)} disabled:bg-gray-50 disabled:text-gray-400`}
            />
          </div>

          {mission.category_slug !== 'flipflop' && (
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Audio File</label>
              {vf.media_url ? (
                <div className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 border ${accent.soft} ${accent.border}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-white ${accent.text}`}>
                    <Music size={16} />
                  </div>
                  <span className="flex-1 text-sm font-semibold text-gray-700 truncate">{basename(vf.media_url)}</span>
                  {!locked && (
                    <button onClick={() => updateVersionField('media_url', '')} className="text-gray-400 hover:text-red-500 flex-shrink-0 transition">
                      <X size={16} />
                    </button>
                  )}
                </div>
              ) : (
                <label className={`flex items-center gap-2 justify-center border-2 border-dashed border-gray-200 rounded-2xl px-3 py-3.5 text-sm font-semibold text-gray-400 transition ${locked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-50 hover:border-gray-300'}`}>
                  <Upload size={15} /> {uploadingAudio ? 'Uploading...' : 'Upload audio file'}
                  <input type="file" accept="audio/*,video/*" className="hidden" disabled={uploadingAudio || locked} onChange={e => e.target.files?.[0] && handleAudioUpload(e.target.files[0])} />
                </label>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Subtitle</label>
            <input
              type="text"
              value={vf.subtitle}
              onChange={e => updateVersionField('subtitle', e.target.value)}
              disabled={locked}
              className={`${inputClass(accent.ring)} disabled:bg-gray-50 disabled:text-gray-400`}
            />
          </div>

          {general.type === 'sing' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Lyrics</label>
                <span className="text-xs text-gray-400 font-semibold">{lyricsText.length} / 1000</span>
              </div>
              <textarea
                value={lyricsText}
                maxLength={1000}
                rows={6}
                onChange={e => updateContentJson('lyrics', e.target.value.split('\n'))}
                disabled={locked}
                className={`w-full border-l-4 ${accent.border} border-y border-r border-gray-200 rounded-r-2xl rounded-l-md px-4 py-3 text-sm font-mono text-gray-700 leading-relaxed transition disabled:bg-gray-50 disabled:text-gray-400 ${accent.ring}`}
              />
            </div>
          )}

          {general.type === 'move' && (
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Visual Activity Cards</label>
              <p className="text-[11px] text-gray-400 mb-3">Each card = one action for kids. Upload images/videos/audio so pre-readers can See → Hear → Copy.</p>
              <div className="space-y-3">
                {[...prompts].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((p, i) => {
                  const promptIdx = prompts.indexOf(p)
                  const update = (field: string, val: string | number | undefined) =>
                    updatePrompts(prompts.map((x, idx) => idx === promptIdx ? { ...x, [field]: val } : x))

                  const handlePromptMedia = async (field: 'image_url' | 'video_url' | 'audio_url', file: File) => {
                    const ext = file.name.split('.').pop()
                    const path = `moves/${mission.id}-${field}-${i}-${Date.now()}.${ext}`
                    const { error: err, storagePath } = await smartUpload('storyBook', path, file)
                    if (!err) update(field, storagePath)
                  }

                  return (
                    <div key={i} className="bg-gray-50 rounded-xl border border-gray-100 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-gray-400 w-5">#{p.order ?? i + 1}</span>
                        <input type="text" value={p.emoji ?? ''} onChange={e => update('emoji', e.target.value)} placeholder="👏" disabled={locked}
                          className="w-11 h-9 text-center text-lg bg-white border border-gray-200 rounded-lg" />
                        <input type="text" value={p.label ?? ''} onChange={e => update('label', e.target.value)} placeholder="Action label" disabled={locked}
                          className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px]" />
                        <select value={p.difficulty ?? ''} onChange={e => update('difficulty', e.target.value || undefined)} disabled={locked}
                          className="bg-white border border-gray-200 rounded-lg px-2 py-2 text-[11px] font-bold text-gray-600">
                          <option value="">Difficulty</option>
                          <option value="easy">⭐ Easy</option>
                          <option value="medium">⭐⭐ Medium</option>
                          <option value="hard">⭐⭐⭐ Hard</option>
                        </select>
                        <input type="number" value={p.order ?? i + 1} onChange={e => update('order', Number(e.target.value))} disabled={locked}
                          className="w-12 bg-white border border-gray-200 rounded-lg px-2 py-2 text-[11px] text-center" title="Order" />
                        <button onClick={() => updatePrompts(prompts.filter((_, idx) => idx !== promptIdx))} disabled={locked}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Media uploads row */}
                      <div className="flex gap-2 ml-7">
                        {(['image_url', 'video_url', 'audio_url'] as const).map(field => {
                          const val = p[field]
                          const labels: Record<string, string> = { image_url: '📷 Image', video_url: '🎥 Video', audio_url: '🔊 Audio' }
                          const accepts: Record<string, string> = { image_url: 'image/*', video_url: 'video/*', audio_url: 'audio/*' }
                          return (
                            <div key={field} className="flex-1">
                              {val ? (
                                <div className="flex items-center gap-1 bg-emerald-50 rounded-lg px-2 py-1.5 text-[10px]">
                                  <span className="text-emerald-600 font-bold truncate flex-1">{labels[field]} ✓</span>
                                  <button onClick={() => update(field, undefined)} className="text-red-400 hover:text-red-600 font-bold">✕</button>
                                </div>
                              ) : (
                                <label className="flex items-center justify-center gap-1 border border-dashed border-gray-200 rounded-lg py-1.5 text-[10px] text-gray-400 hover:text-green-500 hover:border-green-300 cursor-pointer transition">
                                  {labels[field]}
                                  <input type="file" accept={accepts[field]} className="hidden" disabled={locked}
                                    onChange={e => { const f = e.target.files?.[0]; if (f) handlePromptMedia(field, f) }} />
                                </label>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
              <button onClick={() => updatePrompts([...prompts, { order: prompts.length + 1, emoji: '', label: '' }])} disabled={locked}
                className={`mt-3 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12px] font-bold transition hover:opacity-80 disabled:opacity-40 ${accent.soft} ${accent.text}`}>
                <Plus size={14} /> Add Activity Card
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Tip Text</label>
            <input
              type="text"
              value={vf.tip_text}
              onChange={e => updateVersionField('tip_text', e.target.value)}
              disabled={locked}
              className={`${inputClass(accent.ring)} disabled:bg-gray-50 disabled:text-gray-400`}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Cover Image (Optional)</label>
            {coverUrl ? (
              <div className="flex items-center gap-3">
                <img src={getStorageUrl(coverUrl)} alt="Cover" className="w-20 h-20 rounded-2xl object-cover border border-gray-100 shadow-sm" />
                {!locked && (
                  <button onClick={() => updateContentJson('cover_image_url', undefined)} className="text-xs font-bold text-red-500 hover:text-red-600 px-3 py-1.5 rounded-full hover:bg-red-50 transition">Remove</button>
                )}
              </div>
            ) : (
              <label
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); if (locked) return; const f = e.dataTransfer.files?.[0]; if (f) handleCoverUpload(f) }}
                className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-2xl px-4 py-6 transition text-center ${locked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-50 hover:border-gray-300'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent.tile}`}>
                  <ImageIcon size={18} />
                </div>
                <span className="text-sm font-semibold text-gray-500">{uploadingCover ? 'Uploading...' : 'Upload cover image'}</span>
                <span className="text-xs text-gray-400">PNG or JPG, up to 5MB</span>
                <input type="file" accept="image/*" className="hidden" disabled={uploadingCover || locked} onChange={e => e.target.files?.[0] && handleCoverUpload(e.target.files[0])} />
              </label>
            )}
          </div>
        </section>

        {/* Preview panel */}
        <section className="lg:col-span-2 h-fit">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${accent.tile}`}>
              <Eye size={15} />
            </div>
            <h3 className="text-sm font-extrabold text-gray-800">Live Preview</h3>
          </div>
          <div className={`relative overflow-hidden rounded-3xl p-5 text-white shadow-lg ${accent.gradient}`}>
            <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
            <div className="absolute -bottom-10 -left-6 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
            <div className="relative">
              {coverUrl && (
                <img src={getStorageUrl(coverUrl)} alt="Cover" className="w-full h-32 object-cover rounded-2xl mb-3 border-2 border-white/30" />
              )}
              <p className="font-extrabold text-lg leading-tight">{vf.title || 'Untitled mission'}</p>
              {vf.subtitle && <p className="text-sm text-white/80 mt-0.5">{vf.subtitle}</p>}

              {vf.media_url && isAudioFile(vf.media_url) && (
                <div className="mt-4 flex items-center gap-3 bg-white/15 backdrop-blur rounded-2xl px-3.5 py-3 border border-white/20">
                  <audio
                    ref={audioRef}
                    src={getStorageUrl(vf.media_url)}
                    onTimeUpdate={e => setCurrentTime(e.currentTarget.currentTime)}
                    onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  />
                  <button onClick={togglePlay} className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-white text-gray-800 hover:scale-105 transition shadow-sm">
                    {isPlaying ? <Pause size={17} /> : <Play size={17} />}
                  </button>
                  <div className="flex-1">
                    <div className="h-1.5 rounded-full bg-white/25 overflow-hidden">
                      <div className="h-full bg-white transition-all" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
                    </div>
                    <p className="text-[11px] text-white/70 mt-1 font-semibold">{formatTime(currentTime)} / {formatTime(duration)}</p>
                  </div>
                </div>
              )}

              {vf.tip_text && (
                <div className="mt-4 flex items-start gap-2 bg-white/15 backdrop-blur rounded-2xl px-3.5 py-3 border border-white/20">
                  <Lightbulb size={15} className="flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium leading-snug">{vf.tip_text}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Comprehension & Vocabulary */}
      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-6">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${accent.tile}`}>
            <HelpCircle size={15} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-gray-800">Comprehension &amp; Vocabulary</h3>
            <p className="text-[11px] text-gray-400">Shown after the child completes this mission · {LANGUAGE_META[activeLang].label}</p>
          </div>
        </div>

        {/* Questions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">
              Questions <span className="font-normal normal-case text-gray-300">({questions.length})</span>
            </label>
            <button
              onClick={() => updateQuestions([...questions, { text: '', options: ['', '', ''], correct: 0 }])}
              disabled={locked}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold transition disabled:opacity-40 ${accent.soft} ${accent.text}`}
            >
              <Plus size={12} /> Add Question
            </button>
          </div>
          <div className="space-y-4">
            {questions.map((q, qi) => (
              <div key={qi} className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={q.emoji ?? ''}
                    onChange={e => updateQuestions(questions.map((x, i) => i === qi ? { ...x, emoji: e.target.value } : x))}
                    placeholder="🧠"
                    disabled={locked}
                    className="w-10 h-9 text-center text-lg bg-white border border-gray-200 rounded-lg shrink-0"
                  />
                  <input
                    type="text"
                    value={q.text}
                    onChange={e => updateQuestions(questions.map((x, i) => i === qi ? { ...x, text: e.target.value } : x))}
                    placeholder="What happened in the story?"
                    disabled={locked}
                    className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-700"
                  />
                  <button
                    onClick={() => updateQuestions(questions.filter((_, i) => i !== qi))}
                    disabled={locked}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition shrink-0 disabled:opacity-40"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="space-y-2 pl-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Options · click circle = correct answer</p>
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuestions(questions.map((x, i) => i === qi ? { ...x, correct: oi } : x))}
                        disabled={locked}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                          q.correct === oi ? 'border-emerald-400 bg-emerald-400' : 'border-gray-300 hover:border-emerald-300'
                        }`}
                      >
                        {q.correct === oi && <span className="w-2 h-2 rounded-full bg-white block" />}
                      </button>
                      <span className="w-4 text-[11px] font-bold text-gray-400 shrink-0">{String.fromCharCode(65 + oi)}</span>
                      <input
                        type="text"
                        value={opt}
                        onChange={e => {
                          const newOpts = [...q.options]; newOpts[oi] = e.target.value
                          updateQuestions(questions.map((x, i) => i === qi ? { ...x, options: newOpts } : x))
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                        disabled={locked}
                        className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-gray-700"
                      />
                      {q.options.length > 2 && (
                        <button
                          onClick={() => {
                            const newOpts = q.options.filter((_, idx) => idx !== oi)
                            const newCorrect = q.correct >= newOpts.length ? 0 : q.correct === oi ? 0 : q.correct > oi ? q.correct - 1 : q.correct
                            updateQuestions(questions.map((x, i) => i === qi ? { ...x, options: newOpts, correct: newCorrect } : x))
                          }}
                          disabled={locked}
                          className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-400 transition shrink-0"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  {q.options.length < 4 && (
                    <button
                      onClick={() => updateQuestions(questions.map((x, i) => i === qi ? { ...x, options: [...x.options, ''] } : x))}
                      disabled={locked}
                      className="text-[11px] font-bold text-gray-400 hover:text-gray-600 transition disabled:opacity-40 flex items-center gap-1 pl-8"
                    >
                      <Plus size={11} /> Add option
                    </button>
                  )}
                </div>
              </div>
            ))}
            {questions.length === 0 && (
              <p className="text-[12px] text-gray-400 text-center py-4 border-2 border-dashed border-gray-100 rounded-2xl">No questions yet — click &quot;Add Question&quot; above</p>
            )}
          </div>
        </div>

        {/* Vocabulary */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">
              Vocabulary Words <span className="font-normal normal-case text-gray-300">({vocabulary.length})</span>
            </label>
            <button
              onClick={() => updateVocabulary([...vocabulary, { word: '', meaning: '' }])}
              disabled={locked}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold transition disabled:opacity-40 ${accent.soft} ${accent.text}`}
            >
              <Plus size={12} /> Add Word
            </button>
          </div>
          <div className="space-y-3">
            {vocabulary.map((v, vi) => (
              <div key={vi} className="flex items-center gap-2 bg-gray-50 rounded-2xl border border-gray-100 p-3 flex-wrap sm:flex-nowrap">
                <input
                  type="text"
                  value={v.emoji ?? ''}
                  onChange={e => updateVocabulary(vocabulary.map((x, i) => i === vi ? { ...x, emoji: e.target.value } : x))}
                  placeholder="📖"
                  disabled={locked}
                  className="w-10 h-9 text-center text-lg bg-white border border-gray-200 rounded-lg shrink-0"
                />
                <input
                  type="text"
                  value={v.word}
                  onChange={e => updateVocabulary(vocabulary.map((x, i) => i === vi ? { ...x, word: e.target.value } : x))}
                  placeholder="Word"
                  disabled={locked}
                  className="w-28 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-700 shrink-0"
                />
                <input
                  type="text"
                  value={v.meaning}
                  onChange={e => updateVocabulary(vocabulary.map((x, i) => i === vi ? { ...x, meaning: e.target.value } : x))}
                  placeholder="Meaning / definition"
                  disabled={locked}
                  className="flex-1 min-w-0 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700"
                />
                {v.audio_url ? (
                  <div className="flex items-center gap-1 bg-teal-50 rounded-lg px-2 py-1.5 text-[10px] shrink-0">
                    <Volume2 size={11} className="text-teal-500" />
                    <span className="font-bold text-teal-600">Audio ✓</span>
                    {!locked && (
                      <button onClick={() => updateVocabulary(vocabulary.map((x, i) => i === vi ? { ...x, audio_url: null } : x))} className="text-red-400 hover:text-red-600 ml-1">✕</button>
                    )}
                  </div>
                ) : (
                  <label className={`flex items-center gap-1 border border-dashed border-gray-200 rounded-lg px-2 py-1.5 text-[10px] text-gray-400 hover:text-teal-500 hover:border-teal-300 cursor-pointer transition shrink-0 ${locked || uploadingVocabAudio[vi] ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <Volume2 size={11} />
                    {uploadingVocabAudio[vi] ? 'Uploading…' : 'Audio'}
                    <input type="file" accept="audio/*" className="hidden" disabled={locked || uploadingVocabAudio[vi]}
                      onChange={e => e.target.files?.[0] && handleVocabAudioUpload(vi, e.target.files[0])} />
                  </label>
                )}
                <button
                  onClick={() => updateVocabulary(vocabulary.filter((_, i) => i !== vi))}
                  disabled={locked}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition shrink-0 disabled:opacity-40"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {vocabulary.length === 0 && (
              <p className="text-[12px] text-gray-400 text-center py-4 border-2 border-dashed border-gray-100 rounded-2xl">No vocabulary words yet — click &quot;Add Word&quot; above</p>
            )}
          </div>
        </div>
      </section>

      {/* FlipFlop Story Pages */}
      {mission.category_slug === 'flipflop' && (() => {
        const sortedPages = story ? [...story.story_pages].sort((a, b) => a.page_number - b.page_number) : []
        const audioStats = story ? LANGUAGES.map(lang => ({
          lang,
          count: sortedPages.filter(p => p.story_page_versions?.some(v => v.language === lang && v.audio_url)).length,
        })) : []
        return (
          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

            {/* ── Header ── */}
            <div className="flex items-center justify-between gap-3 flex-wrap px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${accent.tile}`}>
                  <BookOpen size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-800 leading-tight">Story Pages</h3>
                  {story && (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400 font-semibold">{sortedPages.length} {sortedPages.length === 1 ? 'page' : 'pages'}</span>
                      <span className="text-gray-200">·</span>
                      {audioStats.map(s => (
                        <span key={s.lang} className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${s.count === sortedPages.length && sortedPages.length > 0 ? 'bg-emerald-100 text-emerald-600' : s.count > 0 ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
                          {LANGUAGE_META[s.lang].flag} {s.count}/{sortedPages.length}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {story && (
                <div className="flex items-center gap-2">
                  <label className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white shadow-sm transition cursor-pointer select-none ${bulkUploading ? 'opacity-50 cursor-not-allowed bg-blue-400' : 'bg-blue-500 hover:bg-blue-600'}`}>
                    <Upload size={13} />
                    {bulkUploading ? `Uploading ${bulkProgress}…` : 'Upload Pages'}
                    <input type="file" multiple accept="image/*" className="hidden" disabled={bulkUploading}
                      onChange={e => e.target.files && e.target.files.length > 0 && handleBulkPageUpload(e.target.files)} />
                  </label>
                  <button onClick={handleAddPage} disabled={bulkUploading}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold shadow-sm transition disabled:opacity-50 ${accent.button} text-white`}>
                    <Plus size={13} /> Add Empty Page
                  </button>
                </div>
              )}
            </div>

            {/* ── Bulk upload progress bar ── */}
            {bulkUploading && (
              <div className="h-1 bg-blue-100">
                <div className="h-full bg-blue-500 animate-pulse" style={{ width: bulkProgress ? `${(parseInt(bulkProgress) / parseInt(bulkProgress.split('/')[1] ?? '1')) * 100}%` : '100%' }} />
              </div>
            )}

            {/* ── Error ── */}
            {storyError && (
              <div className="flex items-start gap-2 mx-5 mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs font-semibold text-red-600 leading-snug">{storyError}</p>
                <button onClick={() => setStoryError('')} className="ml-auto text-red-300 hover:text-red-500 transition shrink-0"><X size={13} /></button>
              </div>
            )}

            {/* ── Body ── */}
            <div className="p-5">

              {/* Loading */}
              {storyLoading && (
                <div className="flex items-center justify-center py-12 gap-2 text-sm text-gray-400">
                  <div className="w-4 h-4 rounded-full border-2 border-gray-200 border-t-blue-400 animate-spin" />
                  Loading pages…
                </div>
              )}

              {/* No story linked */}
              {!mission.story_id && !storyLoading && (
                <div className="flex flex-col items-center gap-4 py-12 text-center">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${accent.tile}`}>
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-gray-700">No story linked yet</p>
                    <p className="text-xs text-gray-400 mt-1">Create a story to start adding pages with images and audio.</p>
                  </div>
                  <button onClick={handleCreateStory} className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white shadow-md hover:shadow-lg transition ${accent.button}`}>
                    <Plus size={15} /> Create & Link Story
                  </button>
                </div>
              )}

              {/* Story exists but no pages */}
              {story && sortedPages.length === 0 && (
                <div className="flex flex-col items-center gap-4 py-10 text-center">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gray-100">
                    <ImageIcon size={22} className="text-gray-300" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-gray-700">No pages yet</p>
                    <p className="text-xs text-gray-400 mt-1">Upload all your page images at once, or add pages one by one.</p>
                  </div>
                  <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white bg-blue-500 hover:bg-blue-600 shadow-md hover:shadow-lg transition cursor-pointer">
                    <Upload size={15} /> Upload Pages
                    <input type="file" multiple accept="image/*" className="hidden"
                      onChange={e => e.target.files && e.target.files.length > 0 && handleBulkPageUpload(e.target.files)} />
                  </label>
                </div>
              )}

              {/* Pages grid */}
              {story && sortedPages.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {sortedPages.map(page => {
                    const spv = page.story_page_versions?.find(v => v.language === activeLang)
                    const audioKey = `${page.id}-${activeLang}`
                    const isUploading = pageUploading === page.id
                    const isAudioUploading = audioUploading === audioKey

                    return (
                      <div key={page.id} className="group rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">

                        {/* Image area */}
                        <div className="relative aspect-[3/4] bg-gray-50 overflow-hidden">
                          {page.image_url ? (
                            <>
                              <img
                                src={getStorageUrl(page.image_url)}
                                alt={`Page ${page.page_number}`}
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                              {/* Replace overlay */}
                              <label className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                                  <Upload size={14} className="text-white" />
                                </div>
                                <span className="text-[10px] font-bold text-white">Replace</span>
                                <input type="file" accept="image/*" className="hidden"
                                  onChange={e => e.target.files?.[0] && handlePageImageUpload(page.id, e.target.files[0])} />
                              </label>
                            </>
                          ) : (
                            <label className="absolute inset-0 flex flex-col items-center justify-center gap-2 cursor-pointer group/upload hover:bg-gray-100 transition-colors">
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 border-dashed transition-colors ${isUploading ? 'border-blue-300 bg-blue-50' : 'border-gray-200 group-hover/upload:border-blue-300 group-hover/upload:bg-blue-50'}`}>
                                <Upload size={16} className={isUploading ? 'text-blue-400' : 'text-gray-300 group-hover/upload:text-blue-400'} />
                              </div>
                              <span className={`text-[10px] font-bold ${isUploading ? 'text-blue-400' : 'text-gray-400'}`}>
                                {isUploading ? 'Uploading…' : 'Add Image'}
                              </span>
                              <input type="file" accept="image/*" className="hidden" disabled={isUploading}
                                onChange={e => e.target.files?.[0] && handlePageImageUpload(page.id, e.target.files[0])} />
                            </label>
                          )}

                          {/* Upload loading overlay */}
                          {isUploading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                <span className="text-[10px] font-bold text-white">Uploading…</span>
                              </div>
                            </div>
                          )}

                          {/* Page number badge */}
                          <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/60 backdrop-blur flex items-center justify-center">
                            <span className="text-[10px] font-extrabold text-white leading-none">{page.page_number}</span>
                          </div>

                          {/* Delete button */}
                          <button
                            onClick={() => handleDeletePage(page.id)}
                            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                            title="Delete page"
                          >
                            <Trash2 size={11} className="text-white" />
                          </button>
                        </div>

                        {/* Audio footer */}
                        <div className="p-2.5 border-t border-gray-100 space-y-2">
                          {/* Language coverage dots — click to switch active lang */}
                          <div className="flex items-center gap-1">
                            {LANGUAGES.map(lang => {
                              const lv = page.story_page_versions?.find(v => v.language === lang)
                              const hasAudio = !!lv?.audio_url
                              const isActive = lang === activeLang
                              return (
                                <button
                                  key={lang}
                                  onClick={() => setActiveLang(lang)}
                                  title={`${LANGUAGE_META[lang].label} audio${hasAudio ? ' — uploaded' : ' — missing'}`}
                                  className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full transition ${isActive ? `${accent.soft} ${accent.text}` : 'text-gray-400 hover:bg-gray-100'}`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasAudio ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                                  {LANGUAGE_META[lang].flag}
                                </button>
                              )
                            })}
                          </div>

                          {/* Audio for active language */}
                          {spv?.audio_url ? (
                            <div className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 ${accent.soft}`}>
                              <Music size={11} className={`${accent.text} shrink-0`} />
                              <span className="flex-1 text-[10px] font-semibold text-gray-600 truncate">{basename(spv.audio_url)}</span>
                              <button onClick={() => handleRemovePageAudio(page.id, activeLang)} className="text-gray-400 hover:text-red-500 transition shrink-0">
                                <X size={11} />
                              </button>
                            </div>
                          ) : (
                            <label className={`flex items-center gap-1.5 justify-center border border-dashed border-gray-200 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-gray-400 cursor-pointer hover:bg-gray-50 hover:border-blue-300 hover:text-blue-400 transition ${isAudioUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                              <Upload size={11} />
                              {isAudioUploading ? 'Uploading…' : `${LANGUAGE_META[activeLang].flag} Add audio`}
                              <input type="file" accept="audio/*" className="hidden" disabled={isAudioUploading}
                                onChange={e => e.target.files?.[0] && handlePageAudioUpload(page.id, activeLang, e.target.files[0])} />
                            </label>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </section>
        )
      })()}

      {/* Revision History */}
      {revisionsByLang[activeLang].length > 0 && (
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${accent.tile}`}>
                <History size={15} />
              </div>
              <h3 className="text-sm font-extrabold text-gray-800">
                Revision History · {LANGUAGE_META[activeLang].label}
                <span className="ml-1.5 text-xs font-bold text-gray-400">({revisionsByLang[activeLang].length})</span>
              </h3>
            </div>
            <button
              onClick={handleCreateRevision}
              disabled={creatingRevision || vf.status !== 'published'}
              title={vf.status !== 'published' ? 'Publish this version first to create a new revision' : undefined}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-white bg-green-600 hover:bg-green-700 shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <GitBranch size={13} /> {creatingRevision ? 'Creating…' : 'Create Revision'}
            </button>
          </div>
          <div className="space-y-2">
            {revisionsByLang[activeLang].map(rev => (
              <div key={rev.id} className="flex items-center gap-2.5 rounded-2xl border border-gray-100 px-4 py-3 flex-wrap">
                <span className="text-sm font-extrabold text-gray-700 flex-shrink-0">v{rev.revision_number}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${STATUS_META[rev.status].badge}`}>
                  {STATUS_META[rev.status].label}
                </span>
                {rev.published && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 bg-emerald-50 text-emerald-600">🟢 Live</span>
                )}
                {rev.is_current && !rev.published && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 bg-green-50 text-green-600">Editing</span>
                )}
                <span className="flex-1 min-w-[80px] text-sm text-gray-500 truncate">{rev.title || 'Untitled'}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">{rev.created_at ? new Date(rev.created_at).toLocaleString() : ''}</span>
                {!rev.is_current && rev.status === 'archived' && (
                  <button
                    onClick={() => handleRollback(rev.id)}
                    disabled={rollingBackId === rev.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    <RotateCcw size={13} /> {rollingBackId === rev.id ? 'Rolling back…' : 'Rollback'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Info banner */}
      <div className={`flex items-start gap-3 rounded-2xl px-4 py-3.5 border ${accent.soft} ${accent.border}`}>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-white ${accent.text}`}>
          <Info size={14} />
        </div>
        <span className={`text-sm font-semibold ${accent.text}`}>Publishing makes this mission visible only to children whose language has a published version — there&apos;s no fallback to another language. Publish each language separately to reach those learners. Editing a published version creates a new revision — learners keep seeing the current content until you publish your changes.</span>
      </div>
    </div>
  )
}
