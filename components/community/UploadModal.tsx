"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import type { CreationType, UploadFormState } from "./types";

const CREATION_TYPES: { id: CreationType; emoji: string; labelKey: string }[] = [
  { id: "art", emoji: "🎨", labelKey: "creationTypeArt" },
  { id: "coloring", emoji: "🖍️", labelKey: "creationTypeColoring" },
  { id: "story", emoji: "📖", labelKey: "creationTypeStory" },
];

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
  const { t } = useLanguage();
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
          <DialogTitle>{t("uploadArtworkTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Child Name */}
          <Input
            placeholder={t("creationChildNamePlaceholder")}
            value={formState.childName}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, childName: e.target.value }))
            }
            disabled={formState.isUploading}
          />

          {/* Age */}
          <Input
            placeholder={t("agePlaceholder")}
            value={formState.age}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, age: e.target.value }))
            }
            disabled={formState.isUploading}
          />

          {/* Description */}
          <Textarea
            placeholder={t("descriptionPlaceholder")}
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
              <p>{t("dragDropImageLabel")}</p>
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

          {/* Creation Type Selection */}
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">{t("chooseTypeLabel")}</label>
            <div className="flex gap-2">
              {CREATION_TYPES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFormState((prev) => ({ ...prev, creationType: option.id }))}
                  disabled={formState.isUploading}
                  className={`flex-1 flex flex-col items-center gap-1 rounded-lg border-2 py-2 text-xs font-bold transition-colors ${
                    formState.creationType === option.id
                      ? "border-purple-500 bg-purple-50 text-purple-700"
                      : "border-gray-200 text-gray-500"
                  }`}
                >
                  <span className="text-lg">{option.emoji}</span>
                  {t(option.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Share Method Selection */}
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">{t("sharingMethodLabel")}</label>
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
                <span>{t("sharePubliclyLabel")}</span>
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
                <span>{t("shareWhatsappLabel")}</span>
              </label>
            </div>
          </div>

          {/* Upload Button */}
          <Button
            onClick={(e) => onSubmit(e)} // ✅ Pass event
            disabled={formState.isUploading || !formState.imageFile}
          >
            {formState.isUploading ? t("uploadingLabel") : t("uploadBtnLabel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
