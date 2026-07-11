"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star } from "lucide-react";
import { useMotion } from "@/hooks/useMotion";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getComponentVariant } from "@/lib/design-system/componentVariants";
import type { ToastConfig } from "@/lib/design-system/delight";

interface Props {
  visible: boolean;
  config: ToastConfig | null;
  onDismiss: () => void;
}

export default function AchievementToast({ visible, config, onDismiss }: Props) {
  const m = useMotion();
  const { themeId } = useAppTheme();
  const cv = getComponentVariant(themeId);

  // Auto-dismiss after the toast's configured duration.
  useEffect(() => {
    if (!visible || !config) return;
    const t = setTimeout(onDismiss, config.duration);
    return () => clearTimeout(t);
  }, [visible, config, onDismiss]);

  return (
    <AnimatePresence>
      {visible && config && (
        <motion.div
          {...m.fadeDown}
          className="fixed top-4 left-1/2 z-[70] w-auto max-w-xs sm:max-w-sm min-w-[220px] -translate-x-1/2"
          onClick={onDismiss}
          role="status"
          aria-live="polite"
        >
          <div className={`${cv.cardStyle.background} ${cv.cardStyle.border} ${cv.cardStyle.shadow} px-4 py-3 flex items-center gap-3 shadow-2xl cursor-pointer select-none`} style={{ borderRadius: 'var(--leaf-r)' }}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shrink-0 text-xl">
              {config.icon}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-black text-ds-text text-sm leading-tight truncate">{config.title}</p>
              {config.subtitle && (
                <p className="text-gray-500 text-xs mt-0.5 truncate">{config.subtitle}</p>
              )}
            </div>

            {config.stars !== undefined && (
              <div className="flex items-center gap-1 shrink-0">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                <span className="font-black text-yellow-500 text-sm">+{config.stars}</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
