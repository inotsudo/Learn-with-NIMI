"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { createChild } from "@/lib/queries";
import type { Child } from "@/lib/queries";

export const AVATARS = ["🦁", "🐧", "🦊", "🐬", "🦋", "🐸", "🐨", "🦄"];
const LANGUAGES: { code: Child["language"]; label: string; flag: string }[] = [
  { code: "en", label: "English",    flag: "🇬🇧" },
  { code: "fr", label: "Français",   flag: "🇫🇷" },
  { code: "rw", label: "Kinyarwanda", flag: "🇷🇼" },
];

interface Props {
  onCreated: (child: Child) => void;
  onClose?: () => void;
}

export default function CreateChildModal({ onCreated, onClose }: Props) {
  const [name, setName]         = useState("");
  const [age, setAge]           = useState<number>(5);
  const [language, setLanguage] = useState<Child["language"]>("en");
  const [avatar, setAvatar]     = useState(AVATARS[0]);
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
      avatar_url: avatar,
    });
    setSaving(false);
    if (err || !child) { setError(err ?? "Something went wrong. Please try again."); return; }
    onCreated(child);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-white font-black text-lg tracking-wide">Create Profile</p>
              <p className="text-purple-200 text-[11px]">Who is going on this adventure?</p>
            </div>
            {onClose && (
              <button onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="px-5 py-5 space-y-4">

            {/* Avatar picker */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Pick an avatar</p>
              <div className="flex gap-2 flex-wrap">
                {AVATARS.map(a => (
                  <button
                    key={a}
                    onClick={() => setAvatar(a)}
                    className={`w-10 h-10 rounded-full text-xl flex items-center justify-center transition border-2 ${
                      avatar === a
                        ? "border-purple-500 bg-purple-50 scale-110 shadow"
                        : "border-transparent bg-gray-100 hover:bg-purple-50"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="Enter child's name..."
                maxLength={30}
                className="w-full border-2 border-purple-200 rounded-xl px-3 py-2 text-sm font-semibold text-gray-800 focus:outline-none focus:border-purple-500 transition placeholder:text-gray-300"
              />
            </div>

            {/* Age */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">
                Age: <span className="text-purple-600">{age}</span>
              </label>
              <input
                type="range" min={2} max={12} value={age}
                onChange={e => setAge(Number(e.target.value))}
                className="w-full accent-purple-600"
              />
              <div className="flex justify-between text-[10px] text-gray-400 font-semibold mt-0.5">
                <span>2</span><span>12</span>
              </div>
            </div>

            {/* Language */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Language</p>
              <div className="flex gap-2">
                {LANGUAGES.map(l => (
                  <button
                    key={l.code}
                    onClick={() => setLanguage(l.code)}
                    className={`flex-1 py-2 rounded-xl text-[11px] font-bold flex flex-col items-center gap-0.5 border-2 transition ${
                      language === l.code
                        ? "border-purple-500 bg-purple-50 text-purple-700"
                        : "border-gray-100 bg-gray-50 text-gray-500 hover:border-purple-200"
                    }`}
                  >
                    <span className="text-lg">{l.flag}</span>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-xs font-semibold text-center">{error}</p>
            )}

            {/* Submit */}
            <motion.button
              onClick={handleSubmit}
              disabled={saving}
              whileTap={{ scale: 0.96 }}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black rounded-2xl py-3 flex items-center justify-center gap-2 shadow-lg transition disabled:opacity-60"
            >
              {saving ? (
                <span className="text-sm">Creating...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm">Start Adventure!</span>
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
