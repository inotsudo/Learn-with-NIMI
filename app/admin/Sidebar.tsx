'use client'
import React, { useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import {
  LayoutDashboard, BookOpen, Palette, Trophy, Star,
  Users, Globe, Award, Bell, FolderOpen, Settings,
  ChevronLeft, ChevronRight, X, CreditCard, Crown, BarChart3, ShieldCheck, GraduationCap, School, Mail, Share2, Tag, Gift, MessageSquareQuote, Handshake,
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

const NAV = [
  { icon: LayoutDashboard, label: 'Overview',           table: 'Dashboard' },
  { icon: BookOpen,        label: 'Story Studio',       table: 'stories' },
  { icon: Palette,         label: 'Content Library',    table: 'content_library' },
  { icon: Trophy,          label: 'Weekly Challenges',  table: 'weekly_challenges' },
  { icon: Star,            label: 'Rewards',            table: 'child_badges' },
  { icon: Users,           label: 'Families',           table: 'families' },
  { icon: Globe,           label: 'Community',          table: 'creations' },
  { icon: Award,           label: 'Certificates',       table: 'child_achievements' },
  { icon: Award,           label: 'Cert Templates',     table: 'certificate_templates' },
  { icon: Bell,            label: 'Notifications',      table: 'notifications' },
  { icon: FolderOpen,      label: 'Media Library',      table: 'Buckets' },
  { icon: CreditCard,      label: 'Products & Pricing', table: 'products' },
  { icon: Crown,           label: 'Masterpieces',       table: 'masterpieces' },
  { icon: BarChart3,       label: 'Analytics',          table: 'child_progress' },
  { icon: GraduationCap,   label: 'Curriculum',         table: 'curriculum' },
  { icon: School,          label: 'Schools',            table: 'school_inquiries' },
  { icon: Mail,            label: 'Newsletter',         table: 'newsletter_signups' },
  { icon: Share2,          label: 'Referrals',          table: 'referral_redemptions' },
  { icon: Tag,             label: 'Discount Codes',     table: 'discount_codes' },
  { icon: Gift,            label: 'Gift Subscriptions', table: 'gift_subscriptions' },
  { icon: MessageSquareQuote, label: 'Testimonials',   table: 'testimonials' },
  { icon: Handshake,          label: 'Partners',        table: 'partners' },
  { icon: ShieldCheck,     label: 'Administrators',     table: 'admins' },
  { icon: Settings,        label: 'Settings',           table: 'parental_settings' },
]

export default function Sidebar({ currentTable, onSelectTable, collapsed, onToggleCollapse, mobileOpen, onCloseMobile }: SidebarProps) {
  const [admin, setAdmin] = useState<{ name: string; role: string } | null>(null)
  const baseTable = currentTable.split(':')[0]

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('admins').select('name, role').eq('id', user.id).maybeSingle()
      if (data) setAdmin({ name: data.name ?? 'Admin', role: data.role ?? 'admin' })
    })()
  }, [])

  const isActive = (table: string) => {
    if (table === 'Dashboard') return baseTable === 'Dashboard'
    if (table === 'stories') return baseTable === 'stories' || baseTable === 'story_slots' || baseTable === 'story_ordering' || baseTable === 'story_publishing'
    if (table === 'content_library') return baseTable === 'content_library' || baseTable === 'flipflop_books' || baseTable === 'coloring_pages' || baseTable === 'story_pdfs' || baseTable === 'videos' || baseTable === 'audio'
    if (table === 'families') return baseTable === 'families' || baseTable === 'children' || baseTable === 'parents'
    return baseTable === table
  }

  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className={`px-4 py-3 flex items-center gap-3 border-b border-ds-border ${collapsed ? 'lg:justify-center lg:px-2' : ''}`}>
        <img src="/nimi-logo.png" alt="NimiPiko" className="w-10 h-10 rounded-xl object-cover ring-2 ring-gray-100 flex-shrink-0" />
        <div className={`overflow-hidden flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
          <p className="font-extrabold text-ds-text text-[15px] leading-tight">NimiPiko</p>
          <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">Admin Studio</p>
        </div>
        <button onClick={onCloseMobile} aria-label="Close sidebar" className="lg:hidden flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition">
          <X size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {NAV.map(item => {
          const active = isActive(item.table)
          return (
            <button key={item.table}
              onClick={() => onSelectTable(item.table)}
              title={collapsed ? item.label : undefined}
              aria-current={active ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold transition ${
                collapsed ? 'lg:justify-center lg:px-0' : ''
              } ${active ? 'bg-green-50 text-green-700' : 'text-gray-500 hover:bg-gray-50 hover:text-ds-text'}`}>
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
              <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button onClick={onToggleCollapse}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={`hidden lg:flex items-center justify-center gap-2 mx-3 mb-2 py-2 rounded-lg text-gray-400 hover:text-ds-text hover:bg-gray-50 text-[11px] font-semibold transition ${collapsed ? 'lg:mx-1' : ''}`}>
        {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /> <span>Collapse</span></>}
      </button>

      {/* Admin profile */}
      <div className="border-t border-ds-border px-3 py-3">
        <button onClick={() => onSelectTable('Profile')}
          title={collapsed ? (admin?.name ?? 'Admin') : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition text-left ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
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
