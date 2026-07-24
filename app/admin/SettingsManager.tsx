'use client'
import React, { useCallback, useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import { Menu, Save, Loader2, RefreshCw } from 'lucide-react'
import { useToast } from './Toast'
import { logAdminAction } from '@/lib/adminAuditLog'

interface Props {
  initialSettingsChildId?: string
  onNavigate: (table: string) => void
  onOpenSidebar?: () => void
}

type SettingsTab = 'general' | 'story' | 'notifications' | 'security' | 'audit'

interface AuditRow {
  id: string
  created_at: string
  admin_email: string
  action: string
  entity_type: string
  entity_label: string | null
  metadata: Record<string, unknown> | null
}

type Config = Record<string, string | boolean>

// Defined outside component so React doesn't see a new type each render
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)}
      className={`w-11 h-6 rounded-full flex items-center px-0.5 transition ${on ? 'bg-emerald-500' : 'bg-gray-200'}`}>
      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
    </button>
  )
}

const DEFAULTS: Config = {
  platformName: 'NimiPiko',
  tagline: 'Stories. Adventures. Values for Life.',
  adminEmail: '',
  supportEmail: '',
  missionsPerStory: '6',
  starsPerMission: '10',
  autoUnlock: true,
  introRequired: false,
  pushNotifications: true,
  dailyReminders: true,
  achievementAlerts: true,
  communityUpdates: false,
  parentGate: true,
  contentModeration: true,
  dataEncryption: true,
}

