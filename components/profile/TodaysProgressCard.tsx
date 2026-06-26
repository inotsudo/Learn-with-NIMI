"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { motion } from "framer-motion";
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
    <div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-md p-4">
      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-[72px] h-[72px] shrink-0">
          <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90">
            <circle cx="36" cy="36" r={RING_RADIUS} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7" />
            <motion.circle
              cx="36" cy="36" r={RING_RADIUS} fill="none"
              stroke={allDone ? "#22c55e" : "var(--theme-accent, #9333ea)"}
              strokeWidth="7" strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
              animate={{ strokeDashoffset: dashoffset }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-black text-white text-sm">{done}/{total}</span>
          </div>
        </div>
        <div>
          <p className="font-black text-white text-base">{t("todaysProgressTitle")}</p>
          {allDone && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-green-300 text-xs font-bold mt-0.5"
            >
              🎉 {t("allDoneMsg")}
            </motion.p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        {ACTIVITIES.map((activity, i) => {
          const isDone = completedCategories.has(activity.category);
          return (
            <motion.div
              key={activity.number}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`flex items-center justify-between p-2 rounded-xl transition ${
                isDone ? "bg-green-500/10" : "hover:bg-white/5"
              }`}
            >
              <span className={`text-sm font-semibold flex items-center gap-2 ${
                isDone ? "text-green-200" : "theme-text"
              }`}>
                <span className="text-base">{activity.emoji}</span>
                {t(activity.titleKey)}
              </span>
              {isDone ? (
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              ) : (
                <Circle className="w-5 h-5 text-white/20" />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
