'use client'
import React, { useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import {
  LayoutDashboard, Compass, BookOpen, Palette, Languages, Baby, Users, Award,
  Trophy, BarChart3, HardDrive, Settings, Bell, ShieldCheck, HelpCircle, GraduationCap,
  Images, ChevronDown, ChevronRight, ChevronLeft, X,
  type LucideIcon,
} from 'lucide-react'
import { CATEGORY_ORDER, CATEGORY_META } from './missionMeta'

interface SidebarProps {
  tables?: string[]   // optional, won't crash if empty
  currentTable: string
  onSelectTable: (table: string) => void
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

interface NavItem {
  label: string
  icon: LucideIcon
  table: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, table: 'Dashboard' },
  { label: 'Curriculum', icon: GraduationCap, table: 'curriculum' },
  { label: 'Stories & FlipFlop Books', icon: BookOpen, table: 'stories' },
  { label: 'Coloring Books', icon: Palette, table: 'coloring_pages' },
  { label: 'Languages', icon: Languages, table: 'mission_versions' },
  { label: 'Children', icon: Baby, table: 'children' },
  { label: 'Parents', icon: Users, table: 'parents' },
  { label: 'Community', icon: Images, table: 'creations' },
  { label: 'Certificates', icon: Award, table: 'child_achievements' },
  { label: 'Rewards & Badges', icon: Trophy, table: 'child_badges' },
  { label: 'Analytics', icon: BarChart3, table: 'child_progress' },
  { label: 'Media Library', icon: HardDrive, table: 'Buckets' },
  { label: 'Settings', icon: Settings, table: 'parental_settings' },
  { label: 'Notifications', icon: Bell, table: 'notifications' },
  { label: 'Administrators', icon: ShieldCheck, table: 'admins' },
  { label: 'Help & Support', icon: HelpCircle, table: 'Help' },
]

function NavButton({
  active, icon: Icon, label, onClick, collapsed,
}: { active: boolean; icon: LucideIcon; label: string; onClick: () => void; collapsed: boolean }) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`w-full flex items-center gap-3 pl-3 pr-3 py-2.5 rounded-lg text-sm font-semibold border-l-4 transition ${
        collapsed ? 'lg:justify-center lg:px-0' : ''
      } ${
        active
          ? 'bg-white/10 text-white border-fuchsia-400 shadow-inner'
          : 'text-indigo-200/80 border-transparent hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{label}</span>
    </button>
  )
}

export default function Sidebar({ currentTable, onSelectTable, collapsed, onToggleCollapse, mobileOpen, onCloseMobile }: SidebarProps) {
  const [admin, setAdmin] = useState<{ name: string; role: string } | null>(null)
  const [adventuresOpen, setAdventuresOpen] = useState(currentTable.startsWith('mission:'))

  // currentTable may carry a deep-link suffix (e.g. "mission:morning:abc-123"
  // or "children:abc-123") from global search — strip it for active-state checks
  const baseTable = currentTable.split(':')[0]
  const missionBase = currentTable.startsWith('mission:') ? currentTable.split(':').slice(0, 2).join(':') : ''

  useEffect(() => {
    const fetchAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('admins')
        .select('name, role')
        .eq('id', user.id)
        .maybeSingle()
      if (data) setAdmin({ name: data.name ?? 'Admin', role: data.role ?? 'admin' })
    }
    fetchAdmin()
  }, [])

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-50 flex-shrink-0 bg-gradient-to-b from-[#1e1b4b] via-[#312e81] to-[#3b0764] text-white flex flex-col h-full transition-all duration-300 ease-in-out w-64 ${
          collapsed ? 'lg:w-20' : 'lg:w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Collapse toggle (desktop only) */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500 shadow-md hover:bg-gray-50 hover:text-indigo-600 transition z-10"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Brand header */}
        <div className={`px-5 py-5 flex items-center gap-3 border-b border-white/10 ${collapsed ? 'lg:justify-center lg:px-3' : ''}`}>
          <img
            src="/nimi-logo-circle.png"
            alt="NIMIPIKO"
            className="w-10 h-10 rounded-full object-cover ring-2 ring-white/20 flex-shrink-0"
          />
          <div className={`overflow-hidden flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
            <p className="font-extrabold text-white text-sm leading-tight truncate">NIMIPIKO</p>
            <p className="text-indigo-300/70 text-[11px] font-semibold uppercase tracking-wider">Admin Console</p>
          </div>
          {/* Mobile close button */}
          <button onClick={onCloseMobile} className="lg:hidden flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-indigo-200 transition">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <NavButton
            active={baseTable === 'Dashboard'}
            icon={LayoutDashboard}
            label="Dashboard"
            onClick={() => onSelectTable('Dashboard')}
            collapsed={collapsed}
          />

          {/* Daily Adventures — expandable submenu */}
          <button
            onClick={() => setAdventuresOpen(!adventuresOpen)}
            title={collapsed ? 'Daily Adventures' : undefined}
            className={`w-full flex items-center gap-3 pl-3 pr-3 py-2.5 rounded-lg text-sm font-semibold border-l-4 transition ${
              collapsed ? 'lg:justify-center lg:px-0' : ''
            } ${
              currentTable.startsWith('mission:')
                ? 'bg-white/10 text-white border-fuchsia-400 shadow-inner'
                : 'text-indigo-200/80 border-transparent hover:bg-white/5 hover:text-white'
            }`}
          >
            <Compass className="w-4 h-4 flex-shrink-0" />
            <span className={`flex-1 text-left truncate ${collapsed ? 'lg:hidden' : ''}`}>Daily Adventures</span>
            <span className={collapsed ? 'lg:hidden' : ''}>
              {adventuresOpen ? <ChevronDown className="w-4 h-4 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 flex-shrink-0" />}
            </span>
          </button>
          {adventuresOpen && (
            <div className={`space-y-1 ${collapsed ? 'lg:hidden' : ''}`}>
              {CATEGORY_ORDER.map(slug => {
                const meta = CATEGORY_META[slug]
                return (
                  <button
                    key={slug}
                    onClick={() => onSelectTable('mission:' + slug)}
                    className={`w-full flex items-center gap-3 pl-9 pr-3 py-2 rounded-lg text-sm font-semibold border-l-4 transition ${
                      missionBase === 'mission:' + slug
                        ? 'bg-white/10 text-white border-fuchsia-400 shadow-inner'
                        : 'text-indigo-200/80 border-transparent hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <meta.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{meta.label}</span>
                  </button>
                )
              })}
            </div>
          )}

          {NAV_ITEMS.slice(1).map(item => (
            <NavButton
              key={item.label}
              active={baseTable === item.table}
              icon={item.icon}
              label={item.label}
              onClick={() => onSelectTable(item.table)}
              collapsed={collapsed}
            />
          ))}
        </div>

        {/* Profile footer */}
        <div className="border-t border-white/10 px-3 py-3">
          <button
            onClick={() => onSelectTable('Profile')}
            title={collapsed ? (admin?.name ?? 'Admin') : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition text-left ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
          >
            <img
              src="/nimi-logo-circle.png"
              alt="Profile"
              className="w-9 h-9 rounded-full object-cover ring-2 ring-white/20 flex-shrink-0"
            />
            <div className={`flex-1 overflow-hidden ${collapsed ? 'lg:hidden' : ''}`}>
              <p className="text-sm font-bold text-white truncate">{admin?.name ?? 'Admin'}</p>
              <p className="text-[11px] text-indigo-300/70 uppercase font-semibold truncate">{admin?.role ?? 'admin'}</p>
            </div>
          </button>
        </div>
      </aside>
    </>
  )
}
