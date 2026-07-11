// NIMIPIKO — "Today's Adventure" dashboard activity config (Phase 2A)
//
// Drives the homepage grid and the /missions/[category] dynamic route.
// This config provides card layout/links/i18n fallbacks; lesson content
// (title, subtitle, media, stars, tips) is loaded from the `missions`
// table per category and overrides these defaults when present.

export type ActivityCategory =
  | "morning"
  | "movement"
  | "artistic"
  | "histoire"
  | "zoom"
  | "discovery"
  | "flipflop"
  | "coloring";

export interface ActivityConfig {
  number: number;
  category: ActivityCategory;
  titleKey: string;
  subtitleKey: string;
  emoji: string;
  mascot: "nimi" | "piko";
  borderColor: string;
  numBg: string;
  numBgGlass: string;
  numTextGlass: string;
  stars: number;
  href: string;
  startKey?: string;
}

export const ACTIVITIES: ActivityConfig[] = [
  {
    number: 1,
    category: "morning",
    titleKey: "activityMorningSongTitle",
    subtitleKey: "activityMorningSongSubtitle",
    emoji: "🎧",
    mascot: "nimi",
    borderColor: "border-purple-200",
    numBg: "bg-purple-600",
    numBgGlass: "bg-purple-400/20",
    numTextGlass: "text-purple-200",
    stars: 10,
    href: "/missions/morning",
    startKey: "startSinging",
  },
  {
    number: 2,
    category: "movement",
    titleKey: "activityMovementTitle",
    subtitleKey: "activityMovementSubtitle",
    emoji: "🤸",
    mascot: "nimi",
    borderColor: "border-pink-200",
    numBg: "bg-pink-600",
    numBgGlass: "bg-pink-400/20",
    numTextGlass: "text-pink-200",
    stars: 10,
    href: "/missions/movement",
    startKey: "startMoving",
  },
  {
    number: 3,
    category: "artistic",
    titleKey: "activityArtistiqueTitle",
    subtitleKey: "activityArtistiqueSubtitle",
    emoji: "🎨",
    mascot: "nimi",
    borderColor: "border-orange-200",
    numBg: "bg-orange-500",
    numBgGlass: "bg-orange-400/20",
    numTextGlass: "text-orange-200",
    stars: 15,
    href: "/missions/artistic",
    startKey: "startCreating",
  },
  {
    number: 4,
    category: "histoire",
    titleKey: "activityHistoriqueTitle",
    subtitleKey: "activityHistoriqueSubtitle",
    emoji: "🏛️",
    mascot: "nimi",
    borderColor: "border-amber-300",
    numBg: "bg-amber-700",
    numBgGlass: "bg-amber-400/20",
    numTextGlass: "text-amber-200",
    stars: 15,
    href: "/missions/histoire",
    startKey: "startExploring",
  },
  {
    number: 5,
    category: "zoom",
    titleKey: "activityZoomTitle",
    subtitleKey: "activityZoomSubtitle",
    emoji: "🔍",
    mascot: "nimi",
    borderColor: "border-green-200",
    numBg: "bg-[var(--nimi-green)]",
    numBgGlass: "bg-green-400/20",
    numTextGlass: "text-green-200",
    stars: 15,
    href: "/missions/zoom",
    startKey: "startZooming",
  },
  {
    number: 6,
    category: "discovery",
    titleKey: "activityDiscoveryTitle",
    subtitleKey: "activityDiscoverySubtitle",
    emoji: "🌱",
    mascot: "nimi",
    borderColor: "border-teal-200",
    numBg: "bg-teal-600",
    numBgGlass: "bg-teal-400/20",
    numTextGlass: "text-teal-200",
    stars: 10,
    href: "/missions/discovery",
    startKey: "startDiscovering",
  },
  {
    number: 7,
    category: "flipflop",
    titleKey: "activityFlipFlopTitle",
    subtitleKey: "activityFlipFlopSubtitle",
    emoji: "📖",
    mascot: "nimi",
    borderColor: "border-indigo-200",
    numBg: "bg-indigo-600",
    numBgGlass: "bg-indigo-400/20",
    numTextGlass: "text-indigo-200",
    stars: 10,
    href: "/missions/flipflop",
    startKey: "startReading",
  },
  {
    number: 8,
    category: "coloring",
    titleKey: "activityColoringTitle",
    subtitleKey: "activityColoringSubtitle",
    emoji: "🖍️",
    mascot: "nimi",
    borderColor: "border-yellow-200",
    numBg: "bg-yellow-500",
    numBgGlass: "bg-yellow-400/20",
    numTextGlass: "text-yellow-200",
    stars: 10,
    href: "/missions/coloring",
    startKey: "startColoring",
  },
];

export const FALLBACK_THEME = { title: "The Lion King of Rwanda", emoji: "🦁" };

export function getActivity(number: number): ActivityConfig | undefined {
  return ACTIVITIES.find((a) => a.number === number);
}
