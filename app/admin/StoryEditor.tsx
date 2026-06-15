'use client'
import React, { useState, useRef, useMemo } from 'react'
import supabase from '@/lib/supabaseClient'
import { getStorageUrl } from '@/lib/queries'
import {
  BookOpen, Settings2, Image as ImageIcon, Upload, X, FileStack, Plus, Trash2,
  Music, Play, Pause, Info, CheckCircle2, AlertCircle, Copy as CopyIcon, Eye, FileText,
} from 'lucide-react'
import {
  ACCENT, LANGUAGES, LANGUAGE_META,
  type Lang, type StoryRow, type StoryPageRow,
} from './missionMeta'
import { useConfirmDialog } from './ConfirmDialog'

const accent = ACCENT.blue

interface StoryEditorProps {
  story: StoryRow
  onSaved: () => void
}

interface StoryForm {
  title: string
  slug: string
  theme_title: string
  theme_emoji: string
  sort_order: number
  cover_url: string
  is_active: boolean
}

interface PageVersionForm {
  text: string
  audio_url: string
  published: boolean
}

const EMPTY_PAGE_VERSION: PageVersionForm = { text: '', audio_url: '', published: false }

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

function storyFormFromRow(story: StoryRow): StoryForm {
  return {
    title: story.title ?? '',
    slug: story.slug ?? '',
    theme_title: story.theme_title ?? '',
    theme_emoji: story.theme_emoji ?? '',
    sort_order: story.sort_order ?? 1,
    cover_url: story.cover_url ?? '',
    is_active: story.is_active ?? false,
  }
}

