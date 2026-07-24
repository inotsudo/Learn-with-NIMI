"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AvatarBuilder from "@/components/avatar/AvatarBuilder";
import ChildAvatar from "@/components/avatar/ChildAvatar";
import supabase from "@/lib/supabaseClient";
import { smartUpload } from "@/lib/uploadWithProgress";
import {
  type AvatarConfig,
  serializeAvatar, parseAvatar, DEFAULT_AVATAR,
} from "@/lib/avatarConfig";

const KID_EMOJIS = [
  "🦁","🐯","🦊","🐺","🐸","🦋","🦄","🐨","🐼","🐧","🦕","🦖",
  "🐬","🦈","🦅","🦜","🐉","🐙","🦑","🦩","🐱","🐶","🐻","🐰",
  "⭐","🌟","💎","🔮","🌈","🌊","🌺","🌸","🌻","🍀","🌙","☀️",
  "🎮","⚽","🎨","🎭","🏆","🥇","🎯","🎠","🎡","🎢","🎤","🎸",
  "🍕","🍦","🍩","🍭","🧁","🍓","🍒","🍉","🥝","🍑","🌮","🍔",
  "🦸","🧙","🧜","🧚","🤖","👾","🧸","🎃","🏄","🧗","🛸","🚀",
  "😊","😎","🤩","😄","🥳","😆","🤗","😜","🤪","🥰","🤓","😇",
];

type AvatarMode = "avatar" | "emoji" | "photo";
type SheetTab   = "avatar" | "photo" | "emoji" | "name";

interface Props {
  isOpen:           boolean;
  onClose:          () => void;
  onSave:           (name: string, avatarUrl: string) => Promise<void>;
  initialName:      string;
  initialAvatarUrl: string | null | undefined;
  /** Child (or parent) ID used as the storage path. If omitted, photo upload is disabled. */
  childId?:         string;
}

function isPhotoUrl(url: string | null | undefined): boolean {
  return !!(url?.startsWith("http") || url?.startsWith("blob:"));
}

