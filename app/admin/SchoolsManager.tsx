'use client'
import React, { useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import { Search, School, Menu, Mail, Globe, Users, CheckCircle2, Clock, XCircle } from 'lucide-react'

interface Props {
  onOpenSidebar?: () => void
}

interface InquiryRow {
  id: string
  name: string
  school: string
  email: string
  country: string | null
  learner_count: string | null
  message: string | null
  status: 'new' | 'contacted' | 'closed'
  created_at: string
}

const STATUS_STYLES: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  new:       { label: 'New',       className: 'bg-blue-100 text-blue-700',   icon: Clock },
  contacted: { label: 'Contacted', className: 'bg-yellow-100 text-yellow-700', icon: Mail },
  closed:    { label: 'Closed',    className: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function SchoolsManager({ onOpenSidebar }: Props) {
  const [rows, setRows] = useState<InquiryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'new' | 'contacted' | 'closed'>('all')
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await supabase.from('school_inquiries').select('*').order('created_at', { ascending: false })
        setRows((data ?? []) as InquiryRow[])
      } catch (err) {
        console.error('[SchoolsManager] load failed:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function updateStatus(id: string, status: 'new' | 'contacted' | 'closed') {
    setUpdating(id)
    try {
      await supabase.from('school_inquiries').update({ status }).eq('id', id)
      setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    } catch (err) {
      console.error('[SchoolsManager] updateStatus failed:', err)
    } finally {
      setUpdating(null)
    }
  }

  const newCount = rows.filter(r => r.status === 'new').length

  const filtered = rows.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return r.name.toLowerCase().includes(q) || r.school.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || (r.country ?? '').toLowerCase().includes(q)
  })

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-5 flex-shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={onOpenSidebar} className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-gray-500">
              <Menu size={17} />
            </button>
            <div>
              <h1 className="text-[22px] font-extrabold text-gray-900 flex items-center gap-2">
                Schools
                {newCount > 0 && (
                  <span className="bg-blue-600 text-white text-[11px] font-black px-2 py-0.5 rounded-full">{newCount} new</span>
                )}
              </h1>
              <p className="text-[13px] text-gray-500">School and classroom inquiry leads from /schools page.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              {(['all', 'new', 'contacted', 'closed'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-[12px] font-bold capitalize transition ${filter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
                  {f}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 bg-ds-input border border-ds-border rounded-xl text-[13px] font-medium text-ds-text focus:outline-none focus:ring-2 focus:ring-green-500 w-44" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <School size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-[14px] font-bold text-gray-400">{rows.length === 0 ? 'No inquiries yet. Share /schools with teachers!' : 'No inquiries match this filter.'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => {
              const s = STATUS_STYLES[r.status] ?? STATUS_STYLES.new
              const StatusIcon = s.icon
              return (
                <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                        <School size={18} className="text-green-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-[14px] text-gray-900">{r.school}</p>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${s.className}`}>
                            <StatusIcon size={10} /> {s.label}
                          </span>
                        </div>
                        <p className="text-[12px] text-gray-500 mt-0.5">{r.name}</p>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <a href={`mailto:${r.email}`} className="flex items-center gap-1 text-[12px] text-blue-600 hover:underline font-medium">
                            <Mail size={11} /> {r.email}
                          </a>
                          {r.country && (
                            <span className="flex items-center gap-1 text-[11px] text-gray-400">
                              <Globe size={11} /> {r.country}
                            </span>
                          )}
                          {r.learner_count && (
                            <span className="flex items-center gap-1 text-[11px] text-gray-400">
                              <Users size={11} /> {r.learner_count} learners
                            </span>
                          )}
                          <span className="text-[11px] text-gray-300">{fmtDate(r.created_at)}</span>
                        </div>
                        {r.message && (
                          <p className="text-[12px] text-gray-500 mt-2 bg-gray-50 rounded-lg px-3 py-2 leading-relaxed">
                            &ldquo;{r.message}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Status actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {r.status !== 'contacted' && (
                        <button onClick={() => updateStatus(r.id, 'contacted')} disabled={updating === r.id}
                          className="text-[11px] font-bold bg-yellow-100 text-yellow-700 hover:bg-yellow-200 px-3 py-1.5 rounded-lg transition disabled:opacity-60">
                          Mark Contacted
                        </button>
                      )}
                      {r.status !== 'closed' && (
                        <button onClick={() => updateStatus(r.id, 'closed')} disabled={updating === r.id}
                          className="text-[11px] font-bold bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1.5 rounded-lg transition disabled:opacity-60">
                          Close
                        </button>
                      )}
                      {r.status !== 'new' && (
                        <button onClick={() => updateStatus(r.id, 'new')} disabled={updating === r.id}
                          className="text-[11px] font-bold text-gray-400 hover:text-gray-600 px-2 py-1.5 transition">
                          Reopen
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
