'use client'
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import supabase from '@/lib/supabaseClient'
import { getCachedAdmin } from './adminAuth'
import {
  HardDrive, Menu, ChevronDown, ChevronRight, ArrowLeft, Folder, Search, Upload,
  ExternalLink, Trash2, ImageIcon, Video, Music, FileText, File as FileIcon,
  BookOpen, Palette, Film, AlertCircle, RefreshCw, X,
  type LucideIcon,
} from 'lucide-react'
import { ACCENT } from './missionMeta'
import { SkeletonCardGrid } from './Skeleton'
import { useConfirmDialog } from './ConfirmDialog'

interface BucketsViewProps {
  onNavigate: (table: string) => void
  onOpenSidebar?: () => void
}

interface StorageEntry {
  name: string
  id: string | null // null => folder
  updated_at?: string | null
  metadata?: { size?: number; mimetype?: string } | null
}

const accent = ACCENT.orange

const BUCKETS = ['storyBook', 'Coloriage', 'preview'] as const

const BUCKET_META: Record<string, { label: string; description: string; icon: LucideIcon }> = {
  storyBook: { label: 'Story Book', description: 'Mission media, story pages & cover art', icon: BookOpen },
  Coloriage: { label: 'Coloring Pages', description: 'Coloring book page templates', icon: Palette },
  preview: { label: 'Preview Media', description: 'Reserved for upcoming preview assets', icon: Film },
}

function formatSize(bytes?: number) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

type FileKind = 'image' | 'video' | 'audio' | 'pdf' | 'other'

function fileKind(name: string): FileKind {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image'
  if (['mp4', 'webm', 'mov'].includes(ext)) return 'video'
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return 'audio'
  if (ext === 'pdf') return 'pdf'
  return 'other'
}

const KIND_ICON: Record<FileKind, LucideIcon> = {
  image: ImageIcon, video: Video, audio: Music, pdf: FileText, other: FileIcon,
}

