"use client";

import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X } from "lucide-react";

interface UpdateToastProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function UpdateToast({ visible, onDismiss }: UpdateToastProps) {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -60 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="fixed top-3 left-1/2 z-[200] -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm"
        >
          <div className="flex items-center gap-3 bg-[var(--nimi-green)] text-white rounded-2xl shadow-xl px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-base">🌿</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-baloo font-black text-[13px] leading-tight">Nimi got an upgrade!</p>
              <p className="text-white/80 text-[11px] font-nunito">Reload for the latest features.</p>
            </div>
            <button
              onClick={handleReload}
              className="flex items-center gap-1.5 bg-white text-[var(--nimi-green)] font-black text-[12px] px-3 py-1.5 rounded-xl hover:bg-white/90 transition flex-shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload
            </button>
            <button
              onClick={onDismiss}
              aria-label="Dismiss"
              className="w-6 h-6 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
