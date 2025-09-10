"use client";

import { useState } from "react";
import supabase from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";

interface UploadMissionMediaProps {
  missionId: string;
  onUploadComplete?: (urls: { videoUrl?: string; audioUrl?: string }) => void;
}

export default function UploadMissionMedia({ missionId, onUploadComplete }: UploadMissionMediaProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<File | null>>
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      setter(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File, type: "video" | "audio") => {
    if (!file) return null;

    const fileExt = file.name.split(".").pop();
    const fileName = `${missionId}/${type}-${Date.now()}.${fileExt}`;
    const filePath = fileName;

    // Upload the file
    const { error } = await supabase.storage
      .from("mission-media")
      .upload(filePath, file, { upsert: true });

    if (error) {
      console.error(`Upload error (${type}):`, error);
      setMessage(`Upload failed for ${type}: ${error.message}`);
      return null;
    }

    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from("mission-media")
      .getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) {
      setMessage(`Failed to get public URL for ${type}`);
      return null;
    }

    return publicUrlData.publicUrl;
  };

  const handleUpload = async () => {
    setUploading(true);
    setMessage("");

    try {
      const videoUrl = videoFile ? await uploadFile(videoFile, "video") : null;
      const audioUrl = audioFile ? await uploadFile(audioFile, "audio") : null;

      if (!videoUrl && !audioUrl) {
        setMessage("No files uploaded.");
        setUploading(false);
        return;
      }

      // Update the mission record with new URLs
      const { error } = await supabase
        .from("daily_missions")
        .update({
          ...(videoUrl && { video_url: videoUrl }),
          ...(audioUrl && { audio_url: audioUrl }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", missionId);

      if (error) {
        setMessage(`Database update failed: ${error.message}`);
        setUploading(false);
        return;
      }

      setMessage("Upload & DB update successful!");

      if (onUploadComplete) {
        onUploadComplete({ videoUrl: videoUrl || undefined, audioUrl: audioUrl || undefined });
      }

      setVideoFile(null);
      setAudioFile(null);
    } catch (err) {
      setMessage("Upload failed. Please try again.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block font-semibold mb-1">Upload Video</label>
        <input
          type="file"
          accept="video/*"
          onChange={(e) => handleFileChange(e, setVideoFile)}
          disabled={uploading}
        />
        {videoFile && <p className="text-sm text-gray-600 mt-1">Selected: {videoFile.name}</p>}
      </div>

      <div>
        <label className="block font-semibold mb-1">Upload Audio</label>
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => handleFileChange(e, setAudioFile)}
          disabled={uploading}
        />
        {audioFile && <p className="text-sm text-gray-600 mt-1">Selected: {audioFile.name}</p>}
      </div>

      <Button
        onClick={handleUpload}
        disabled={uploading || (!videoFile && !audioFile)}
        className="bg-blue-600 text-white px-6 py-2 rounded"
      >
        {uploading ? "Uploading..." : "Upload Files"}
      </Button>

      {message && <p className="mt-2 text-sm text-gray-700">{message}</p>}
    </div>
  );
}
