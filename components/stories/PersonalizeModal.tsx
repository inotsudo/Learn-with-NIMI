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
            className="relative z-10 bg-white border border-ds-border shadow-ds-card leaf p-6 sm:p-8 max-w-md w-full"
          >
            <button onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 transition">
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-6">
              <div className="w-14 h-14 flex items-center justify-center mx-auto mb-3 shadow-lg" style={{ backgroundColor: 'var(--nimi-green)', borderRadius: 'var(--leaf-r)' }}>
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h2 className="font-black text-ds-text text-xl">Personalize Story</h2>
              <p className="text-gray-400 text-[13px] mt-1">Make this story special!</p>
            </div>

            {/* Name input */}
            <div className="mb-5">
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Child&apos;s Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={30}
                className="w-full bg-ds-input border border-ds-border leaf px-4 py-3 text-ds-text font-bold text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] transition placeholder:text-gray-400"
                placeholder="Enter name..."
              />
            </div>

            {/* Live preview */}
            <div className="mb-6">
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Preview</label>
              <div className="bg-gray-50 border border-ds-border leaf p-4 text-center">
                <p className="text-gray-400 text-[10px] font-bold mb-1">Story title becomes:</p>
                <motion.p
                  key={preview}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-black text-ds-text text-[16px] leading-tight"
                >
                  ✨ {preview}
                </motion.p>
                <p className="text-gray-400 text-[10px] mt-2">
                  &quot;Hello {name || "Friend"}!&quot; will appear in story pages
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 bg-gray-50 hover:bg-gray-100 border border-ds-border text-gray-600 font-black rounded-full py-3 text-[13px] transition">
                Cancel
              </button>
              <button
                onClick={() => { onApply(name.trim() || childName); onClose(); }}
                className="flex-1 text-white font-black py-3 text-[13px] shadow-lg transition"
                style={{ backgroundColor: 'var(--nimi-green)', borderRadius: 'var(--leaf-r-sm)' }}
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
