"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabaseClient";

interface AdminProfileData {
  id: string;
  name: string;
  email: string;
  role: string;
  bio?: string;
  avatar_url?: string;
}

export default function AdminProfile() {
  const [profile, setProfile] = useState<AdminProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchProfile() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.push("/login");
          return;
        }

        const { data, error } = await supabase
        .from("admins")
        .select("*")
        .eq("id", user.id)
        .single()

        if (error) throw error;

        setProfile(data);
      } catch (error: any) {
        setErrorMsg(error.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [router]);

  async function uploadAvatar(file: File, adminId: string) {
    const fileExt = file.name.split(".").pop();
    const filePath = `avatars/${adminId}.${fileExt}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (error) throw error;
    // Get the public URL for the avatar
    const { data } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const publicURL = data?.publicUrl;

    if (!publicURL) {
      console.error("Failed to get public URL for file:", filePath);
      return;
    }

    return publicURL;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    if (password && password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    setSaving(true);
    setErrorMsg("");

    try {
      let avatar_url = profile.avatar_url;

      if (avatarFile) {
        avatar_url = await uploadAvatar(avatarFile, profile.id);
      }

      const updates = {
        name: profile.name,
        email: profile.email,
        bio: profile.bio,
        avatar_url,
      };

      const { error } = await supabase
        .from("admins")
        .update(updates)
        .eq("id", profile.id);

      if (error) throw error;

      if (password) {
        const { error: pwError } = await supabase.auth.updateUser({ password });
        if (pwError) throw pwError;
      }

      alert("Profile updated!");
      setEditing(false);
      setAvatarFile(null);
      setPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      setErrorMsg(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading profile...</p>;
  if (errorMsg) return <p className="text-red-600">{errorMsg}</p>;

  return (
    <div className="max-w-md mx-auto space-y-6 p-6 bg-white rounded-xl shadow">
      <h2 className="text-2xl font-bold text-[#5e548e]">Admin Profile</h2>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="flex items-center space-x-4">
          <img
            src={
              avatarFile
                ? URL.createObjectURL(avatarFile)
                : profile?.avatar_url ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    profile?.name || "Admin"
                  )}&background=ff9a9e&color=5e548e`
            }
            alt="Avatar"
            className="w-20 h-20 rounded-full object-cover border-2 border-[#ff9a9e]"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={saving}
            className="px-4 py-2 rounded bg-[#ff9a9e] text-white hover:bg-[#e07b8f]"
          >
            Change Avatar
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) setAvatarFile(e.target.files[0]);
            }}
            disabled={saving}
          />
        </div>

        <label className="block">
          <span className="text-gray-700">Name</span>
          <input
  type="text"
  value={profile?.name || ""}
  onChange={(e) =>
    setProfile((p) => (p ? { ...p, name: e.target.value } : p))
  }
  disabled={saving || !editing}
  required
/>

        </label>

        <label className="block">
          <span className="text-gray-700">Email</span>
          <input
            type="email"
            value={profile?.email}
            onChange={(e) => setProfile((p) => p ? { ...p, email: e.target.value } : p)}
            disabled={saving || !editing}
            required
            className="mt-1 block w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff9a9e]"
          />
        </label>

        <label className="block">
          <span className="text-gray-700">Bio</span>
          <textarea
            value={profile?.bio || ""}
            onChange={(e) => setProfile((p) => p ? { ...p, bio: e.target.value } : p)}
            disabled={saving || !editing}
            rows={3}
            className="mt-1 block w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff9a9e]"
          />
        </label>

        {editing && (
          <>
            <label className="block">
              <span className="text-gray-700">New Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={saving}
                className="mt-1 block w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff9a9e]"
                placeholder="Leave blank to keep current"
              />
            </label>

            <label className="block">
              <span className="text-gray-700">Confirm Password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={saving}
                className="mt-1 block w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff9a9e]"
                placeholder="Confirm new password"
              />
            </label>
          </>
        )}

        <div className="flex space-x-4 mt-4">
          {editing ? (
            <>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-[#5e548e] text-white rounded hover:bg-[#3f3560]"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => setEditing(false)}
                className="px-6 py-2 border rounded border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="px-6 py-2 bg-pink-300 text-[#5e548e] rounded hover:bg-pink-400"
            >
              Edit Profile
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
