"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import type { ActivityCategory } from "@/app/_activityData";

interface Props {
  categoryProgress: Record<ActivityCategory, { completed: number; total: number }>;
}

const SKILL_GROUPS: {
  icon: string; titleKey: string; descKey?: string;
  categories: ActivityCategory[]; gradient: string;
}[] = [
  { icon: "🎤", titleKey: "skillMusic",      categories: ["morning"],             gradient: "from-pink-400 to-rose-500" },
  { icon: "🤸", titleKey: "skillMovement",   categories: ["movement"],            gradient: "from-green-400 to-emerald-500" },
  { icon: "🎨", titleKey: "skillCreativity", categories: ["artistic", "coloring"], gradient: "from-orange-400 to-amber-500" },
  { icon: "📖", titleKey: "skillReading",    categories: ["flipflop", "histoire"], gradient: "from-blue-400 to-indigo-500" },
  { icon: "🔍", titleKey: "skillExploration",categories: ["zoom", "discovery"],    gradient: "from-teal-400 to-cyan-500" },
];

const LEVEL_META = {
  notStarted: { key: "levelNotStarted", bg: "bg-gray-100", text: "text-gray-500",     ring: "ring-gray-200" },
  beginner:   { key: "levelBeginner",   bg: "bg-blue-50",  text: "text-blue-600",     ring: "ring-blue-200" },
  growing:    { key: "levelGrowing",    bg: "bg-amber-50", text: "text-amber-600",    ring: "ring-amber-200" },
  mastered:   { key: "levelMastered",   bg: "bg-emerald-50",text: "text-emerald-700", ring: "ring-emerald-300" },
} as const;

function getLevel(pct: number, total: number): keyof typeof LEVEL_META {
  if (total === 0 || pct === 0) return "notStarted";
  if (pct < 50)  return "beginner";
  if (pct < 100) return "growing";
  return "mastered";
}

const LEVEL_EMOJI: Record<keyof typeof LEVEL_META, string> = {
  notStarted: "💤", beginner: "🌱", growing: "⚡", mastered: "👑",
};

export default function SkillsTab({ categoryProgress }: Props) {
  const { t } = useLanguage();

  const masteredCount = SKILL_GROUPS.filter(g => {
    let completed = 0, total = 0;
    for (const cat of g.categories) { completed += categoryProgress[cat].completed; total += categoryProgress[cat].total; }
    return total > 0 && completed === total;
  }).length;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-baloo font-black text-ds-text text-[18px]">{t("skillsPageTitle")}</p>
          <p className="text-ds-muted text-[13px] mt-0.5">{t("skillsPageSubtitle")}</p>
        </div>
        {masteredCount > 0 && (
          <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0 mt-1">
            👑 {t("skillsMasteredCount").replace("{count}", String(masteredCount))}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SKILL_GROUPS.map((group, i) => {
          let completed = 0, total = 0;
          for (const cat of group.categories) {
            completed += categoryProgress[cat].completed;
            total += categoryProgress[cat].total;
          }
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
          const levelKey = getLevel(pct, total);
          const level = LEVEL_META[levelKey];
          const levelEmoji = LEVEL_EMOJI[levelKey];

          return (
            <motion.div
              key={group.titleKey}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.3 }}
              className="bg-ds-card border border-ds-border shadow-ds-card p-4"
              style={{ borderRadius: 'var(--leaf-r)' }}
            >
              {/* Header row */}
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${group.gradient} flex items-center justify-center text-xl shadow-sm shrink-0`}>
                  {group.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-baloo font-black text-ds-text text-[14px]">{t(group.titleKey)}</p>
                  <p className="text-ds-muted text-[11px]">
                    {completed}/{total} {t("skillsActivitiesLabel")}
                  </p>
                </div>
                <span className={`flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full ring-1 ${level.bg} ${level.text} ${level.ring} shrink-0`}>
                  {levelEmoji} {t(level.key)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2.5 bg-ds-border rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${group.gradient}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.75, delay: i * 0.07 + 0.15, ease: "easeOut" }}
                  style={{ minWidth: pct > 0 ? 8 : 0 }}
                />
              </div>

              {/* Pct label */}
              <div className="flex justify-end mt-1.5">
                <span className="text-[11px] font-black text-ds-muted tabular-nums">{pct}%</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
