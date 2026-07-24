"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { MILESTONE_BADGES } from "@/lib/milestoneBadges";

const MILESTONE_TARGETS: Record<string, { type: "stories" | "stars"; target: number }> = {
  "story-explorer":   { type: "stories", target: 1   },
  "story-adventurer": { type: "stories", target: 3   },
  "story-champion":   { type: "stories", target: 5   },
  "star-collector":   { type: "stars",   target: 50  },
  "super-star":       { type: "stars",   target: 100 },
};

interface Props {
  earnedSlugs:      string[];
  storiesCompleted: number;
  totalStars:       number;
  imageMap:         Record<string, string>;
}

export default function NextMilestoneCard({ earnedSlugs, storiesCompleted, totalStars, imageMap }: Props) {
  const next = MILESTONE_BADGES.find(b => !earnedSlugs.includes(b.slug));

  if (!next) {
    return (
      <div className="bg-ds-card border border-ds-border shadow-ds-card p-5 text-center" style={{ borderRadius: "var(--leaf-r)" }}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
          <p className="text-[40px] leading-none mb-2">🏆</p>
        </motion.div>
        <p className="font-baloo font-black text-ds-text text-[15px]">All Milestones Unlocked!</p>
        <p className="text-ds-muted text-[11px] font-semibold mt-1">You are a NIMIPIKO Legend 👑</p>
      </div>
    );
  }

  const target = MILESTONE_TARGETS[next.slug];
  if (!target) return null;

  const current   = target.type === "stories" ? storiesCompleted : totalStars;
  const pct       = Math.min(1, current / target.target);
  const remaining = Math.max(0, target.target - current);
  const isClose   = pct >= 0.5;
  const unit      = target.type === "stories" ? (remaining === 1 ? "story" : "stories") : "⭐";
  const imageUrl  = imageMap[next.slug];

  return (
    <div
      className="bg-ds-card border border-ds-border shadow-ds-card overflow-hidden"
      style={{ borderRadius: "var(--leaf-r)" }}
    >
      {/* Header stripe */}
      <div
        className="px-5 py-3 flex items-center gap-2"
        style={{ background: "linear-gradient(90deg, var(--ds-brand-primary)/12, transparent)", borderBottom: "1px solid var(--ds-border)" }}
      >
        <motion.span
          animate={{ rotate: [0, -8, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          className="text-[14px] font-black text-[var(--ds-brand-primary)]"
        >
          🎯
        </motion.span>
        <p className="font-baloo font-black text-[var(--ds-brand-primary)] text-[12px] uppercase tracking-widest">
          Next Milestone
        </p>
        {isClose && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="ml-auto text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200"
          >
            🔥 So close!
          </motion.span>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-center gap-4">
          {/* Badge preview */}
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-yellow-50 border-2 border-amber-200/60 shadow-[0_4px_16px_rgba(251,191,36,0.2)] flex items-center justify-center shrink-0 overflow-hidden"
          >
            {imageUrl ? (
              <img src={imageUrl} alt={next.label} className="w-full h-full object-contain" />
            ) : (
              <span className="text-3xl grayscale opacity-60 select-none">{next.emoji}</span>
            )}
          </motion.div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-baloo font-black text-ds-text text-[16px] leading-tight">{next.label}</p>
            <p className="text-ds-muted text-[11px] font-semibold mt-0.5 leading-snug">{next.desc}</p>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black text-ds-muted uppercase tracking-wide">
                  Progress
                </span>
                <span className="text-[11px] font-black text-[var(--ds-brand-primary)]">
                  {current} / {target.target}
                </span>
              </div>
              <div className="h-2.5 bg-ds-border rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg, var(--ds-brand-primary), var(--ds-brand-hover))" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct * 100}%` }}
                  transition={{ duration: 1.1, ease: "easeOut", delay: 0.4 }}
                />
              </div>
              <p className="text-[10px] text-ds-muted font-semibold mt-1.5">
                {remaining === 0 ? "Ready to unlock!" : `${remaining} more ${unit} to go`}
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/stories"
          className="mt-4 flex items-center justify-center gap-2 py-2.5 font-baloo font-black text-[13px] text-white rounded-xl transition hover:-translate-y-0.5 active:scale-95 shadow-sm hover:shadow-md"
          style={{ background: "var(--ds-brand-primary)" }}
        >
          {target.type === "stories" ? "📖 Read a Story" : "⭐ Earn Stars"} →
        </Link>
      </div>
    </div>
  );
}
