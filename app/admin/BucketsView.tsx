'use client'
import React, { useEffect, useState } from 'react'
import supabase from "@/lib/supabaseClient";

interface FileEntry {
  name: string
  updated_at?: string
  size?: number
}

export default function BucketsView() {
  const buckets = [
    'missions-videos', 'missions-audios', 'mission-media', 'avatars',
    'creations', 'storybook', 'trip-media', 'coloriage', 'book-covers'
  ]

  const [currentBucket, setCurrentBucket] = useState<string>(buckets[0])
  const [files, setFiles] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(false)

  const fetchFiles = async (bucket: string) => {
    setLoading(true)
    const { data, error } = await supabase.storage.from(bucket).list('', { limit: 100, offset: 0 })
    if (error) {
      console.error('Error fetching files:', error)
      setFiles([])
    } else {
      setFiles(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchFiles(currentBucket)
  }, [currentBucket])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !currentBucket) return
    const file = e.target.files[0]
    const { error } = await supabase.storage.from(currentBucket).upload(file.name, file, { upsert: true })
    if (error) console.error('Upload error:', error)
    else fetchFiles(currentBucket)
  }

  const handleDelete = async (fileName: string) => {
    const { error } = await supabase.storage.from(currentBucket).remove([fileName])
    if (error) console.error('Delete error:', error)
    else fetchFiles(currentBucket)
  }

  return (
    <div className="flex-1 p-4 overflow-auto">
      <h2 className="text-xl font-bold mb-4">Buckets</h2>

      <div className="mb-4">
        <label className="mr-2">Select Bucket:</label>
        <select
          value={currentBucket}
          onChange={e => setCurrentBucket(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          {buckets.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      <div className="mb-4">
        <input type="file" onChange={handleUpload} />
      </div>

      {loading ? (
        <div>Loading files...</div>
      ) : (
        <table className="w-full border border-gray-300">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 border">File Name</th>
              <th className="p-2 border">Size</th>
              <th className="p-2 border">Last Modified</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.length === 0 && (
              <tr>
                <td className="p-2 border text-center" colSpan={4}>
                  No files in this bucket
                </td>
              </tr>
            )}
            {files.map(f => (
              <tr key={f.name}>
                <td className="p-2 border">{f.name}</td>
                <td className="p-2 border">{f.size ?? '-'}</td>
                <td className="p-2 border">{f.updated_at ?? '-'}</td>
                <td className="p-2 border flex gap-2">
                  <a
                    href={supabase.storage.from(currentBucket).getPublicUrl(f.name).data.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500"
                  >
                    View
                  </a>
                  <button
                    onClick={() => handleDelete(f.name)}
                    className="px-2 py-1 bg-red-500 text-white rounded"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
