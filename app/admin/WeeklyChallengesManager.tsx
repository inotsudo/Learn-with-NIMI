'use client'
import React, { useEffect, useState, useRef } from 'react'
import supabase from '@/lib/supabaseClient'
import {
  Menu, Plus, Trash2, CheckCircle2, Trophy, Star,
  ChevronDown, ChevronUp, Video, Volume2, Search, X, Image as ImageIcon,
  AlertTriangle, XCircle, Award, Layers,
} from 'lucide-react'
import { useToast } from './Toast'
import { useConfirmDialog } from './ConfirmDialog'
import { smartUpload } from '@/lib/uploadWithProgress'
import { getStorageUrl } from '@/lib/queries'

interface Props {
  onNavigate: (table: string) => void
  onOpenSidebar?: () => void
}

interface BadgeImageRow {
  slug: string
  image_url: string | null
  label: string | null
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
  versions: VersionRow[]
}

interface VersionRow {
  id: string
  language: string
  title: string
  description: string
  status: string
  published: boolean
  content_json: Record<string, unknown>
}

const CHALLENGE_TYPES = ['kindness', 'friendship', 'responsibility', 'creativity', 'health']
const LANG_FLAGS: Record<string, string> = { en: '🇬🇧', fr: '🇫🇷', rw: '🇷🇼' }

function versionReadiness(v: { title: string; description: string; content_json: Record<string, unknown> }, c: ChallengeRow): { ready: boolean; missing: string[] } {
  const missing: string[] = []
  if (!v.title.trim())       missing.push('Title')
  if (!v.description.trim()) missing.push('Description')
  if (!c.image_url)          missing.push('Example image')
  if (!(v.content_json?.audio_url as string | null)) missing.push('Audio instruction')
  return { ready: missing.length === 0, missing }
}

function scarcityWarnings(challenges: ChallengeRow[]): string[] {
  const warnings: string[] = []
  const active = challenges.filter(c => c.versions.some(v => v.published))
  if (active.length < 4)
    warnings.push(`Only ${active.length} active challenge${active.length !== 1 ? 's' : ''} — aim for at least 4 so kids get weekly variety`)
  const activeTypes = new Set(active.map(c => c.type))
  const missingTypes = CHALLENGE_TYPES.filter(t => !activeTypes.has(t))
  if (missingTypes.length > 0)
    warnings.push(`No active ${missingTypes.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')} challenge${missingTypes.length > 1 ? 's' : ''} — add some for variety`)
  const noImage = active.filter(c => !c.image_url).length
  if (noImage > 0)
    warnings.push(`${noImage} active challenge${noImage !== 1 ? 's' : ''} ${noImage !== 1 ? 'have' : 'has'} no example image — kids need a visual to get excited`)
  const noAudio = active.filter(c => c.versions.some(v => v.published && !(v.content_json?.audio_url as string | null))).length
  if (noAudio > 0)
    warnings.push(`${noAudio} active challenge${noAudio !== 1 ? 's' : ''} missing audio instructions for at least one language`)
  if (challenges.length > 0 && active.length === 0)
    warnings.push('No challenges are live yet — children will see nothing this week')
  return warnings
}

