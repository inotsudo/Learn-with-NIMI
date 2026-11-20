'use client'
import React, { useEffect, useState } from 'react'
import { getCachedAdmin } from './adminAuth'
import {
  LayoutDashboard, BookOpen, Palette, Trophy, Star,
  Users, Award, Bell, FolderOpen, Settings,
  ChevronLeft, ChevronRight, X, CreditCard, Crown, ShieldCheck,
  Mail, Share2, Tag, Gift, MessageSquareQuote, Handshake,
  MessagesSquare, ClipboardList, Activity, Plane, Layers, Music, Languages, Video,
  type LucideIcon,
} from 'lucide-react'

interface SidebarProps {
  tables?: string[]
  currentTable: string
  onSelectTable: (table: string) => void
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

interface NavItem { icon: LucideIcon; label: string; table: string }
interface NavGroup { label: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    label: '',
    items: [
      { icon: LayoutDashboard, label: 'Overview',          table: 'Dashboard' },
    ],
  },
  {
    label: 'Content',
    items: [
      { icon: BookOpen,        label: 'Story Studio',      table: 'stories' },
      { icon: Palette,         label: 'Content Library',   table: 'content_library' },
      { icon: Trophy,          label: 'Weekly Challenges', table: 'weekly_challenges' },
      { icon: Languages,       label: 'Langues Missions',  table: 'mission_versions' },
    ],
  },
  {
    label: 'Learners',
    items: [
      { icon: Users,           label: 'Families',          table: 'families' },
      { icon: Star,            label: 'Rewards',           table: 'child_badges' },
      { icon: Award,           label: 'Badge Images',      table: 'badge_images' },
      { icon: Award,           label: 'Certificates',      table: 'child_achievements' },
      { icon: Award,           label: 'Cert Templates',    table: 'certificate_templates' },
      { icon: Crown,           label: 'Masterpieces',      table: 'masterpieces' },
    ],
  },
  {
    label: '✈️ Airways',
    items: [
      { icon: Activity,        label: 'Airways Hub',       table: 'airways_hub' },
      { icon: Plane,           label: 'Templates',         table: 'airways_templates' },
      { icon: Layers,          label: 'Kit Layout',        table: 'kit_layout' },
      { icon: Music,           label: 'Songs Enfants',     table: 'song_manager' },
      { icon: BookOpen,        label: 'Pages Histoires',   table: 'story_pages' },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { icon: CreditCard,      label: 'Products & Pricing', table: 'products' },
      { icon: Activity,        label: 'Payment Health',    table: 'payment_health' },
      { icon: Tag,             label: 'Discount Codes',    table: 'discount_codes' },
      { icon: Gift,            label: 'Gift Subscriptions',table: 'gift_subscriptions' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { icon: Mail,            label: 'Newsletter',        table: 'newsletter_signups' },
      { icon: Share2,          label: 'Referrals',         table: 'referral_redemptions' },
      { icon: MessageSquareQuote, label: 'Testimonials',   table: 'testimonials' },
      { icon: Handshake,       label: 'Partners',          table: 'partners' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { icon: Video,           label: 'Platform Intro Video', table: 'platform_intro_video' },
      { icon: Bell,            label: 'Notifications',     table: 'notifications' },
      { icon: FolderOpen,      label: 'Media Library',     table: 'Buckets' },
      { icon: MessagesSquare,  label: 'AI Chat History',   table: 'conversation_history' },
      { icon: ClipboardList,   label: 'Audit Log',         table: 'audit_log' },
      { icon: ShieldCheck,     label: 'Administrators',    table: 'admins' },
      { icon: Settings,        label: 'Settings',          table: 'parental_settings' },
    ],
  },
]

// Flat list for active-state checks that span multiple views
const AIRWAYS_TABLES = new Set(['airways_hub', 'airways_templates', 'kit_layout', 'song_manager', 'story_pages'])

export default function Sidebar({ currentTable, onSelectTable, collapsed, onToggleCollapse, mobileOpen, onCloseMobile }: SidebarProps) {
  const [admin, setAdmin] = useState<{ name: string; role: string } | null>(null)
  const baseTable = currentTable.split(':')[0]

  useEffect(() => {
    getCachedAdmin().then(a => { if (a) setAdmin(a) }).catch(() => {})
  }, [])

  const isActive = (table: string) => {
    if (table === 'Dashboard')       return baseTable === 'Dashboard'
    if (table === 'stories')         return ['stories', 'story_slots', 'story_ordering', 'story_publishing'].includes(baseTable)
    if (table === 'content_library') return ['content_library', 'flipflop_books', 'coloring_pages', 'story_pdfs', 'videos', 'audio'].includes(baseTable)
    if (table === 'families')        return ['families', 'children', 'parents'].includes(baseTable)
    if (table === 'airways_hub')     return AIRWAYS_TABLES.has(baseTable)
    return baseTable === table
  }

  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className={`px-4 py-3 flex items-center gap-3 border-b border-ds-border ${collapsed ? 'lg:justify-center lg:px-2' : ''}`}>
        <img src="/nimi-logo.png" alt="NimiPiko" className="w-10 h-10 rounded-xl object-cover ring-2 ring-gray-100 flex-shrink-0" loading="lazy" />
        <div className={`overflow-hidden flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
          <p className="font-extrabold text-ds-text text-[15px] leading-tight">NimiPiko</p>
          <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">Admin Studio</p>
        </div>
        <button onClick={onCloseMobile} aria-label="Close sidebar" className="lg:hidden flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition">
          <X size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-3' : ''}>
            {/* Section label — hidden when collapsed */}
            {group.label && (
              <p className={`px-3 mb-0.5 text-[9px] font-black uppercase tracking-widest text-gray-400 ${collapsed ? 'lg:hidden' : ''}`}>
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = isActive(item.table)
                return (
                  <button
                    key={item.table}
                    onClick={() => onSelectTable(item.table)}
                    title={collapsed ? item.label : undefined}
                    aria-current={active ? 'page' : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold transition ${
                      collapsed ? 'lg:justify-center lg:px-0' : ''
                    } ${active ? 'bg-green-50 text-green-700' : 'text-gray-500 hover:bg-gray-50 hover:text-ds-text'}`}
                  >
                    <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                    <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={`hidden lg:flex items-center justify-center gap-2 mx-3 mb-2 py-2 rounded-lg text-gray-400 hover:text-ds-text hover:bg-gray-50 text-[11px] font-semibold transition ${collapsed ? 'lg:mx-1' : ''}`}
      >
        {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span>Collapse</span></>}
      </button>

      {/* Admin profile */}
      <div className="border-t border-ds-border px-3 py-3">
        <button
          onClick={() => onSelectTable('Profile')}
          title={collapsed ? (admin?.name ?? 'Admin') : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition text-left ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
        >
          <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-white text-[13px] font-black flex-shrink-0">
            {(admin?.name ?? 'A')[0].toUpperCase()}
          </div>
          <div className={`flex-1 overflow-hidden ${collapsed ? 'lg:hidden' : ''}`}>
            <p className="text-[13px] font-bold text-ds-text truncate">{admin?.name ?? 'Admin User'}</p>
            <p className="text-[10px] text-gray-400 font-medium capitalize truncate">{admin?.role ?? 'Super Admin'}</p>
          </div>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onCloseMobile} />}
      <aside className={`fixed lg:relative inset-y-0 left-0 z-50 flex-shrink-0 bg-white border-r border-ds-border flex flex-col h-full transition-all duration-300 ease-in-out w-[220px] ${
        collapsed ? 'lg:w-[68px]' : 'lg:w-[220px]'
      } ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        {sidebar}
      </aside>
    </>
  )
}
