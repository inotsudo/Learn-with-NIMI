// NIMIPIKO — Achievement Dashboard catalog (Phase BF)
//
// Maps the 3 language-scoped achievement tiers already written by
// `complete_curriculum_mission` (migrations 026/027) into a display
// catalog for `/certificates`. The 4th tier — "Trilingual Champion" — is
// derived (not stored): see getTrilingualStatus below.

import { ACTIVITIES, type ActivityCategory } from "@/app/_activityData";
import type { ChildAchievement } from "@/lib/queries";

export type Lang = "en" | "fr" | "rw";
export const LANGUAGES: Lang[] = ["en", "fr", "rw"];

// Fixed native language names — same convention as AppPreferencesCard's
// language switcher (not translated; a language's own name doesn't change
// depending on the viewer's UI language).
export const LANGUAGE_META: Record<Lang, { label: string; flag: string }> = {
  en: { label: "English", flag: "🇬🇧" },
  fr: { label: "Français", flag: "🇫🇷" },
  rw: { label: "Kinyarwanda", flag: "🇷🇼" },
};

export type AchievementTier = "explorer" | "categoryMaster" | "languageExplorer";

export interface AchievementItem {
  tier: AchievementTier;
  slug: string;
  type: "badge" | "certificate";
  language: Lang;
  emoji: string;
  level?: number;
  category?: ActivityCategory;
  titleKey: string;
  titleParams?: Record<string, string>;
  descKey: string;
  descParams?: Record<string, string>;
}

const EXPLORER_EMOJI = "🧭";
const CERT_EMOJI = "📜";

// Builds the full catalog of earnable Tier 1-3 achievements for all 3
// languages. `t` resolves i18n keys to localized strings up front (e.g.
// category names) so AchievementItem.titleParams/descParams are plain
// strings ready for fillTemplate().
export function buildAchievementCatalog(maxLevel: number, t: (key: string) => string): AchievementItem[] {
  const items: AchievementItem[] = [];

  for (const lang of LANGUAGES) {
    // Tier 3 — Language Explorer Certificate (curriculum-complete-{lang})
    items.push({
      tier: "languageExplorer",
      slug: `curriculum-complete-${lang}`,
      type: "certificate",
      language: lang,
      emoji: CERT_EMOJI,
      titleKey: "achLanguageExplorerTitle",
      titleParams: { flag: LANGUAGE_META[lang].flag, language: LANGUAGE_META[lang].label },
      descKey: "achLanguageExplorerDesc",
      descParams: { language: LANGUAGE_META[lang].label },
    });

    // Tier 1 — Explorer Badges (level-{N}-complete-{lang})
    for (let level = 1; level <= maxLevel; level++) {
      items.push({
        tier: "explorer",
        slug: `level-${level}-complete-${lang}`,
        type: "badge",
        language: lang,
        emoji: EXPLORER_EMOJI,
        level,
        titleKey: "levelExplorer",
        titleParams: { level: String(level) },
        descKey: "achExplorerBadgeDesc",
        descParams: { level: String(level) },
      });
    }

    // Tier 2 — Category Master Badges ({category}-master-{lang})
    for (const activity of ACTIVITIES) {
      const categoryName = t(activity.titleKey);
      items.push({
        tier: "categoryMaster",
        slug: `${activity.category}-master-${lang}`,
        type: "badge",
        language: lang,
        emoji: activity.emoji,
        category: activity.category,
        titleKey: "achCategoryMasterTitle",
        titleParams: { category: categoryName },
        descKey: "achCategoryMasterDesc",
        descParams: { category: categoryName },
      });
    }
  }

  return items;
}

// Replaces "{key}" placeholders in an i18n template with resolved values.
export function fillTemplate(template: string, params?: Record<string, string>): string {
  if (!params) return template;
  return Object.entries(params).reduce((str, [key, value]) => str.replaceAll(`{${key}}`, value), template);
}

// slug -> earned_at, for O(1) earned/locked lookups while rendering the catalog.
export function getEarnedMap(achievements: ChildAchievement[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const a of achievements) map.set(a.slug, a.earned_at);
  return map;
}

export interface TrilingualStatus {
  earned: boolean;
  earnedAt: string | null;
  progress: number; // 0-3
  languages: Record<Lang, boolean>;
}

// Tier 4 — Trilingual Champion: derived, not stored. Earned once
// curriculum-complete-{en,fr,rw} all exist for this child; earnedAt is the
// latest of the three (the moment the 3rd language's curriculum finished).
export function getTrilingualStatus(achievements: ChildAchievement[]): TrilingualStatus {
  const languages = {} as Record<Lang, boolean>;
  const dates: (string | null)[] = [];

  for (const lang of LANGUAGES) {
    const row = achievements.find(a => a.type === "certificate" && a.slug === `curriculum-complete-${lang}`);
    languages[lang] = !!row;
    dates.push(row?.earned_at ?? null);
  }

  const progress = Object.values(languages).filter(Boolean).length;
  const earned = progress === LANGUAGES.length;
  const earnedAt = earned
    ? dates.reduce((max, d) => (!max || (d && d > max) ? d : max), null as string | null)
    : null;

  return { earned, earnedAt, progress, languages };
}
