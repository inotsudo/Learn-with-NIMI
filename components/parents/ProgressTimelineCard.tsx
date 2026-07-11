"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { fillTemplate, LANGUAGE_META } from "@/app/_achievementData";
import { ACTIVITIES } from "@/app/_activityData";
import type { TimelineEvent } from "@/lib/parentInsights";

interface Props {
  events: TimelineEvent[];
}

const EVENT_EMOJI: Record<TimelineEvent["type"], string> = {
  levelComplete: "🎓",
  categoryMaster: "🏅",
  languageCert: "📜",
  languageStarted: "🚀",
};

const EVENT_KEY: Record<TimelineEvent["type"], string> = {
  levelComplete: "timelineLevelComplete",
  categoryMaster: "timelineCategoryMaster",
  languageCert: "timelineLanguageCert",
  languageStarted: "timelineLanguageStarted",
};

export default function ProgressTimelineCard({ events }: Props) {
  const { t } = useLanguage();

  return (
    <div className="bg-white border border-ds-border shadow-ds-card p-4" style={{ borderRadius: 'var(--leaf-r)' }}>
      <p className="font-black text-ds-text mb-3">{t("progressTimelineTitle")}</p>

      {events.length === 0 ? (
        <p className="text-gray-500 text-sm font-bold text-center py-4">{t("timelineEmptyState")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((event, i) => {
            const meta = LANGUAGE_META[event.language];
            const category = event.category ? ACTIVITIES.find(a => a.category === event.category) : null;
            const message = fillTemplate(t(EVENT_KEY[event.type]), {
              level: String(event.level ?? ""),
              flag: meta.flag,
              language: meta.label,
              category: category ? t(category.titleKey) : "",
            });
            return (
              <div key={i} className="flex items-start gap-3">
                <span className="text-xl shrink-0">{EVENT_EMOJI[event.type]}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-ds-text text-sm">{message}</p>
                  <p className="text-gray-500 text-xs">
                    {new Date(event.earnedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
