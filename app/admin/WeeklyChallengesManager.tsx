'use client'
import React, { useEffect, useState, useRef } from 'react'
import supabase from '@/lib/supabaseClient'
import { Menu, Plus, Trash2, CheckCircle2, AlertCircle, Trophy, Star, Edit, ChevronDown, ChevronRight, Upload, Image as ImageIcon, Video, Volume2 } from 'lucide-react'
import { useToast } from './Toast'
import { smartUpload } from '@/lib/uploadWithProgress'
import { getStorageUrl } from '@/lib/queries'

interface Props {
  onNavigate: (table: string) => void
  onOpenSidebar?: () => void
}

interface ChallengeRow {
  id: string
  story_id: string | null
  sort_order: number
  type: string
  stars: number
  difficulty: string | null
  estimated_minutes: number | null
  image_url: string | null
  video_url: string | null
  reward_badge: string | null
  created_at: string
  story_title: string | null
  versions: { id: string; language: string; title: string; description: string; status: string; published: boolean; content_json: Record<string, unknown> }[]
}

export default function WeeklyChallengesManager({ onNavigate, onOpenSidebar }: Props) {
  const [challenges, setChallenges] = useState<ChallengeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { success: toastOk, error: toastErr } = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const [{ data: ch }, { data: versions }, { data: stories }] = await Promise.all([
        supabase.from('weekly_challenges').select('*').order('sort_order'),
        supabase.from('weekly_challenge_versions').select('id, challenge_id, language, title, description, status, published, content_json'),
        supabase.from('stories').select('id, title'),
      ])
      const rows: ChallengeRow[] = (ch ?? []).map(c => ({
        ...c,
        story_title: (stories ?? []).find(s => s.id === c.story_id)?.title ?? null,
        versions: (versions ?? []).filter(v => v.challenge_id === c.id),
      }))
      setChallenges(rows)
    } catch (err) {
      console.error('[WeeklyChallengesManager] load failed:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const maxSort = challenges.reduce((max, c) => Math.max(max, c.sort_order), 0)
      const { data: newCh, error } = await supabase
        .from('weekly_challenges')
        .insert({ sort_order: maxSort + 1, type: 'kindness', stars: 50 })
        .select().single()
      if (error || !newCh) { toastErr('Failed to create challenge'); return }
      await supabase.from('weekly_challenge_versions').insert([
        { challenge_id: newCh.id, language: 'en', title: 'New Challenge', description: 'Description here...', status: 'draft' },
        { challenge_id: newCh.id, language: 'fr', title: 'Nouveau défi', description: 'Description ici...', status: 'draft' },
        { challenge_id: newCh.id, language: 'rw', title: 'Ikibazo gishya', description: 'Ibisobanuro hano...', status: 'draft' },
      ])
      await load()
      setExpandedId(newCh.id)
      toastOk('Challenge created')
    } catch (err) {
      toastErr('Failed to create challenge')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await supabase.from('weekly_challenges').delete().eq('id', id)
      await load()
      toastOk('Challenge deleted')
    } catch (err) {
      toastErr('Failed to delete challenge')
    }
  }

  const handleVersionSave = async (versionId: string, field: string, value: string) => {
    try {
      await supabase.from('weekly_challenge_versions').update({ [field]: value || null }).eq('id', versionId)
    } catch (err) {
      console.error('[WeeklyChallengesManager] handleVersionSave failed:', err)
    }
  }

  const handlePublish = async (versionId: string, publish: boolean) => {
    try {
      await supabase.from('weekly_challenge_versions').update({ status: publish ? 'published' : 'draft' }).eq('id', versionId)
      await load()
      toastOk(publish ? 'Version published' : 'Version unpublished')
    } catch (err) {
      toastErr('Failed to update publish status')
    }
  }

  const handleChallengeSave = async (id: string, field: string, value: string | number) => {
    try {
      await supabase.from('weekly_challenges').update({ [field]: value }).eq('id', id)
      await load()
    } catch (err) {
      console.error('[WeeklyChallengesManager] handleChallengeSave failed:', err)
    }
  }

  const statusColor = (c: ChallengeRow) => {
    const published = c.versions.filter(v => v.published).length
    if (published === c.versions.length && c.versions.length > 0) return { label: 'ACTIVE', cls: 'bg-emerald-100 text-emerald-700' }
    if (published > 0) return { label: 'PARTIAL', cls: 'bg-amber-100 text-amber-600' }
    return { label: 'DRAFT', cls: 'bg-gray-100 text-gray-500' }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-5 flex-shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={onOpenSidebar} className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-gray-500">
              <Menu size={17} />
            </button>
            <div>
              <h1 className="text-[22px] font-extrabold text-gray-900">Weekly Challenges</h1>
              <p className="text-[13px] text-gray-500">Manage weekly challenges and rewards.</p>
            </div>
          </div>
          <button onClick={handleCreate} disabled={creating}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold text-[13px] rounded-xl px-4 py-2.5 shadow-sm transition disabled:opacity-50">
            <Plus size={16} /> New Challenge
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
        ) : challenges.length === 0 ? (
          <div className="text-center py-16">
            <Trophy size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-[16px] font-bold text-gray-500">No challenges yet</p>
            <p className="text-[13px] text-gray-400 mt-1">Create your first weekly challenge for the children.</p>
          </div>
        ) : (
          challenges.map(c => {
            const isOpen = expandedId === c.id
            const badge = statusColor(c)
            const enVersion = c.versions.find(v => v.language === 'en')

            return (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50/50 transition"
                  onClick={() => setExpandedId(isOpen ? null : c.id)}>
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                    <Trophy size={22} className="text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[15px] font-extrabold text-gray-800 truncate">{enVersion?.title ?? 'Untitled'}</h3>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                    </div>
                    <p className="text-[12px] text-gray-400 truncate mt-0.5">{enVersion?.description ?? 'No description'}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[12px] font-bold text-gray-500 flex items-center gap-1">
                      <Star size={14} className="text-amber-500" /> {c.stars}
                    </span>
                    <span className="text-[11px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{c.type}</span>
                    {isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                    {/* Challenge settings */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Type</label>
                        <select defaultValue={c.type}
                          onChange={e => handleChallengeSave(c.id, 'type', e.target.value)}
                          className="w-full bg-ds-input border border-ds-border rounded-lg px-3 py-2 text-[13px] font-medium text-ds-text focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                          <option value="kindness">Kindness</option>
                          <option value="friendship">Friendship</option>
                          <option value="responsibility">Responsibility</option>
                          <option value="creativity">Creativity</option>
                          <option value="health">Health</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Stars Reward</label>
                        <input type="number" defaultValue={c.stars}
                          onBlur={e => handleChallengeSave(c.id, 'stars', Number(e.target.value))}
                          className="w-full bg-ds-input border border-ds-border rounded-lg px-3 py-2 text-[13px] font-medium text-ds-text focus:outline-none focus:ring-2 focus:ring-green-500" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Difficulty</label>
                        <select defaultValue={c.difficulty ?? 'easy'}
                          onChange={e => handleChallengeSave(c.id, 'difficulty', e.target.value)}
                          className="w-full bg-ds-input border border-ds-border rounded-lg px-3 py-2 text-[13px] font-medium text-ds-text focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                          <option value="easy">⭐ Easy</option>
                          <option value="medium">⭐⭐ Medium</option>
                          <option value="hard">⭐⭐⭐ Hard</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Duration (min)</label>
                        <input type="number" defaultValue={c.estimated_minutes ?? 2}
                          onBlur={e => handleChallengeSave(c.id, 'estimated_minutes', Number(e.target.value))}
                          className="w-full bg-ds-input border border-ds-border rounded-lg px-3 py-2 text-[13px] font-medium text-ds-text focus:outline-none focus:ring-2 focus:ring-green-500" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Reward Badge</label>
                        <input type="text" defaultValue={c.reward_badge ?? ''}
                          onBlur={e => handleChallengeSave(c.id, 'reward_badge', e.target.value)}
                          placeholder="kind-heart"
                          className="w-full bg-ds-input border border-ds-border rounded-lg px-3 py-2 text-[13px] font-medium text-ds-text focus:outline-none focus:ring-2 focus:ring-green-500" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Sort Order</label>
                        <input type="number" defaultValue={c.sort_order}
                          onBlur={e => handleChallengeSave(c.id, 'sort_order', Number(e.target.value))}
                          className="w-full bg-ds-input border border-ds-border rounded-lg px-3 py-2 text-[13px] font-medium text-ds-text focus:outline-none focus:ring-2 focus:ring-green-500" />
                      </div>
                    </div>

                    {/* Visual media — example image + video */}
                    <div>
                      <h4 className="text-[12px] font-bold text-gray-500 uppercase mb-2">Visual Example (kids see this)</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <ChallengeMediaUpload label="Example Image" icon={<ImageIcon size={16} />} accept="image/*"
                          url={c.image_url} challengeId={c.id} field="image_url" onSaved={load} />
                        <ChallengeMediaUpload label="Example Video" icon={<Video size={16} />} accept="video/*"
                          url={c.video_url} challengeId={c.id} field="video_url" onSaved={load} />
                      </div>
                    </div>

                    {/* Language versions */}
                    <div className="space-y-3">
                      <h4 className="text-[12px] font-bold text-gray-500 uppercase">Language Versions</h4>
                      {c.versions.map(v => (
                        <div key={v.id} className={`rounded-xl border p-4 space-y-2 ${v.published ? 'border-emerald-200 bg-emerald-50/20' : 'border-gray-100'}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] font-bold text-gray-500 uppercase">{v.language}</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v.published ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                {v.published ? 'Published' : v.status}
                              </span>
                              <button onClick={() => handlePublish(v.id, !v.published)}
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition ${v.published ? 'text-red-500 hover:bg-red-50' : 'text-emerald-500 hover:bg-emerald-50'}`}>
                                {v.published ? 'Unpublish' : 'Publish'}
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 block mb-0.5">Title</label>
                            <input type="text" defaultValue={v.title}
                              onBlur={e => handleVersionSave(v.id, 'title', e.target.value)}
                              className="w-full bg-ds-input border border-ds-border rounded-lg px-3 py-2 text-[13px] font-medium text-ds-text focus:outline-none focus:ring-2 focus:ring-green-500" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 block mb-0.5">Description</label>
                            <textarea defaultValue={v.description} rows={2}
                              onBlur={e => handleVersionSave(v.id, 'description', e.target.value)}
                              className="w-full bg-ds-input border border-ds-border rounded-lg px-3 py-2 text-[12px] text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
                          </div>
                          {/* Audio instruction per language */}
                          <VersionAudioUpload versionId={v.id} audioUrl={(v.content_json?.audio_url as string) ?? null} language={v.language} onSaved={load} />
                        </div>
                      ))}
                    </div>

                    {/* Delete */}
                    <div className="flex justify-end">
                      <button onClick={() => handleDelete(c.id)}
                        className="flex items-center gap-1.5 text-[12px] font-bold text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition">
                        <Trash2 size={14} /> Delete Challenge
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function ChallengeMediaUpload({ label, icon, accept, url, challengeId, field, onSaved }: {
  label: string; icon: React.ReactNode; accept: string; url: string | null; challengeId: string; field: string; onSaved: () => void
}) {
  const [uploading, setUploading] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  const { success: toastOk } = useToast()

  const handleUpload = async (f: File) => {
    setUploading(true)
    const path = `challenges/${challengeId}-${field}-${Date.now()}.${f.name.split('.').pop()}`
    const { error, storagePath } = await smartUpload('storyBook', path, f)
    if (!error) {
      await supabase.from('weekly_challenges').update({ [field]: storagePath }).eq('id', challengeId)
      toastOk(`${label} uploaded`)
      onSaved()
    }
    setUploading(false)
  }

  const handleRemove = async () => {
    await supabase.from('weekly_challenges').update({ [field]: null }).eq('id', challengeId)
    onSaved()
  }

  return (
    <div>
      {uploading ? (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-3">
          <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-[12px] font-bold text-green-700">Uploading...</span>
        </div>
      ) : url ? (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
          <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
          <span className="text-[11px] text-emerald-700 font-medium truncate flex-1">{url.split('/').pop()}</span>
          <button onClick={() => ref.current?.click()} className="text-[10px] font-bold text-green-700 hover:underline">Replace</button>
          <button onClick={handleRemove} className="text-[10px] font-bold text-red-500 hover:underline">Remove</button>
        </div>
      ) : (
        <button onClick={() => ref.current?.click()}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-4 text-gray-400 hover:border-green-400 hover:text-green-600 transition">
          {icon}
          <span className="text-[12px] font-bold">{label}</span>
        </button>
      )}
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }} />
    </div>
  )
}

function VersionAudioUpload({ versionId, audioUrl, language, onSaved }: {
  versionId: string; audioUrl: string | null; language: string; onSaved: () => void
}) {
  const [uploading, setUploading] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  const handleUpload = async (f: File) => {
    setUploading(true)
    const path = `challenges/audio-${versionId}-${language}-${Date.now()}.${f.name.split('.').pop()}`
    const { error, storagePath } = await smartUpload('storyBook', path, f)
    if (!error) {
      await supabase.from('weekly_challenge_versions').update({ content_json: { audio_url: storagePath } }).eq('id', versionId)
      onSaved()
    }
    setUploading(false)
  }

  const handleRemove = async () => {
    await supabase.from('weekly_challenge_versions').update({ content_json: {} }).eq('id', versionId)
    onSaved()
  }

  return (
    <div>
      <label className="text-[10px] font-bold text-gray-400 block mb-0.5">🔊 Audio Instruction ({language.toUpperCase()})</label>
      {uploading ? (
        <div className="flex items-center gap-2 bg-green-50 rounded-lg px-2.5 py-2">
          <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-[11px] text-green-700">Uploading...</span>
        </div>
      ) : audioUrl ? (
        <div className="flex items-center gap-1.5 bg-emerald-50 rounded-lg px-2.5 py-2">
          <Volume2 size={12} className="text-emerald-500 shrink-0" />
          <span className="text-[10px] text-emerald-700 font-medium truncate flex-1">{audioUrl.split('/').pop()}</span>
          <button onClick={() => ref.current?.click()} className="text-[9px] font-bold text-green-700 hover:underline">Replace</button>
          <button onClick={handleRemove} className="text-[9px] font-bold text-red-500 hover:underline">Remove</button>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-1.5 border border-dashed border-gray-200 rounded-lg py-2 text-gray-400 hover:text-green-600 hover:border-green-400 cursor-pointer transition">
          <Volume2 size={12} />
          <span className="text-[11px] font-bold">Upload Audio</span>
          <input type="file" accept="audio/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }} />
        </label>
      )}
      <input ref={ref} type="file" accept="audio/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }} />
    </div>
  )
}
