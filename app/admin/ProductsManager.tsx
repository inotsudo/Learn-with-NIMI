'use client'

import React, { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Check, X, Eye, EyeOff, DollarSign, Repeat, Package } from 'lucide-react'
import supabase from '@/lib/supabaseClient'
import { useToast } from './Toast'

interface Product {
  id: string
  slug: string
  name: string
  description: string | null
  tier: string
  product_type: string
  price_usd: number | null
  price_eur: number | null
  price_rwf: number | null
  billing_interval: string | null
  features: string[]
  org_type: string
  is_active: boolean
  sort_order: number
}

const EMPTY: Omit<Product, 'id'> = {
  slug: '', name: '', description: '', tier: 'club', product_type: 'subscription',
  price_usd: null, price_eur: null, price_rwf: null, billing_interval: 'month',
  features: [], org_type: 'family', is_active: true, sort_order: 0,
}

const TIERS = ['discovery', 'story_pack', 'family_bundle', 'personalized', 'champion_pack', 'club', 'school', 'enterprise']
const ORG_TYPES = ['family', 'school', 'enterprise']
const PRODUCT_TYPES = ['one_time', 'subscription']

export default function ProductsManager() {
  const { error: toastErr } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Product | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<Omit<Product, 'id'>>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [featInput, setFeatInput] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await supabase.from('products').select('*').order('sort_order')
      setProducts((data ?? []) as Product[])
    } catch (err) {
      toastErr('Failed to load products.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const startEdit = (p: Product) => {
    setEditing(p)
    setCreating(false)
    setForm({ ...p })
    setFeatInput('')
  }

  const startCreate = () => {
    setEditing(null)
    setCreating(true)
    setForm({ ...EMPTY, sort_order: products.length + 1 })
    setFeatInput('')
  }

  const cancel = () => { setEditing(null); setCreating(false) }

  const save = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      if (creating) {
        const slug = form.slug || form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        const { error } = await supabase.from('products').insert({ ...form, slug })
        if (error) throw error
      } else if (editing) {
        const { slug, ...rest } = form
        const { error } = await supabase.from('products').update(rest).eq('id', editing.id)
        if (error) throw error
      }
      cancel()
      void load()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (p: Product) => {
    await supabase.from('products').update({ is_active: !p.is_active }).eq('id', p.id)
    load()
  }

  const remove = async (p: Product) => {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return
    await supabase.from('products').delete().eq('id', p.id)
    load()
  }

  const addFeature = () => {
    if (!featInput.trim()) return
    setForm(f => ({ ...f, features: [...f.features, featInput.trim()] }))
    setFeatInput('')
  }

  const removeFeature = (i: number) => {
    setForm(f => ({ ...f, features: f.features.filter((_, j) => j !== i) }))
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Loading products...</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Products & Pricing</h2>
          <p className="text-sm text-gray-500 mt-1">Manage subscription plans, one-time purchases, and school licensing tiers</p>
        </div>
        <button onClick={startCreate}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {/* Product cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {products.map(p => (
          <div key={p.id}
            className={`rounded-2xl border-2 p-5 transition ${
              p.is_active ? 'border-green-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-60'
            }`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${
                  p.product_type === 'subscription' ? 'bg-green-600' : 'bg-amber-500'
                }`}>
                  {p.product_type === 'subscription' ? <Repeat className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-[16px]">{p.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">{p.tier}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{p.org_type}</span>
                    {p.product_type === 'subscription' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-600">/{p.billing_interval}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleActive(p)} className="p-1.5 rounded-lg hover:bg-gray-100 transition"
                  title={p.is_active ? 'Deactivate' : 'Activate'}>
                  {p.is_active ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                </button>
                <button onClick={() => startEdit(p)} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
                  <Edit2 className="w-4 h-4 text-gray-500" />
                </button>
                <button onClick={() => remove(p)} className="p-1.5 rounded-lg hover:bg-red-50 transition">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>

            {/* Prices */}
            <div className="flex gap-4 mb-3">
              {p.price_usd != null && (
                <div className="flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-green-500" />
                  <span className="font-bold text-gray-900 text-[14px]">${p.price_usd}</span>
                </div>
              )}
              {p.price_rwf != null && (
                <div className="text-[13px] text-gray-500 font-bold">{Number(p.price_rwf).toLocaleString()} RWF</div>
              )}
              {p.price_eur != null && (
                <div className="text-[13px] text-gray-500 font-bold">€{p.price_eur}</div>
              )}
            </div>

            {/* Features */}
            <div className="flex flex-wrap gap-1.5">
              {(p.features as string[]).map((f, i) => (
                <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{f}</span>
              ))}
            </div>

            {p.description && <p className="text-[12px] text-gray-400 mt-2">{p.description}</p>}
          </div>
        ))}
      </div>

      {/* Edit/Create form */}
      {(editing || creating) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-ds-card border border-ds-border w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h3 className="font-bold text-xl text-gray-900 mb-4">
              {creating ? 'Create Product' : `Edit: ${editing!.name}`}
            </h3>

            <div className="space-y-4">
              {/* Name + Slug */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Slug</label>
                  <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                    disabled={!!editing}
                    className="w-full border rounded-xl px-3 py-2 text-sm disabled:bg-gray-50" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Description</label>
                <input value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>

              {/* Tier + Org Type + Product Type */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Tier</label>
                  <select value={form.tier} onChange={e => setForm(f => ({ ...f, tier: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm">
                    {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">For</label>
                  <select value={form.org_type} onChange={e => setForm(f => ({ ...f, org_type: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm">
                    {ORG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Type</label>
                  <select value={form.product_type} onChange={e => setForm(f => ({ ...f, product_type: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm">
                    {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Prices */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Price USD</label>
                  <input type="number" step="0.01" value={form.price_usd ?? ''}
                    onChange={e => setForm(f => ({ ...f, price_usd: e.target.value ? Number(e.target.value) : null }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Price RWF</label>
                  <input type="number" step="1" value={form.price_rwf ?? ''}
                    onChange={e => setForm(f => ({ ...f, price_rwf: e.target.value ? Number(e.target.value) : null }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Price EUR</label>
                  <input type="number" step="0.01" value={form.price_eur ?? ''}
                    onChange={e => setForm(f => ({ ...f, price_eur: e.target.value ? Number(e.target.value) : null }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
              </div>

              {/* Billing interval + Sort */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Billing Interval</label>
                  <select value={form.billing_interval ?? ''} onChange={e => setForm(f => ({ ...f, billing_interval: e.target.value || null }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm">
                    <option value="">None (one-time)</option>
                    <option value="month">Monthly</option>
                    <option value="year">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Sort Order</label>
                  <input type="number" value={form.sort_order}
                    onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded" />
                <span className="text-sm font-bold text-gray-700">Active (visible on pricing page)</span>
              </label>

              {/* Features */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Features</label>
                <div className="flex gap-2 mb-2">
                  <input value={featInput} onChange={e => setFeatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                    placeholder="e.g. all_stories"
                    className="flex-1 border rounded-xl px-3 py-2 text-sm" />
                  <button onClick={addFeature} className="bg-green-50 text-green-700 font-bold px-3 rounded-xl text-sm">Add</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {form.features.map((f, i) => (
                    <span key={i} className="flex items-center gap-1 text-[11px] bg-green-50 text-green-700 pl-2 pr-1 py-0.5 rounded-full">
                      {f}
                      <button onClick={() => removeFeature(i)} className="hover:bg-green-200 rounded-full p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            {saveError && (
              <p className="mt-4 text-xs font-bold text-red-500 bg-red-50 rounded-xl px-3 py-2">{saveError}</p>
            )}
            <div className="flex gap-3 mt-3">
              <button onClick={cancel} className="flex-1 py-2.5 rounded-xl border text-gray-500 font-bold text-sm">Cancel</button>
              <button onClick={save} disabled={saving || !form.name.trim()}
                className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? 'Saving...' : <><Check className="w-4 h-4" /> Save</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
