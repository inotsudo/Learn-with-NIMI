"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AvatarBuilder from "@/components/avatar/AvatarBuilder";
import ChildAvatar from "@/components/avatar/ChildAvatar";
import {
  type AvatarConfig,
  serializeAvatar, parseAvatar, DEFAULT_AVATAR,
} from "@/lib/avatarConfig";

// ─── Kid-friendly emoji palette ──────────────────────────────────────────────
const KID_EMOJIS = [
  "🦁","🐯","🦊","🐺","🐸","🦋","🦄","🐨","🐼","🐧","🦕","🦖",
  "🐬","🦈","🦅","🦜","🐉","🐙","🦑","🦩","🐱","🐶","🐻","🐰",
  "⭐","🌟","💎","🔮","🌈","🌊","🌺","🌸","🌻","🍀","🌙","☀️",
  "🎮","⚽","🎨","🎭","🏆","🥇","🎯","🎠","🎡","🎢","🎤","🎸",
  "🍕","🍦","🍩","🍭","🧁","🍓","🍒","🍉","🥝","🍑","🌮","🍔",
  "🦸","🧙","🧜","🧚","🤖","👾","🧸","🎃","🏄","🧗","🛸","🚀",
  "😊","😎","🤩","😄","🥳","😆","🤗","😜","🤪","🥰","🤓","😇",
];

type AvatarMode = "avatar" | "emoji";
type SheetTab   = "avatar" | "emoji" | "name";

interface Props {
  isOpen:         boolean;
  onClose:        () => void;
  onSave:         (name: string, avatarUrl: string) => Promise<void>;
  initialName:    string;
  initialAvatarUrl: string | null | undefined;
}

export default function EditProfileSheet({
  isOpen, onClose, onSave, initialName, initialAvatarUrl,
}: Props) {
  const existingConfig = parseAvatar(initialAvatarUrl);
  const existingEmoji  = (initialAvatarUrl && !initialAvatarUrl.startsWith("ava:") && !initialAvatarUrl.startsWith("http"))
    ? initialAvatarUrl : null;

  const [tab,      setTab]      = useState<SheetTab>("avatar");
  const [mode,     setMode]     = useState<AvatarMode>(existingEmoji ? "emoji" : "avatar");
  const [cfg,      setCfg]      = useState<AvatarConfig>(existingConfig ?? DEFAULT_AVATAR);
  const [emoji,    setEmoji]    = useState<string | null>(existingEmoji);
  const [name,     setName]     = useState(initialName);
  const [saving,   setSaving]   = useState(false);
  const [done,     setDone]     = useState(false);

  // Reset when sheet opens fresh
  useEffect(() => {
    if (isOpen) {
      const ec = parseAvatar(initialAvatarUrl);
      const ee = (initialAvatarUrl && !initialAvatarUrl.startsWith("ava:") && !initialAvatarUrl.startsWith("http"))
        ? initialAvatarUrl : null;
      setCfg(ec ?? DEFAULT_AVATAR);
      setEmoji(ee);
      setMode(ee ? "emoji" : "avatar");
      setName(initialName);
      setTab("avatar");
      setDone(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const currentAvatarUrl =
    mode === "emoji" ? (emoji ?? "🧒") : serializeAvatar(cfg);

  const handleSave = async () => {
    setSaving(true);
    await onSave(name.trim() || initialName, currentAvatarUrl);
    setSaving(false);
    setDone(true);
    setTimeout(() => {
      setDone(false);
      onClose();
    }, 900);
  };

  const handleTabChange = (t: SheetTab) => {
    setTab(t);
    if (t === "avatar") setMode("avatar");
    if (t === "emoji")  setMode("emoji");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-ds-card rounded-t-[28px] shadow-2xl overflow-hidden
                       sm:inset-0 sm:m-auto sm:h-fit sm:w-[560px] sm:rounded-3xl sm:max-h-[90vh]"
            style={{ maxHeight: "93vh" }}
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Drag handle (mobile) */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
              <div className="w-10 h-1 rounded-full bg-ds-border" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-3 pb-4 shrink-0 border-b border-ds-border">
              <div className="flex items-center gap-3">
                {/* Live preview bubble */}
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
              {([
                { id: "avatar", label: "My Avatar", icon: "🎭" },
                { id: "emoji",  label: "Emoji",     icon: "😊" },
                { id: "name",   label: "My Name",   icon: "✏️" },
              ] as { id: SheetTab; label: string; icon: string }[]).map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTabChange(t.id)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-[11px] font-black uppercase tracking-wide border-b-2 transition-all ${
                    tab === t.id
                      ? "border-[var(--ds-brand-primary)] text-[var(--ds-brand-primary)]"
                      : "border-transparent text-ds-muted hover:text-ds-text"
                  }`}
                >
                  <span className="text-xl leading-none">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content — scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  {/* ── Avatar builder tab ── */}
                  {tab === "avatar" && (
                    <div className="p-4">
                      <AvatarBuilder
                        initial={cfg}
                        onChange={next => {
                          setCfg(next);
                          setMode("avatar");
                        }}
                      />
                    </div>
                  )}

                  {/* ── Emoji picker tab ── */}
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

                  {/* ── Name editor tab ── */}
                  {tab === "name" && (
                    <div className="p-6 flex flex-col items-center gap-6">
                      <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-[var(--ds-brand-primary)]/30 bg-ds-page flex items-center justify-center">
                        <ChildAvatar avatarUrl={currentAvatarUrl} size={96} />
                      </div>

                      <div className="w-full">
                        <label className="block text-[13px] font-black text-ds-muted uppercase tracking-widest mb-3 text-center">
                          What's your name?
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

                      {/* Fun name suggestions */}
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

            {/* Footer — save button */}
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
                    <motion.span key="done"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center justify-center gap-2"
                    >
                      ✅ Saved!
                    </motion.span>
                  ) : saving ? (
                    <motion.span key="saving"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-center gap-2"
                    >
                      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.3" />
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                      Saving…
                    </motion.span>
                  ) : (
                    <motion.span key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-center gap-2"
                    >
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
