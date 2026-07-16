"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ACTIVITIES, type ActivityCategory } from "@/app/_activityData";

interface Props {
  completedCategories: Set<ActivityCategory>;
}

const RING_RADIUS = 32;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function TodaysProgressCard({ completedCategories }: Props) {
  const { t } = useLanguage();

  const done = completedCategories.size;
  const total = ACTIVITIES.length;
  const pct = (done / total) * 100;
  const dashoffset = RING_CIRCUMFERENCE * (1 - pct / 100);
  const allDone = done === total;

  return (
    <div className="bg-ds-card border border-ds-border shadow-ds-card p-5" style={{ borderRadius: 'var(--leaf-r)' }}>
      {/* Header row: ring + title + state */}
      <div className="flex items-center gap-4 mb-4">
        {/* Progress ring */}
        <div className="relative w-[72px] h-[72px] shrink-0">
          <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90">
            {/* Track — pulses softly when nothing done yet */}
            <motion.circle
              cx="36" cy="36" r={RING_RADIUS}
              fill="none" stroke="var(--ds-border-primary)" strokeWidth="7"
              animate={done === 0 ? { opacity: [0.45, 1, 0.45] } : { opacity: 1 }}
              transition={done === 0 ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" } : {}}
            />
            {/* Fill arc */}
            {done > 0 && (
              <motion.circle
                cx="36" cy="36" r={RING_RADIUS} fill="none"
                stroke={allDone ? "#f59e0b" : "var(--ds-brand-primary)"}
                strokeWidth="7" strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
                animate={{ strokeDashoffset: dashoffset }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            {allDone ? (
              <span className="text-2xl">🏆</span>
            ) : (
              <>
                <span className="font-black text-ds-text text-[15px] leading-none">{done}</span>
                <span className="text-ds-muted text-[9px] font-bold">/{total}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-baloo font-black text-ds-text text-[16px] leading-tight">
            {t("todaysProgressTitle")}
          </p>
          {allDone ? (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-amber-500 text-[12px] font-bold mt-1"
            >
              🎉 {t("allDoneMsg")}
            </motion.p>
          ) : (
            <p className="text-ds-muted text-[12px] mt-1">
              {done === 0
                ? t("todayGetStartedLabel")
                : t("todayLeftLabel").replace("{count}", String(total - done))}
            </p>
          )}
          {done === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Link
                href="/missions/morning"
                className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-[11px] font-black text-white bg-[var(--ds-brand-primary)] hover:opacity-90 transition-opacity shadow-sm"
              >
                {t("startNowLabel")} →
              </Link>
            </motion.div>
          )}
        </div>
      </div>

      {/* Activity list */}
      <div className="space-y-1">
        {ACTIVITIES.map((activity, i) => {
          const isDone = completedCategories.has(activity.category);
          return (
            <motion.div
              key={activity.number}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`flex items-center gap-3 px-2.5 py-2 rounded-xl transition-colors border ${
                isDone
                  ? "bg-[var(--ds-brand-soft)] border-[var(--ds-border-brand)]/30"
                  : "border-transparent hover:bg-ds-page"
              }`}
            >
              {/* Colored icon bubble matching home grid */}
              <div className={`w-8 h-8 ${activity.numBg} rounded-xl flex items-center justify-center text-[15px] shrink-0 shadow-sm`}>
                {activity.emoji}
              </div>
              <span className={`flex-1 text-[13px] font-semibold truncate ${
                isDone ? "text-[var(--ds-brand-primary)]" : "text-ds-text"
              }`}>
                {t(activity.titleKey)}
              </span>
              {isDone ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15, delay: i * 0.04 + 0.1 }}
                >
                  <CheckCircle2 className="w-5 h-5 text-[var(--ds-brand-primary)] shrink-0" />
                </motion.div>
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-ds-border shrink-0" />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
