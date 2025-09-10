"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export type ShareMethod = "public" | "whatsapp";

export interface UploadFormState {
  childName: string;
  age: string;
  description: string;
  isPublic: boolean;
  imageFile: File | null;
  previewUrl: string;
  uploadProgress: number;
  isUploading: boolean;
  shareMethod: ShareMethod;
}

export default function UploadModal({
  open,
  onClose,
  onSubmit,
  formState,
  setFormState,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void; // ✅ Accept the form event
  formState: UploadFormState;
  setFormState: React.Dispatch<React.SetStateAction<UploadFormState>>;
}) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null); // ✅ Use ref instead of ID

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    setFormState((prev) => ({
      ...prev,
      imageFile: file,
      previewUrl: URL.createObjectURL(file),
    }));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileChange(file);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Artwork</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Child Name */}
          <Input
            placeholder="Child's Name"
            value={formState.childName}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, childName: e.target.value }))
            }
            disabled={formState.isUploading}
          />

          {/* Age */}
          <Input
            placeholder="Age"
            value={formState.age}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, age: e.target.value }))
            }
            disabled={formState.isUploading}
          />

          {/* Description */}
          <Textarea
            placeholder="Description"
            value={formState.description}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, description: e.target.value }))
            }
            disabled={formState.isUploading}
          />

          {/* File Upload */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition 
              ${dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"}
              ${formState.isUploading ? "opacity-50 pointer-events-none" : ""}
            `}
            onClick={() => fileInputRef.current?.click()} // ✅ Use ref
          >
            {formState.previewUrl ? (
              <div className="relative w-full h-48">
                <Image
                  src={formState.previewUrl}
                  alt="Preview"
                  fill
                  className="object-contain rounded-lg"
                  unoptimized // ✅ Needed for blob URLs
                />
              </div>
            ) : (
              <p>Drag & drop or click to select an image</p>
            )}
            <input
              ref={fileInputRef} // ✅ ref
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              disabled={formState.isUploading}
            />
          </div>

          {/* Share Method Selection */}
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">Sharing Method</label>
            <div className="flex space-x-6">
              {/* Public option */}
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="shareMethod"
                  value="public"
                  checked={formState.shareMethod === "public"}
                  onChange={() =>
                    setFormState((prev) => ({
                      ...prev,
                      isPublic: true,
                      shareMethod: "public",
                    }))
                  }
                  disabled={formState.isUploading}
                />
                <span>Public</span>
              </label>

              {/* WhatsApp option */}
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="shareMethod"
                  value="whatsapp"
                  checked={formState.shareMethod === "whatsapp"}
                  onChange={() =>
                    setFormState((prev) => ({
                      ...prev,
                      isPublic: false,
                      shareMethod: "whatsapp",
                    }))
                  }
                  disabled={formState.isUploading}
                />
                <span>WhatsApp</span>
              </label>
            </div>
          </div>

          {/* Upload Button */}
          <Button
            onClick={(e) => onSubmit(e)} // ✅ Pass event
            disabled={formState.isUploading || !formState.imageFile}
          >
            {formState.isUploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