export default function WeeklyChallengesManager({ onNavigate: _onNavigate, onOpenSidebar }: Props) {
  const [challenges, setChallenges] = useState<ChallengeRow[]>([])
  const [stories, setStories] = useState<{ id: string; title: string }[]>([])
  const [badges, setBadges] = useState<BadgeImageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const { success: toastOk, error: toastErr } = useToast()
  const { confirm, dialog } = useConfirmDialog()

  const load = async () => {
    setLoading(true)
    try {
      const [{ data: ch }, { data: versions }, { data: storiesData }, { data: badgesData }] = await Promise.all([
        supabase.from('weekly_challenges').select('*').order('sort_order'),
        supabase.from('weekly_challenge_versions').select('id, challenge_id, language, title, description, status, published, content_json'),
        supabase.from('stories').select('id, title').order('sort_order'),
        supabase.from('badge_images').select('slug, image_url, label'),
      ])
      setStories(storiesData ?? [])
      setBadges(badgesData ?? [])
      const rows: ChallengeRow[] = (ch ?? []).map(c => ({
        ...c,
        story_title: (storiesData ?? []).find(s => s.id === c.story_id)?.title ?? null,
        versions: (versions ?? []).filter(v => v.challenge_id === c.id),
      }))
      setChallenges(rows)
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Failed to load challenges')
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
        .insert({ sort_order: maxSort + 1, type: 'kindness', stars: 50, difficulty: 'easy', estimated_minutes: 5 })
        .select().single()
      if (error || !newCh) throw new Error(error?.message ?? 'Create failed')
      const { error: vErr } = await supabase.from('weekly_challenge_versions').insert([
        { challenge_id: newCh.id, language: 'en', title: 'New Challenge', description: 'Describe what kids will do…', status: 'draft', published: false },
        { challenge_id: newCh.id, language: 'fr', title: 'Nouveau défi', description: 'Décrivez ce que les enfants feront…', status: 'draft', published: false },
        { challenge_id: newCh.id, language: 'rw', title: 'Ikibazo gishya', description: 'Sobanura ibikorwa...', status: 'draft', published: false },
      ])
      if (vErr) toastErr('Challenge created but language versions failed')
      else toastOk('Challenge created')
      await load()
      setExpandedId(newCh.id)
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Failed to create challenge')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (c: ChallengeRow) => {
    const enTitle = c.versions.find(v => v.language === 'en')?.title ?? 'this challenge'
    const ok = await confirm({ title: `Delete "${enTitle}"?`, message: 'This removes the challenge and all its language versions. Cannot be undone.' })
    if (!ok) return
    try {
      const { error } = await supabase.from('weekly_challenges').delete().eq('id', c.id)
      if (error) throw error
      await load()
      toastOk('Challenge deleted')
    } catch (err) {
      toastErr(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const handleChallengeSave = async (id: string, field: string, value: string | number | null) => {
    const { error } = await supabase.from('weekly_challenges').update({ [field]: value }).eq('id', id)
    if (error) { toastErr(`Save failed: ${error.message}`); return }
    setChallenges(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  const handleVersionSave = async (versionId: string, field: string, value: string) => {
    const { error } = await supabase.from('weekly_challenge_versions').update({ [field]: value || null }).eq('id', versionId)
    if (error) { toastErr(`Save failed: ${error.message}`); return }
    setChallenges(prev => prev.map(c => ({
      ...c,
      versions: c.versions.map(v => v.id === versionId ? { ...v, [field]: value } : v),
    })))
  }

  const handlePublish = async (versionId: string, publish: boolean, liveChallenge: ChallengeRow, liveVersion: { title: string; description: string; content_json: Record<string, unknown> }) => {
    if (publish) {
      const { missing } = versionReadiness(liveVersion, liveChallenge)
      if (missing.length > 0) {
        toastErr(`Can't publish — missing: ${missing.join(', ')}`)
        return
      }
    }
    const { error } = await supabase.from('weekly_challenge_versions')
      .update({ status: publish ? 'published' : 'draft', published: publish })
      .eq('id', versionId)
    if (error) { toastErr(`Failed: ${error.message}`); return }
    setChallenges(prev => prev.map(c => ({
      ...c,
      versions: c.versions.map(v => v.id === versionId ? { ...v, published: publish, status: publish ? 'published' : 'draft' } : v),
    })))
    toastOk(publish ? 'Version published' : 'Unpublished')
  }

  const handleBulkPublish = async (
    challengeId: string,
    localVersionEdits: Record<string, { title: string; description: string }>,
  ) => {
    const c = challenges.find(ch => ch.id === challengeId)
    if (!c) return
    const errors: string[] = []
    let published = 0
    for (const v of c.versions) {
      const localEdit = localVersionEdits[v.id] ?? { title: v.title, description: v.description }
      const merged = { ...v, ...localEdit }
      const { ready, missing } = versionReadiness(merged, c)
      if (!ready) { errors.push(`${v.language.toUpperCase()}: missing ${missing.join(', ')}`); continue }
      const { error } = await supabase.from('weekly_challenge_versions')
        .update({ status: 'published', published: true }).eq('id', v.id)
      if (error) errors.push(`${v.language.toUpperCase()}: ${error.message}`)
      else published++
    }
    if (published > 0) toastOk(`Published ${published}/${c.versions.length} languages`)
    if (errors.length > 0) toastErr(errors.join(' · '))
    if (published > 0) await load()
  }

  const handleReorder = async (id: string, dir: 'up' | 'down') => {
    const idx = challenges.findIndex(c => c.id === id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= challenges.length) return
    const a = challenges[idx]
    const b = challenges[swapIdx]
    const [r1, r2] = await Promise.all([
      supabase.from('weekly_challenges').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('weekly_challenges').update({ sort_order: a.sort_order }).eq('id', b.id),
    ])
    if (r1.error || r2.error) { toastErr('Reorder failed'); return }
    await load()
  }

  const filtered = challenges.filter(c => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const enTitle = c.versions.find(v => v.language === 'en')?.title ?? ''
    return enTitle.toLowerCase().includes(q) || c.type.includes(q) || (c.story_title ?? '').toLowerCase().includes(q)
  })

  const statusBadge = (c: ChallengeRow) => {
    const pub = c.versions.filter(v => v.published).length
    if (pub === 3) return { label: 'Active', cls: 'bg-emerald-100 text-emerald-700' }
    if (pub > 0)   return { label: `${pub}/3 live`, cls: 'bg-amber-100 text-amber-600' }
    return { label: 'Draft', cls: 'bg-gray-100 text-gray-500' }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {dialog}
      <div className="bg-white border-b border-gray-100 px-6 py-5 flex-shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={onOpenSidebar} className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-gray-500">
              <Menu size={17} />
            </button>
            <div>
              <h1 className="text-[22px] font-extrabold text-gray-900">Weekly Challenges</h1>
              <p className="text-[13px] text-gray-500">
                {challenges.length} challenge{challenges.length !== 1 ? 's' : ''} · {challenges.filter(c => c.versions.every(v => v.published)).length} fully active
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-8 py-2 border border-gray-200 rounded-xl text-[13px] font-medium text-gray-700 focus:outline-none focus:border-green-400 w-40 transition" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                  <X size={13} />
                </button>
              )}
            </div>
            <button onClick={handleCreate} disabled={creating}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold text-[13px] rounded-xl px-4 py-2 shadow-sm transition disabled:opacity-50">
              <Plus size={15} /> New Challenge
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4 space-y-3">
        {/* Scarcity warnings */}
        {!loading && scarcityWarnings(challenges).length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 space-y-1.5">
            <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
              <AlertTriangle size={13} /> Content health warnings
            </p>
            {scarcityWarnings(challenges).map((w, i) => (
              <p key={i} className="text-[12px] text-amber-800 flex items-start gap-2">
                <span className="mt-0.5 shrink-0">•</span>{w}
              </p>
            ))}
          </div>
        )}

        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Trophy size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-[15px] font-bold text-gray-400">{search ? 'No challenges match your search' : 'No challenges yet'}</p>
            {!search && <p className="text-[13px] text-gray-400 mt-1">Create your first weekly challenge for the children.</p>}
          </div>
        ) : filtered.map((c, cidx) => {
          const isOpen = expandedId === c.id
          const badge = statusBadge(c)
          const enVersion = c.versions.find(v => v.language === 'en')
          const isFirst = cidx === 0
          const isLast = cidx === filtered.length - 1

          return (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-visible">
              {/* Header row */}
              <div className="flex items-center gap-3 px-4 py-4">
                {/* Week slot reorder */}
                <div className="flex flex-col items-center gap-0 shrink-0">
                  <button disabled={isFirst}
                    onClick={e => { e.stopPropagation(); void handleReorder(c.id, 'up') }}
                    className="w-6 h-5 flex items-center justify-center rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-20 disabled:cursor-not-allowed transition">
                    <ChevronUp size={13} />
                  </button>
                  <span className="text-[9px] font-black text-gray-300 leading-none my-0.5">W{c.sort_order}</span>
                  <button disabled={isLast}
                    onClick={e => { e.stopPropagation(); void handleReorder(c.id, 'down') }}
                    className="w-6 h-5 flex items-center justify-center rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-20 disabled:cursor-not-allowed transition">
                    <ChevronDown size={13} />
                  </button>
                </div>

                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <Trophy size={18} className="text-amber-600" />
                </div>

                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(isOpen ? null : c.id)}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[14px] font-extrabold text-gray-800 truncate">{enVersion?.title ?? 'Untitled'}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                  </div>
                  <p className="text-[12px] text-gray-400 truncate mt-0.5">{enVersion?.description ?? 'No description'}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0 cursor-pointer" onClick={() => setExpandedId(isOpen ? null : c.id)}>
                  <span className="text-[12px] font-bold text-amber-500 flex items-center gap-1"><Star size={13} />{c.stars}</span>
                  <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded capitalize hidden sm:inline">{c.type}</span>
                  {c.story_title && <span className="text-[10px] text-blue-500 bg-blue-50 px-2 py-0.5 rounded font-medium truncate max-w-[80px] hidden sm:inline">{c.story_title}</span>}
                  {isOpen ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
                </div>
              </div>

              {isOpen && (
                <ChallengeCard
                  key={c.id}
                  challenge={c}
                  stories={stories}
                  badges={badges}
                  onChallengeSave={handleChallengeSave}
                  onVersionSave={handleVersionSave}
                  onPublish={handlePublish}
                  onBulkPublish={handleBulkPublish}
                  onDelete={handleDelete}
                  onMediaSaved={load}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── ChallengeCard: own local state so all inputs are controlled ──────────────

function ChallengeCard({
  challenge: c, stories, badges,
  onChallengeSave, onVersionSave, onPublish, onBulkPublish, onDelete, onMediaSaved,
}: {
  challenge: ChallengeRow
  stories: { id: string; title: string }[]
  badges: BadgeImageRow[]
  onChallengeSave: (id: string, field: string, value: string | number | null) => Promise<void>
  onVersionSave: (versionId: string, field: string, value: string) => Promise<void>
  onPublish: (versionId: string, publish: boolean, liveChallenge: ChallengeRow, liveVersion: { title: string; description: string; content_json: Record<string, unknown> }) => Promise<void>
  onBulkPublish: (challengeId: string, localEdits: Record<string, { title: string; description: string }>) => Promise<void>
  onDelete: (c: ChallengeRow) => Promise<void>
  onMediaSaved: () => void
}) {
  // Controlled challenge-level fields (initialized once on mount)
  const [type, setType]           = useState(c.type)
  const [stars, setStars]         = useState(String(c.stars))
  const [difficulty, setDifficulty] = useState(c.difficulty ?? 'easy')
  const [duration, setDuration]   = useState(String(c.estimated_minutes ?? 5))
  const [rewardBadge, setRewardBadge] = useState(c.reward_badge ?? '')
  const [storyId, setStoryId]     = useState(c.story_id ?? '')
  const [showBadgePicker, setShowBadgePicker] = useState(false)
  const badgePickerRef = useRef<HTMLDivElement>(null)

  // Controlled version-level fields
  const [versionEdits, setVersionEdits] = useState<Record<string, { title: string; description: string }>>(
    () => Object.fromEntries(c.versions.map(v => [v.id, { title: v.title, description: v.description }]))
  )

  // Close badge picker on outside click
  useEffect(() => {
    if (!showBadgePicker) return
    const handler = (e: MouseEvent) => {
      if (badgePickerRef.current && !badgePickerRef.current.contains(e.target as Node)) {
        setShowBadgePicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showBadgePicker])

  const anyUnpublished = c.versions.some(v => !v.published)
  const selectedBadge = badges.find(b => b.slug === rewardBadge)

  const saveType = (val: string) => { setType(val); void onChallengeSave(c.id, 'type', val) }
  const saveDifficulty = (val: string) => { setDifficulty(val); void onChallengeSave(c.id, 'difficulty', val) }
  const saveStoryId = (val: string) => { setStoryId(val); void onChallengeSave(c.id, 'story_id', val || null) }
  const selectBadge = (slug: string) => {
    setRewardBadge(slug)
    void onChallengeSave(c.id, 'reward_badge', slug || null)
    setShowBadgePicker(false)
  }

  const getLocalVersion = (v: VersionRow) => versionEdits[v.id] ?? { title: v.title, description: v.description }

  return (
    <div className="border-t border-gray-100 px-5 py-5 space-y-6">

      {/* ── Challenge settings ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field label="Type">
          <select value={type} onChange={e => saveType(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-700 focus:outline-none focus:border-green-400 bg-white">
            {CHALLENGE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </Field>

        <Field label="Stars reward">
          <input type="number" value={stars}
            onChange={e => setStars(e.target.value)}
            onBlur={() => void onChallengeSave(c.id, 'stars', Number(stars))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-700 focus:outline-none focus:border-green-400" />
        </Field>

        <Field label="Difficulty">
          <select value={difficulty} onChange={e => saveDifficulty(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-700 focus:outline-none focus:border-green-400 bg-white">
            <option value="easy">⭐ Easy</option>
            <option value="medium">⭐⭐ Medium</option>
            <option value="hard">⭐⭐⭐ Hard</option>
          </select>
        </Field>

        <Field label="Duration (min)">
          <input type="number" value={duration}
            onChange={e => setDuration(e.target.value)}
            onBlur={() => void onChallengeSave(c.id, 'estimated_minutes', Number(duration))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-700 focus:outline-none focus:border-green-400" />
        </Field>

        {/* Badge image picker */}
        <Field label="Reward badge">
          <div className="relative" ref={badgePickerRef}>
            <button type="button" onClick={() => setShowBadgePicker(p => !p)}
              className="w-full flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-left bg-white hover:border-green-400 focus:outline-none focus:border-green-400 transition">
              {selectedBadge?.image_url
                ? <img src={getStorageUrl(selectedBadge.image_url)} alt="" className="w-5 h-5 rounded object-cover shrink-0" />
                : <Award size={14} className="text-gray-400 shrink-0" />}
              <span className={`truncate flex-1 text-[13px] font-medium ${rewardBadge ? 'text-gray-700' : 'text-gray-400'}`}>
                {rewardBadge || 'Select badge…'}
              </span>
              <ChevronDown size={12} className="text-gray-400 shrink-0" />
            </button>

            {showBadgePicker && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-2 max-h-56 overflow-y-auto">
                <button onClick={() => selectBadge('')}
                  className="w-full text-left px-2 py-1.5 text-[11px] text-gray-400 hover:bg-gray-50 rounded-lg font-medium mb-1.5">
                  — None —
                </button>
                {badges.length === 0 ? (
                  <p className="text-[11px] text-gray-400 text-center py-4">No badge images uploaded yet<br /><span className="text-[10px]">Go to Badge Images to upload some</span></p>
                ) : (
                  <div className="grid grid-cols-3 gap-1">
                    {badges.map(b => (
                      <button key={b.slug} onClick={() => selectBadge(b.slug)}
                        className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition text-center ${
                          b.slug === rewardBadge ? 'bg-green-50 ring-1 ring-green-400' : 'hover:bg-gray-50'
                        }`}>
                        {b.image_url
                          ? <img src={getStorageUrl(b.image_url)} alt={b.slug} className="w-9 h-9 rounded object-cover" />
                          : <div className="w-9 h-9 rounded bg-gray-100 flex items-center justify-center"><Award size={16} className="text-gray-300" /></div>}
                        <span className={`text-[9px] font-bold truncate w-full ${b.slug === rewardBadge ? 'text-green-700' : 'text-gray-500'}`}>
                          {b.label ?? b.slug}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Field>

        <Field label="Linked story">
          <select value={storyId} onChange={e => saveStoryId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-700 focus:outline-none focus:border-green-400 bg-white">
            <option value="">— None —</option>
            {stories.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </Field>
      </div>

      {/* ── Visual media ── */}
      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Visual Example</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <MediaUpload label="Example Image" icon={<ImageIcon size={15} />} accept="image/*"
            url={c.image_url} table="weekly_challenges" rowId={c.id} field="image_url" onSaved={onMediaSaved} />
          <MediaUpload label="Example Video" icon={<Video size={15} />} accept="video/*"
            url={c.video_url} table="weekly_challenges" rowId={c.id} field="video_url" onSaved={onMediaSaved} />
        </div>
      </div>

      {/* ── Language versions ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Language Versions</p>
          {anyUnpublished && (
            <button onClick={() => void onBulkPublish(c.id, versionEdits)}
              className="flex items-center gap-1.5 text-[11px] font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-1 rounded-full transition">
              <Layers size={11} /> Publish All Languages
            </button>
          )}
        </div>

        <div className="space-y-2">
          {c.versions.map(v => {
            const localEdit = getLocalVersion(v)
            const { ready, missing } = versionReadiness({ ...v, ...localEdit }, c)

            return (
              <div key={v.id} className={`rounded-xl border p-4 space-y-3 ${v.published ? 'border-emerald-200 bg-emerald-50/20' : 'border-gray-100'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-gray-700">{LANG_FLAGS[v.language] ?? ''} {v.language.toUpperCase()}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v.published ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                      {v.published ? 'Published' : 'Draft'}
                    </span>
                    <button
                      onClick={() => void onPublish(v.id, !v.published, c, { ...v, ...localEdit })}
                      title={!ready && !v.published ? `Missing: ${missing.join(', ')}` : undefined}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition ${
                        v.published
                          ? 'border-red-200 text-red-500 hover:bg-red-50'
                          : ready
                            ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                            : 'border-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                      }`}>
                      {v.published ? 'Unpublish' : 'Publish'}
                    </button>
                  </div>
                </div>

                {/* Readiness checklist — shown when draft */}
                {!v.published && (
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: 'Title',       ok: !!localEdit.title.trim() },
                      { label: 'Description', ok: !!localEdit.description.trim() },
                      { label: 'Image',       ok: !!c.image_url },
                      { label: 'Audio',       ok: !!(v.content_json?.audio_url as string | null) },
                    ].map(item => (
                      <span key={item.label} className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                      }`}>
                        {item.ok ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                        {item.label}
                      </span>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2">
                  <input type="text"
                    value={localEdit.title}
                    onChange={e => setVersionEdits(prev => ({ ...prev, [v.id]: { ...prev[v.id], title: e.target.value } }))}
                    onBlur={() => void onVersionSave(v.id, 'title', localEdit.title)}
                    placeholder="Title"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-700 focus:outline-none focus:border-green-400" />
                  <textarea
                    value={localEdit.description}
                    onChange={e => setVersionEdits(prev => ({ ...prev, [v.id]: { ...prev[v.id], description: e.target.value } }))}
                    onBlur={() => void onVersionSave(v.id, 'description', localEdit.description)}
                    placeholder="Description — what will the child do?" rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-600 focus:outline-none focus:border-green-400 resize-none" />
                </div>
                <AudioUpload versionId={v.id} audioUrl={(v.content_json?.audio_url as string) ?? null} onSaved={onMediaSaved} />
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Delete ── */}
      <div className="flex justify-end pt-1">
        <button onClick={() => void onDelete(c)}
          className="flex items-center gap-1.5 text-[12px] font-bold text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition">
          <Trash2 size={13} /> Delete Challenge
        </button>
      </div>
    </div>
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">{label}</label>
      {children}
    </div>
  )
}

function MediaUpload({ label, icon, accept, url, table, rowId, field, onSaved }: {
  label: string; icon: React.ReactNode; accept: string
  url: string | null; table: string; rowId: string; field: string; onSaved: () => void
}) {
  const [uploading, setUploading] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  const { success: toastOk, error: toastErr } = useToast()
  const isImage = accept.startsWith('image')
  const resolvedUrl = url ? getStorageUrl(url) : null

  const handleUpload = async (f: File) => {
    setUploading(true)
    const path = `challenges/${rowId}-${field}-${Date.now()}.${f.name.split('.').pop()}`
    const { error, storagePath } = await smartUpload('storyBook', path, f)
    if (error) { toastErr('Upload failed'); setUploading(false); return }
    const { error: dbErr } = await supabase.from(table).update({ [field]: storagePath }).eq('id', rowId)
    if (dbErr) toastErr(`Save failed: ${dbErr.message}`)
    else { toastOk(`${label} uploaded`); onSaved() }
    setUploading(false)
  }

  const handleRemove = async () => {
    const { error } = await supabase.from(table).update({ [field]: null }).eq('id', rowId)
    if (error) { toastErr(`Remove failed: ${error.message}`); return }
    onSaved()
  }

  return (
    <div>
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) void handleUpload(f); e.target.value = '' }} />
      {uploading ? (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-3">
          <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-[12px] font-bold text-green-700">Uploading…</span>
        </div>
      ) : url ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 overflow-hidden">
          {isImage && resolvedUrl && <img src={resolvedUrl} alt="" className="w-full h-28 object-cover" />}
          {!isImage && resolvedUrl && (
            <a href={resolvedUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2.5 text-[12px] font-bold text-blue-600 hover:underline">
              <Video size={13} /> View video ↗
            </a>
          )}
          <div className="flex items-center gap-2 px-3 py-2 border-t border-emerald-100">
            <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
            <span className="text-[10px] text-emerald-700 font-medium truncate flex-1">{url.split('/').pop()}</span>
            <button onClick={() => ref.current?.click()} className="text-[10px] font-bold text-green-700 hover:underline">Replace</button>
            <button onClick={() => void handleRemove()} className="text-[10px] font-bold text-red-500 hover:underline">Remove</button>
          </div>
        </div>
      ) : (
        <button onClick={() => ref.current?.click()}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-5 text-gray-400 hover:border-green-400 hover:text-green-600 transition">
          {icon}
          <span className="text-[12px] font-bold">{label}</span>
        </button>
      )}
    </div>
  )
}

function AudioUpload({ versionId, audioUrl, onSaved }: {
  versionId: string; audioUrl: string | null; onSaved: () => void
}) {
  const [uploading, setUploading] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  const { error: toastErr } = useToast()
  const resolvedUrl = audioUrl ? getStorageUrl(audioUrl) : null

  const handleUpload = async (f: File) => {
    setUploading(true)
    const path = `challenges/audio-${versionId}-${Date.now()}.${f.name.split('.').pop()}`
    const { error, storagePath } = await smartUpload('storyBook', path, f)
    if (error) { toastErr('Upload failed'); setUploading(false); return }
    const { error: dbErr } = await supabase.from('weekly_challenge_versions')
      .update({ content_json: { audio_url: storagePath } }).eq('id', versionId)
    if (dbErr) toastErr(`Save failed: ${dbErr.message}`)
    else onSaved()
    setUploading(false)
  }

  const handleRemove = async () => {
    const { error } = await supabase.from('weekly_challenge_versions').update({ content_json: {} }).eq('id', versionId)
    if (error) { toastErr(`Remove failed: ${error.message}`); return }
    onSaved()
  }

  return (
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Audio instruction</p>
      <input ref={ref} type="file" accept="audio/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) void handleUpload(f); e.target.value = '' }} />
      {uploading ? (
        <div className="flex items-center gap-2 bg-green-50 rounded-lg px-2.5 py-2">
          <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-[11px] text-green-700">Uploading…</span>
        </div>
      ) : audioUrl && resolvedUrl ? (
        <div className="bg-emerald-50 rounded-lg overflow-hidden">
          <audio controls src={resolvedUrl} className="w-full h-8 rounded-t-lg" />
          <div className="flex items-center gap-2 px-2.5 py-1.5 border-t border-emerald-100">
            <Volume2 size={11} className="text-emerald-500 shrink-0" />
            <span className="text-[10px] text-emerald-700 font-medium truncate flex-1">{audioUrl.split('/').pop()}</span>
            <button onClick={() => ref.current?.click()} className="text-[9px] font-bold text-green-700 hover:underline">Replace</button>
            <button onClick={() => void handleRemove()} className="text-[9px] font-bold text-red-500 hover:underline">Remove</button>
          </div>
        </div>
      ) : (
        <button onClick={() => ref.current?.click()}
          className="w-full flex items-center justify-center gap-1.5 border border-dashed border-gray-200 rounded-lg py-2.5 text-gray-400 hover:text-green-600 hover:border-green-400 transition">
          <Volume2 size={12} />
          <span className="text-[11px] font-bold">Upload Audio</span>
        </button>
      )}
    </div>
  )
}
