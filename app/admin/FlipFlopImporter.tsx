'use client'
import React, { useState, useRef } from 'react'
import supabase from '@/lib/supabaseClient'
import { smartUpload } from '@/lib/uploadWithProgress'
import { Upload, CheckCircle2, AlertCircle, FileArchive, Image as ImageIcon, Music, X } from 'lucide-react'

interface Props {
  storyId: string
  storyTitle: string
  language: string
  onDone: () => void
  onClose: () => void
}

interface DetectedFile {
  name: string
  type: 'image' | 'audio'
  pageNum: number
  file: File
}

function extractPageNum(name: string): number {
  const match = name.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

export default function FlipFlopImporter({ storyId, storyTitle, language, onDone, onClose }: Props) {
  const [files, setFiles] = useState<DetectedFile[]>([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentFile, setCurrentFile] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (fileList: FileList) => {
    const detected: DetectedFile[] = []
    for (const f of Array.from(fileList)) {
      const lower = f.name.toLowerCase()
      const pageNum = extractPageNum(f.name)
      if (lower.match(/\.(jpg|jpeg|png|webp|gif)$/)) {
        detected.push({ name: f.name, type: 'image', pageNum, file: f })
      } else if (lower.match(/\.(mp3|wav|ogg|m4a|aac)$/)) {
        detected.push({ name: f.name, type: 'audio', pageNum, file: f })
      }
    }
    detected.sort((a, b) => a.pageNum - b.pageNum || a.type.localeCompare(b.type))
    setFiles(detected)
    setError(null)
  }

  const handleImport = async () => {
    const images = files.filter(f => f.type === 'image').sort((a, b) => a.pageNum - b.pageNum)
    const audios = files.filter(f => f.type === 'audio')

    if (images.length === 0) { setError('No page images found.'); return }

    setImporting(true)
    setProgress(0)
    const total = images.length
    let completed = 0
    const BATCH_SIZE = 4

    const importOnePage = async (img: DetectedFile, pageNum: number) => {
      setCurrentFile(img.name)

      // Upload image + audio in parallel
      const imgPath = `pages/${storyId}/${language}/page-${String(pageNum).padStart(3, '0')}-${Date.now()}.${img.file.name.split('.').pop()}`
      const matchAudio = audios.find(a => a.pageNum === img.pageNum)
      const audioPath = matchAudio ? `pages/${storyId}/${language}/audio-${String(pageNum).padStart(3, '0')}-${Date.now()}.${matchAudio.file.name.split('.').pop()}` : null

      const uploads = [smartUpload('storyBook', imgPath, img.file)]
      if (matchAudio && audioPath) uploads.push(smartUpload('storyBook', audioPath, matchAudio.file))

      const results = await Promise.all(uploads)
      const imgResult = results[0]
      const audioResult = results[1]

      if (imgResult.error) throw new Error(`Failed to upload: ${img.name}`)

      const { data: page, error: pageErr } = await supabase
        .from('story_pages')
        .insert({ story_id: storyId, page_number: pageNum, image_url: imgResult.storagePath })
        .select().single()
      if (pageErr) throw new Error(`Failed to create page ${pageNum}`)

      await supabase.from('story_page_versions').insert({
        story_page_id: page.id,
        language,
        text: '',
        audio_url: (audioResult && !audioResult.error) ? audioResult.storagePath : null,
        published: true,
      })

      completed++
      setProgress(Math.round((completed / total) * 100))
    }

    try {
      // Process in parallel batches
      for (let i = 0; i < images.length; i += BATCH_SIZE) {
        const batch = images.slice(i, i + BATCH_SIZE)
        await Promise.all(batch.map((img, j) => importOnePage(img, i + j + 1)))
      }

      setDone(true)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.')
    } finally {
      setImporting(false)
    }
  }

  const images = files.filter(f => f.type === 'image')
  const audios = files.filter(f => f.type === 'audio')
  const matched = images.filter(img => audios.some(a => a.pageNum === img.pageNum)).length

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-lg w-full max-h-[85vh] overflow-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
            <div>
              <h2 className="text-[16px] font-extrabold text-gray-800">FlipFlop Bulk Import</h2>
              <p className="text-[12px] text-gray-400">{storyTitle} · {language.toUpperCase()}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500">
              <X size={16} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {done ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <p className="text-[16px] font-extrabold text-gray-800">Import Complete!</p>
                <p className="text-[13px] text-gray-500 mt-1">{images.length} pages imported with {matched} audio files.</p>
                <button onClick={onClose} className="mt-4 bg-indigo-600 text-white font-bold text-[13px] rounded-xl px-6 py-2.5">
                  Done
                </button>
              </div>
            ) : (
              <>
                {/* Instructions */}
                <div className="bg-indigo-50 rounded-xl p-4 text-[12px] text-indigo-700">
                  <p className="font-bold mb-1">How to import:</p>
                  <p>Select all page images and audio files at once. Name files with numbers (001.jpg, 002.jpg, etc.) so pages and audio match automatically.</p>
                </div>

                {/* File picker */}
                <button onClick={() => inputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-200 rounded-xl py-8 text-center hover:border-indigo-300 hover:bg-indigo-50/30 transition">
                  <Upload size={28} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-[13px] font-bold text-gray-600">Select Files</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Images (jpg, png) + Audio (mp3, wav)</p>
                </button>
                <input ref={inputRef} type="file" multiple accept="image/*,audio/*" className="hidden"
                  onChange={e => { if (e.target.files) handleFiles(e.target.files) }} />

                {/* Detection results */}
                {files.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <p className="text-[12px] font-bold text-gray-700">Detected:</p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <ImageIcon size={14} className="text-indigo-500" />
                        <span className="text-[12px] font-medium text-gray-600">{images.length} pages</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Music size={14} className="text-pink-500" />
                        <span className="text-[12px] font-medium text-gray-600">{audios.length} audio</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        <span className="text-[12px] font-medium text-gray-600">{matched} matched</span>
                      </div>
                    </div>
                    {audios.length > 0 && matched < images.length && (
                      <p className="text-[11px] text-amber-600 flex items-center gap-1">
                        <AlertCircle size={12} /> {images.length - matched} pages missing audio match
                      </p>
                    )}
                  </div>
                )}

                {/* Progress */}
                {importing && (
                  <div>
                    <div className="flex items-center justify-between text-[12px] font-medium text-gray-500 mb-1">
                      <span>Uploading: {currentFile || '...'}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Large files may take a moment. Please wait.</p>
                  </div>
                )}

                {error && (
                  <p className="text-[12px] text-red-600 flex items-center gap-1">
                    <AlertCircle size={14} /> {error}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 font-bold text-[13px] rounded-xl py-2.5 hover:bg-gray-50 transition">
                    Cancel
                  </button>
                  <button onClick={handleImport} disabled={images.length === 0 || importing}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[13px] rounded-xl py-2.5 transition disabled:opacity-50">
                    {importing ? 'Importing...' : `Import ${images.length} Pages`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
