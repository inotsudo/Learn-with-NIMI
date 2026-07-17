"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  childName: string;
  daysAway: number;
  onDismiss: () => void;
}

export default function WelcomeBackOverlay({ childName, daysAway, onDismiss }: Props) {
  const [visible, setVisible] = useState(true);

  // Auto-dismiss after 3.5 s if the user doesn't tap
  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); setTimeout(onDismiss, 400); }, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  function dismiss() {
    setVisible(false);
    setTimeout(onDismiss, 400);
  }

  const daysLabel = daysAway === 1 ? "1 day" : `${daysAway} days`;

  const message =
    daysAway >= 14 ? `It's been a while — welcome back! 🌟` :
    daysAway >= 7  ? `A whole week — we missed you! 💫` :
                     `You've been away for ${daysLabel} — let's pick up where you left off! 🚀`;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[999] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
          onClick={dismiss}
        >
          <motion.div
            initial={{ scale: 0.88, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 280, delay: 0.05 }}
            onClick={e => e.stopPropagation()}
            className="mx-5 max-w-sm w-full bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Illustrated top band */}
            <div className="h-32 flex items-center justify-center relative"
              style={{ background: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 50%, #6ee7b7 100%)" }}>
              <motion.span
                className="text-[72px] leading-none select-none"
                animate={{ rotate: [0, -8, 8, -4, 0], scale: [1, 1.1, 1.05, 1.1, 1] }}
                transition={{ duration: 1.2, delay: 0.3, ease: "easeInOut" }}
              >
                🌟
              </motion.span>
              <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
            </div>

            <div className="px-6 pt-5 pb-6 text-center">
              <h2 className="font-baloo font-black text-gray-900 text-[24px] leading-tight mb-2">
                Welcome back, {childName}!
              </h2>
              <p className="font-nunito text-gray-500 text-[14px] leading-relaxed mb-6">
                {message}
              </p>

              {/* Progress nudge */}
              <div className="bg-emerald-50 rounded-2xl px-4 py-3 mb-5 flex items-center gap-3">
                <span className="text-[26px]">🔥</span>
                <p className="font-nunito text-emerald-700 text-[13px] text-left leading-snug">
                  Start today's adventure to <strong>light a new streak</strong> — every journey begins with one step!
                </p>
              </div>

              <button
                onClick={dismiss}
                className="w-full bg-[var(--nimi-green)] text-white font-baloo font-black text-[16px] py-3.5 rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-green-200/50"
              >
                Let's go! 🚀
              </button>
              <p className="font-nunito text-gray-300 text-[11px] mt-3">Tap anywhere to continue</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
