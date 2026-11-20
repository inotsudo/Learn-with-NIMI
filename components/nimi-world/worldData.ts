// Data contract between the app (HomeClient) and the toy world.
import type { PassportStamp } from "./three/PassportBook";
import { TARMAC_TILES } from "./themes";

export interface WorldStory {
  id: string;
  slug: string;
  title: string;
  emoji: string;
  unlocked: boolean;
  complete: boolean;
  /** Destination number (story sort_order) → flight NMP1xx, gate, "Destination N". */
  order: number;
}

export interface WorldSlot { slotKey: string; title: string; completed: boolean }

export interface WorldChild { id: string; name: string; age: number | null }

export interface WorldData {
  childName: string;
  stories: WorldStory[];
  /** The story the tarmac tiles launch (first unlocked & unfinished). */
  currentStoryId: string | null;
  slots: WorldSlot[];
  stars: number;
  streak: number;
  level: number;
  xpIn: number;
  xpNeeded: number;
  xpPct: number;
  stamps: PassportStamp[];
}

const CATEGORY_STAMPS: Record<string, { emoji: string; color: string }> = {
  morning: { emoji: "🎵", color: "#DB2777" },
  movement: { emoji: "🤸", color: "#E11D48" },
  artistic: { emoji: "🎨", color: "#D97706" },
  histoire: { emoji: "📖", color: "#0284C7" },
  zoom: { emoji: "🔍", color: "#059669" },
  discovery: { emoji: "🌍", color: "#0891B2" },
  flipflop: { emoji: "🎧", color: "#7C3AED" },
  coloring: { emoji: "🦋", color: "#E11D48" },
};

/** Badge achievement slug → passport stamp (mirrors the badge visuals used elsewhere in the app). */
export function stampForBadge(slug: string): PassportStamp {
  if (slug.startsWith("trilingual-story-")) return { slug, emoji: "🌐", color: "#0D9488" };
  if (slug.startsWith("story-streak-")) return { slug, emoji: "🔥", color: "#EA580C" };
  if (slug.startsWith("story-") && slug.includes("-complete-")) return { slug, emoji: "📚", color: "#4F46E5" };
  if (slug.startsWith("level-") && slug.includes("-complete-")) return { slug, emoji: "⭐", color: "#D97706" };
  const cat = CATEGORY_STAMPS[slug.split("-")[0] ?? ""];
  return cat ? { slug, ...cat } : { slug, emoji: "🏅", color: "#4F46E5" };
}

export function missionHref(data: WorldData, slotKey: string): string | null {
  const story = data.stories.find((s) => s.id === data.currentStoryId);
  if (!story) return null;
  return data.slots.some((s) => s.slotKey === slotKey) ? `/stories/${story.slug}/mission/${slotKey}` : `/stories/${story.slug}`;
}

/** Next unfinished mission in tarmac order, or null when the story is done / empty. */
export function nextSlotKey(data: WorldData): string | null {
  for (const t of TARMAC_TILES) {
    const s = data.slots.find((x) => x.slotKey === t.slotKey);
    if (s && !s.completed) return s.slotKey;
  }
  return data.slots.find((s) => !s.completed)?.slotKey ?? null;
}
