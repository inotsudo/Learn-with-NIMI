'use client'
import React, { useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import { getStorageUrl } from '@/lib/queries'
import { smartUpload } from '@/lib/uploadWithProgress'
import { Menu, Plus, Trash2, Upload, CheckCircle2, ChevronDown, ChevronRight, Image as ImageIcon, FileArchive } from 'lucide-react'
import { useToast } from './Toast'
import FlipFlopImporter from './FlipFlopImporter'
import { LANGUAGES, LANGUAGE_META, type Lang } from './missionMeta'

interface Props {
  onNavigate: (table: string) => void
  onOpenSidebar?: () => void
}

interface PageVersion {
  id: string
  language: string
  text: string | null
  audio_url: string | null
  image_url: string | null
  published: boolean
}

interface PageRow {
  id: string
  story_id: string
  page_number: number
  image_url: string | null  // legacy shared image — fallback only
  versions: PageVersion[]
}

interface StoryGroup {
  id: string
  title: string
  slug: string
  pages: PageRow[]
}

export default function FlipFlopBooksManager({ onNavigate, onOpenSidebar }: Props) {
  const [groups, setGroups] = useState<StoryGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedStory, setExpandedStory] = useState<string | null>(null)
  const [editingPage, setEditingPage] = useState<string | null>(null)
  const [activeLang, setActiveLang] = useState<Lang>('en')
  const [importingStory, setImportingStory] = useState<{ id: string; title: string } | null>(null)
  const { success: toastOk, error: toastErr } = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const [{ data: stories }, { data: pages }, { data: versions }] = await Promise.all([
        supabase.from('stories').select('id, title, slug').order('sort_order'),
        supabase.from('story_pages').select('id, story_id, page_number, image_url').order('page_number'),
        supabase.from('story_page_versions').select('id, story_page_id, language, text, audio_url, image_url, published'),
      ])
      const result: StoryGroup[] = (stories ?? []).map(s => ({
        ...s,
        pages: (pages ?? []).filter(p => p.story_id === s.id).map(p => ({
          ...p,
          versions: (versions ?? []).filter(v => v.story_page_id === p.id),
        })),
      }))
      setGroups(result)
    } catch (err) {
      toastErr('Failed to load books.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const handleAddPage = async (storyId: string, pageCount: number) => {
    try {
      const { error } = await supabase.from('story_pages').insert({ story_id: storyId, page_number: pageCount + 1 })
      if (error) throw error
      await load()
      toastOk('Page added')
    } catch (err) {
      toastErr('Failed to add page')
    }
  }

  const handleDeletePage = async (pageId: string) => {
    try {
      const { error } = await supabase.from('story_pages').delete().eq('id', pageId)
      if (error) throw error
      await load()
      toastOk('Page deleted')
    } catch (err) {
      toastErr('Failed to delete page')
    }
  }

  const handleImageUpload = async (pageId: string, lang: Lang, existingVerId: string | undefined, rawFile: File) => {
    const path = `pages/${pageId}-${lang}-${Date.now()}.${rawFile.name.split('.').pop()}`
    const { error, storagePath } = await smartUpload('storyBook', path, rawFile)
    if (error) { toastErr(`Upload failed: ${error.message}`); return }
    const dbErr = existingVerId
      ? (await supabase.from('story_page_versions').update({ image_url: storagePath }).eq('id', existingVerId)).error
      : (await supabase.from('story_page_versions').insert({ story_page_id: pageId, language: lang, text: '', image_url: storagePath, audio_url: null, published: true })).error
    if (dbErr) { toastErr(`Save failed: ${dbErr.message}`); return }
    await load()
  }

  const handleVersionSave = async (versionId: string, field: string, value: string) => {
    try {
      const { error } = await supabase.from('story_page_versions').update({ [field]: value || null }).eq('id', versionId)
      if (error) throw error
      await load()
    } catch (err) {
      toastErr('Save failed')
    }
  }

  const handleAudioUpload = async (versionId: string | undefined, pageId: string, lang: Lang, file: File) => {
    const ext = file.name.split('.').pop()
    const path = `pages/audio-${pageId}-${lang}-${Date.now()}.${ext}`
    const { error, storagePath } = await smartUpload('storyBook', path, file)
    if (error) { toastErr(`Upload failed: ${error.message}`); return }
    const dbErr = versionId
      ? (await supabase.from('story_page_versions').update({ audio_url: storagePath }).eq('id', versionId)).error
      : (await supabase.from('story_page_versions').insert({ story_page_id: pageId, language: lang, text: '', audio_url: storagePath, image_url: null, published: true })).error
    if (dbErr) { toastErr(`Save failed: ${dbErr.message}`); return }
    await load()
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onOpenSidebar} className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-gray-500">
            <Menu size={17} />
          </button>
          <div>
            <h1 className="text-[22px] font-extrabold text-gray-900">FlipFlop Books</h1>
            <p className="text-[13px] text-gray-500">Manage story pages, illustrations, and audio — per language.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
        {loading ? (
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
        ) : groups.map(story => {
          const isOpen = expandedStory === story.id
          return (
            <div key={story.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-2 border-b border-gray-50 bg-gray-50/30">
                <button onClick={() => { setImportingStory({ id: story.id, title: story.title }) }}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-green-600 bg-green-50 hover:bg-green-100 rounded-lg px-3 py-1.5 transition">
                  <FileArchive size={12} /> Bulk Import
                </button>
              </div>
              <button onClick={() => setExpandedStory(isOpen ? null : story.id)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50/50 transition text-left">
                {isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                <div className="flex-1">
                  <h3 className="text-[15px] font-extrabold text-gray-800">{story.title}</h3>
                  <p className="text-[11px] text-gray-400">{story.pages.length} pages</p>
                </div>
                <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${story.pages.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                  {story.pages.length} pages
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100">
                  {/* Language tab strip */}
                  <div className="flex border-b border-gray-100 bg-gray-50/40">
                    {LANGUAGES.map(lang => (
                      <button key={lang} onClick={() => setActiveLang(lang)}
                        className={`flex items-center gap-1.5 px-5 py-2.5 text-[12px] font-semibold border-b-2 transition ${
                          activeLang === lang ? 'border-green-600 text-green-700 bg-white' : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}>
                        {LANGUAGE_META[lang].flag} {LANGUAGE_META[lang].label}
                      </button>
                    ))}
                  </div>

                  <div className="px-5 py-4 space-y-3">
                    {story.pages.length === 0 ? (
                      <p className="text-[13px] text-gray-400 text-center py-4">No pages yet.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {story.pages.map(page => {
                          const ver = page.versions.find(v => v.language === activeLang)
                          // Per-language image; legacy shared image is the fallback for old data
                          const displayImage = ver?.image_url ?? page.image_url
                          const hasImage = !!displayImage
                          const hasAudio = !!ver?.audio_url

                          return (
                            <div key={page.id} className={`rounded-xl border p-3 ${editingPage === page.id ? 'border-green-300 bg-green-50/30' : 'border-gray-100'}`}>
                              {/* Per-language image */}
                              <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 mb-2">
                                {hasImage ? (
                                  <label className="w-full h-full cursor-pointer group relative block">
                                    <img src={getStorageUrl(displayImage!)} alt={`Page ${page.page_number}`} className="w-full h-full object-cover" loading="lazy" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                      <span className="text-white text-[10px] font-bold bg-black/50 rounded-lg px-3 py-1.5">Replace</span>
                                    </div>
                                    <input type="file" accept="image/*" className="hidden"
                                      onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(page.id, activeLang, ver?.id, f) }} />
                                  </label>
                                ) : (
                                  <label className="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-300 cursor-pointer hover:text-gray-400 hover:bg-gray-50 transition">
                                    <ImageIcon size={20} />
                                    <span className="text-[9px] font-bold">Upload {LANGUAGE_META[activeLang].flag}</span>
                                    <input type="file" accept="image/*" className="hidden"
                                      onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(page.id, activeLang, ver?.id, f) }} />
                                  </label>
                                )}
                                <div className="absolute top-1.5 left-1.5 bg-white/90 backdrop-blur px-2 py-0.5 rounded-md text-[10px] font-bold text-gray-600">
                                  #{page.page_number}
                                </div>
                                {hasAudio && (
                                  <div className="absolute top-1.5 right-1.5 bg-emerald-500 rounded-md px-1.5 py-0.5 text-[9px] font-bold text-white">🔊</div>
                                )}
                              </div>

                              {/* Language coverage dots */}
                              <div className="flex items-center gap-1 mb-1.5">
                                {LANGUAGES.map(lang => {
                                  const v = page.versions.find(vv => vv.language === lang)
                                  const ok = v && (v.image_url || v.audio_url)
                                  return (
                                    <span key={lang} className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                      ok ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'
                                    }`}>{lang}</span>
                                  )
                                })}
                              </div>

                              {/* Actions */}
                              <div className="flex gap-1">
                                <button onClick={() => setEditingPage(editingPage === page.id ? null : page.id)}
                                  className="flex-1 text-[10px] font-bold text-green-600 bg-green-50 hover:bg-green-100 rounded-lg py-1.5 transition">
                                  {editingPage === page.id ? 'Close' : 'Edit'}
                                </button>
                                <button onClick={() => handleDeletePage(page.id)}
                                  className="w-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                                  <Trash2 size={12} />
                                </button>
                              </div>

                              {/* Expanded edit — per-language image + audio + text */}
                              {editingPage === page.id && (
                                <div className="mt-2 space-y-2 border-t border-gray-100 pt-2">
                                  {LANGUAGES.map(lang => {
                                    const v = page.versions.find(vv => vv.language === lang)
                                    return (
                                      <div key={lang} className="space-y-1.5">
                                        <p className="text-[9px] font-bold text-gray-400 uppercase">{LANGUAGE_META[lang].flag} {lang}</p>

                                        {/* Image per language */}
                                        {v?.image_url ? (
                                          <div className="flex items-center gap-1 bg-blue-50 rounded-lg px-2 py-1.5">
                                            <CheckCircle2 size={10} className="text-blue-500 shrink-0" />
                                            <span className="text-[9px] text-blue-700 truncate flex-1">Image set</span>
                                            <label className="text-[8px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded px-1.5 py-0.5 cursor-pointer">
                                              Replace
                                              <input type="file" accept="image/*" className="hidden"
                                                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(page.id, lang as Lang, v.id, f) }} />
                                            </label>
                                          </div>
                                        ) : (
                                          <label className="flex items-center gap-1.5 border border-dashed border-gray-200 rounded-lg px-2 py-1.5 text-gray-400 hover:border-blue-300 hover:text-blue-500 cursor-pointer transition">
                                            <Upload size={10} />
                                            <span className="text-[9px] font-bold">Upload Image</span>
                                            <input type="file" accept="image/*" className="hidden"
                                              onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(page.id, lang as Lang, v?.id, f) }} />
                                          </label>
                                        )}

                                        {/* Audio per language */}
                                        {v?.audio_url ? (
                                          <div className="flex items-center gap-1 bg-emerald-50 rounded-lg px-2 py-1.5">
                                            <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
                                            <span className="text-[9px] text-emerald-700 truncate flex-1">{v.audio_url.split('/').pop()}</span>
                                            <label className="text-[8px] font-bold text-green-600 bg-green-50 hover:bg-green-100 rounded px-1.5 py-0.5 cursor-pointer">
                                              Change
                                              <input type="file" accept="audio/*" className="hidden"
                                                onChange={e => { const f = e.target.files?.[0]; if (f) handleAudioUpload(v.id, page.id, lang as Lang, f) }} />
                                            </label>
                                            <button onClick={() => handleVersionSave(v.id, 'audio_url', '')}
                                              className="text-[8px] font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded px-1.5 py-0.5">Remove</button>
                                          </div>
                                        ) : (
                                          <label className="flex items-center gap-1.5 border border-dashed border-gray-200 rounded-lg px-2 py-1.5 text-gray-400 hover:border-green-300 hover:text-green-500 cursor-pointer transition">
                                            <Upload size={10} />
                                            <span className="text-[9px] font-bold">Upload Audio</span>
                                            <input type="file" accept="audio/*" className="hidden"
                                              onChange={e => { const f = e.target.files?.[0]; if (f) handleAudioUpload(v?.id, page.id, lang as Lang, f) }} />
                                          </label>
                                        )}

                                        {/* Text */}
                                        {v && (
                                          <textarea defaultValue={v.text ?? ''} rows={2}
                                            onBlur={e => handleVersionSave(v.id, 'text', e.target.value)}
                                            placeholder="Page text..."
                                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-[11px] text-gray-700 focus:outline-none focus:border-green-300 resize-none" />
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                    <button onClick={() => handleAddPage(story.id, story.pages.length)}
                      className="flex items-center gap-1.5 text-[12px] font-bold text-green-600 bg-green-50 hover:bg-green-100 rounded-xl px-4 py-2 transition">
                      <Plus size={14} /> Add Page
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {importingStory && (
        <FlipFlopImporter
          storyId={importingStory.id}
          storyTitle={importingStory.title}
          language={activeLang}
          onDone={load}
          onClose={() => setImportingStory(null)}
        />
      )}
    </div>
  )
}
