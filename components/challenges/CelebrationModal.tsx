"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X } from "lucide-react";

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

  useEffect(() => {
    if (!isOpen) { setPhase("confetti"); return; }
    const t1 = setTimeout(() => setPhase("reward"), 1500);
    return () => clearTimeout(t1);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

          {/* Confetti layer */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {CONFETTI.map(c => (
              <motion.div key={c.id}
                className="absolute rounded-full"
                style={{ left: `${c.x}%`, width: c.size, height: c.size, backgroundColor: c.color }}
                initial={{ top: "-5%", opacity: 1, rotate: 0 }}
                animate={{ top: "110%", opacity: [1, 1, 0], rotate: 360 + Math.random() * 360 }}
                transition={{ duration: c.duration, delay: c.delay, ease: "easeIn" }}
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
                transition={{ duration: 1.5, delay: s.delay }}>
                ⭐
              </motion.div>
            ))}
          </div>

          {/* Modal card */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative z-10 bg-gradient-to-b from-[#2a1660] to-[#15092e] rounded-[28px] border border-yellow-400/30 shadow-2xl shadow-purple-900/50 p-6 sm:p-8 max-w-sm w-full text-center overflow-hidden"
          >
            {/* Close */}
            <button onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/60 transition z-20">
              <X className="w-4 h-4" />
            </button>

            {/* Sparkle bg */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <motion.span key={i}
                  className="absolute text-yellow-400/20"
                  style={{ top: `${15 + i * 14}%`, left: `${10 + i * 15}%`, fontSize: 10 + i * 2 }}
                  animate={{ opacity: [0.1, 0.5, 0.1], scale: [1, 1.3, 1] }}
                  transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}>
                  ✦
                </motion.span>
              ))}
            </div>

            <div className="relative z-10">
              {/* WATATAWOWO text */}
              <motion.p
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.3 }}
                className="font-black text-yellow-400 text-2xl sm:text-3xl tracking-wider mb-2"
              >
                🎉 WATATAWOWO! 🎉
              </motion.p>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="theme-text-faint text-sm font-medium"
              >
                Amazing job, {childName}!
              </motion.p>

              {/* Reward reveal */}
              <AnimatePresence>
                {phase === "reward" && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 18 }}
                    className="mt-5"
                  >
                    {/* Big star */}
                    <motion.div
                      animate={{ scale: [1, 1.08, 1], rotate: [0, 3, -3, 0] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                      className="w-24 h-24 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl shadow-yellow-500/30 border-4 border-yellow-200/50 mb-4"
                    >
                      <Star className="w-12 h-12 text-white fill-white drop-shadow-lg" />
                    </motion.div>

                    <p className="font-black text-white text-lg">You earned:</p>

                    {/* Stars count */}
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="flex items-center justify-center gap-2 mt-2"
                    >
                      <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                      <span className="font-black text-yellow-300 text-2xl">+{stars}</span>
                      <span className="theme-text-faint text-sm font-bold">Stars</span>
                    </motion.div>

                    {/* Badge */}
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="mt-3 inline-flex items-center gap-2 theme-accent/25 border theme-border-strong/25 rounded-full px-4 py-2"
                    >
                      <span className="text-lg">🏅</span>
                      <span className="theme-text font-black text-sm">{reward}</span>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action buttons */}
              <div className="mt-6 space-y-2">
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2 }}
                  onClick={onClose}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black rounded-full py-3 text-sm shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-shadow"
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
