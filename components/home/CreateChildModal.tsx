"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { X, Star, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import Link from "next/link";
import { createChild } from "@/lib/queries";
import type { Child } from "@/lib/queries";
import AvatarBuilder from "@/components/avatar/AvatarBuilder";
import { serializeAvatar, DEFAULT_AVATAR, type AvatarConfig } from "@/lib/avatarConfig";

// Keep the old export so anything importing AVATARS doesn't break immediately
export const AVATARS = ["🦁", "🐧", "🦊", "🐬", "🦋", "🐸", "🐨", "🦄"];

const LANGUAGES: { code: Child["language"]; label: string; flag: string }[] = [
  { code: "en", label: "English",     flag: "🇬🇧" },
  { code: "fr", label: "Français",    flag: "🇫🇷" },
  { code: "rw", label: "Kinyarwanda", flag: "🇷🇼" },
];

type Step = "design" | "details";

interface Props {
  onCreated: (child: Child) => void;
  onClose?: () => void;
}

export default function CreateChildModal({ onCreated, onClose }: Props) {
  const m = useThemeMotion();
  const [step, setStep] = useState<Step>("design");
  const [avatarCfg, setAvatarCfg] = useState<AvatarConfig>(DEFAULT_AVATAR);
  const [name, setName]         = useState("");
  const [age, setAge]           = useState<number>(5);
  const [language, setLanguage] = useState<Child["language"]>("en");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Please enter a name!"); return; }
    setSaving(true);
    setError("");
    const { data: child, error: err } = await createChild({
      name: name.trim(),
      age,
      language,
      avatar_url: serializeAvatar(avatarCfg),
    });
    setSaving(false);
    if (err === "subscription_required") { setError("subscription_required"); return; }
    if (err || !child) { setError(err ?? "Something went wrong. Please try again."); return; }
    onCreated(child);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ scale: 0.88, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.88, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          className="bg-ds-card border border-ds-border shadow-[0_24px_64px_rgba(0,0,0,0.25)] w-full max-w-2xl overflow-hidden my-4"
          style={{ borderRadius: 'var(--leaf-r-lg)' }}
        >
          {/* Header */}
          <div className="px-5 py-4 flex items-center justify-between" style={{ backgroundColor: 'var(--nimi-green)' }}>
            <div>
              <p className="text-white font-black text-lg tracking-wide">
                {step === "design" ? "Design your Explorer!" : "Almost there!"}
              </p>
              <p className="text-white/75 text-[12px]">
                {step === "design" ? "Create a unique look for your child" : "Tell us a bit about your explorer"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Step dots */}
              <div className="flex gap-1.5 mr-1">
                {(["design", "details"] as Step[]).map(s => (
                  <div key={s} className={`w-2 h-2 rounded-full transition-all ${step === s ? "bg-white" : "bg-white/40"}`} />
                ))}
              </div>
              {onClose && (
                <button onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === "design" ? (
              <motion.div
                key="design"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-4">
                  <AvatarBuilder initial={avatarCfg} onChange={setAvatarCfg} />
                </div>
                <div className="px-4 pb-4">
                  <motion.button
                    onClick={() => setStep("details")}
                    whileTap={m.buttonPress}
                    className="w-full text-white font-black py-3.5 text-sm flex items-center justify-center gap-2 rounded-xl transition"
                    style={{ backgroundColor: 'var(--nimi-green)' }}
                  >
                    Next: Explorer Details
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="px-5 py-5 space-y-4"
              >
                {/* Name */}
                <div>
                  <label className="text-xs font-bold text-ds-text uppercase tracking-wide block mb-1">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    placeholder="Enter child's name..."
                    maxLength={30}
                    className="w-full border border-ds-border bg-ds-input rounded-xl px-3 py-2.5 text-sm font-semibold text-ds-text focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] transition placeholder:text-gray-400"
                  />
                </div>

                {/* Age */}
                <div>
                  <label className="text-xs font-bold text-ds-text uppercase tracking-wide block mb-1">
                    Age: <span className="text-[var(--ds-brand-primary)]">{age}</span>
                  </label>
                  <input
                    type="range" min={2} max={12} value={age}
                    onChange={e => setAge(Number(e.target.value))}
                    className="w-full accent-green-600"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 font-semibold mt-0.5">
                    <span>2</span><span>12</span>
                  </div>
                </div>

                {/* Language */}
                <div>
                  <p className="text-xs font-bold text-ds-text uppercase tracking-wide mb-2">Language</p>
                  <div className="flex gap-2">
                    {LANGUAGES.map(l => (
                      <button
                        key={l.code}
                        onClick={() => setLanguage(l.code)}
                        className={`flex-1 py-3 rounded-xl text-[12px] font-bold flex flex-col items-center gap-1 border-2 transition ${
                          language === l.code
                            ? "border-[var(--ds-border-brand)] bg-[var(--ds-brand-subtle)] text-[var(--ds-brand-primary)]"
                            : "border-ds-border bg-gray-50 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        <span className="text-xl">{l.flag}</span>
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>

                {error === "subscription_required" ? (
                  <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 flex flex-col items-center gap-3 text-center">
                    <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-black text-ds-text text-[14px]">Free plan: 1 child included</p>
                      <p className="text-gray-500 text-[12px] mt-0.5">Upgrade to Nimipiko Club to add unlimited explorers.</p>
                    </div>
                    <Link href="/pricing?reason=add-child"
                      className="w-full text-center text-white font-black text-[13px] py-2.5 rounded-xl transition"
                      style={{ backgroundColor: 'var(--nimi-green)' }}>
                      See Plans →
                    </Link>
                  </div>
                ) : error ? (
                  <p className="text-red-500 text-xs font-semibold text-center">{error}</p>
                ) : null}

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setStep("design")}
                    className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-ds-border text-ds-muted font-bold text-sm hover:bg-gray-50 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                  <motion.button
                    onClick={handleSubmit}
                    disabled={saving}
                    whileTap={m.buttonPress}
                    className="flex-1 text-white font-black py-3 flex items-center justify-center gap-2 rounded-xl shadow-md transition disabled:opacity-60"
                    style={{ backgroundColor: 'var(--nimi-green)' }}
                  >
                    {saving ? (
                      <span className="text-sm">Creating...</span>
                    ) : (
                      <>
                        <Star className="w-4 h-4" />
                        <span className="text-sm">Start Adventure!</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
