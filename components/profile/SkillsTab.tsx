"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import type { ActivityCategory } from "@/app/_activityData";

interface Props {
  categoryProgress: Record<ActivityCategory, { completed: number; total: number }>;
}

const SKILL_GROUPS: { icon: string; titleKey: string; categories: ActivityCategory[]; color: string }[] = [
  { icon: "🎤", titleKey: "skillMusic", categories: ["morning"], color: "from-purple-400 to-pink-500" },
  { icon: "🤸", titleKey: "skillMovement", categories: ["movement"], color: "from-pink-400 to-pink-600" },
  { icon: "🎨", titleKey: "skillCreativity", categories: ["artistic", "coloring"], color: "from-orange-400 to-yellow-500" },
  { icon: "📖", titleKey: "skillReading", categories: ["flipflop", "histoire"], color: "from-indigo-400 to-amber-600" },
  { icon: "🔍", titleKey: "skillExploration", categories: ["zoom", "discovery"], color: "from-green-400 to-teal-500" },
];

const LEVEL_STYLES = {
  notStarted: { key: "levelNotStarted", bg: "bg-white/10", text: "theme-text-muted" },
  beginner: { key: "levelBeginner", bg: "bg-blue-400/20", text: "text-blue-200" },
  growing: { key: "levelGrowing", bg: "bg-amber-400/20", text: "text-amber-200" },
  mastered: { key: "levelMastered", bg: "bg-green-400/20", text: "text-green-200" },
} as const;

function getLevel(pct: number, total: number): keyof typeof LEVEL_STYLES {
  if (total === 0 || pct === 0) return "notStarted";
  if (pct < 50) return "beginner";
  if (pct < 100) return "growing";
  return "mastered";
}

export default function SkillsTab({ categoryProgress }: Props) {
  const { t } = useLanguage();

  return (
    <div className="space-y-4 mt-4">
      <div>
        <p className="font-black text-white text-lg">{t("skillsPageTitle")}</p>
        <p className="theme-text-muted text-sm">{t("skillsPageSubtitle")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SKILL_GROUPS.map(group => {
          let completed = 0;
          let total = 0;
          for (const cat of group.categories) {
            completed += categoryProgress[cat].completed;
            total += categoryProgress[cat].total;
          }
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
          const level = LEVEL_STYLES[getLevel(pct, total)];

          return (
            <div key={group.titleKey} className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{group.icon}</span>
                  <p className="font-black text-white text-sm">{t(group.titleKey)}</p>
                </div>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${level.bg} ${level.text}`}>
                  {t(level.key)}
                </span>
              </div>
              <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full bg-gradient-to-r ${group.color}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="theme-text-muted text-xs mt-1.5">{pct}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
