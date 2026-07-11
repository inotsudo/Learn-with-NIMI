'use client'
import React, { useEffect, useState, useCallback } from 'react'
import supabase from '@/lib/supabaseClient'
import { MessageSquareQuote, Plus, Pencil, Trash2, CheckCircle, XCircle, Star, ChevronUp, ChevronDown, Menu } from 'lucide-react'

interface TestimonialsManagerProps {
  onOpenSidebar?: () => void
}

interface Testimonial {
  id: string
  name: string
  role: string
  location: string | null
  quote: string
  rating: number
  avatar_url: string | null
  approved: boolean
  sort_order: number
  created_at: string
}

const EMPTY: Omit<Testimonial, 'id' | 'created_at'> = {
  name: '', role: '', location: '', quote: '', rating: 5,
  avatar_url: '', approved: false, sort_order: 0,
}

export default function TestimonialsManager({ onOpenSidebar }: TestimonialsManagerProps) {
  const [rows, setRows] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Testimonial | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    if (!error) setRows((data ?? []) as Testimonial[])
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const openNew = () => {
    setEditing(null)
    setForm({ ...EMPTY, sort_order: rows.length })
    setError('')
  }

  const openEdit = (r: Testimonial) => {
    setEditing(r)
    setForm({ name: r.name, role: r.role, location: r.location ?? '', quote: r.quote, rating: r.rating, avatar_url: r.avatar_url ?? '', approved: r.approved, sort_order: r.sort_order })
    setError('')
  }

  const closeForm = () => { setEditing(null); setForm(EMPTY); setError('') }

  const save = async () => {
    if (!form.name.trim() || !form.role.trim() || !form.quote.trim()) {
      setError('Name, role and quote are required.')
      return
    }
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      role: form.role.trim(),
      location: form.location?.trim() || null,
      quote: form.quote.trim(),
      rating: form.rating,
      avatar_url: form.avatar_url?.trim() || null,
      approved: form.approved,
      sort_order: form.sort_order,
    }
    const { error } = editing
      ? await supabase.from('testimonials').update(payload).eq('id', editing.id)
      : await supabase.from('testimonials').insert(payload)
    setSaving(false)
    if (error) { setError(error.message); return }
    closeForm()
    void load()
  }

  const toggleApprove = async (r: Testimonial) => {
    await supabase.from('testimonials').update({ approved: !r.approved }).eq('id', r.id)
    void load()
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this testimonial?')) return
    await supabase.from('testimonials').delete().eq('id', id)
    void load()
  }

  const move = async (r: Testimonial, dir: 'up' | 'down') => {
    const idx = rows.findIndex(x => x.id === r.id)
    const swap = dir === 'up' ? rows[idx - 1] : rows[idx + 1]
    if (!swap) return
    await Promise.all([
      supabase.from('testimonials').update({ sort_order: swap.sort_order }).eq('id', r.id),
      supabase.from('testimonials').update({ sort_order: r.sort_order }).eq('id', swap.id),
    ])
    void load()
  }

  const approvedCount = rows.filter(r => r.approved).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-ds-border px-6 py-4 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          {onOpenSidebar && (
            <button onClick={onOpenSidebar} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <Menu size={18} />
            </button>
          )}
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <MessageSquareQuote className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h1 className="font-baloo font-black text-ds-text text-[18px] leading-tight">Testimonials</h1>
            <p className="text-gray-400 text-[12px]">{approvedCount} approved · {rows.length - approvedCount} pending</p>
          </div>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-[#15803d] hover:bg-green-700 text-white font-bold text-[13px] px-4 py-2 rounded-xl transition shadow-sm">
          <Plus size={15} /> Add Testimonial
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6 lg:p-8">

        {/* Form */}
        {(editing !== null || form.name !== '' || form.quote !== '') && (
          <div className="bg-white border border-ds-border rounded-2xl p-6 mb-6 shadow-sm">
            <h2 className="font-baloo font-black text-[15px] text-ds-text mb-4">
              {editing ? 'Edit Testimonial' : 'New Testimonial'}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[12px] font-bold text-gray-500 mb-1">Parent name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-ds-border rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g. Amina R." />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-gray-500 mb-1">Role *</label>
                <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full border border-ds-border rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g. Mom of a 5-year-old" />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-gray-500 mb-1">Location</label>
                <input value={form.location ?? ''} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  className="w-full border border-ds-border rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g. Kigali, Rwanda" />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-gray-500 mb-1">Rating</label>
                <select value={form.rating} onChange={e => setForm(f => ({ ...f, rating: Number(e.target.value) }))}
                  className="w-full border border-ds-border rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-green-500">
                  {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} star{n !== 1 ? 's' : ''}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[12px] font-bold text-gray-500 mb-1">Quote *</label>
                <textarea value={form.quote} onChange={e => setForm(f => ({ ...f, quote: e.target.value }))}
                  rows={3}
                  className="w-full border border-ds-border rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  placeholder="What the parent said about NIMIPIKO..." />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[12px] font-bold text-gray-500 mb-1">Photo URL <span className="text-gray-400 font-normal">(optional — Supabase storage URL)</span></label>
                <input value={form.avatar_url ?? ''} onChange={e => setForm(f => ({ ...f, avatar_url: e.target.value }))}
                  className="w-full border border-ds-border rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="https://..." />
              </div>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={form.approved}
                  onChange={e => setForm(f => ({ ...f, approved: e.target.checked }))}
                  className="w-4 h-4 rounded accent-green-600" />
                <span className="text-[13px] font-semibold text-ds-text">Approved — show on marketing page</span>
              </label>
            </div>
            {error && <p className="text-red-500 text-[12px] mb-3">{error}</p>}
            <div className="flex gap-3">
              <button onClick={save} disabled={saving}
                className="bg-[#15803d] hover:bg-green-700 disabled:opacity-50 text-white font-bold text-[13px] px-5 py-2 rounded-xl transition">
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Testimonial'}
              </button>
              <button onClick={closeForm}
                className="border border-ds-border text-gray-500 hover:bg-gray-50 font-bold text-[13px] px-5 py-2 rounded-xl transition">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <MessageSquareQuote className="w-10 h-10 text-gray-300" />
            <p className="font-baloo font-black text-gray-400 text-[16px]">No testimonials yet</p>
            <p className="text-gray-400 text-[13px] max-w-xs">Add your first testimonial above. Approved ones will appear on the marketing page automatically.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r, idx) => (
              <div key={r.id} className={`bg-white border rounded-2xl p-5 flex gap-4 items-start transition ${r.approved ? 'border-green-200' : 'border-ds-border opacity-70'}`}>
                {/* Avatar */}
                <div className="shrink-0">
                  {r.avatar_url ? (
                    <img src={r.avatar_url} alt={r.name} className="w-12 h-12 rounded-full object-cover"  loading="lazy" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-amber-400 flex items-center justify-center font-baloo font-black text-white text-[16px]">
                      {r.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="font-baloo font-black text-ds-text text-[14px]">{r.name}</span>
                    <span className="text-gray-400 text-[12px]">·</span>
                    <span className="text-gray-500 text-[12px]">{r.role}</span>
                    {r.location && <><span className="text-gray-400 text-[12px]">·</span><span className="text-gray-400 text-[11px]">{r.location}</span></>}
                    <div className="flex gap-0.5 ml-1">
                      {Array.from({length:5}).map((_,i) => (
                        <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                      ))}
                    </div>
                    {r.approved
                      ? <span className="ml-auto text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Approved</span>
                      : <span className="ml-auto text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Pending</span>
                    }
                  </div>
                  <p className="text-gray-600 text-[13px] leading-relaxed italic line-clamp-2">&ldquo;{r.quote}&rdquo;</p>
                </div>
                {/* Actions */}
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => toggleApprove(r)} title={r.approved ? 'Unapprove' : 'Approve'}
                    className={`p-1.5 rounded-lg transition ${r.approved ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}>
                    {r.approved ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  </button>
                  <button onClick={() => openEdit(r)} title="Edit" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 transition">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => remove(r.id)} title="Delete" className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition">
                    <Trash2 size={16} />
                  </button>
                  <button onClick={() => move(r, 'up')} disabled={idx === 0} title="Move up"
                    className="p-1.5 rounded-lg text-gray-300 hover:bg-gray-50 disabled:opacity-30 transition">
                    <ChevronUp size={16} />
                  </button>
                  <button onClick={() => move(r, 'down')} disabled={idx === rows.length - 1} title="Move down"
                    className="p-1.5 rounded-lg text-gray-300 hover:bg-gray-50 disabled:opacity-30 transition">
                    <ChevronDown size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
