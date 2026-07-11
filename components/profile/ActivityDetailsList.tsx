"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getComponentVariant } from "@/lib/design-system/componentVariants";
import { ACTIVITIES } from "@/app/_activityData";
import type { ProgressRow } from "@/lib/queries";
import { ContentSurface } from "@/components/layout/primitives";

interface Props {
  rows: ProgressRow[];
  range: "week" | "all";
}

function startOfWeek(): Date {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export default function ActivityDetailsList({ rows, range }: Props) {
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const v = getComponentVariant(themeId);
  const monday = range === "week" ? startOfWeek() : null;
  const inRange = (iso: string) => !monday || new Date(iso).getTime() >= monday.getTime();

  return (
    <ContentSurface className="p-4">
      {ACTIVITIES.map(activity => {
        const catRows = rows.filter(r => r.category === activity.category && inRange(r.completed_at));
        const daysActive = new Set(catRows.map(r => r.completed_at.slice(0, 10))).size;
        const stars = catRows.reduce((sum, r) => sum + (r.stars_earned ?? 0), 0);
        const denom = range === "week" ? 7 : Math.max(daysActive, 1);
        const pct = Math.min((daysActive / denom) * 100, 100);

        return (
          <div key={activity.number} className="flex items-center gap-3 py-3 border-b border-ds-border last:border-0">
            <div className={`w-10 h-10 ${activity.numBgGlass} rounded-full flex items-center justify-center text-lg shrink-0`}>
              {activity.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-ds-text text-sm truncate">{t(activity.titleKey)}</p>
              <p className="text-gray-500 text-xs truncate">{t(activity.subtitleKey)}</p>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1.5 max-w-xs">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${v.contentGradients.activityProgress[activity.category] ?? "from-gray-400 to-gray-500"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-black text-ds-text text-sm">
                {range === "week" ? `${daysActive}/7` : daysActive}
              </p>
              <p className="text-gray-500 text-[10px] font-semibold">{t("daysPracticedLabel")}</p>
              <p className="text-yellow-500 text-xs font-bold">⭐ {stars}</p>
            </div>
          </div>
        );
      })}
    </ContentSurface>
  );
}
