'use client'
import { useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import { Mail, Download, Search, Users } from 'lucide-react'

interface Row {
  id: string
  email: string
  name: string | null
  source: string | null
  created_at: string
}

interface Props { onOpenSidebar: () => void }

export default function NewsletterManager({ onOpenSidebar }: Props) {
  const [rows, setRows]   = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await supabase
          .from('newsletter_signups')
          .select('*')
          .order('created_at', { ascending: false })
        setRows(data ?? [])
      } catch (err) {
        console.error('[NewsletterManager] load failed:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filtered = rows.filter(r =>
    r.email.toLowerCase().includes(search.toLowerCase()) ||
    (r.name ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  function exportCsv() {
    const header = 'email,name,source,signed_up_at'
    const lines  = filtered.map(r => `${r.email},${r.name ?? ''},${r.source ?? ''},${r.created_at}`)
    const blob   = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
    const url    = URL.createObjectURL(blob)
    const a      = Object.assign(document.createElement('a'), { href: url, download: 'newsletter-subscribers.csv' })
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 lg:px-8 py-5 border-b border-gray-200 bg-white">
        <button onClick={onOpenSidebar} className="lg:hidden p-1 text-gray-500">☰</button>
        <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
          <Mail className="w-5 h-5 text-green-700" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-gray-900 text-[17px]">Newsletter</h1>
          <p className="text-gray-500 text-[12px]">{rows.length} subscriber{rows.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={exportCsv}
          className="flex items-center gap-1.5 text-[12px] font-bold text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total subscribers', value: rows.length, icon: Users, color: 'bg-green-50 text-green-700' },
            { label: 'This month', value: rows.filter(r => new Date(r.created_at) > new Date(Date.now() - 30 * 86400000)).length, icon: Mail, color: 'bg-blue-50 text-blue-700' },
            { label: 'Via landing page', value: rows.filter(r => r.source === 'landing_footer' || r.source === 'landing_page').length, icon: Mail, color: 'bg-purple-50 text-purple-700' },
          ].map(s => (
            <div key={s.label} className={`${s.color} rounded-2xl p-4`}>
              <p className="text-[11px] font-bold uppercase tracking-wide opacity-70">{s.label}</p>
              <p className="text-[28px] font-black mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by email or name…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-[14px] text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/30"
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center text-gray-400 py-20 text-[14px]">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-20">
            <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-bold text-[15px]">{search ? 'No matches' : 'No subscribers yet'}</p>
            <p className="text-[13px] mt-1">{!search && 'Subscribers will appear here as people sign up.'}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-bold text-gray-500 uppercase text-[11px] tracking-wide">Email</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-500 uppercase text-[11px] tracking-wide hidden sm:table-cell">Name</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-500 uppercase text-[11px] tracking-wide hidden md:table-cell">Source</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-500 uppercase text-[11px] tracking-wide">Signed up</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                    <td className="px-4 py-3">
                      <a href={`mailto:${r.email}`} className="text-green-700 hover:underline font-mono">{r.email}</a>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{r.name ?? '—'}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="bg-gray-100 text-gray-600 text-[11px] font-bold px-2 py-0.5 rounded-full">
                        {r.source ?? 'unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