export default function BucketsView({ onNavigate, onOpenSidebar }: BucketsViewProps) {
  const [admin, setAdmin] = useState<{ name: string; role: string } | null>(null)
  const [bucket, setBucket] = useState<string>(BUCKETS[0])
  const [path, setPath] = useState('')
  const [entries, setEntries] = useState<StorageEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deletingName, setDeletingName] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const { confirm, dialog } = useConfirmDialog()

  useEffect(() => {
    getCachedAdmin().then(a => { if (a) setAdmin(a) }).catch(err => console.error('[BucketsView] auth:', err))
  }, [])

  const fetchEntries = useCallback(async (b: string, p: string) => {
    setLoading(true)
    setLoadError(null)
    try {
      const { data, error } = await supabase.storage.from(b).list(p, {
        limit: 200,
        sortBy: { column: 'name', order: 'asc' },
      })
      if (error) throw error
      setEntries((data ?? []).filter(f => f.name !== '.emptyFolderPlaceholder'))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load files.'
      console.error('[Media Library] list error:', message)
      setLoadError(message)
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEntries(bucket, path) }, [bucket, path, fetchEntries])

  const selectBucket = (b: string) => {
    setBucket(b)
    setPath('')
    setSearch('')
  }

  const openFolder = (name: string) => {
    setPath(prev => (prev ? `${prev}/${name}` : name))
    setSearch('')
  }

  const goRoot = () => { setPath(''); setSearch('') }

  const goToCrumb = (index: number) => {
    const parts = path.split('/').filter(Boolean)
    setPath(parts.slice(0, index + 1).join('/'))
    setSearch('')
  }

  const goUp = () => {
    const parts = path.split('/').filter(Boolean)
    setPath(parts.slice(0, -1).join('/'))
    setSearch('')
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setActionError(null)
    setUploading(true)
    try {
      const fullPath = path ? `${path}/${file.name}` : file.name
      const { error } = await supabase.storage.from(bucket).upload(fullPath, file, { upsert: true })
      if (error) throw error
      await fetchEntries(bucket, path)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDelete = async (name: string) => {
    const ok = await confirm({ title: `Delete "${name}"?`, message: 'This cannot be undone.' })
    if (!ok) return
    setActionError(null)
    setDeletingName(name)
    try {
      const fullPath = path ? `${path}/${name}` : name
      const { error } = await supabase.storage.from(bucket).remove([fullPath])
      if (error) throw error
      await fetchEntries(bucket, path)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete the file.')
    } finally {
      setDeletingName(null)
    }
  }

  const publicUrl = (name: string) => {
    const fullPath = path ? `${path}/${name}` : name
    return supabase.storage.from(bucket).getPublicUrl(fullPath).data.publicUrl
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = q ? entries.filter(e => e.name.toLowerCase().includes(q)) : entries
    return {
      folders: rows.filter(e => e.id === null),
      files: rows.filter(e => e.id !== null),
    }
  }, [entries, search])

  const pathParts = path.split('/').filter(Boolean)
  const meta = BUCKET_META[bucket] ?? { label: bucket, description: '', icon: HardDrive }

  return (
    <div>
      {/* Header */}
      <header className={`border-b border-gray-100 px-4 sm:px-6 py-5 ${accent.soft}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3.5 min-w-0">
            <button
              onClick={onOpenSidebar}
              className="lg:hidden flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-100 hover:bg-gray-50 text-gray-600 shadow-sm transition mt-0.5"
            >
              <Menu size={17} />
            </button>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm bg-white ${accent.text}`}>
              <HardDrive className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                Media Library <span className="text-lg">🗂️</span>
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">
                All your images, audio &amp; video in one place
              </p>
              <p className="text-xs text-gray-400 mt-1.5">
                <button onClick={() => onNavigate('Dashboard')} className={`font-bold hover:underline ${accent.text}`}>Dashboard</button>
                <span className="mx-1.5 text-gray-300">/</span>
                <span className="font-bold text-gray-500">Media Library</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-100 pl-1.5 pr-3 py-1.5 rounded-full shadow-sm">
            <img src="/nimi-logo-circle.png" alt="Profile" className="w-7 h-7 rounded-full object-cover flex-shrink-0 ring-2 ring-white"  loading="lazy" />
            <div className="hidden sm:block leading-tight">
              <p className="text-sm font-semibold text-gray-700">{admin?.name ?? 'Admin'}</p>
              <p className="text-[10px] text-gray-400 uppercase font-bold">{admin?.role ?? 'admin'}</p>
            </div>
            <ChevronDown size={14} className="text-gray-400" />
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {actionError && (
          <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-xl px-3.5 py-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="flex-1">{actionError}</span>
            <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600 flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Bucket picker */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {BUCKETS.map(b => {
            const m = BUCKET_META[b]
            const isActive = b === bucket
            return (
              <button
                key={b}
                onClick={() => selectBucket(b)}
                className={`text-left rounded-2xl border p-4 transition ${
                  isActive ? `${accent.soft} ${accent.border} shadow-sm` : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${accent.tile}`}>
                  <m.icon className="w-5 h-5" />
                </div>
                <p className="font-bold text-gray-800">{m.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>
              </button>
            )
          })}
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 flex-wrap min-w-0">
            {path && (
              <button onClick={goUp} title="Back" className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 mr-1">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <button onClick={goRoot} className={path ? 'hover:underline' : `${accent.text} font-bold`}>
              {meta.label}
            </button>
            {pathParts.map((part, i) => (
              <React.Fragment key={i}>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                <button
                  onClick={() => goToCrumb(i)}
                  className={i === pathParts.length - 1 ? `${accent.text} font-bold` : 'hover:underline'}
                >
                  {part}
                </button>
              </React.Fragment>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-50 border border-gray-100 rounded-full px-3.5 py-2 focus-within:ring-2 focus-within:ring-gray-200 transition">
              <Search size={15} className="text-gray-400 mr-2 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search this folder..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
              />
            </div>
            <label className={`inline-flex items-center gap-2 text-white text-sm font-bold px-4 py-2.5 rounded-full cursor-pointer transition whitespace-nowrap ${accent.button}`}>
              <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload'}
              <input type="file" onChange={handleUpload} disabled={uploading} className="hidden" />
            </label>
          </div>
        </div>

        {/* Grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {loading ? (
            <SkeletonCardGrid count={12} cols="sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6" />
          ) : loadError ? (
            <div className="flex flex-col items-center text-center py-10">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-400 flex items-center justify-center mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-gray-700">Couldn&apos;t load this folder</p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">{loadError}</p>
              <button
                onClick={() => fetchEntries(bucket, path)}
                className={`mt-4 inline-flex items-center gap-2 text-white text-xs font-bold px-4 py-2 rounded-full transition ${accent.button}`}
              >
                <RefreshCw className="w-3.5 h-3.5" /> Try again
              </button>
            </div>
          ) : filtered.folders.length === 0 && filtered.files.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">
              {search ? 'No files match your search.' : 'This folder is empty.'}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filtered.folders.map(f => (
                <button
                  key={f.name}
                  onClick={() => openFolder(f.name)}
                  className="group rounded-2xl border border-gray-100 p-3 hover:border-gray-200 hover:shadow-sm transition text-left"
                >
                  <div className={`w-full aspect-square rounded-xl flex items-center justify-center mb-2 ${accent.tile}`}>
                    <Folder className="w-8 h-8" />
                  </div>
                  <p className="text-xs font-bold text-gray-700 truncate" title={f.name}>{f.name}</p>
                  <p className="text-[10px] text-gray-400">Folder</p>
                </button>
              ))}
              {filtered.files.map(f => {
                const kind = fileKind(f.name)
                const Icon = KIND_ICON[kind]
                return (
                  <div key={f.name} className="group relative rounded-2xl border border-gray-100 p-3 hover:border-gray-200 hover:shadow-sm transition">
                    {kind === 'image' ? (
                      <img src={publicUrl(f.name)} alt={f.name} loading="lazy" className="w-full aspect-square object-cover rounded-xl mb-2 bg-gray-50" />
                    ) : (
                      <div className={`w-full aspect-square rounded-xl flex items-center justify-center mb-2 ${accent.tile}`}>
                        <Icon className="w-8 h-8" />
                      </div>
                    )}
                    <p className="text-xs font-bold text-gray-700 truncate" title={f.name}>{f.name}</p>
                    <p className="text-[10px] text-gray-400">{formatSize(f.metadata?.size)} · {formatDate(f.updated_at)}</p>
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <a
                        href={publicUrl(f.name)}
                        target="_blank"
                        rel="noreferrer"
                        title="View"
                        className="w-7 h-7 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => handleDelete(f.name)}
                        disabled={deletingName === f.name}
                        title="Delete"
                        className="w-7 h-7 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      {dialog}
    </div>
  )
}
