'use client'
import React, { useCallback, useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import { Tag, Plus, X, CheckCircle, AlertCircle, Copy, ChevronLeft } from 'lucide-react'
import { useToast } from './Toast'

interface DiscountCode {
  id: string
  code: string
  description: string | null
  discount_type: 'percent' | 'fixed'
  discount_value: number
  applies_to: 'all' | 'club' | 'annual'
  max_uses: number | null
  uses_count: number
  valid_from: string
  valid_until: string | null
  is_active: boolean
  created_at: string
}

const EMPTY: Omit<DiscountCode, 'id' | 'uses_count' | 'created_at'> = {
  code: '',
  description: '',
  discount_type: 'percent',
  discount_value: 10,
  applies_to: 'all',
  max_uses: null,
  valid_from: new Date().toISOString().slice(0, 10),
  valid_until: null,
  is_active: true,
}

export default function DiscountCodesManager({ onOpenSidebar }: { onOpenSidebar?: () => void }) {
  const { error: toastErr } = useToast()
  const [codes, setCodes] = useState<DiscountCode[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [search, setSearch] = useState('')

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('discount_codes')
        .select('*')
        .order('created_at', { ascending: false })
      setCodes(data ?? [])
    } catch (err) {
      toastErr('Failed to load discount codes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    setForm(f => ({ ...f, code }))
  }

  const handleSave = async () => {
    if (!form.code.trim()) { showToast('Code is required', false); return }
    if (!form.discount_value || form.discount_value <= 0) { showToast('Discount value must be > 0', false); return }
    if (form.discount_type === 'percent' && form.discount_value > 100) { showToast('Percent cannot exceed 100', false); return }
    setSaving(true)
    const { error } = await supabase.from('discount_codes').insert({
      code: form.code.toUpperCase().trim(),
      description: form.description || null,
      discount_type: form.discount_type,
      discount_value: form.discount_value,
      applies_to: form.applies_to,
      max_uses: form.max_uses,
      valid_from: form.valid_from,
      valid_until: form.valid_until || null,
      is_active: form.is_active,
    })
    setSaving(false)
    if (error) { showToast(error.message, false); return }
    showToast('Code created successfully')
    setShowForm(false)
    setForm({ ...EMPTY })
    void load()
  }

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from('discount_codes').update({ is_active: !current }).eq('id', id)
    if (error) { showToast(error.message, false); return }
    setCodes(cs => cs.map(c => c.id === id ? { ...c, is_active: !current } : c))
  }

  const deleteCode = async (id: string) => {
    if (!confirm('Delete this discount code? This cannot be undone.')) return
    const { error } = await supabase.from('discount_codes').delete().eq('id', id)
    if (error) { showToast(error.message, false); return }
    setCodes(cs => cs.filter(c => c.id !== id))
    showToast('Code deleted')
  }

  const filtered = codes.filter(c =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    (c.description ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const now = new Date()
  const isExpired = (c: DiscountCode) => c.valid_until ? new Date(c.valid_until) < now : false
  const isExhausted = (c: DiscountCode) => c.max_uses !== null && c.uses_count >= c.max_uses

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-ds-border px-6 py-4 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          {onOpenSidebar && (
            <button onClick={onOpenSidebar} className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition">
              <ChevronLeft size={18} />
            </button>
          )}
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-ds-text text-lg leading-tight">Discount Codes</h1>
            <p className="text-gray-400 text-xs">{codes.length} code{codes.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text" placeholder="Search codes..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="hidden sm:block border border-ds-border bg-ds-input rounded-lg px-3 py-2 text-sm text-ds-text focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] w-48 transition placeholder:text-gray-400"
          />
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition shadow-sm">
            <Plus className="w-4 h-4" /> New Code
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {loading ? (
          <div className="text-center text-gray-400 py-16 text-sm font-semibold">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Tag className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-semibold text-sm">No discount codes yet</p>
            <button onClick={() => setShowForm(true)}
              className="mt-4 px-5 py-2.5 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 transition">
              Create your first code
            </button>
          </div>
        ) : (
          filtered.map(c => {
            const expired = isExpired(c)
            const exhausted = isExhausted(c)
            const effective = c.is_active && !expired && !exhausted
            return (
              <div key={c.id} className="bg-white border border-ds-border rounded-2xl p-4 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${effective ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  <Tag className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="font-black text-ds-text text-[15px]">{c.code}</code>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${effective ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {expired ? 'EXPIRED' : exhausted ? 'EXHAUSTED' : c.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
                      {c.discount_type === 'percent' ? `${c.discount_value}% off` : `$${c.discount_value} off`}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                      {c.applies_to === 'all' ? 'All plans' : c.applies_to === 'club' ? 'Club only' : 'Annual only'}
                    </span>
                  </div>
                  {c.description && <p className="text-gray-500 text-[12px] mt-0.5">{c.description}</p>}
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400 font-medium flex-wrap">
                    <span>{c.uses_count} use{c.uses_count !== 1 ? 's' : ''}{c.max_uses ? ` / ${c.max_uses} max` : ' (unlimited)'}</span>
                    {c.valid_until && <span>· Expires {new Date(c.valid_until).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => { navigator.clipboard.writeText(c.code); showToast('Copied!') }}
                    title="Copy code" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition">
                    <Copy size={14} />
                  </button>
                  <button onClick={() => toggleActive(c.id, c.is_active)}
                    title={c.is_active ? 'Deactivate' : 'Activate'}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition">
                    {c.is_active ? <CheckCircle size={14} className="text-green-500" /> : <AlertCircle size={14} />}
                  </button>
                  <button onClick={() => deleteCode(c.id)}
                    title="Delete" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition">
                    <X size={14} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Create modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-ds-border shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-ds-text text-lg">New Discount Code</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={16} />
              </button>
            </div>

            {/* Code */}
            <div>
              <label className="text-[11px] font-bold text-gray-500 mb-1 block">Code *</label>
              <div className="flex gap-2">
                <input
                  type="text" value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="SUMMER20"
                  className="flex-1 border border-ds-border bg-ds-input rounded-lg px-3 py-2.5 text-ds-text text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] font-mono font-bold"
                />
                <button onClick={generateCode}
                  className="px-3 py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs transition">
                  Random
                </button>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-[11px] font-bold text-gray-500 mb-1 block">Description</label>
              <input
                type="text" value={form.description ?? ''}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Summer 2026 promotion"
                className="w-full border border-ds-border bg-ds-input rounded-lg px-3 py-2.5 text-ds-text text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)]"
              />
            </div>

            {/* Discount type + value */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-500 mb-1 block">Type *</label>
                <select value={form.discount_type}
                  onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as 'percent' | 'fixed' }))}
                  className="w-full border border-ds-border bg-ds-input rounded-lg px-3 py-2.5 text-ds-text text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)]">
                  <option value="percent">Percent (%)</option>
                  <option value="fixed">Fixed ($)</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 mb-1 block">
                  Value {form.discount_type === 'percent' ? '(%)' : '(USD)'} *
                </label>
                <input
                  type="number" min={0} max={form.discount_type === 'percent' ? 100 : undefined}
                  step={form.discount_type === 'percent' ? 1 : 0.01}
                  value={form.discount_value}
                  onChange={e => setForm(f => ({ ...f, discount_value: parseFloat(e.target.value) || 0 }))}
                  className="w-full border border-ds-border bg-ds-input rounded-lg px-3 py-2.5 text-ds-text text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)]"
                />
              </div>
            </div>

            {/* Applies to */}
            <div>
              <label className="text-[11px] font-bold text-gray-500 mb-1 block">Applies to</label>
              <select value={form.applies_to}
                onChange={e => setForm(f => ({ ...f, applies_to: e.target.value as 'all' | 'club' | 'annual' }))}
                className="w-full border border-ds-border bg-ds-input rounded-lg px-3 py-2.5 text-ds-text text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)]">
                <option value="all">All plans</option>
                <option value="club">Club (monthly) only</option>
                <option value="annual">Annual only</option>
              </select>
            </div>

            {/* Max uses */}
            <div>
              <label className="text-[11px] font-bold text-gray-500 mb-1 block">Max uses (blank = unlimited)</label>
              <input
                type="number" min={1} value={form.max_uses ?? ''}
                onChange={e => setForm(f => ({ ...f, max_uses: e.target.value ? parseInt(e.target.value) : null }))}
                placeholder="Unlimited"
                className="w-full border border-ds-border bg-ds-input rounded-lg px-3 py-2.5 text-ds-text text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)]"
              />
            </div>

            {/* Validity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-500 mb-1 block">Valid from *</label>
                <input
                  type="date" value={form.valid_from}
                  onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))}
                  className="w-full border border-ds-border bg-ds-input rounded-lg px-3 py-2.5 text-ds-text text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)]"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 mb-1 block">Valid until</label>
                <input
                  type="date" value={form.valid_until ?? ''}
                  onChange={e => setForm(f => ({ ...f, valid_until: e.target.value || null }))}
                  className="w-full border border-ds-border bg-ds-input rounded-lg px-3 py-2.5 text-ds-text text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)]"
                />
              </div>
            </div>

            {/* Active toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`w-10 h-6 rounded-full transition-colors ${form.is_active ? 'bg-green-500' : 'bg-gray-200'}`}
                onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mt-0.5 ${form.is_active ? 'translate-x-4.5 ml-0.5' : 'translate-x-0.5 ml-0.5'}`} />
              </div>
              <span className="text-sm font-bold text-ds-text">Active immediately</span>
            </label>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-xl border border-ds-border text-gray-500 font-bold text-sm hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition shadow-sm disabled:opacity-60">
                {saving ? 'Creating...' : 'Create Code'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-bold ${toast.ok ? 'bg-green-600' : 'bg-red-500'}`}>
          {toast.ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}
