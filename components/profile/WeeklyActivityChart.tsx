"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  weekCounts: number[];
}

export default function WeeklyActivityChart({ weekCounts }: Props) {
  const { t } = useLanguage();
  const dayKeys = ["dayMon", "dayTue", "dayWed", "dayThu", "dayFri", "daySat", "daySun"] as const;
  const max = Math.max(...weekCounts, 1);

  return (
    <div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-md p-4">
      <p className="font-black text-white mb-4">{t("weeklyActivityTitle")}</p>
      <div className="flex items-end justify-between gap-2 h-36">
        {weekCounts.map((count, i) => {
          const pct = Math.max((count / max) * 100, 4);
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              {count > 0 && (
                <motion.span
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="text-[10px] font-black theme-text"
                >
                  {count}
                </motion.span>
              )}
              <motion.div
                className={`w-full rounded-t-lg ${
                  count > 0
                    ? "bg-gradient-to-t from-sky-500 to-emerald-400"
                    : "bg-white/10"
                }`}
                initial={{ height: 0 }}
                animate={{ height: `${pct}%` }}
                transition={{ duration: 0.6, delay: i * 0.06, ease: "easeOut" }}
                style={{ minHeight: count > 0 ? 8 : 4 }}
              />
              <span className="text-[10px] font-bold theme-text-muted">{t(dayKeys[i])}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
