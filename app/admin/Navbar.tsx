'use client'
import React, { useEffect, useState, useRef } from 'react'
import supabase from "@/lib/supabaseClient";
import { LogOut, User, Search, ChevronDown } from 'lucide-react'

interface NavbarProps {
  onNavigate: (page: string) => void
  tables: string[]
  setCurrentTable: (table: string) => void
}

export default function Navbar({ onNavigate, tables, setCurrentTable }: NavbarProps) {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filteredTables, setFilteredTables] = useState<string[]>([])
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserEmail(user.email ?? null) // ✅ Fix undefined typing
    }
    getUser()
  }, [])

  // Filter tables based on search
  useEffect(() => {
    if (!search.trim()) {
      setFilteredTables([])
    } else {
      const results = tables.filter(t =>
        t.toLowerCase().includes(search.toLowerCase())
      )
      setFilteredTables(results)
    }
  }, [search, tables])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const handleProfileAction = (action: string) => {
    setProfileOpen(false)
    if (action === 'profile') setCurrentTable('Profile')
    if (action === 'dashboard') setCurrentTable('Dashboard')
    if (action === 'logout') handleLogout()
  }

  // ✅ Close profile menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false)
      }
    }
    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [profileOpen])

  return (
    <header className="w-full bg-gray-800 text-white flex items-center justify-between px-6 py-3 shadow-md relative z-50">
      {/* Left: Logo */}
      <div className="flex items-center gap-3">
        <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center shadow-lg">
          <img 
            src="/nimi-logo.jpg" 
            alt="Nimi Logo" 
            className="w-10 h-10 rounded-full object-cover"
          />
        </div>
        <span className="text-xl font-bold">Nimi Admin</span>
      </div>

      {/* Middle: Search for tables */}
      <div className="relative flex-1 max-w-md mx-6">
        <div className="flex items-center bg-gray-700 rounded-lg px-3 py-2">
          <Search size={16} className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search tables..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white focus:outline-none"
          />
        </div>
        {filteredTables.length > 0 && (
          <ul className="absolute mt-1 w-full bg-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto z-50">
            {filteredTables.map((table) => (
              <li
                key={table}
                className="px-3 py-2 cursor-pointer hover:bg-gray-600 text-sm"
                onClick={() => {
                  setCurrentTable(table)
                  setSearch('')
                  setFilteredTables([])
                }}
              >
                {table.replace('_', ' ').toUpperCase()}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Right: Profile menu */}
      <div className="relative flex items-center gap-4" ref={profileRef}>
        <div 
          className="flex items-center gap-2 bg-gray-700 px-3 py-1 rounded-full cursor-pointer relative"
          onClick={() => setProfileOpen(!profileOpen)}
        >
          <User size={18} className="text-gray-300" />
          <span className="text-sm">{userEmail || 'Admin'}</span>
          <ChevronDown size={14} className="text-gray-300"/>
        </div>

        {profileOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white text-black rounded shadow-lg z-50">
            <ul>
              <li 
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleProfileAction('dashboard')}
              >
                Dashboard
              </li>
              <li 
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleProfileAction('profile')}
              >
                Profile
              </li>
              <li 
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-red-600"
                onClick={() => handleProfileAction('logout')}
              >
                Logout
              </li>
            </ul>
          </div>
        )}

        <button 
          onClick={handleLogout}
          className="flex items-center gap-1 bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-sm transition"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </header>
  )
}
