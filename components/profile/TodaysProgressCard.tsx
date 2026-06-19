"use client";

import { CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ACTIVITIES, type ActivityCategory } from "@/app/_activityData";

interface Props {
  completedCategories: Set<ActivityCategory>;
}

const RING_RADIUS = 24;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function TodaysProgressCard({ completedCategories }: Props) {
  const { t } = useLanguage();

  const done = completedCategories.size;
  const pct = (done / 8) * 100;
  const dashoffset = RING_CIRCUMFERENCE * (1 - pct / 100);

  return (
    <div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-md p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="relative w-14 h-14 shrink-0">
          <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
            <circle cx="28" cy="28" r={RING_RADIUS} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6" />
            <circle
              cx="28" cy="28" r={RING_RADIUS} fill="none"
              stroke="#9333ea" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={dashoffset}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-black text-white text-xs">{done}/8</span>
          </div>
        </div>
        <p className="font-black text-white">{t("todaysProgressTitle")}</p>
      </div>

      <div className="space-y-1.5">
        {ACTIVITIES.map(activity => {
          const isDone = completedCategories.has(activity.category);
          return (
            <div key={activity.number} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5">
              <span className="text-sm font-semibold text-purple-100 flex items-center gap-2">
                <span className="text-base">{activity.emoji}</span>
                {t(activity.titleKey)}
              </span>
              {isDone ? (
                <CheckCircle2 className="w-5 h-5 text-blue-500" />
              ) : (
                <span className="text-gray-300 text-base leading-none">☆</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
