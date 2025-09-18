'use client'

import React, { useEffect, useState } from 'react'
import supabase from "@/lib/supabaseClient";

export default function AdminProfile() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState<any>({})
  const [password, setPassword] = useState<string>('')
  const [message, setMessage] = useState<string>('')

  // Fetch current admin
  const fetchProfile = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('id', user.id)
        .single()
      if (error) throw error
      setProfile(data)
      setFormData(data)
    } catch (err) {
      console.error('Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!profile) return
    try {
      const { error } = await supabase
        .from('admins')
        .update(formData)
        .eq('id', profile.id)
      if (error) throw error
      setProfile(formData)
      setEditing(false)
      setMessage('Profile updated successfully!')
    } catch (err) {
      console.error(err)
      setMessage('Error updating profile')
    }
  }

  const handleChangePassword = async () => {
    if (!password) return
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setPassword('')
      setMessage('Password updated successfully!')
    } catch (err) {
      console.error(err)
      setMessage('Error updating password')
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  if (loading) return <div className="p-4">Loading profile...</div>
  if (!profile) return <div className="p-4">Profile not found</div>

  return (
    <div className="flex-1 p-4 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Admin Profile</h2>

      {message && <div className="mb-4 text-green-600">{message}</div>}

      {editing ? (
        <div className="flex flex-col gap-4">
          <div>
            <label className="block font-semibold mb-1">Name</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full border px-3 py-2 rounded"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Email</label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full border px-3 py-2 rounded"
            />
          </div>
          <div className="flex gap-2">
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              onClick={handleSaveProfile}
            >
              Save
            </button>
            <button
              className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p><strong>Name:</strong> {profile.name}</p>
          <p><strong>Email:</strong> {profile.email}</p>
          <p><strong>Role:</strong> {profile.role}</p>
          <button
            className="mt-3 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-max"
            onClick={() => setEditing(true)}
          >
            Edit Profile
          </button>
        </div>
      )}

      {/* Password Change */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Change Password</h3>
        <div className="flex flex-col gap-2 max-w-sm">
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="border px-3 py-2 rounded"
          />
          <button
            className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 w-max"
            onClick={handleChangePassword}
          >
            Update Password
          </button>
        </div>
      </div>
    </div>
  )
}
