'use client'
import React, { useState, useEffect, useRef } from 'react'
import supabase from '@/lib/supabaseClient'
import { getStorageUrl } from '@/lib/queries'
import {
  Music, X, Play, Pause, Image as ImageIcon, Plus, Trash2, Copy as CopyIcon,
  Info, Upload, Settings2, FileText, Eye, CheckCircle2, AlertCircle, Lightbulb,
} from 'lucide-react'
import {
  ACCENT, LANGUAGES, LANGUAGE_META, MISSION_TYPES, TYPE_META, CATEGORY_ORDER, CATEGORY_META, FALLBACK_META,
  CONTENT_STATUSES, STATUS_META, type Lang, type MissionType, type MissionRow, type ContentStatus,
} from './missionMeta'

interface VersionForm {
  title: string
  subtitle: string
  tip_text: string
  media_url: string
  content_json: Record<string, any>
  status: ContentStatus
}

const EMPTY_VERSION: VersionForm = {
  title: '', subtitle: '', tip_text: '', media_url: '', content_json: {}, status: 'draft',
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
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [uploadingAudio, setUploadingAudio] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const resetForm = () => {
    setGeneral({
      sequence: mission.sequence,
      stars: mission.stars,
      duration_minutes: mission.duration_minutes,
      type: mission.type,
      category_slug: mission.category_slug,
    })
    const forms: Record<Lang, VersionForm> = { en: { ...EMPTY_VERSION }, fr: { ...EMPTY_VERSION }, rw: { ...EMPTY_VERSION } }
    for (const v of mission.mission_versions) {
      forms[v.language] = {
        title: v.title ?? '',
        subtitle: v.subtitle ?? '',
        tip_text: v.tip_text ?? '',
        media_url: v.media_url ?? '',
        content_json: v.content_json ?? {},
        status: v.status ?? 'draft',
      }
    }
    setVersionForms(forms)
    setActiveLang('en')
    setMessage('')
    setError('')
  }

  useEffect(() => {
    resetForm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission.id])

  useEffect(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
  }, [activeLang, mission.id])

  const vf = versionForms[activeLang]

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
      const { error: uploadErr } = await supabase.storage.from('storyBook').upload(path, file, { upsert: true })
      if (uploadErr) throw uploadErr
      updateVersionField('media_url', `storyBook/${path}`)
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
      const { error: uploadErr } = await supabase.storage.from('storyBook').upload(path, file, { upsert: true })
      if (uploadErr) throw uploadErr
      updateContentJson('cover_image_url', `storyBook/${path}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploadingCover(false)
    }
  }

  const saveMission = async () => {
    setMessage('')
    setError('')
    if (vf.status === 'published' && !vf.title.trim()) {
      setError(`Add a ${LANGUAGE_META[activeLang].label} title before publishing.`)
      return
    }
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

      const { error: versionErr } = await supabase.from('mission_versions').upsert({
        mission_id: mission.id,
        language: activeLang,
        title: vf.title,
        subtitle: vf.subtitle,
        tip_text: vf.tip_text,
        media_url: vf.media_url,
        content_json: vf.content_json,
        status: vf.status,
      }, { onConflict: 'mission_id,language' })
      if (versionErr) throw versionErr

      setMessage(vf.status === 'published' ? 'Mission published!' : 'Saved!')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save mission.')
    } finally {
      setSaving(false)
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
  const prompts = (vf.content_json.prompts as { emoji: string; label: string }[]) ?? []
  const updatePrompts = (next: { emoji: string; label: string }[]) => updateContentJson('prompts', next)
  const coverUrl = vf.content_json.cover_image_url as string | undefined

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
          <button onClick={resetForm} disabled={saving} className="px-4 py-2.5 rounded-full text-sm font-bold text-gray-500 hover:bg-gray-100 transition disabled:opacity-50">
            Cancel
          </button>
          <button onClick={() => saveMission()} disabled={saving} className={`px-5 py-2.5 rounded-full text-sm font-bold text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition disabled:opacity-50 disabled:hover:translate-y-0 ${accent.button}`}>
            {saving ? 'Saving...' : 'Save'}
          </button>
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
          <button onClick={handleCopyFromEnglish} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition hover:opacity-80 ${accent.soft} ${accent.text}`}>
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
              className={inputClass(accent.ring)}
            >
              {CONTENT_STATUSES.map(s => (
                <option key={s} value={s}>{STATUS_META[s].label}</option>
              ))}
            </select>
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
              className={inputClass(accent.ring)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Audio File</label>
            {vf.media_url ? (
              <div className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 border ${accent.soft} ${accent.border}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-white ${accent.text}`}>
                  <Music size={16} />
                </div>
                <span className="flex-1 text-sm font-semibold text-gray-700 truncate">{basename(vf.media_url)}</span>
                <button onClick={() => updateVersionField('media_url', '')} className="text-gray-400 hover:text-red-500 flex-shrink-0 transition">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 justify-center border-2 border-dashed border-gray-200 rounded-2xl px-3 py-3.5 text-sm font-semibold text-gray-400 cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition">
                <Upload size={15} /> {uploadingAudio ? 'Uploading...' : 'Upload audio file'}
                <input type="file" accept="audio/*,video/*" className="hidden" disabled={uploadingAudio} onChange={e => e.target.files?.[0] && handleAudioUpload(e.target.files[0])} />
              </label>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Subtitle</label>
            <input
              type="text"
              value={vf.subtitle}
              onChange={e => updateVersionField('subtitle', e.target.value)}
              className={inputClass(accent.ring)}
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
                className={`w-full border-l-4 ${accent.border} border-y border-r border-gray-200 rounded-r-2xl rounded-l-md px-4 py-3 text-sm font-mono text-gray-700 leading-relaxed transition ${accent.ring}`}
              />
            </div>
          )}

          {general.type === 'move' && (
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Action Prompts</label>
              <div className="space-y-2">
                {prompts.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2 border border-gray-100">
                    <input
                      type="text"
                      value={p.emoji}
                      onChange={e => updatePrompts(prompts.map((x, idx) => idx === i ? { ...x, emoji: e.target.value } : x))}
                      placeholder="🎉"
                      className={`w-12 h-10 text-center text-lg bg-white border border-gray-200 rounded-lg transition ${accent.ring}`}
                    />
                    <input
                      type="text"
                      value={p.label}
                      onChange={e => updatePrompts(prompts.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))}
                      placeholder="Action label"
                      className={`flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm transition ${accent.ring}`}
                    />
                    <button onClick={() => updatePrompts(prompts.filter((_, idx) => idx !== i))} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0 transition">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={() => updatePrompts([...prompts, { emoji: '', label: '' }])} className={`mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition hover:opacity-80 ${accent.soft} ${accent.text}`}>
                <Plus size={14} /> Add Prompt
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Tip Text</label>
            <input
              type="text"
              value={vf.tip_text}
              onChange={e => updateVersionField('tip_text', e.target.value)}
              className={inputClass(accent.ring)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Cover Image (Optional)</label>
            {coverUrl ? (
              <div className="flex items-center gap-3">
                <img src={getStorageUrl(coverUrl)} alt="Cover" className="w-20 h-20 rounded-2xl object-cover border border-gray-100 shadow-sm" />
                <button onClick={() => updateContentJson('cover_image_url', undefined)} className="text-xs font-bold text-red-500 hover:text-red-600 px-3 py-1.5 rounded-full hover:bg-red-50 transition">Remove</button>
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

      {/* Info banner */}
      <div className={`flex items-start gap-3 rounded-2xl px-4 py-3.5 border ${accent.soft} ${accent.border}`}>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-white ${accent.text}`}>
          <Info size={14} />
        </div>
        <span className={`text-sm font-semibold ${accent.text}`}>Publishing makes this mission visible only to children whose language has a published version — there&apos;s no fallback to another language. Publish each language separately to reach those learners.</span>
      </div>
    </div>
  )
}
