"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getComponentVariant } from "@/lib/design-system/componentVariants";
import { CONFETTI_BURST, DELIGHT, type DelightSpec, type HeroReactionType } from "@/lib/design-system/delight";
import { SPRING, DURATION } from "@/lib/design-system/motion";
import RewardBurst from "./RewardBurst";
import AnimatedCheckmark from "./AnimatedCheckmark";
import HeroReaction from "./HeroReaction";

interface Props {
  visible: boolean;
  title?: string;
  subtitle?: string;
  stars?: number;
  spec?: DelightSpec;
  onDismiss: () => void;
  /** Auto-dismiss after N ms (default 5000, 0 = manual only). */
  autoDismissMs?: number;
}

export default function CelebrationOverlay({
  visible,
  title,
  subtitle,
  stars,
  spec = DELIGHT.storyComplete,
  onDismiss,
  autoDismissMs = 5000,
}: Props) {
  const m = useThemeMotion();
  const { themeId } = useAppTheme();
  const cv = getComponentVariant(themeId);

  const burst    = spec.burst ?? CONFETTI_BURST;
  const reaction = (spec.mascotReaction ?? "celebrate") as HeroReactionType;

  useEffect(() => {
    if (!visible || autoDismissMs === 0) return;
    const t = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(t);
  }, [visible, autoDismissMs, onDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          {...m.overlayFade}
          className="fixed inset-0 z-[70] flex items-center justify-center p-6"
          onClick={onDismiss}
          role="dialog"
          aria-modal="true"
          aria-label={title ?? "Celebration"}
        >
          {/* Dim backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Particle burst across the full screen */}
          <RewardBurst active={visible} config={burst} className="absolute inset-0" />

          {/* Modal card */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={SPRING.modal}
            className={`relative z-10 ${cv.dialogStyle.background} ${cv.dialogStyle.border} ${cv.dialogStyle.shadow} ${cv.dialogStyle.radius} p-8 max-w-sm w-full text-center`}
            onClick={e => e.stopPropagation()}
          >
            <HeroReaction
              reaction={reaction}
              mascot="nimi"
              size={80}
              className="mx-auto mb-4"
            />

            {spec.checkmark && (
              <AnimatedCheckmark className="mx-auto mb-3" />
            )}

            {title && (
              <motion.p
                initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: DURATION.base }}
                className="font-black text-ds-text text-2xl mb-1"
              >
                {title}
              </motion.p>
            )}

            {subtitle && (
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: DURATION.base }}
                className="text-gray-500 text-sm"
              >
                {subtitle}
              </motion.p>
            )}

            {stars !== undefined && (
              <motion.p
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: DURATION.base }}
                className="font-black text-yellow-500 text-3xl mt-2"
              >
                ⭐ +{stars}
              </motion.p>
            )}

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: DURATION.base }}
              whileHover={m.buttonHover}
              whileTap={m.buttonPress}
              onClick={onDismiss}
              className="mt-6 w-full bg-ds-action text-white font-black rounded-full py-3 text-sm"
            >
              🎉 Awesome!
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
