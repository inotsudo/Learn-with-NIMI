'use client'

import React, { useEffect, useState } from 'react'
import supabase from "@/lib/supabaseClient";
import { ShieldCheck, Pencil, Lock, Eye, EyeOff, Menu } from 'lucide-react'
import { Skeleton, SkeletonForm } from './Skeleton'
import { useToast } from './Toast'

interface AdminProfileProps {
  onOpenSidebar?: () => void
}

interface AdminRow {
  id: string
  name: string | null
  email: string
  role: string
  created_at?: string
}

export default function AdminProfile({ onOpenSidebar }: AdminProfileProps) {
  const { success, error: toastError } = useToast()
  const [profile, setProfile] = useState<AdminRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState<AdminRow | null>(null)
  const [password, setPassword] = useState<string>('')
  const [showPassword, setShowPassword] = useState(false)

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
      setProfile(data as AdminRow)
      setFormData(data as AdminRow)
    } catch (err) {
      console.error('Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!profile || !formData) return
    try {
      const emailChanged = formData.email !== profile.email
      const { error: updateError } = await supabase
        .from('admins')
        .update({ name: formData.name, email: formData.email })
        .eq('id', profile.id)
      if (updateError) throw updateError

      if (emailChanged) {
        const { error: authError } = await supabase.auth.updateUser({ email: formData.email })
        if (authError) throw authError
      }

      setProfile(formData)
      setEditing(false)
      success(emailChanged
        ? 'Profile updated! Check your inbox to confirm the new email address.'
        : 'Profile updated successfully!')
    } catch (err) {
      console.error(err)
      toastError(err instanceof Error ? err.message : 'Error updating profile')
    }
  }

  const handleChangePassword = async () => {
    if (!password) return
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setPassword('')
      success('Password updated successfully!')
    } catch (err) {
      console.error(err)
      toastError(err instanceof Error ? err.message : 'Error updating password')
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        <div className="bg-white border-b border-gray-100 px-6 py-5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onOpenSidebar} className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-gray-500">
              <Menu size={17} />
            </button>
            <div className="space-y-1.5">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto px-6 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-4 mb-6">
                <Skeleton className="w-14 h-14 rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full flex-shrink-0" />
              </div>
              <SkeletonForm fields={3} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        <div className="flex-1 overflow-auto px-6 py-6">
          <p className="text-gray-400 text-sm">Profile not found</p>
        </div>
      </div>
    )
  }

  const initial = (profile.name?.[0] || profile.email?.[0] || 'A').toUpperCase()

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSidebar}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 text-gray-500"
          >
            <Menu size={17} />
          </button>
          <div>
            <h1 className="text-[22px] font-extrabold text-gray-900">My Profile</h1>
            <p className="text-[13px] text-gray-500">Manage your admin account details</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Profile card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-green-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-gray-800 truncate">{profile.name || 'Admin'}</p>
                <p className="text-gray-500 text-sm truncate">{profile.email}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold uppercase tracking-wide flex-shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" /> {profile.role}
              </span>
            </div>

            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block font-semibold text-gray-600 text-xs uppercase tracking-wide mb-1.5">Name</label>
                  <input
                    type="text"
                    value={formData?.name ?? ''}
                    onChange={e => setFormData(prev => prev ? { ...prev, name: e.target.value } : prev)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:border-green-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-600 text-xs uppercase tracking-wide mb-1.5">Email</label>
                  <input
                    type="email"
                    value={formData?.email ?? ''}
                    onChange={e => setFormData(prev => prev ? { ...prev, email: e.target.value } : prev)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:border-green-400"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveProfile}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold text-[13px] rounded-xl px-4 py-2"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => { setEditing(false); setFormData(profile) }}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-[13px] rounded-xl px-4 py-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-4 py-2 rounded-xl transition"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit Profile
              </button>
            )}
          </div>

          {/* Password card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-base font-bold text-gray-800 mb-1">Change Password</h3>
            <p className="text-gray-500 text-sm mb-4">Update the password used to sign in to the admin console</p>
            <div className="max-w-sm space-y-3">
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="New password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl pl-10 pr-10 py-2 text-[13px] focus:outline-none focus:border-green-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={handleChangePassword}
                className="bg-green-600 hover:bg-green-700 text-white font-bold text-[13px] rounded-xl px-4 py-2"
              >
                Update Password
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
