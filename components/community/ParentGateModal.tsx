"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, X } from "lucide-react";

interface Props {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  childName: string;
  shareType: string;
}

export default function ParentGateModal({ isOpen, onConfirm, onCancel, childName, shareType }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative z-10 bg-gradient-to-b from-[#2a1660] to-[#15092e] rounded-[24px] border theme-border shadow-2xl p-6 max-w-sm w-full text-center"
          >
            <button onClick={onCancel}
              className="absolute top-3 right-3 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/60 transition">
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>

            <h2 className="font-black text-white text-lg">Parent Confirmation</h2>
            <p className="theme-text-faint text-[13px] mt-2 leading-relaxed">
              Share {childName}&apos;s {shareType} to the Nimi Community? This will be visible to other families.
            </p>

            <div className="flex gap-3 mt-5">
              <button onClick={onCancel}
                className="flex-1 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] theme-text/70 font-black rounded-full py-3 text-[13px] transition">
                Cancel
              </button>
              <button onClick={onConfirm}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black rounded-full py-3 text-[13px] shadow-lg shadow-green-500/25 transition">
                ✅ Yes, Share
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
