'use client'
import React, { useEffect, useRef, useState, useCallback } from 'react'
import supabase from '@/lib/supabaseClient'
import { getCachedAdmin } from './adminAuth'
import { Award, Menu, ChevronDown, Upload, Save, RefreshCw, CheckCircle2, AlertCircle, Eye } from 'lucide-react'

interface CertificateTemplatesManagerProps {
  onNavigate: (table: string) => void
  onOpenSidebar?: () => void
}

const LANGS = [
  { key: 'en', label: 'English',     flag: '🇬🇧' },
  { key: 'fr', label: 'French',      flag: '🇫🇷' },
  { key: 'rw', label: 'Kinyarwanda', flag: '🇷🇼' },
] as const
type LangKey = 'en' | 'fr' | 'rw'

interface LangConfig {
  image_url: string | null
  name_x:    number
  name_y:    number
  name_size: number
  name_color: string
}

const DEFAULTS: LangConfig = { image_url: null, name_x: 438, name_y: 1089, name_size: 50, name_color: '#0d1b4b' }

export default function CertificateTemplatesManager({ onNavigate, onOpenSidebar }: CertificateTemplatesManagerProps) {
  const [admin, setAdmin] = useState<{ name: string; role: string } | null>(null)
  const [activeLang, setActiveLang] = useState<LangKey>('en')
  const [configs, setConfigs] = useState<Record<LangKey, LangConfig>>({ en: { ...DEFAULTS }, fr: { ...DEFAULTS }, rw: { ...DEFAULTS } })
  const [loadingInit, setLoadingInit] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  const [previewName, setPreviewName] = useState('NATHAN JOYEUX')
  const [dragging, setDragging] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef    = useRef<HTMLImageElement | null>(null)
  const fileRef   = useRef<HTMLInputElement>(null)

  // ── Load admin + existing templates ──────────────────────────
  useEffect(() => {
    void (async () => {
      try {
        const [adminData, { data: rows }] = await Promise.all([
          getCachedAdmin(),
          supabase.from('certificate_templates').select('*'),
        ])
        if (adminData) setAdmin(adminData)
        if (rows?.length) {
          setConfigs(prev => {
            const next = { ...prev }
            for (const row of rows) {
              const lang = row.lang as LangKey
              if (next[lang]) {
                next[lang] = {
                  image_url:  row.image_url  ?? null,
                  name_x:     row.name_x     ?? DEFAULTS.name_x,
                  name_y:     row.name_y     ?? DEFAULTS.name_y,
                  name_size:  row.name_size  ?? DEFAULTS.name_size,
                  name_color: row.name_color ?? DEFAULTS.name_color,
                }
              }
            }
            return next
          })
        }
      } catch (err) {
        console.error('[CertificateTemplatesManager] init failed:', err)
      } finally {
        setLoadingInit(false)
      }
    })()
  }, [])

  // ── Draw canvas whenever config / preview name changes ────────
  const redraw = useCallback(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const cfg = configs[activeLang]
    ctx.clearRect(0, 0, cv.width, cv.height)

    if (imgRef.current && imgRef.current.complete) {
      ctx.drawImage(imgRef.current, 0, 0, cv.width, cv.height)
    } else {
      ctx.fillStyle = '#f3f4f6'
      ctx.fillRect(0, 0, cv.width, cv.height)
      ctx.fillStyle = '#9ca3af'
      ctx.font = 'bold 18px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText('Upload a certificate image to preview', cv.width / 2, cv.height / 2)
    }

    // crosshair
    ctx.strokeStyle = 'rgba(99,102,241,0.4)'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 4])
    ctx.beginPath(); ctx.moveTo(cfg.name_x, 0); ctx.lineTo(cfg.name_x, cv.height); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, cfg.name_y); ctx.lineTo(cv.width, cfg.name_y); ctx.stroke()
    ctx.setLineDash([])

    // name
    ctx.font = `900 ${cfg.name_size}px Arial Black, Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = cfg.name_color
    ctx.fillText(previewName.toUpperCase(), cfg.name_x, cfg.name_y)

    // dot
    ctx.beginPath()
    ctx.arc(cfg.name_x, cfg.name_y, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#ef4444'
    ctx.fill()
  }, [activeLang, configs, previewName])

  useEffect(() => { redraw() }, [redraw])

  // ── Load image when image_url changes ─────────────────────────
  useEffect(() => {
    const url = configs[activeLang].image_url
    if (!url) { imgRef.current = null; redraw(); return }

    const fullUrl = url.startsWith('http')
      ? url
      : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${url}`

    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => { imgRef.current = img; redraw() }
    img.onerror = () => { imgRef.current = null; redraw() }
    img.src = fullUrl
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLang, configs[activeLang].image_url])

  // ── Canvas setup ─────────────────────────────────────────────
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    cv.width  = 864
    cv.height = 1152
    redraw()
  }, [activeLang, redraw])

  // ── Canvas drag ───────────────────────────────────────────────
  const getCanvasXY = (e: React.MouseEvent | React.TouchEvent) => {
    const cv = canvasRef.current!
    const rect = cv.getBoundingClientRect()
    const scaleX = cv.width  / rect.width
    const scaleY = cv.height / rect.height
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY }
  }

  const updatePos = (e: React.MouseEvent | React.TouchEvent) => {
    const { x, y } = getCanvasXY(e)
    setConfigs(prev => ({ ...prev, [activeLang]: { ...prev[activeLang], name_x: Math.round(x), name_y: Math.round(y) } }))
  }

  // ── Upload cert image ─────────────────────────────────────────
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext  = file.name.split('.').pop() || 'jpg'
      const path = `cert-templates/${activeLang}_${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('certificates').upload(path, file, { upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('certificates').getPublicUrl(path)
      setConfigs(prev => ({ ...prev, [activeLang]: { ...prev[activeLang], image_url: publicUrl } }))
      showToast('ok', 'Image uploaded successfully')
    } catch (err) {
      showToast('err', err instanceof Error ? err.message : 'Upload failed')
    }
    setUploading(false)
    e.target.value = ''
  }

  // ── Save to DB ────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    const cfg = configs[activeLang]
    try {
      const { error } = await supabase.from('certificate_templates').upsert({
        lang:       activeLang,
        image_url:  cfg.image_url,
        name_x:     cfg.name_x,
        name_y:     cfg.name_y,
        name_size:  cfg.name_size,
        name_color: cfg.name_color,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'lang' })
      if (error) throw error
      showToast('ok', `${activeLang.toUpperCase()} certificate template saved`)
    } catch (err) {
      showToast('err', err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const showToast = (type: 'ok' | 'err', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  const cfg = configs[activeLang]

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3.5 min-w-0">
            <button onClick={onOpenSidebar}
              className="lg:hidden flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-100 hover:bg-gray-50 text-gray-600 shadow-sm transition mt-0.5">
              <Menu size={17} />
            </button>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm bg-amber-50 text-amber-600">
              <Award className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                Certificate Templates 🎓
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">
                Upload and configure the story certificate design per language
              </p>
              <p className="text-xs text-gray-400 mt-1.5">
                <button onClick={() => onNavigate('Dashboard')} className="font-bold hover:underline text-green-600">Dashboard</button>
                <span className="mx-1.5 text-gray-300">/</span>
                <button onClick={() => onNavigate('child_achievements')} className="font-bold hover:underline text-green-600">Certificates</button>
                <span className="mx-1.5 text-gray-300">/</span>
                <span className="font-bold text-gray-500">Templates</span>
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
      <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">

        {/* Info banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <Eye className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Upload the official certificate JPEG for each language. Drag directly on the preview to position the child&apos;s name.
            When a child downloads their certificate, their real name is stamped at the saved position.
          </p>
        </div>

        {/* Language tabs */}
        <div className="flex gap-2">
          {LANGS.map(l => (
            <button key={l.key} onClick={() => setActiveLang(l.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition ${
                activeLang === l.key
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-green-300 hover:text-green-700'
              }`}>
              <span>{l.flag}</span> {l.label}
              {configs[l.key].image_url && (
                <span className={`w-2 h-2 rounded-full ${activeLang === l.key ? 'bg-green-200' : 'bg-green-500'}`} />
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

          {/* Canvas preview */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <p className="font-bold text-gray-700 text-sm">Live Preview — drag to reposition name</p>
              <input
                type="text"
                value={previewName}
                onChange={e => setPreviewName(e.target.value)}
                placeholder="Preview name..."
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 w-44 focus:outline-none focus:border-green-400"
              />
            </div>
            <div className="relative" style={{ cursor: 'crosshair' }}>
              <canvas
                ref={canvasRef}
                className="w-full h-auto block"
                onMouseDown={e => { setDragging(true); updatePos(e) }}
                onMouseMove={e => { if (dragging) updatePos(e) }}
                onMouseUp={() => setDragging(false)}
                onMouseLeave={() => setDragging(false)}
                onTouchStart={e => { setDragging(true); updatePos(e) }}
                onTouchMove={e => { e.preventDefault(); if (dragging) updatePos(e) }}
                onTouchEnd={() => setDragging(false)}
              />
              {loadingInit && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Config panel */}
          <div className="space-y-4">

            {/* Upload */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="font-bold text-gray-700 text-sm mb-3">Certificate Image</p>
              {cfg.image_url ? (
                <div className="mb-3 p-3 bg-green-50 rounded-xl border border-green-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <p className="text-xs text-green-800 font-bold truncate">Image uploaded</p>
                </div>
              ) : (
                <div className="mb-3 p-3 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-center">
                  <p className="text-xs text-gray-400 font-bold">No image yet</p>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png" onChange={handleUpload} className="hidden" />
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm py-2.5 rounded-xl transition">
                {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'Uploading…' : 'Upload Certificate JPEG'}
              </button>
            </div>

            {/* Name position */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <p className="font-bold text-gray-700 text-sm">Name Position</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">X (horizontal)</label>
                  <input type="number" value={cfg.name_x}
                    onChange={e => setConfigs(prev => ({ ...prev, [activeLang]: { ...prev[activeLang], name_x: +e.target.value } }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Y (vertical)</label>
                  <input type="number" value={cfg.name_y}
                    onChange={e => setConfigs(prev => ({ ...prev, [activeLang]: { ...prev[activeLang], name_y: +e.target.value } }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Font Size</label>
                  <input type="number" value={cfg.name_size}
                    onChange={e => setConfigs(prev => ({ ...prev, [activeLang]: { ...prev[activeLang], name_size: +e.target.value } }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Name Color</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={cfg.name_color}
                      onChange={e => setConfigs(prev => ({ ...prev, [activeLang]: { ...prev[activeLang], name_color: e.target.value } }))}
                      className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                    <input type="text" value={cfg.name_color}
                      onChange={e => setConfigs(prev => ({ ...prev, [activeLang]: { ...prev[activeLang], name_color: e.target.value } }))}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-green-400" />
                  </div>
                </div>
              </div>

              <div className="pt-1 bg-gray-50 rounded-xl p-3 text-xs font-mono text-gray-500 leading-relaxed">
                nameX={cfg.name_x}  nameY={cfg.name_y}<br />
                size={cfg.name_size}  color=&quot;{cfg.name_color}&quot;
              </div>
            </div>

            {/* Save */}
            <button onClick={handleSave} disabled={saving || !cfg.image_url}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-bold text-sm py-3 rounded-xl shadow transition">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : `Save ${LANGS.find(l => l.key === activeLang)?.flag} Certificate`}
            </button>
            <p className="text-center text-xs text-gray-400">
              Upload an image first, then save. Both steps are required.
            </p>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-xl text-white text-sm font-bold z-50 ${
          toast.type === 'ok' ? 'bg-green-600' : 'bg-red-500'
        }`}>
          {toast.type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}