export default function EditProfileSheet({
  isOpen, onClose, onSave, initialName, initialAvatarUrl, childId,
}: Props) {
  const existingConfig   = parseAvatar(initialAvatarUrl);
  const existingIsPhoto  = isPhotoUrl(initialAvatarUrl);
  const existingEmoji    = (initialAvatarUrl && !initialAvatarUrl.startsWith("ava:") && !existingIsPhoto)
    ? initialAvatarUrl : null;

  const deriveMode = (url: string | null | undefined): AvatarMode =>
    isPhotoUrl(url) ? "photo" : (url && !url.startsWith("ava:") ? "emoji" : "avatar");
  const deriveTab  = (url: string | null | undefined): SheetTab =>
    isPhotoUrl(url) ? "photo" : (url && !url.startsWith("ava:") ? "emoji" : "avatar");

  const [tab,            setTab]            = useState<SheetTab>(deriveTab(initialAvatarUrl));
  const [mode,           setMode]           = useState<AvatarMode>(deriveMode(initialAvatarUrl));
  const [cfg,            setCfg]            = useState<AvatarConfig>(existingConfig ?? DEFAULT_AVATAR);
  const [emoji,          setEmoji]          = useState<string | null>(existingEmoji);
  const [name,           setName]           = useState(initialName);
  const [saving,         setSaving]         = useState(false);
  const [done,           setDone]           = useState(false);
  const [photoFile,      setPhotoFile]      = useState<File | null>(null);
  const [photoPreview,   setPhotoPreview]   = useState<string | null>(existingIsPhoto ? (initialAvatarUrl ?? null) : null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError,    setUploadError]    = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const ec      = parseAvatar(initialAvatarUrl);
    const isPhoto = isPhotoUrl(initialAvatarUrl);
    const ee      = (initialAvatarUrl && !initialAvatarUrl.startsWith("ava:") && !isPhoto) ? initialAvatarUrl : null;
    setCfg(ec ?? DEFAULT_AVATAR);
    setEmoji(ee);
    setMode(deriveMode(initialAvatarUrl));
    setTab(deriveTab(initialAvatarUrl));
    setName(initialName);
    setPhotoFile(null);
    setPhotoPreview(isPhoto ? (initialAvatarUrl ?? null) : null);
    setUploadProgress(0);
    setUploadError(null);
    setDone(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const currentAvatarUrl =
    mode === "photo"
      ? (photoPreview ?? "🧒")
      : mode === "emoji"
        ? (emoji ?? "🧒")
        : serializeAvatar(cfg);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setMode("photo");
    setUploadError(null);
    e.target.value = "";
  };

  const handleSave = async () => {
    setSaving(true);
    setUploadError(null);

    let finalAvatarUrl = currentAvatarUrl;

    if (mode === "photo" && photoFile && childId?.length) {
      setUploadProgress(0);
      const { error } = await smartUpload(
        "avatars",
        `${childId!}/avatar.jpg`,
        photoFile,
        (p) => setUploadProgress(p.percent),
      );
      if (error) {
        setSaving(false);
        setUploadError("Upload failed — please try again.");
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(`${childId!}/avatar.jpg`);
      finalAvatarUrl = `${publicUrl}?t=${Date.now()}`;
    } else if (mode === "photo" && !photoFile) {
      // Existing saved photo — strip cache-bust param from initial URL
      const base = initialAvatarUrl?.split("?")[0] ?? "🧒";
      finalAvatarUrl = `${base}?t=${Date.now()}`;
    }

    await onSave(name.trim() || initialName, finalAvatarUrl);
    setSaving(false);
    setDone(true);
    setTimeout(() => { setDone(false); onClose(); }, 900);
  };

  const handleTabChange = (t: SheetTab) => {
    setTab(t);
    if (t !== "name") setMode(t as AvatarMode);
  };

  const TABS: { id: SheetTab; label: string; icon: string }[] = [
    { id: "avatar", label: "Avatar", icon: "🎭" },
    { id: "photo",  label: "Photo",  icon: "📷" },
    { id: "emoji",  label: "Emoji",  icon: "😊" },
    { id: "name",   label: "Name",   icon: "✏️" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-ds-card rounded-t-[28px] shadow-2xl overflow-hidden
                       sm:inset-0 sm:m-auto sm:h-fit sm:w-[580px] sm:rounded-3xl sm:max-h-[90vh]"
            style={{ maxHeight: "93vh" }}
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
              <div className="w-10 h-1 rounded-full bg-ds-border" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-3 pb-4 shrink-0 border-b border-ds-border">
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-14 h-14 rounded-full overflow-hidden ring-4 ring-[var(--ds-brand-primary)]/30 bg-ds-page shrink-0 flex items-center justify-center"
                  key={currentAvatarUrl}
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 0.3 }}
                >
                  <ChildAvatar avatarUrl={currentAvatarUrl} size={56} />
                </motion.div>
                <div>
                  <p className="font-baloo font-black text-ds-text text-[18px] leading-tight">
                    {name || initialName}
                  </p>
                  <p className="text-[11px] text-ds-muted font-semibold">Edit your profile ✨</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-ds-page flex items-center justify-center text-ds-muted hover:text-ds-text transition-colors"
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-ds-border shrink-0">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTabChange(t.id)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-black uppercase tracking-wide border-b-2 transition-all ${
                    tab === t.id
                      ? "border-[var(--ds-brand-primary)] text-[var(--ds-brand-primary)]"
                      : "border-transparent text-ds-muted hover:text-ds-text"
                  }`}
                >
                  <span className="text-lg leading-none">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  {/* ── Avatar builder ── */}
                  {tab === "avatar" && (
                    <div className="p-4">
                      <AvatarBuilder initial={cfg} onChange={next => { setCfg(next); setMode("avatar"); }} />
                    </div>
                  )}

                  {/* ── Photo upload ── */}
                  {tab === "photo" && (
                    <div className="p-6 flex flex-col items-center gap-6">
                      {/* Preview circle */}
                      <div className="relative">
                        <motion.div
                          key={photoPreview ?? "empty"}
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="w-36 h-36 rounded-full overflow-hidden ring-4 ring-[var(--ds-brand-primary)]/40 bg-ds-page flex items-center justify-center shadow-lg"
                        >
                          {photoPreview ? (
                            <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-5xl select-none">📷</span>
                          )}
                        </motion.div>
                        {photoPreview && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-green-500 text-white flex items-center justify-center text-lg shadow-md border-2 border-white"
                          >
                            ✓
                          </motion.div>
                        )}
                      </div>

                      {/* Hidden file input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleFileChange}
                        aria-hidden
                      />

                      {/* Pick / change button */}
                      <div className="w-full space-y-3">
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-dashed border-[var(--ds-brand-primary)]/50 bg-[var(--ds-brand-subtle)] text-[var(--ds-brand-primary)] font-black text-[15px] transition hover:border-[var(--ds-brand-primary)] hover:shadow-sm"
                        >
                          <span className="text-2xl">📷</span>
                          {photoPreview ? "Change Photo" : "Choose a Photo"}
                        </motion.button>

                        <p className="text-center text-[11px] text-ds-muted font-semibold leading-relaxed">
                          On mobile, tap to take a selfie or pick from your gallery.{"\n"}
                          Your photo is cropped to a circle automatically.
                        </p>
                      </div>

                      {/* Upload progress */}
                      {saving && uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="w-full">
                          <div className="h-2 bg-ds-border rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-[var(--ds-brand-primary)] rounded-full"
                              animate={{ width: `${uploadProgress}%` }}
                              transition={{ duration: 0.2 }}
                            />
                          </div>
                          <p className="text-center text-[11px] text-ds-muted mt-1.5 font-semibold">
                            Uploading… {uploadProgress}%
                          </p>
                        </div>
                      )}

                      {uploadError && (
                        <p className="text-red-500 text-[12px] font-semibold text-center">{uploadError}</p>
                      )}
                    </div>
                  )}

                  {/* ── Emoji picker ── */}
                  {tab === "emoji" && (
                    <div className="p-5">
                      <p className="text-[12px] font-black text-ds-muted uppercase tracking-widest mb-4">
                        Pick your favorite!
                      </p>
                      <div className="grid grid-cols-6 sm:grid-cols-8 gap-2.5">
                        {KID_EMOJIS.map(e => {
                          const isSelected = emoji === e && mode === "emoji";
                          return (
                            <motion.button
                              key={e}
                              onClick={() => { setEmoji(e); setMode("emoji"); }}
                              whileTap={{ scale: 0.82 }}
                              className={`aspect-square rounded-2xl flex items-center justify-center text-3xl transition-all border-2 ${
                                isSelected
                                  ? "border-[var(--ds-brand-primary)] bg-[var(--ds-brand-subtle)] shadow-md scale-110 ring-2 ring-[var(--ds-brand-primary)]/30"
                                  : "border-ds-border bg-ds-page hover:scale-105 hover:border-[var(--ds-brand-primary)]/40"
                              }`}
                            >
                              {e}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── Name editor ── */}
                  {tab === "name" && (
                    <div className="p-6 flex flex-col items-center gap-6">
                      <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-[var(--ds-brand-primary)]/30 bg-ds-page flex items-center justify-center">
                        <ChildAvatar avatarUrl={currentAvatarUrl} size={96} />
                      </div>
                      <div className="w-full">
                        <label className="block text-[13px] font-black text-ds-muted uppercase tracking-widest mb-3 text-center">
                          What&apos;s your name?
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={e => setName(e.target.value.slice(0, 24))}
                          placeholder={initialName}
                          maxLength={24}
                          autoFocus
                          className="w-full text-center text-[28px] font-baloo font-black text-ds-text bg-ds-page border-2 border-ds-border rounded-2xl px-4 py-4 focus:outline-none focus:border-[var(--ds-brand-primary)] transition-colors placeholder:text-ds-muted/50"
                          style={{ letterSpacing: "-0.01em" }}
                        />
                        <p className="text-center text-[11px] text-ds-muted mt-2 font-semibold">
                          {name.length} / 24 characters
                        </p>
                      </div>
                      <div className="w-full">
                        <p className="text-[11px] font-black text-ds-muted uppercase tracking-widest mb-3 text-center">
                          Quick ideas ✨
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {["Explorer","Star","Champion","Hero","Genius","Legend","Rainbow","Thunder"].map(n => (
                            <button
                              key={n}
                              onClick={() => setName(n)}
                              className="px-3 py-1.5 rounded-full bg-ds-page border border-ds-border text-[12px] font-bold text-ds-muted hover:border-[var(--ds-brand-primary)] hover:text-[var(--ds-brand-primary)] transition-all"
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Save button */}
            <div className="shrink-0 px-5 py-4 border-t border-ds-border bg-ds-card">
              <motion.button
                onClick={handleSave}
                disabled={saving || done}
                whileTap={!saving && !done ? { scale: 0.96 } : {}}
                className="w-full py-4 rounded-2xl font-baloo font-black text-[17px] text-white transition-all relative overflow-hidden"
                style={{ background: done ? "#22c55e" : "var(--ds-brand-primary)" }}
              >
                <AnimatePresence mode="wait">
                  {done ? (
                    <motion.span key="done" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center justify-center gap-2">
                      ✅ Saved!
                    </motion.span>
                  ) : saving ? (
                    <motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.3" />
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                      {mode === "photo" && uploadProgress > 0 && uploadProgress < 100
                        ? `Uploading… ${uploadProgress}%`
                        : "Saving…"}
                    </motion.span>
                  ) : (
                    <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex items-center justify-center gap-2">
                      ✨ Save my profile
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
