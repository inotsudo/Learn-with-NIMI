'use client'
import React, { useState } from 'react'
import Sidebar from './Sidebar'
import TableView from './TableView'
import BucketsView from './BucketsView'
import Navbar from './Navbar'
import DashboardHome from './DashboardHome'

const tables = [
  'activities', 'admins', 'audio_tracks', 'animated_creations', 'book_covers', 'child_preferences',
  'children', 'coloring_book_pages', 'comments', 'creations', 'enrollments',
  'likes', 'manual_payments', 'mission_completions', 'missions', 'parent_notes',
  'preferences', 'progress', 'profiles', 'rewards', 'storybook_pages',
  'subscriptions', 'users'
]

export default function AdminPanel() {
  const [currentTable, setCurrentTable] = useState<string>('Buckets')

  return (
    <div className="flex flex-col h-screen">
      <Navbar
        onNavigate={setCurrentTable}
        tables={tables}
        setCurrentTable={setCurrentTable}
      />
      <div className="flex flex-1">
        <Sidebar
          tables={tables}
          currentTable={currentTable}
          onSelectTable={setCurrentTable}
        />
        <main className="flex-1 overflow-auto">
          {currentTable === 'Buckets' && <BucketsView />}
          {/* Admins table instead of Profile */}
          {currentTable === 'admins' && <TableView table="admins" />}
          {currentTable === 'Dashboard' && <DashboardHome />}
          {/* All other tables */}
          {currentTable !== 'Buckets' && currentTable !== 'admins' && currentTable !== 'Dashboard' && (
            <TableView table={currentTable} />
          )}
        </main>
      </div>
    </div>
  )
}
