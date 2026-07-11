"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getComponentVariant } from "@/lib/design-system/componentVariants";
import { useMotion } from "@/hooks/useMotion";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  emoji?: string;
  children: ReactNode;
}

export default function MagicDialog({ open, onClose, title, emoji, children }: Props) {
  const { themeId } = useAppTheme();
  const cv = getComponentVariant(themeId);
  const m = useMotion();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            {...m.overlayFade}
            className={`fixed inset-0 ${cv.dialogStyle.overlay}`}
            style={{ zIndex: 9998 }}
            onClick={onClose}
          />
          <div className="fixed inset-0 flex items-end sm:items-center justify-center" style={{ zIndex: 9998 }}>
            <motion.div
              {...m.dialogAnimation}
              className={`w-full sm:max-w-md ${cv.dialogStyle.containerRadius} p-6 pb-8 sm:pb-6 ${cv.dialogStyle.background} border-t border-t-ds-border sm:${cv.dialogStyle.border} sm:mx-4 ${cv.dialogStyle.shadow}`}
            >
              {/* Mobile handle */}
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />

              {/* Header */}
              {(title || emoji) && (
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {emoji && <span className="text-2xl">{emoji}</span>}
                    {title && <h3 className="font-baloo font-black text-gray-900 text-[20px]">{title}</h3>}
                  </div>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                  >
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
