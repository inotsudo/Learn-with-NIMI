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
            className="relative z-10 bg-white border border-ds-border shadow-2xl leaf p-6 max-w-sm w-full text-center"
          >
            <button onClick={onCancel}
              className="absolute top-3 right-3 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 transition">
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 flex items-center justify-center mx-auto mb-4 shadow-lg" style={{ backgroundColor: 'var(--nimi-green)', borderRadius: 'var(--leaf-r)' }}>
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>

            <h2 className="font-black text-ds-text text-lg">Parent Confirmation</h2>
            <p className="text-gray-500 text-[13px] mt-2 leading-relaxed">
              Share {childName}&apos;s {shareType} to the Nimi Community? This will be visible to other families.
            </p>

            <div className="flex gap-3 mt-5">
              <button onClick={onCancel}
                className="flex-1 bg-gray-50 hover:bg-gray-100 border border-ds-border text-gray-600 font-black rounded-full py-3 text-[13px] transition">
                Cancel
              </button>
              <button onClick={onConfirm}
                className="flex-1 bg-cta-gradient text-white font-black rounded-full py-3 text-[13px] shadow-lg shadow-ds-cta transition">
                ✅ Yes, Share
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
