"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import supabase from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useSession } from "@supabase/auth-helpers-react";

export function UserProfileMenu() {
  const session = useSession();
  const { toast } = useToast();
  const { user, profile, updateUser, updateProfile } = useUser();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const initial = useMemo(() => (profile?.name?.[0] || "U").toUpperCase(), [profile?.name]);

  // --- Save profile ---
  const saveProfile = async () => {
    if (!session?.user?.id || !profile) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .update({
          name: profile.name,
          avatar_url: profile.avatar_url,
          bio: profile.bio,
          date_of_birth: profile.date_of_birth,
          preferred_language: profile.preferred_language,
          notify_email: profile.notify_email,
          notify_sms: profile.notify_sms,
        })
        .eq("auth_user_id", session.user.id)
        .select()
        .single();

      if (error) {
        toast({ title: "Error", description: "Failed to save profile", variant: "destructive" });
        return;
      }

      updateProfile?.(data);
      toast({ title: "Profile Saved", description: "Your profile has been updated." });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Unexpected error occurred", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // --- Avatar upload ---
  const cropImageToSquare = async (file: File, size = 256): Promise<File> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas context not found"));
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Failed to create blob"));
            resolve(new File([blob], file.name, { type: "image/png" }));
          },
          "image/png",
          0.95
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });

  const handleAvatarUpload = async (file: File) => {
    if (!session?.user?.id || !profile) return;
    setIsLoading(true);
    try {
      const croppedFile = await cropImageToSquare(file);
      const fileExt = croppedFile.name.split(".").pop();
      const fileName = `${session.user.id}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(`avatars/${fileName}`, croppedFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(`avatars/${fileName}`);

      if (publicData?.publicUrl) {
        updateProfile?.({ ...profile, avatar_url: publicData.publicUrl });
        if (user?.id) {
          updateUser({ ...user, avatar_url: publicData.publicUrl });
        }
        toast({ title: "Avatar Updated" });
      }
      
    } catch (err: any) {
      console.error(err);
      toast({ title: "Upload Error", description: err.message || "Failed to upload avatar", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // --- Drag & Drop ---
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleAvatarUpload(e.dataTransfer.files[0]);
  };

  // --- Logout ---
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/loginpage");
    } catch (err) {
      console.error(err);
      toast({ title: "Logout Error", description: "Failed to logout. Please try again.", variant: "destructive" });
    }
  };

  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="inline-flex items-center justify-center rounded-full h-10 w-10 border bg-white shadow-sm hover:bg-muted"
          aria-label="User Profile"
          disabled={isLoading}
        >
          <Avatar className="h-10 w-10">
            {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt="Profile" /> : <AvatarFallback>{isLoading ? "..." : initial}</AvatarFallback>}
          </Avatar>
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader><DialogTitle>Profile</DialogTitle></DialogHeader>

        {session?.user?.email && (
          <div className="mb-2">
            <Label>Email</Label>
            <div className="text-sm text-gray-600">{session.user.email}</div>
          </div>
        )}

        {/* Avatar */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`mb-4 flex items-center justify-center w-full h-32 border-2 rounded-md cursor-pointer ${dragOver ? "border-blue-500 bg-blue-50" : "border-dashed border-gray-300"} ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
          onClick={() => !isLoading && fileInputRef.current?.click()}
        >
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="h-28 w-28 rounded-full object-cover" />
          ) : (
            <span className="text-gray-500">{isLoading ? "Uploading..." : "Click or Drag & Drop Avatar"}</span>
          )}
          <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files && handleAvatarUpload(e.target.files[0])} disabled={isLoading} />
        </div>

        {/* Profile fields */}
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={profile.name || ""} onChange={(e) => updateProfile?.({ ...profile, name: e.target.value })} disabled={isLoading} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bio">Bio</Label>
            <Input id="bio" value={profile.bio || ""} onChange={(e) => updateProfile?.({ ...profile, bio: e.target.value })} disabled={isLoading} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dob">Date of Birth</Label>
            <Input id="dob" type="date" value={profile.date_of_birth || ""} onChange={(e) => updateProfile?.({ ...profile, date_of_birth: e.target.value })} disabled={isLoading} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="preferred_language">Language</Label>
            <Input id="preferred_language" value={profile.preferred_language || ""} onChange={(e) => updateProfile?.({ ...profile, preferred_language: e.target.value })} disabled={isLoading} />
          </div>

          <div className="flex items-center justify-between">
            <div className="font-medium">Email Notifications</div>
            <Switch checked={profile.notify_email} onCheckedChange={(v) => updateProfile?.({ ...profile, notify_email: v })} disabled={isLoading} />
          </div>

          <div className="flex items-center justify-between">
            <div className="font-medium">SMS Notifications</div>
            <Switch checked={profile.notify_sms} onCheckedChange={(v) => updateProfile?.({ ...profile, notify_sms: v })} disabled={isLoading} />
          </div>

          <div className="flex items-center justify-between">
            <div className="font-medium">Subscription</div>
            <span className={`font-bold ${profile.subscription_status === "premium" ? "text-purple-700" : "text-gray-700"}`}>{profile.subscription_status}</span>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2">
          <Button onClick={saveProfile} className="w-full" disabled={isLoading}>{isLoading ? "Saving..." : "Save Profile"}</Button>
          <Button variant="outline" className="w-full" onClick={handleLogout} disabled={isLoading}>Logout</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