export default function SettingsManager({ onOpenSidebar }: Props) {
  const [tab, setTab] = useState<SettingsTab>('general')
  const [settings, setSettings] = useState<Config>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [auditRows, setAuditRows] = useState<AuditRow[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditPage, setAuditPage] = useState(0)
  const [auditHasMore, setAuditHasMore] = useState(false)
  const AUDIT_PAGE_SIZE = 25
  const { success: toastOk, error: toastErr } = useToast()

  const loadAudit = useCallback(async (page = 0) => {
    setAuditLoading(true)
    try {
      const from = page * AUDIT_PAGE_SIZE
      // Fetch one extra row to detect whether a next page exists
      const { data, error } = await supabase
        .from('admin_audit_log')
        .select('id, created_at, admin_email, action, entity_type, entity_label, metadata')
        .order('created_at', { ascending: false })
        .range(from, from + AUDIT_PAGE_SIZE)
      if (error) throw error
      const rows = data ?? []
      setAuditHasMore(rows.length > AUDIT_PAGE_SIZE)
      setAuditRows(rows.slice(0, AUDIT_PAGE_SIZE))
      setAuditPage(page)
    } catch {
      // leave empty — table shows existing rows
    } finally {
      setAuditLoading(false)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        const [{ data: row }, { data: { user } }] = await Promise.all([
          supabase.from('admin_settings').select('config').eq('id', 1).single(),
          supabase.auth.getUser(),
        ])
        const stored = (row?.config ?? {}) as Config
        setSettings(prev => ({
          ...prev,
          ...stored,
          adminEmail: String(stored.adminEmail || user?.email || ''),
        }))
      } catch {
        // fallback to defaults — settings still usable
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const set = useCallback((key: string, value: string | boolean) =>
    setSettings(prev => ({ ...prev, [key]: value })), [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('admin_settings')
        .upsert({ id: 1, config: settings, updated_at: new Date().toISOString(), updated_by: user?.email })
      if (error) throw error
      void logAdminAction({ action: 'update_settings', entityType: 'settings', entityId: '1', entityLabel: 'Platform Settings' })
      toastOk('Settings saved')
    } catch {
      toastErr('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (tab === 'audit' && auditRows.length === 0) void loadAudit(0)
  }, [tab, loadAudit])

  const TABS: { key: SettingsTab; label: string }[] = [
    { key: 'general',       label: 'General' },
    { key: 'story',         label: 'Story Settings' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'security',      label: 'Security' },
    { key: 'audit',         label: 'Audit Log' },
  ]

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onOpenSidebar} className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-gray-500">
            <Menu size={17} />
          </button>
          <div>
            <h1 className="text-[22px] font-extrabold text-gray-900">Settings</h1>
            <p className="text-[13px] text-gray-500">Manage your platform settings.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row gap-5">
          <div className="sm:w-44 shrink-0 flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`whitespace-nowrap text-left px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-[12px] sm:text-[13px] font-semibold transition ${
                  tab === t.key ? 'bg-green-50 text-green-700' : 'text-gray-500 hover:bg-gray-100'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 min-w-0">
            {tab === 'general' && (
              <div className="bg-white rounded-xl border border-gray-100 p-5 sm:p-6 space-y-4">
                <div>
                  <h2 className="text-[15px] font-extrabold text-gray-800">General Settings</h2>
                  <p className="text-[12px] text-gray-400">Update your platform information.</p>
                </div>
                {[
                  { key: 'platformName', label: 'Platform Name' },
                  { key: 'tagline', label: 'Tagline' },
                  { key: 'adminEmail', label: 'Admin Email' },
                  { key: 'supportEmail', label: 'Support Email', placeholder: 'support@nimipiko.com' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1">{f.label}</label>
                    <input type={f.key.includes('Email') ? 'email' : 'text'}
                      value={String(settings[f.key] ?? '')}
                      onChange={e => set(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full bg-ds-input border border-ds-border rounded-lg px-3 sm:px-4 py-2.5 text-[13px] sm:text-[14px] font-medium text-ds-text focus:outline-none focus:ring-2 focus:ring-green-500 transition" />
                  </div>
                ))}
                <div className="flex justify-end pt-2">
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold text-[13px] rounded-lg px-5 py-2.5 transition disabled:opacity-50">
                    {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : <><Save size={15} /> Save Changes</>}
                  </button>
                </div>
              </div>
            )}

            {tab === 'story' && (
              <div className="bg-white rounded-xl border border-gray-100 p-5 sm:p-6 space-y-1">
                <h2 className="text-[15px] font-extrabold text-gray-800 mb-1">Story Settings</h2>
                <p className="text-[12px] text-gray-400 mb-3">Configure how stories work for children.</p>
                {[
                  { key: 'missionsPerStory', label: 'Missions per Story', desc: 'Number of missions required to complete a story', type: 'text' },
                  { key: 'starsPerMission',  label: 'Stars per Mission',  desc: 'Default stars awarded per mission', type: 'text' },
                  { key: 'autoUnlock',   label: 'Auto-unlock Next Story', desc: 'Automatically unlock the next story when current is complete', type: 'toggle' },
                  { key: 'introRequired', label: 'Intro Required', desc: 'Require children to view intro items before missions', type: 'toggle' },
                ].map(s => (
                  <div key={s.key} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-[13px] font-bold text-gray-700">{s.label}</p>
                      <p className="text-[11px] text-gray-400">{s.desc}</p>
                    </div>
                    {s.type === 'toggle' ? (
                      <Toggle on={!!settings[s.key]} onChange={v => set(s.key, v)} />
                    ) : (
                      <input type="text" value={String(settings[s.key] ?? '')} onChange={e => set(s.key, e.target.value)}
                        className="w-16 text-center bg-ds-input border border-ds-border rounded-lg px-2 py-1.5 text-[13px] font-bold text-ds-text focus:outline-none focus:ring-2 focus:ring-green-500" />
                    )}
                  </div>
                ))}
                <div className="flex justify-end pt-4">
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold text-[13px] rounded-lg px-5 py-2.5 transition disabled:opacity-50">
                    {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : <><Save size={15} /> Save Changes</>}
                  </button>
                </div>
              </div>
            )}

            {tab === 'notifications' && (
              <div className="bg-white rounded-xl border border-gray-100 p-5 sm:p-6 space-y-1">
                <h2 className="text-[15px] font-extrabold text-gray-800 mb-1">Notification Settings</h2>
                {[
                  { key: 'pushNotifications', label: 'Push Notifications', desc: 'Send push notifications to parents' },
                  { key: 'dailyReminders',    label: 'Daily Reminders',    desc: 'Remind children to continue their story' },
                  { key: 'achievementAlerts', label: 'Achievement Alerts', desc: 'Notify when a child earns a badge or certificate' },
                  { key: 'communityUpdates',  label: 'Community Updates',  desc: 'Notify about new community posts' },
                ].map(n => (
                  <div key={n.key} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-[13px] font-bold text-gray-700">{n.label}</p>
                      <p className="text-[11px] text-gray-400">{n.desc}</p>
                    </div>
                    <Toggle on={!!settings[n.key]} onChange={v => set(n.key, v)} />
                  </div>
                ))}
                <div className="flex justify-end pt-4">
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold text-[13px] rounded-lg px-5 py-2.5 transition disabled:opacity-50">
                    {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : <><Save size={15} /> Save Changes</>}
                  </button>
                </div>
              </div>
            )}

            {tab === 'audit' && (
              <div className="bg-white rounded-xl border border-gray-100 p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-[15px] font-extrabold text-gray-800">Audit Log</h2>
                    <p className="text-[12px] text-gray-400">Recent admin actions on this platform.</p>
                  </div>
                  <button onClick={() => void loadAudit(0)} disabled={auditLoading}
                    className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-[12px] font-semibold border border-gray-200 rounded-lg px-3 py-1.5 transition disabled:opacity-40">
                    <RefreshCw size={13} className={auditLoading ? 'animate-spin' : ''} /> Refresh
                  </button>
                </div>

                {auditLoading && auditRows.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
                  </div>
                ) : auditRows.length === 0 ? (
                  <p className="text-center text-[13px] text-gray-400 py-12">No audit entries yet.</p>
                ) : (
                  <>
                    <div className="overflow-x-auto -mx-5 sm:-mx-6">
                      <table className="w-full text-[12px] text-left">
                        <thead>
                          <tr className="border-b border-gray-100 text-[10px] uppercase tracking-wide font-bold text-gray-400">
                            <th className="py-2 px-5 sm:px-6">Time</th>
                            <th className="py-2 px-3">Admin</th>
                            <th className="py-2 px-3">Action</th>
                            <th className="py-2 px-3">Entity</th>
                            <th className="py-2 px-3">Detail</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {auditRows.map(row => (
                            <tr key={row.id} className="hover:bg-gray-50/60 transition">
                              <td className="py-2.5 px-5 sm:px-6 whitespace-nowrap text-gray-400 tabular-nums">
                                {new Date(row.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="py-2.5 px-3 text-gray-600 font-medium max-w-[140px] truncate" title={row.admin_email}>
                                {row.admin_email}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="inline-block bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full text-[10px]">
                                  {row.action.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-gray-500">{row.entity_type}</td>
                              <td className="py-2.5 px-3 text-gray-700 font-medium max-w-[200px] truncate" title={row.entity_label ?? ''}>
                                {row.entity_label ?? '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-50">
                      <button onClick={() => void loadAudit(auditPage - 1)} disabled={auditPage === 0 || auditLoading}
                        className="text-[12px] font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-30 transition">
                        ← Newer
                      </button>
                      <span className="text-[11px] text-gray-400">Page {auditPage + 1}</span>
                      <button onClick={() => void loadAudit(auditPage + 1)} disabled={!auditHasMore || auditLoading}
                        className="text-[12px] font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-30 transition">
                        Older →
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {tab === 'security' && (
              <div className="bg-white rounded-xl border border-gray-100 p-5 sm:p-6 space-y-1">
                <h2 className="text-[15px] font-extrabold text-gray-800 mb-1">Security Settings</h2>
                {[
                  { key: 'parentGate',        label: 'Parent Gate Required', desc: 'Require parent confirmation before sharing content' },
                  { key: 'contentModeration', label: 'Content Moderation',   desc: 'Review community posts before publishing' },
                  { key: 'dataEncryption',    label: 'Data Encryption',      desc: 'Encrypt sensitive child data at rest' },
                ].map(s => (
                  <div key={s.key} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-[13px] font-bold text-gray-700">{s.label}</p>
                      <p className="text-[11px] text-gray-400">{s.desc}</p>
                    </div>
                    <Toggle on={!!settings[s.key]} onChange={v => set(s.key, v)} />
                  </div>
                ))}
                <div className="flex justify-end pt-4">
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold text-[13px] rounded-lg px-5 py-2.5 transition disabled:opacity-50">
                    {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : <><Save size={15} /> Save Changes</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
