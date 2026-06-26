"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { useKidTheme } from "@/contexts/ThemeProvider";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  emoji?: string;
  children: ReactNode;
}

export default function MagicDialog({ open, onClose, title, emoji, children }: Props) {
  const { theme } = useKidTheme();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            style={{ zIndex: 9998 }}
            onClick={onClose}
          />
          <div className="fixed inset-0 flex items-end sm:items-center justify-center" style={{ zIndex: 9998 }}>
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 250, damping: 25 }}
              className="w-full sm:max-w-md rounded-t-[32px] sm:rounded-[28px] p-6 pb-8 sm:pb-6 border-t-2 sm:border-2 sm:mx-4"
              style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}
            >
              {/* Mobile handle */}
              <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-4 sm:hidden" />

              {/* Header */}
              {(title || emoji) && (
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {emoji && <span className="text-2xl">{emoji}</span>}
                    {title && <h3 className="font-baloo font-black text-white text-[20px]">{title}</h3>}
                  </div>
                  <button onClick={onClose}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/50 transition">
                    <X size={16} />
                  </button>
                </div>
              )}

              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
