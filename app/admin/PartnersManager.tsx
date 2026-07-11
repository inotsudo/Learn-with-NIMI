'use client'
import React, { useEffect, useState, useCallback } from 'react'
import supabase from '@/lib/supabaseClient'
import { Handshake, Plus, Pencil, Trash2, ChevronUp, ChevronDown, Menu } from 'lucide-react'

interface PartnersManagerProps { onOpenSidebar?: () => void }

interface Partner {
  id: string; name: string; logo_url: string; website_url: string | null;
  category: string; active: boolean; sort_order: number; created_at: string;
}

const CATEGORIES = ['partner', 'education', 'media', 'award']
const EMPTY: Omit<Partner, 'id' | 'created_at'> = {
  name: '', logo_url: '', website_url: '', category: 'partner', active: true, sort_order: 0,
}

export default function PartnersManager({ onOpenSidebar }: PartnersManagerProps) {
  const [rows, setRows] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partner | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('partners').select('*')
      .order('sort_order', { ascending: true }).order('created_at', { ascending: true })
    setRows((data ?? []) as Partner[])
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const openNew = () => {
    setEditing(null); setForm({ ...EMPTY, sort_order: rows.length }); setError(''); setShowForm(true)
  }
  const openEdit = (r: Partner) => {
    setEditing(r)
    setForm({ name: r.name, logo_url: r.logo_url, website_url: r.website_url ?? '', category: r.category, active: r.active, sort_order: r.sort_order })
    setError(''); setShowForm(true)
  }
  const closeForm = () => { setEditing(null); setForm(EMPTY); setError(''); setShowForm(false) }

  const save = async () => {
    if (!form.name.trim() || !form.logo_url.trim()) { setError('Name and logo URL are required.'); return }
    setSaving(true)
    const payload = {
      name: form.name.trim(), logo_url: form.logo_url.trim(),
      website_url: form.website_url?.trim() || null,
      category: form.category, active: form.active, sort_order: form.sort_order,
    }
    const { error } = editing
      ? await supabase.from('partners').update(payload).eq('id', editing.id)
      : await supabase.from('partners').insert(payload)
    setSaving(false)
    if (error) { setError(error.message); return }
    closeForm(); void load()
  }

  const toggleActive = async (r: Partner) => {
    await supabase.from('partners').update({ active: !r.active }).eq('id', r.id); void load()
  }
  const remove = async (id: string) => {
    if (!confirm('Delete this partner?')) return
    await supabase.from('partners').delete().eq('id', id); void load()
  }
  const move = async (r: Partner, dir: 'up' | 'down') => {
    const idx = rows.findIndex(x => x.id === r.id)
    const swap = dir === 'up' ? rows[idx - 1] : rows[idx + 1]
    if (!swap) return
    await Promise.all([
      supabase.from('partners').update({ sort_order: swap.sort_order }).eq('id', r.id),
      supabase.from('partners').update({ sort_order: r.sort_order }).eq('id', swap.id),
    ]); void load()
  }

  const categoryLabel: Record<string, string> = {
    partner: 'Partner', education: 'Education', media: 'Media', award: 'Award',
  }
  const categoryColor: Record<string, string> = {
    partner: 'bg-blue-100 text-blue-700', education: 'bg-green-100 text-green-700',
    media: 'bg-purple-100 text-purple-700', award: 'bg-amber-100 text-amber-700',
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-ds-border px-6 py-4 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          {onOpenSidebar && (
            <button onClick={onOpenSidebar} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500"><Menu size={18} /></button>
          )}
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Handshake className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h1 className="font-baloo font-black text-ds-text text-[18px] leading-tight">Partners & Endorsers</h1>
            <p className="text-gray-400 text-[12px]">{rows.filter(r => r.active).length} active · shown on marketing page</p>
          </div>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-[#15803d] hover:bg-green-700 text-white font-bold text-[13px] px-4 py-2 rounded-xl transition shadow-sm">
          <Plus size={15} /> Add Partner
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6 lg:p-8">
        {showForm && (
          <div className="bg-white border border-ds-border rounded-2xl p-6 mb-6 shadow-sm">
            <h2 className="font-baloo font-black text-[15px] text-ds-text mb-4">{editing ? 'Edit Partner' : 'New Partner'}</h2>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[12px] font-bold text-gray-500 mb-1">Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-ds-border rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g. Rwanda Education Board" />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-gray-500 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-ds-border rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-green-500">
                  {CATEGORIES.map(c => <option key={c} value={c}>{categoryLabel[c]}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[12px] font-bold text-gray-500 mb-1">Logo URL * <span className="text-gray-400 font-normal">(Supabase storage or /public path)</span></label>
                <input value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
                  className="w-full border border-ds-border rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="/mtn-logo.png or https://..." />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[12px] font-bold text-gray-500 mb-1">Website URL <span className="text-gray-400 font-normal">(optional)</span></label>
                <input value={form.website_url ?? ''} onChange={e => setForm(f => ({ ...f, website_url: e.target.value }))}
                  className="w-full border border-ds-border rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="https://..." />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer mb-4">
              <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                className="w-4 h-4 rounded accent-green-600" />
              <span className="text-[13px] font-semibold text-ds-text">Active — show on marketing page</span>
            </label>
            {error && <p className="text-red-500 text-[12px] mb-3">{error}</p>}
            <div className="flex gap-3">
              <button onClick={save} disabled={saving}
                className="bg-[#15803d] hover:bg-green-700 disabled:opacity-50 text-white font-bold text-[13px] px-5 py-2 rounded-xl transition">
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Partner'}
              </button>
              <button onClick={closeForm}
                className="border border-ds-border text-gray-500 hover:bg-gray-50 font-bold text-[13px] px-5 py-2 rounded-xl transition">
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <Handshake className="w-10 h-10 text-gray-300" />
            <p className="font-baloo font-black text-gray-400 text-[16px]">No partners yet</p>
            <p className="text-gray-400 text-[13px] max-w-xs">Add school logos, media badges or partner brands. Active ones appear on the marketing page.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r, idx) => (
              <div key={r.id} className={`bg-white border rounded-2xl p-4 flex items-center gap-4 transition ${r.active ? 'border-green-200' : 'border-ds-border opacity-60'}`}>
                <img src={r.logo_url} alt={r.name} className="w-14 h-10 object-contain rounded-lg bg-gray-50 p-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-baloo font-black text-ds-text text-[14px]">{r.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${categoryColor[r.category] ?? 'bg-gray-100 text-gray-600'}`}>
                      {categoryLabel[r.category] ?? r.category}
                    </span>
                    {r.active
                      ? <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Active</span>
                      : <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Hidden</span>}
                  </div>
                  {r.website_url && <p className="text-gray-400 text-[11px] truncate">{r.website_url}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleActive(r)} title={r.active ? 'Hide' : 'Show'}
                    className={`p-1.5 rounded-lg text-[11px] font-bold transition ${r.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}>
                    {r.active ? '●' : '○'}
                  </button>
                  <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 transition"><Pencil size={15} /></button>
                  <button onClick={() => remove(r.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition"><Trash2 size={15} /></button>
                  <button onClick={() => move(r, 'up')} disabled={idx === 0} className="p-1.5 rounded-lg text-gray-300 hover:bg-gray-50 disabled:opacity-30 transition"><ChevronUp size={15} /></button>
                  <button onClick={() => move(r, 'down')} disabled={idx === rows.length - 1} className="p-1.5 rounded-lg text-gray-300 hover:bg-gray-50 disabled:opacity-30 transition"><ChevronDown size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
