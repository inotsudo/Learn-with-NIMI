'use client'

import React, { useEffect, useState } from 'react'
import { Crown, Check, Eye, Download, RefreshCw, Upload, Award } from 'lucide-react'
import supabase from '@/lib/supabaseClient'

interface Story { id: string; title: string; slug: string; theme_emoji: string | null; is_personalizable: boolean; personalization_config: any; certificate_config: any }
interface MasterpieceOrder { id: string; child_name: string; child_photo_url: string | null; status: string; pdf_url: string | null; created_at: string; stories: { title: string } }

export default function MasterpieceManager() {
  const [stories, setStories] = useState<Story[]>([])
  const [orders, setOrders] = useState<MasterpieceOrder[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const [{ data: s }, { data: o }] = await Promise.all([
      supabase.from('stories').select('id, title, slug, theme_emoji, is_personalizable, personalization_config, certificate_config').order('sort_order'),
      supabase.from('masterpiece_orders').select('*, stories(title)').order('created_at', { ascending: false }).limit(50),
    ])
    setStories((s ?? []) as Story[])
    setOrders((o ?? []) as MasterpieceOrder[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const togglePersonalizable = async (story: Story) => {
    await supabase.from('stories').update({ is_personalizable: !story.is_personalizable }).eq('id', story.id)
    load()
  }

  const updateConfig = async (storyId: string, config: any) => {
    await supabase.from('stories').update({ personalization_config: config }).eq('id', storyId)
    load()
  }

  const retryGenerate = async (orderId: string) => {
    await fetch('/api/masterpiece/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ masterpieceId: orderId }),
    })
    load()
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Crown className="w-6 h-6 text-yellow-500" /> Masterpiece Manager
        </h2>
        <p className="text-sm text-gray-500 mt-1">Configure which stories can be personalized and manage orders</p>
      </div>

      {/* Stories — toggle personalizable */}
      <div>
        <h3 className="font-bold text-gray-700 text-[16px] mb-3">Personalizable Stories</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {stories.map(story => (
            <div key={story.id}
              className={`rounded-xl border-2 p-4 transition ${
                story.is_personalizable ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-white'
              }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{story.theme_emoji || '📖'}</span>
                <button onClick={() => togglePersonalizable(story)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                    story.is_personalizable ? 'bg-yellow-400 text-white' : 'bg-gray-200 text-gray-400'
                  }`}>
                  <Check className="w-4 h-4" />
                </button>
              </div>
              <p className="font-bold text-gray-900 text-[14px]">{story.title}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {story.is_personalizable ? '✅ Personalizable' : 'Not personalizable'}
              </p>

              {story.is_personalizable && (
                <div className="mt-3 space-y-2 border-t pt-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500">Photo X</label>
                      <input type="number" defaultValue={story.personalization_config?.photoX ?? 50}
                        onBlur={e => updateConfig(story.id, { ...story.personalization_config, photoX: Number(e.target.value) })}
                        className="w-full border rounded-lg px-2 py-1 text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500">Photo Y</label>
                      <input type="number" defaultValue={story.personalization_config?.photoY ?? 50}
                        onBlur={e => updateConfig(story.id, { ...story.personalization_config, photoY: Number(e.target.value) })}
                        className="w-full border rounded-lg px-2 py-1 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500">Photo Size</label>
                      <input type="number" defaultValue={story.personalization_config?.photoSize ?? 150}
                        onBlur={e => updateConfig(story.id, { ...story.personalization_config, photoSize: Number(e.target.value) })}
                        className="w-full border rounded-lg px-2 py-1 text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500">Photo Pages</label>
                      <input type="text" defaultValue={(story.personalization_config?.photoPages ?? []).join(',')}
                        placeholder="1,3,5"
                        onBlur={e => updateConfig(story.id, {
                          ...story.personalization_config,
                          photoPages: e.target.value.split(',').map(Number).filter(n => !isNaN(n)),
                        })}
                        className="w-full border rounded-lg px-2 py-1 text-sm" />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={story.personalization_config?.photoOnAllPages ?? false}
                      onChange={e => updateConfig(story.id, { ...story.personalization_config, photoOnAllPages: e.target.checked })}
                      className="w-3.5 h-3.5 rounded" />
                    <span className="text-[11px] text-gray-600 font-bold">Photo on all pages</span>
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ Certificate Templates ═══ */}
      <div>
        <h3 className="font-bold text-gray-700 text-[16px] mb-3 flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-500" /> Certificate Templates
        </h3>
        <p className="text-sm text-gray-500 mb-4">Upload designed certificate images per story. The child&apos;s name will be overlaid at the configured position.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {stories.map(story => {
            const certConfig = (story.certificate_config || {}) as Record<string, any>;
            return (
              <div key={`cert-${story.id}`} className="rounded-xl border p-4 bg-white">
                <p className="font-bold text-gray-900 text-[14px] mb-2">{story.theme_emoji} {story.title}</p>

                {['en', 'fr', 'rw'].map(lang => {
                  const lc = certConfig[lang];
                  return (
                    <div key={lang} className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-bold text-gray-500 w-6 uppercase">{lang}</span>
                      {lc?.image_url ? (
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-green-500 text-[11px] font-bold">✅ Uploaded</span>
                          <button onClick={async () => {
                            const updated = { ...certConfig };
                            delete updated[lang];
                            await supabase.from('stories').update({ certificate_config: updated }).eq('id', story.id);
                            load();
                          }} className="text-red-400 text-[10px] hover:underline">Remove</button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-green-700 font-bold hover:underline">
                          <Upload className="w-3 h-3" /> Upload
                          <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const path = `certificates/${story.slug}_${lang}.${file.name.split('.').pop()}`;
                            await supabase.storage.from('story-assets').upload(path, file, { upsert: true });
                            const updated = {
                              ...certConfig,
                              [lang]: {
                                image_url: `story-assets/${path}`,
                                nameX: 420, nameY: 100, nameSize: 48, nameColor: '#1a1a5e',
                              },
                            };
                            await supabase.from('stories').update({ certificate_config: updated }).eq('id', story.id);
                            load();
                          }} />
                        </label>
                      )}
                    </div>
                  );
                })}

                {/* Name position config — only show if any template is uploaded */}
                {Object.keys(certConfig).length > 0 && (
                  <div className="mt-2 pt-2 border-t grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-gray-400">Name X</label>
                      <input type="number" defaultValue={certConfig[Object.keys(certConfig)[0]]?.nameX ?? 420}
                        onBlur={e => {
                          const updated = { ...certConfig };
                          for (const l of Object.keys(updated)) updated[l].nameX = Number(e.target.value);
                          supabase.from('stories').update({ certificate_config: updated }).eq('id', story.id);
                        }}
                        className="w-full border rounded-lg px-2 py-1 text-sm" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-gray-400">Name Y</label>
                      <input type="number" defaultValue={certConfig[Object.keys(certConfig)[0]]?.nameY ?? 100}
                        onBlur={e => {
                          const updated = { ...certConfig };
                          for (const l of Object.keys(updated)) updated[l].nameY = Number(e.target.value);
                          supabase.from('stories').update({ certificate_config: updated }).eq('id', story.id);
                        }}
                        className="w-full border rounded-lg px-2 py-1 text-sm" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-gray-400">Name Size</label>
                      <input type="number" defaultValue={certConfig[Object.keys(certConfig)[0]]?.nameSize ?? 48}
                        onBlur={e => {
                          const updated = { ...certConfig };
                          for (const l of Object.keys(updated)) updated[l].nameSize = Number(e.target.value);
                          supabase.from('stories').update({ certificate_config: updated }).eq('id', story.id);
                        }}
                        className="w-full border rounded-lg px-2 py-1 text-sm" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-gray-400">Name Color</label>
                      <input type="color" defaultValue={certConfig[Object.keys(certConfig)[0]]?.nameColor ?? '#1a1a5e'}
                        onChange={e => {
                          const updated = { ...certConfig };
                          for (const l of Object.keys(updated)) updated[l].nameColor = e.target.value;
                          supabase.from('stories').update({ certificate_config: updated }).eq('id', story.id);
                        }}
                        className="w-full h-8 rounded-lg cursor-pointer" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Orders */}
      <div>
        <h3 className="font-bold text-gray-700 text-[16px] mb-3">Recent Orders ({orders.length})</h3>
        {orders.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">No masterpiece orders yet</p>
        ) : (
          <div className="space-y-2">
            {orders.map(order => (
              <div key={order.id} className="bg-white rounded-xl border p-4 flex items-center gap-4">
                {order.child_photo_url ? (
                  <img src={order.child_photo_url} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-yellow-400"  loading="lazy" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl">👤</div>
                )}
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-[14px]">{order.child_name}</p>
                  <p className="text-[11px] text-gray-500">
                    {(order.stories as any)?.title} · {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${
                  order.status === 'completed' ? 'bg-green-100 text-green-600'
                    : order.status === 'processing' ? 'bg-yellow-100 text-yellow-600'
                    : order.status === 'failed' ? 'bg-red-100 text-red-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {order.status}
                </span>
                {order.status === 'failed' && (
                  <button onClick={() => retryGenerate(order.id)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition" title="Retry">
                    <RefreshCw className="w-4 h-4 text-gray-500" />
                  </button>
                )}
                {order.status === 'completed' && order.pdf_url && (
                  <button onClick={async () => {
                    const res = await fetch(`/api/masterpiece/download?id=${order.id}`);
                    const data = await res.json();
                    if (data.downloadUrl) window.open(data.downloadUrl, '_blank');
                  }} className="p-2 rounded-lg hover:bg-gray-100 transition" title="Download">
                    <Download className="w-4 h-4 text-green-500" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
