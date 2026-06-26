"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { personalizeTitle } from "@/lib/personalize";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  storyTitle: string;
  childName: string;
  onApply: (name: string) => void;
}

export default function PersonalizeModal({ isOpen, onClose, storyTitle, childName, onApply }: Props) {
  const [name, setName] = useState(childName);
  const preview = personalizeTitle(storyTitle, name);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative z-10 bg-gradient-to-b from-[#2a1660] to-[#15092e] rounded-[24px] border theme-border shadow-2xl p-6 sm:p-8 max-w-md w-full"
          >
            <button onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/60 transition">
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h2 className="font-black text-white text-xl">Personalize Story</h2>
              <p className="theme-text-faint text-[13px] mt-1">Make this story special!</p>
            </div>

            {/* Name input */}
            <div className="mb-5">
              <label className="block text-[11px] font-bold theme-text-faint uppercase tracking-wide mb-1.5">Child&apos;s Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={30}
                className="w-full bg-white/[0.07] border border-white/[0.12] rounded-xl px-4 py-3 text-white font-bold text-[15px] focus:outline-none focus:theme-border-strong/40 transition placeholder:text-white/20"
                placeholder="Enter name..."
              />
            </div>

            {/* Live preview */}
            <div className="mb-6">
              <label className="block text-[11px] font-bold theme-text-faint uppercase tracking-wide mb-1.5">Preview</label>
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-[16px] p-4 text-center">
                <p className="theme-text-faint text-[10px] font-bold mb-1">Story title becomes:</p>
                <motion.p
                  key={preview}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-black text-white text-[16px] leading-tight"
                >
                  ✨ {preview}
                </motion.p>
                <p className="theme-text-faint text-[10px] mt-2">
                  &quot;Hello {name || "Friend"}!&quot; will appear in story pages
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] theme-text/70 font-black rounded-full py-3 text-[13px] transition">
                Cancel
              </button>
              <button
                onClick={() => { onApply(name.trim() || childName); onClose(); }}
                className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-black rounded-full py-3 text-[13px] shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-shadow"
              >
                ✨ Apply Personalization
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
