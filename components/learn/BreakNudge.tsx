"use client";

/**
 * BreakNudge — Phase 4.4
 *
 * A gentle, non-blocking break reminder that appears after the child has been
 * chatting for a while. Sits inside the chat card above the input bar.
 *
 * "Keep going" snoozes for 15 minutes.
 * "Take a break 🌿" is a soft suggestion — clicking it calls onBreak so the
 * parent page can navigate home. It does NOT force the child out.
 *
 * Two severity levels mirror ScreenTimeStatus:
 *   break_suggested → soft green/teal banner
 *   over_limit      → amber banner (still non-blocking)
 */

import { AnimatePresence, motion } from "framer-motion";
import type { ScreenTimeStatus } from "@/lib/screenTime";

interface Props {
  status:     ScreenTimeStatus;
  suggestion: string;   // pre-picked offline activity
  onDismiss:  () => void;
  onBreak?:   () => void;
}

const CONFIG = {
  break_suggested: {
    emoji: "🌿",
    bg:    "bg-emerald-50",
    border:"border-emerald-200",
    text:  "text-emerald-800",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-700",
    badgeBorder: "border-emerald-200",
    headline: "Great job! Time for a quick breather.",
    breakLabel: "Take a break 🌿",
    keepLabel:  "Keep going",
  },
  over_limit: {
    emoji: "⏰",
    bg:    "bg-amber-50",
    border:"border-amber-200",
    text:  "text-amber-800",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
    badgeBorder: "border-amber-200",
    headline: "You've been learning for a while — really well done!",
    breakLabel: "Rest & come back later 🌙",
    keepLabel:  "5 more minutes",
  },
} as const;

export default function BreakNudge({ status, suggestion, onDismiss, onBreak }: Props) {
  const show = status === "break_suggested" || status === "over_limit";
  const cfg  = show ? CONFIG[status] : null;

  return (
    <AnimatePresence>
      {show && cfg && (
        <motion.div
          key="break-nudge"
          initial={{ opacity: 0, height: 0, y: -6 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={{    opacity: 0, height: 0, y: -6 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div className={`mx-3 my-2 p-3.5 border rounded-xl ${cfg.bg} ${cfg.border}`}>
            {/* Top row */}
            <div className="flex items-start gap-2.5">
              <span className="text-[20px] shrink-0 leading-none mt-0.5">{cfg.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className={`font-black text-[13px] leading-snug mb-1 ${cfg.text}`}>
                  {cfg.headline}
                </p>
                {/* Offline activity chip */}
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-full text-[11px] font-bold ${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder}`}>
                  <span>💡</span>
                  <span className="truncate max-w-[220px]">{suggestion}</span>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 mt-3">
              {onBreak && (
                <button
                  onClick={onBreak}
                  className={`flex-1 py-2 text-[12px] font-black rounded-lg border ${cfg.border} ${cfg.text} bg-white hover:opacity-90 transition text-center`}
                >
                  {cfg.breakLabel}
                </button>
              )}
              <button
                onClick={onDismiss}
                className="flex-1 py-2 text-[12px] font-black rounded-lg bg-white/60 border border-gray-200 text-gray-500 hover:bg-white transition text-center"
              >
                {cfg.keepLabel}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
