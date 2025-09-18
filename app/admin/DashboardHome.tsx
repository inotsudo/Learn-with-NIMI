'use client'
import React, { useEffect, useState } from 'react'
import supabase from "@/lib/supabaseClient";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export default function Dashboard() {
  const [stats, setStats] = useState<any>({
    users: 0,
    buckets: 0,
    files: 0,
    activity: []
  })

  const fetchStats = async () => {
    try {
      // Example: count users
      const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact' })
      // Example: count buckets/files (manually list your buckets)
      const bucketNames = ['missions-videos', 'missions-audios', 'avatars', 'creations', 'storybook', 'trip-media', 'coloriage', 'book-covers']
      let totalFiles = 0
      for (const bucket of bucketNames) {
        const { data } = await supabase.storage.from(bucket).list('', { limit: 100 })
        totalFiles += data?.length ?? 0
      }

      // Example activity trends
      const { data: activities } = await supabase.from('activities').select('created_at')
      const grouped: Record<string, number> = {}
      activities?.forEach((a: any) => {
        const date = a.created_at?.split('T')[0] || ''
        grouped[date] = (grouped[date] || 0) + 1
      })
      const activityTrend = Object.entries(grouped).map(([date, count]) => ({ date, count }))

      setStats({
        users: usersCount ?? 0,
        buckets: bucketNames.length,
        files: totalFiles,
        activity: activityTrend
      })
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => { fetchStats() }, [])

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28EFF', '#FF6B6B']

  return (
    <div className="flex-1 p-6 overflow-auto">
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 flex flex-col items-center justify-center">
          <h3 className="text-gray-500 dark:text-gray-300 mb-2">Users</h3>
          <p className="text-3xl font-bold">{stats.users}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 flex flex-col items-center justify-center">
          <h3 className="text-gray-500 dark:text-gray-300 mb-2">Buckets</h3>
          <p className="text-3xl font-bold">{stats.buckets}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 flex flex-col items-center justify-center">
          <h3 className="text-gray-500 dark:text-gray-300 mb-2">Files</h3>
          <p className="text-3xl font-bold">{stats.files}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 className="text-gray-700 dark:text-gray-200 font-semibold mb-4">Activity Trend</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={stats.activity}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mt-6">
        <h3 className="text-gray-700 dark:text-gray-200 font-semibold mb-4">Files Distribution</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie dataKey="value" data={bucketData(stats.files)} cx="50%" cy="50%" outerRadius={80} label>
              {COLORS.map((color, index) => <Cell key={index} fill={color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// Dummy distribution for PieChart
function bucketData(totalFiles: number) {
  const buckets = ['Videos','Audios','Avatars','Creations','Storybook','Trip','Coloriage','Book-Covers']
  return buckets.map((b, i) => ({ name: b, value: Math.floor(totalFiles / (i + 1)) }))
}