export default function StoryEditor({ story, onSaved }: StoryEditorProps) {
  const [storyForm, setStoryForm] = useState<StoryForm>(() => storyFormFromRow(story))
  const sortedPages = useMemo(() => [...story.story_pages].sort((a, b) => a.page_number - b.page_number), [story.story_pages])
  const [selectedPageId, setSelectedPageId] = useState<string | null>(() => sortedPages[0]?.id ?? null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [uploadingCover, setUploadingCover] = useState(false)

  const resetForm = () => {
    setStoryForm(storyFormFromRow(story))
    setMessage('')
    setError('')
  }

  const selectedPage = sortedPages.find(p => p.id === selectedPageId) ?? null

  const handleCoverUpload = async (file: File) => {
    setUploadingCover(true)
    setError('')
    try {
      const ext = file.name.split('.').pop()
      const path = `covers/story-${story.id}-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('storyBook').upload(path, file, { upsert: true })
      if (uploadErr) throw uploadErr
      setStoryForm(f => ({ ...f, cover_url: `storyBook/${path}` }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploadingCover(false)
    }
  }

  const saveStory = async () => {
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const { error: err } = await supabase.from('stories').update({
        title: storyForm.title,
        slug: storyForm.slug,
        theme_title: storyForm.theme_title || null,
        theme_emoji: storyForm.theme_emoji || null,
        sort_order: storyForm.sort_order,
        cover_url: storyForm.cover_url || null,
        is_active: storyForm.is_active,
      }).eq('id', story.id)
      if (err) throw err
      setMessage('Story saved!')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save story.')
    } finally {
      setSaving(false)
    }
  }

  const handleAddPage = async () => {
    setError('')
    try {
      const maxPageNum = sortedPages.reduce((max, p) => Math.max(max, p.page_number), 0)
      const { data: newPage, error: err } = await supabase
        .from('story_pages')
        .insert({ story_id: story.id, page_number: maxPageNum + 1 })
        .select()
        .single()
      if (err) throw err
      await onSaved()
      setSelectedPageId(newPage.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add page.')
    }
  }

  const coverUrl = storyForm.cover_url

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
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-gray-800 leading-tight">Editing Story: {storyForm.title || 'Untitled'}</h2>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold mt-1 ${storyForm.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              {storyForm.is_active ? 'Active' : 'Draft'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resetForm} disabled={saving} className="px-4 py-2.5 rounded-full text-sm font-bold text-gray-500 hover:bg-gray-100 transition disabled:opacity-50">
            Cancel
          </button>
          <button onClick={saveStory} disabled={saving} className={`px-5 py-2.5 rounded-full text-sm font-bold text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition disabled:opacity-50 disabled:hover:translate-y-0 ${accent.button}`}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
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
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Title</label>
            <input
              type="text"
              value={storyForm.title}
              onChange={e => setStoryForm(f => ({ ...f, title: e.target.value }))}
              className={inputClass(accent.ring)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Status</label>
            <select
              value={storyForm.is_active ? 'active' : 'draft'}
              onChange={e => setStoryForm(f => ({ ...f, is_active: e.target.value === 'active' }))}
              className={inputClass(accent.ring)}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Slug</label>
            <input
              type="text"
              value={storyForm.slug}
              onChange={e => setStoryForm(f => ({ ...f, slug: e.target.value }))}
              className={inputClass(accent.ring)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Theme Title</label>
            <input
              type="text"
              value={storyForm.theme_title}
              onChange={e => setStoryForm(f => ({ ...f, theme_title: e.target.value }))}
              className={inputClass(accent.ring)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Theme Emoji</label>
            <input
              type="text"
              value={storyForm.theme_emoji}
              onChange={e => setStoryForm(f => ({ ...f, theme_emoji: e.target.value }))}
              className={inputClass(accent.ring)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Sort Order</label>
            <input
              type="number"
              value={storyForm.sort_order}
              onChange={e => setStoryForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
              className={inputClass(accent.ring)}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Cover Image (Optional)</label>
          {coverUrl ? (
            <div className="flex items-center gap-3">
              <img src={getStorageUrl(coverUrl)} alt="Cover" className="w-20 h-20 rounded-2xl object-cover border border-gray-100 shadow-sm" />
              <button onClick={() => setStoryForm(f => ({ ...f, cover_url: '' }))} className="text-xs font-bold text-red-500 hover:text-red-600 px-3 py-1.5 rounded-full hover:bg-red-50 transition">Remove</button>
            </div>
          ) : (
            <label
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleCoverUpload(f) }}
              className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-2xl px-4 py-6 cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition text-center"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent.tile}`}>
                <ImageIcon size={18} />
              </div>
              <span className="text-sm font-semibold text-gray-500">{uploadingCover ? 'Uploading...' : 'Upload cover image'}</span>
              <span className="text-xs text-gray-400">PNG or JPG, up to 5MB</span>
              <input type="file" accept="image/*" className="hidden" disabled={uploadingCover} onChange={e => e.target.files?.[0] && handleCoverUpload(e.target.files[0])} />
            </label>
          )}
        </div>
      </section>

      {/* Pages */}
      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${accent.tile}`}>
              <FileStack size={15} />
            </div>
            <h3 className="text-sm font-extrabold text-gray-800">Pages ({sortedPages.length})</h3>
          </div>
          <button onClick={handleAddPage} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition hover:opacity-80 ${accent.soft} ${accent.text}`}>
            <Plus size={14} /> Add Page
          </button>
        </div>

        {sortedPages.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-6">No pages yet. Click &quot;Add Page&quot; to add the first page.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {sortedPages.map(p => {
              const isSelected = p.id === selectedPageId
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPageId(p.id)}
                  className={`relative rounded-xl overflow-hidden border-2 aspect-[3/4] bg-gray-50 transition ${
                    isSelected ? `${accent.border} ring-2 ring-blue-300 ring-offset-1` : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  {p.image_url ? (
                    <img src={getStorageUrl(p.image_url)} alt={`Page ${p.page_number}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <ImageIcon size={20} />
                    </div>
                  )}
                  <span className="absolute top-1 left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-white/90 text-gray-700 text-[10px] font-bold flex items-center justify-center shadow-sm">
                    {p.page_number}
                  </span>
                  <div className="absolute bottom-1 right-1 flex gap-0.5">
                    {LANGUAGES.map(lang => {
                      const v = p.story_page_versions.find(x => x.language === lang)
                      const done = !!(v?.published && (v.text || v.audio_url))
                      return <span key={lang} className={`w-1.5 h-1.5 rounded-full ${done ? 'bg-emerald-400' : 'bg-white/70'}`} />
                    })}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* Page sub-editor */}
      {selectedPage && (
        <PageEditor key={selectedPage.id} story={story} page={selectedPage} onSaved={onSaved} pages={sortedPages} onSelectPage={setSelectedPageId} />
      )}

      {/* Info banner */}
      <div className={`flex items-start gap-3 rounded-2xl px-4 py-3.5 border ${accent.soft} ${accent.border}`}>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-white ${accent.text}`}>
          <Info size={14} />
        </div>
        <span className={`text-sm font-semibold ${accent.text}`}>Pages marked Published in a language will be shown to children reading this story in that language.</span>
      </div>
    </div>
  )
}

interface PageEditorProps {
  story: StoryRow
  page: StoryPageRow
  pages: StoryPageRow[]
  onSaved: () => void
  onSelectPage: (id: string | null) => void
}

function versionFormsFromPage(page: StoryPageRow): Record<Lang, PageVersionForm> {
  const forms: Record<Lang, PageVersionForm> = { en: { ...EMPTY_PAGE_VERSION }, fr: { ...EMPTY_PAGE_VERSION }, rw: { ...EMPTY_PAGE_VERSION } }
  for (const v of page.story_page_versions) {
    forms[v.language] = { text: v.text ?? '', audio_url: v.audio_url ?? '', published: v.published ?? false }
  }
  return forms
}

function PageEditor({ story, page, pages, onSaved, onSelectPage }: PageEditorProps) {
  const [activeLang, setActiveLang] = useState<Lang>('en')
  const [imageUrl, setImageUrl] = useState(page.image_url ?? '')
  const [versionForms, setVersionForms] = useState<Record<Lang, PageVersionForm>>(() => versionFormsFromPage(page))
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingAudio, setUploadingAudio] = useState(false)
  const { confirm, dialog } = useConfirmDialog()

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const vf = versionForms[activeLang]

  const updateVersionField = <K extends keyof PageVersionForm>(field: K, value: PageVersionForm[K]) => {
    setVersionForms(prev => ({ ...prev, [activeLang]: { ...prev[activeLang], [field]: value } }))
  }

  const handleCopyFromEnglish = () => {
    const en = versionForms.en
    setVersionForms(prev => ({ ...prev, [activeLang]: { ...prev[activeLang], text: en.text, audio_url: en.audio_url } }))
  }

  const setActiveLangAndReset = (lang: Lang) => {
    setActiveLang(lang)
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
  }

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true)
    setError('')
    try {
      const ext = file.name.split('.').pop()
      const path = `pages/${story.id}-${page.page_number}-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('storyBook').upload(path, file, { upsert: true })
      if (uploadErr) throw uploadErr
      setImageUrl(`storyBook/${path}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleAudioUpload = async (file: File) => {
    setUploadingAudio(true)
    setError('')
    try {
      const ext = file.name.split('.').pop()
      const path = `pages/${story.id}-${page.page_number}-${activeLang}-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('storyBook').upload(path, file, { upsert: true })
      if (uploadErr) throw uploadErr
      updateVersionField('audio_url', `storyBook/${path}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploadingAudio(false)
    }
  }

  const savePage = async () => {
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const { error: pageErr } = await supabase.from('story_pages').update({ image_url: imageUrl || null }).eq('id', page.id)
      if (pageErr) throw pageErr

      const { error: versionErr } = await supabase.from('story_page_versions').upsert({
        story_page_id: page.id,
        language: activeLang,
        text: vf.text || null,
        audio_url: vf.audio_url || null,
        published: vf.published,
      }, { onConflict: 'story_page_id,language' })
      if (versionErr) throw versionErr

      setMessage('Page saved!')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save page.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePage = async () => {
    const ok = await confirm({
      title: `Delete page #${page.page_number}?`,
      message: 'This also deletes its translations in all languages. This cannot be undone.',
    })
    if (!ok) return
    setDeleting(true)
    setError('')
    try {
      const { error: err } = await supabase.from('story_pages').delete().eq('id', page.id)
      if (err) throw err
      const remaining = pages.filter(p => p.id !== page.id)
      onSelectPage(remaining[0]?.id ?? null)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete page.')
    } finally {
      setDeleting(false)
    }
  }

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) audio.pause()
    else audio.play()
    setIsPlaying(!isPlaying)
  }

  return (
    <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
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
            <FileStack className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-gray-800 leading-tight">Editing Page #{page.page_number}</h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold mt-1 ${vf.published ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              {vf.published ? 'Published' : 'Draft'} · {LANGUAGE_META[activeLang].label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDeletePage} disabled={deleting} className="px-4 py-2.5 rounded-full text-sm font-bold text-red-600 hover:bg-red-50 transition disabled:opacity-50 flex items-center gap-1.5">
            <Trash2 size={14} /> Delete Page
          </button>
          <button onClick={savePage} disabled={saving} className={`px-5 py-2.5 rounded-full text-sm font-bold text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition disabled:opacity-50 disabled:hover:translate-y-0 ${accent.button}`}>
            {saving ? 'Saving...' : 'Save Page'}
          </button>
        </div>
      </div>

      {/* Page Image */}
      <div>
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Page Image</label>
        {imageUrl ? (
          <div className="flex items-center gap-3">
            <img src={getStorageUrl(imageUrl)} alt={`Page ${page.page_number}`} className="w-16 h-20 rounded-xl object-cover border border-gray-100 shadow-sm" />
            <button onClick={() => setImageUrl('')} className="text-xs font-bold text-red-500 hover:text-red-600 px-3 py-1.5 rounded-full hover:bg-red-50 transition">Remove</button>
          </div>
        ) : (
          <label className="flex items-center gap-2 justify-center border-2 border-dashed border-gray-200 rounded-2xl px-3 py-3.5 text-sm font-semibold text-gray-400 cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition">
            <Upload size={15} /> {uploadingImage ? 'Uploading...' : 'Upload page image'}
            <input type="file" accept="image/*" className="hidden" disabled={uploadingImage} onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
          </label>
        )}
      </div>

      {/* Language tabs */}
      <div className="flex items-center justify-between flex-wrap gap-2 bg-gray-50 rounded-2xl p-1.5 border border-gray-100">
        <div className="flex items-center gap-1 flex-wrap">
          {LANGUAGES.map(lang => (
            <button
              key={lang}
              onClick={() => setActiveLangAndReset(lang)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold transition ${
                activeLang === lang ? `bg-white shadow-sm ${accent.text}` : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{LANGUAGE_META[lang].flag}</span> {LANGUAGE_META[lang].label}
              {versionForms[lang].published && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />}
            </button>
          ))}
        </div>
        {activeLang !== 'en' && (
          <button onClick={handleCopyFromEnglish} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition hover:opacity-80 ${accent.soft} ${accent.text}`}>
            <CopyIcon size={13} /> Copy from English
          </button>
        )}
      </div>

      {/* Content + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <section className="lg:col-span-3 space-y-4">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${accent.tile}`}>
              <FileText size={15} />
            </div>
            <h4 className="text-sm font-extrabold text-gray-800">Narration · {LANGUAGE_META[activeLang].label}</h4>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Narration Text</label>
            <textarea
              value={vf.text}
              rows={4}
              onChange={e => updateVersionField('text', e.target.value)}
              className={`w-full border border-gray-200 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-gray-700 leading-relaxed transition ${accent.ring}`}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Audio File</label>
            {vf.audio_url ? (
              <div className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 border ${accent.soft} ${accent.border}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-white ${accent.text}`}>
                  <Music size={16} />
                </div>
                <span className="flex-1 text-sm font-semibold text-gray-700 truncate">{basename(vf.audio_url)}</span>
                <button onClick={() => updateVersionField('audio_url', '')} className="text-gray-400 hover:text-red-500 flex-shrink-0 transition">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 justify-center border-2 border-dashed border-gray-200 rounded-2xl px-3 py-3.5 text-sm font-semibold text-gray-400 cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition">
                <Upload size={15} /> {uploadingAudio ? 'Uploading...' : 'Upload audio file'}
                <input type="file" accept="audio/*" className="hidden" disabled={uploadingAudio} onChange={e => e.target.files?.[0] && handleAudioUpload(e.target.files[0])} />
              </label>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Status</label>
            <select
              value={vf.published ? 'published' : 'draft'}
              onChange={e => updateVersionField('published', e.target.value === 'published')}
              className={inputClass(accent.ring)}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </section>

        {/* Preview panel */}
        <section className="lg:col-span-2 h-fit">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${accent.tile}`}>
              <Eye size={15} />
            </div>
            <h4 className="text-sm font-extrabold text-gray-800">Live Preview</h4>
          </div>
          <div className={`relative overflow-hidden rounded-3xl p-5 text-white shadow-lg ${accent.gradient}`}>
            <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
            <div className="absolute -bottom-10 -left-6 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
            <div className="relative">
              {imageUrl && (
                <img src={getStorageUrl(imageUrl)} alt={`Page ${page.page_number}`} className="w-full h-40 object-cover rounded-2xl mb-3 border-2 border-white/30" />
              )}
              <p className="font-extrabold text-lg leading-tight">Page {page.page_number}</p>
              {vf.text && <p className="text-sm text-white/90 mt-1 leading-relaxed">{vf.text}</p>}

              {vf.audio_url && isAudioFile(vf.audio_url) && (
                <div className="mt-4 flex items-center gap-3 bg-white/15 backdrop-blur rounded-2xl px-3.5 py-3 border border-white/20">
                  <audio
                    ref={audioRef}
                    src={getStorageUrl(vf.audio_url)}
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
            </div>
          </div>
        </section>
      </div>
      {dialog}
    </section>
  )
}
