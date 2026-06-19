"use client";

import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  weekCounts: number[];
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export default function WeeklyActivityChart({ weekCounts }: Props) {
  const { t } = useLanguage();

  return (
    <div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-md p-4">
      <p className="font-black text-white mb-4">{t("weeklyActivityTitle")}</p>
      <div className="flex items-end justify-between gap-2 h-32">
        {weekCounts.map((count, i) => {
          const pct = Math.min((count / 8) * 100, 100);
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <div
                className="w-full rounded-t-lg bg-gradient-to-t from-purple-500 to-pink-400 min-h-[4px]"
                style={{ height: `${pct}%` }}
              />
              <span className="text-[10px] font-bold text-purple-300">{DAY_LABELS[i]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
