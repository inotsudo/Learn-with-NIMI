"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X } from "lucide-react";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getComponentVariant } from "@/lib/design-system/componentVariants";
import { useMotion } from "@/hooks/useMotion";
import { SPRING, DURATION, EASE } from "@/lib/design-system/motion";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reward?: string;
  stars?: number;
  childName?: string;
}

const CONFETTI = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  delay: Math.random() * 0.8,
  duration: 1.5 + Math.random() * 1.5,
  size: 6 + Math.random() * 8,
  color: ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#DDA0DD", "#FF9800", "#E91E63", "#9C27B0"][i % 9],
}));

const FLYING_STARS = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  startX: 20 + Math.random() * 60,
  delay: 0.3 + i * 0.15,
}));

export default function CelebrationModal({ isOpen, onClose, reward = "Kind Heart Badge", stars = 50, childName = "Explorer" }: Props) {
  const [phase, setPhase] = useState<"confetti" | "reward" | "done">("confetti");
  const { themeId } = useAppTheme();
  const cv = getComponentVariant(themeId);
  const m = useMotion();

  useEffect(() => {
    if (!isOpen) { setPhase("confetti"); return; }
    const t1 = setTimeout(() => setPhase("reward"), 1500);
    return () => clearTimeout(t1);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          {...m.overlayFade}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div className={`absolute inset-0 ${cv.dialogStyle.overlay}`} onClick={onClose} />

          {/* Confetti layer */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {CONFETTI.map(c => (
              <motion.div key={c.id}
                className="absolute rounded-full"
                style={{ left: `${c.x}%`, width: c.size, height: c.size, backgroundColor: c.color }}
                initial={{ top: "-5%", opacity: 1, rotate: 0 }}
                animate={{ top: "110%", opacity: [1, 1, 0], rotate: 360 + Math.random() * 360 }}
                transition={{ duration: c.duration, delay: c.delay, ease: EASE.exit }}
              />
            ))}
          </div>

          {/* Flying stars */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {FLYING_STARS.map(s => (
              <motion.div key={s.id}
                className="absolute text-yellow-400 text-2xl"
                style={{ left: `${s.startX}%` }}
                initial={{ bottom: "10%", opacity: 0, scale: 0 }}
                animate={{ bottom: "70%", opacity: [0, 1, 1, 0], scale: [0, 1.5, 1, 0.5] }}
                transition={{ duration: DURATION.loopFast, delay: s.delay }}>
                ⭐
              </motion.div>
            ))}
          </div>

          {/* Modal card */}
          <motion.div
            {...m.modalAnimation}
            className={`relative z-10 ${cv.dialogStyle.background} ${cv.dialogStyle.border} ${cv.dialogStyle.shadow} ${cv.dialogStyle.radius} p-6 sm:p-8 max-w-sm w-full text-center overflow-hidden`}
          >
            {/* Close */}
            <button onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 transition z-20">
              <X className="w-4 h-4" />
            </button>

            {/* Sparkle bg */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <motion.span key={i}
                  className="absolute text-yellow-400/20"
                  style={{ top: `${15 + i * 14}%`, left: `${10 + i * 15}%`, fontSize: 10 + i * 2 }}
                  animate={m.starPulse(i * 0.2).animate}
                  transition={m.starPulse(i * 0.2).transition}>
                  ✦
                </motion.span>
              ))}
            </div>

            <div className="relative z-10">
              {/* WATATAWOWO text */}
              <motion.p
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ ...SPRING.tight, delay: 0.3 }}
                className="font-black text-yellow-500 text-2xl sm:text-3xl tracking-wider mb-2"
              >
                🎉 WATATAWOWO! 🎉
              </motion.p>

              <motion.p
                {...m.fadeUp}
                transition={{ ...m.fadeUp.transition, delay: 0.6 }}
                className="text-gray-500 text-sm font-medium"
              >
                Amazing job, {childName}!
              </motion.p>

              {/* Reward reveal */}
              <AnimatePresence>
                {phase === "reward" && (
                  <motion.div
                    {...m.scaleIn}
                    transition={SPRING.gentle}
                    className="mt-5"
                  >
                    {/* Big star */}
                    <motion.div
                      animate={{ scale: [1, 1.08, 1], rotate: [0, 3, -3, 0] }}
                      transition={{ duration: DURATION.loopSlow, repeat: Infinity }}
                      className="w-24 h-24 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl shadow-yellow-500/30 border-4 border-yellow-200/50 mb-4"
                    >
                      <Star className="w-12 h-12 text-white fill-white drop-shadow-lg" />
                    </motion.div>

                    <p className="font-black text-ds-text text-lg">You earned:</p>

                    {/* Stars count */}
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ duration: DURATION.base, ease: EASE.enter, delay: 0.2 }}
                      className="flex items-center justify-center gap-2 mt-2"
                    >
                      <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                      <span className="font-black text-yellow-600 text-2xl">+{stars}</span>
                      <span className="text-gray-500 text-sm font-bold">Stars</span>
                    </motion.div>

                    {/* Badge */}
                    <motion.div
                      {...m.fadeUp}
                      transition={{ ...m.fadeUp.transition, delay: 0.4 }}
                      className={`mt-3 inline-flex items-center gap-2 ${cv.chipStyle.background} ${cv.chipStyle.border} ${cv.chipStyle.radius} px-4 py-2`}
                    >
                      <span className="text-lg">🏅</span>
                      <span className="text-ds-text font-black text-sm">{reward}</span>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action buttons */}
              <div className="mt-6 space-y-2">
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: DURATION.base, delay: 2 }}
                  onClick={onClose}
                  className={`w-full ${cv.buttonStyle.primary} font-black rounded-full py-3 text-sm transition-shadow`}
                >
                  🌟 Awesome! Continue
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
