"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING } from "@/lib/design-system/motion";
import { X } from "lucide-react";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import type { CreationType, UploadFormState } from "./types";

const CREATION_TYPES: { id: CreationType; emoji: string; labelKey: string }[] = [
  { id: "art", emoji: "🎨", labelKey: "creationTypeArt" },
  { id: "coloring", emoji: "🖍️", labelKey: "creationTypeColoring" },
  { id: "story", emoji: "📖", labelKey: "creationTypeStory" },
];

const inputClass =
  "w-full border border-ds-border bg-ds-input leaf px-3 py-2 text-sm font-semibold text-ds-text focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] transition placeholder:text-gray-400";

export default function UploadModal({
  open,
  onClose,
  onSubmit,
  formState,
  setFormState,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formState: UploadFormState;
  setFormState: React.Dispatch<React.SetStateAction<UploadFormState>>;
}) {
  const { t } = useLanguage();
  const [dragActive, setDragActive] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

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
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={SPRING.modal}
          className="bg-white border border-ds-border shadow-2xl w-full max-w-lg my-8 overflow-hidden"
          style={{ borderRadius: 'var(--leaf-r-lg)' }}
        >
          <div className="px-5 py-4 flex items-center justify-between sticky top-0" style={{ backgroundColor: 'var(--nimi-green)' }}>
            <p className="text-white font-black text-lg tracking-wide">{t("uploadArtworkTitle")}</p>
            <button
              onClick={() => !formState.isUploading && onClose()}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 py-5 space-y-4">
            <input
              type="text"
              placeholder={t("creationChildNamePlaceholder")}
              value={formState.childName}
              onChange={(e) => setFormState((prev) => ({ ...prev, childName: e.target.value }))}
              disabled={formState.isUploading}
              className={inputClass}
            />

            <input
              type="text"
              placeholder={t("agePlaceholder")}
              value={formState.age}
              onChange={(e) => setFormState((prev) => ({ ...prev, age: e.target.value }))}
              disabled={formState.isUploading}
              className={inputClass}
            />

            <textarea
              placeholder={t("descriptionPlaceholder")}
              value={formState.description}
              onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
              disabled={formState.isUploading}
              rows={3}
              className={`${inputClass} resize-none`}
            />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed leaf p-4 text-center cursor-pointer transition
                ${dragActive ? "border-[var(--ds-border-brand)] bg-[var(--ds-brand-subtle)]" : "border-gray-300 bg-gray-50 hover:bg-gray-100"}
                ${formState.isUploading ? "opacity-50 pointer-events-none" : ""}
              `}
            >
              {formState.previewUrl ? (
                <div className="relative w-full h-48">
                  <Image
                    src={formState.previewUrl}
                    alt="Preview"
                    fill
                    className="object-contain rounded-lg"
                    unoptimized
                  />
                </div>
              ) : (
                <p className="text-ds-text font-semibold text-sm">{t("dragDropImageLabel")}</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                disabled={formState.isUploading}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-ds-text uppercase tracking-wide">{t("chooseTypeLabel")}</label>
              <div className="flex gap-2">
                {CREATION_TYPES.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setFormState((prev) => ({ ...prev, creationType: option.id }))}
                    disabled={formState.isUploading}
                    className={`flex-1 flex flex-col items-center gap-1 leaf border-2 py-2 text-xs font-bold transition ${
                      formState.creationType === option.id
                        ? "border-[var(--ds-border-brand)] bg-[var(--ds-brand-subtle)] text-[var(--ds-brand-primary)]"
                        : "border-ds-border bg-white text-ds-text hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-lg">{option.emoji}</span>
                    {t(option.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-ds-text uppercase tracking-wide">{t("sharingMethodLabel")}</label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-ds-text">
                  <input
                    type="radio"
                    name="shareMethod"
                    value="public"
                    checked={formState.shareMethod === "public"}
                    onChange={() => setFormState((prev) => ({ ...prev, isPublic: true, shareMethod: "public" }))}
                    disabled={formState.isUploading}
                    className="accent-green-600"
                  />
                  <span>{t("sharePubliclyLabel")}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-ds-text">
                  <input
                    type="radio"
                    name="shareMethod"
                    value="whatsapp"
                    checked={formState.shareMethod === "whatsapp"}
                    onChange={() => setFormState((prev) => ({ ...prev, isPublic: false, shareMethod: "whatsapp" }))}
                    disabled={formState.isUploading}
                    className="accent-green-600"
                  />
                  <span>{t("shareWhatsappLabel")}</span>
                </label>
              </div>
            </div>

            {/* COPPA/GDPR consent — required before submit */}
            <label className={`flex items-start gap-3 cursor-pointer p-3 rounded-xl border transition ${
              consentChecked ? "border-green-300 bg-green-50" : "border-amber-200 bg-amber-50"
            }`}>
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                disabled={formState.isUploading}
                className="mt-0.5 w-4 h-4 accent-green-600 shrink-0 cursor-pointer"
              />
              <span className="font-nunito text-[12px] text-gray-700 leading-relaxed">
                I agree to the{" "}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-green-700 underline font-bold">
                  Terms of Use
                </a>{" "}
                and confirm I have the right to share this content on Nimipiko.
              </span>
            </label>

            <div className="flex gap-3 pt-1">
              <button
                onClick={(e) => onSubmit(e)}
                disabled={formState.isUploading || !formState.imageFile || !consentChecked}
                className="flex-1 text-white font-black py-2.5 text-sm transition disabled:opacity-60"
                style={{ backgroundColor: 'var(--nimi-green)', borderRadius: 'var(--leaf-r-sm)' }}
              >
                {formState.isUploading ? t("uploadingLabel") : t("uploadBtnLabel")}
              </button>
              <button
                onClick={() => !formState.isUploading && onClose()}
                disabled={formState.isUploading}
                className="flex-1 border border-ds-border text-ds-text font-black rounded-full py-2.5 text-sm hover:bg-gray-50 transition disabled:opacity-60"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
