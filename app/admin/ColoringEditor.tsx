'use client'
import React, { useState, useMemo } from 'react'
import supabase from '@/lib/supabaseClient'
import { getStorageUrl } from '@/lib/queries'
import { smartUpload } from '@/lib/uploadWithProgress'
import {
  PenTool, Settings2, Image as ImageIcon, Upload, FileStack, Plus, Trash2,
  Info, CheckCircle2, AlertCircle, Eye,
} from 'lucide-react'
import {
  ACCENT, type ColoringBookRow, type ColoringPageRow,
} from './missionMeta'
import { useConfirmDialog } from './ConfirmDialog'

const accent = ACCENT.rose

interface ColoringEditorProps {
  book: ColoringBookRow
  onSaved: () => void
}

interface BookForm {
  title: string
  theme_title: string
  theme_emoji: string
  is_active: boolean
}

const inputClass = (ring: string) =>
  `w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-700 transition ${ring}`

function bookFormFromRow(book: ColoringBookRow): BookForm {
  return {
    title: book.title ?? '',
    theme_title: book.theme_title ?? '',
    theme_emoji: book.theme_emoji ?? '',
    is_active: book.is_active ?? false,
  }
}

export default function ColoringEditor({ book, onSaved }: ColoringEditorProps) {
  const [bookForm, setBookForm] = useState<BookForm>(() => bookFormFromRow(book))
  const sortedPages = useMemo(() => [...book.coloring_pages].sort((a, b) => a.page_number - b.page_number), [book.coloring_pages])
  const [selectedPageId, setSelectedPageId] = useState<string | null>(() => sortedPages[0]?.id ?? null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const resetForm = () => {
    setBookForm(bookFormFromRow(book))
    setMessage('')
    setError('')
  }

  const selectedPage = sortedPages.find(p => p.id === selectedPageId) ?? null

  const saveBook = async () => {
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const { error: err } = await supabase.from('stories').update({
        title: bookForm.title,
        theme_title: bookForm.theme_title || null,
        theme_emoji: bookForm.theme_emoji || null,
        is_active: bookForm.is_active,
      }).eq('id', book.id)
      if (err) throw err
      setMessage('Coloring book saved!')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save coloring book.')
    } finally {
      setSaving(false)
    }
  }

  const handleAddPage = async () => {
    setError('')
    try {
      const maxPageNum = sortedPages.reduce((max, p) => Math.max(max, p.page_number), 0)
      const { data: newPage, error: err } = await supabase
        .from('coloring_pages')
        .insert({ story_id: book.id, page_number: maxPageNum + 1 })
        .select()
        .single()
      if (err) throw err
      await onSaved()
      setSelectedPageId(newPage.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add page.')
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
            <PenTool className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-gray-800 leading-tight">Editing Coloring Book: {bookForm.title || 'Untitled'}</h2>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold mt-1 ${bookForm.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              {bookForm.is_active ? 'Active' : 'Draft'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resetForm} disabled={saving} className="px-4 py-2.5 rounded-full text-sm font-bold text-gray-500 hover:bg-gray-100 transition disabled:opacity-50">
            Cancel
          </button>
          <button onClick={saveBook} disabled={saving} className={`px-5 py-2.5 rounded-full text-sm font-bold text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition disabled:opacity-50 disabled:hover:translate-y-0 ${accent.button}`}>
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
              value={bookForm.title}
              onChange={e => setBookForm(f => ({ ...f, title: e.target.value }))}
              className={inputClass(accent.ring)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Status</label>
            <select
              value={bookForm.is_active ? 'active' : 'draft'}
              onChange={e => setBookForm(f => ({ ...f, is_active: e.target.value === 'active' }))}
              className={inputClass(accent.ring)}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Theme Title</label>
            <input
              type="text"
              value={bookForm.theme_title}
              onChange={e => setBookForm(f => ({ ...f, theme_title: e.target.value }))}
              className={inputClass(accent.ring)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Theme Emoji</label>
            <input
              type="text"
              value={bookForm.theme_emoji}
              onChange={e => setBookForm(f => ({ ...f, theme_emoji: e.target.value }))}
              className={inputClass(accent.ring)}
            />
          </div>
        </div>
      </section>

      {/* Pages */}
      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${accent.tile}`}>
              <FileStack size={15} />
            </div>
            <h3 className="text-sm font-extrabold text-gray-800">Coloring Pages ({sortedPages.length})</h3>
          </div>
          <button onClick={handleAddPage} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition hover:opacity-80 ${accent.soft} ${accent.text}`}>
            <Plus size={14} /> Add Page
          </button>
        </div>

        {sortedPages.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-6">No coloring pages yet. Click &quot;Add Page&quot; to add the first page.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {sortedPages.map(p => {
              const isSelected = p.id === selectedPageId
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPageId(p.id)}
                  className={`relative rounded-xl overflow-hidden border-2 aspect-[3/4] bg-gray-50 transition ${
                    isSelected ? `${accent.border} ring-2 ring-rose-300 ring-offset-1` : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  {p.template_image_url ? (
                    <img src={getStorageUrl(p.template_image_url)} alt={`Page ${p.page_number}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <ImageIcon size={20} />
                    </div>
                  )}
                  <span className="absolute top-1 left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-white/90 text-gray-700 text-[10px] font-bold flex items-center justify-center shadow-sm">
                    {p.page_number}
                  </span>
                  {p.template_image_url && (
                    <span className="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-emerald-400 ring-1 ring-white" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* Page sub-editor */}
      {selectedPage && (
        <ColoringPageEditor key={selectedPage.id} book={book} page={selectedPage} pages={sortedPages} onSaved={onSaved} onSelectPage={setSelectedPageId} />
      )}

      {/* Info banner */}
      <div className={`flex items-start gap-3 rounded-2xl px-4 py-3.5 border ${accent.soft} ${accent.border}`}>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-white ${accent.text}`}>
          <Info size={14} />
        </div>
        <span className={`text-sm font-semibold ${accent.text}`}>Coloring page templates are line-drawing images children color in the Coloring Studio — make sure each one lines up with the matching storybook page.</span>
      </div>
    </div>
  )
}

interface ColoringPageEditorProps {
  book: ColoringBookRow
  page: ColoringPageRow
  pages: ColoringPageRow[]
  onSaved: () => void
  onSelectPage: (id: string | null) => void
}

function ColoringPageEditor({ book, page, pages, onSaved, onSelectPage }: ColoringPageEditorProps) {
  const [imageUrl, setImageUrl] = useState(page.template_image_url ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const { confirm, dialog } = useConfirmDialog()

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true)
    setError('')
    try {
      const ext = file.name.split('.').pop()
      const path = `pages/${book.id}-${page.page_number}-${Date.now()}.${ext}`
      const { error: uploadErr, storagePath } = await smartUpload('Coloriage', path, file)
      if (uploadErr) throw uploadErr
      setImageUrl(storagePath)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploadingImage(false)
    }
  }

  const savePage = async () => {
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const { error: err } = await supabase.from('coloring_pages').update({ template_image_url: imageUrl || null }).eq('id', page.id)
      if (err) throw err
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
      message: "This also deletes any learners' saved colorings for this page. This cannot be undone.",
    })
    if (!ok) return
    setDeleting(true)
    setError('')
    try {
      const { error: err } = await supabase.from('coloring_pages').delete().eq('id', page.id)
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
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold mt-1 ${imageUrl ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              {imageUrl ? 'Has Template' : 'No Template'}
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

      {/* Content + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <section className="lg:col-span-3 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Template Image</label>
            {imageUrl ? (
              <div className="flex items-center gap-3">
                <img src={getStorageUrl(imageUrl)} alt={`Page ${page.page_number}`} className="w-16 h-20 rounded-xl object-cover border border-gray-100 shadow-sm" />
                <button onClick={() => setImageUrl('')} className="text-xs font-bold text-red-500 hover:text-red-600 px-3 py-1.5 rounded-full hover:bg-red-50 transition">Remove</button>
              </div>
            ) : (
              <label
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleImageUpload(f) }}
                className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-2xl px-4 py-6 cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition text-center"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent.tile}`}>
                  <Upload size={18} />
                </div>
                <span className="text-sm font-semibold text-gray-500">{uploadingImage ? 'Uploading...' : 'Upload template image'}</span>
                <span className="text-xs text-gray-400">PNG or JPG, up to 5MB</span>
                <input type="file" accept="image/*" className="hidden" disabled={uploadingImage} onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
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
            <h4 className="text-sm font-extrabold text-gray-800">Live Preview</h4>
          </div>
          <div className={`relative overflow-hidden rounded-3xl p-5 text-white shadow-lg ${accent.gradient}`}>
            <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
            <div className="absolute -bottom-10 -left-6 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
            <div className="relative">
              {imageUrl ? (
                <img src={getStorageUrl(imageUrl)} alt={`Page ${page.page_number}`} className="w-full h-48 object-cover rounded-2xl mb-3 border-2 border-white/30 bg-white" />
              ) : (
                <div className="w-full h-48 rounded-2xl mb-3 border-2 border-white/30 bg-white/10 flex items-center justify-center text-white/60">
                  <ImageIcon size={28} />
                </div>
              )}
              <p className="font-extrabold text-lg leading-tight">Page {page.page_number}</p>
            </div>
          </div>
        </section>
      </div>
      {dialog}
    </section>
  )
}
