// NIMIPIKO Airways toy world — World Themes × Kid Versions (pure data, no React).

export type WorldThemeId = "golden-sunset" | "starlight-night" | "emerald-jungle" | "cloud-carnival";
export type KidVersionId = "little-explorers" | "junior-champions" | "sky-navigators";
export type WorldLang = "fr" | "en";

export interface WorldTheme {
  id: WorldThemeId;
  name: { fr: string; en: string };
  emoji: string;
  /** CSS custom properties written onto the world root. */
  colors: {
    base: string;      // deep sky / ground
    accent: string;    // glow + interactive highlight
    accent2: string;   // secondary atmosphere hue
    horizon: string;   // horizon band of the sky gradient
    zenith: string;    // top of the sky gradient
    text: string;
  };
  /**
   * Non-destructive mood: a colour grade blended over the full-bleed artwork
   * (never covering it) + the Three.js dust/light particles drifting in front.
   */
  plate: { tint: string; blend: "soft-light" | "multiply" | "color" | "overlay"; tintOpacity: number; filter: string };
  dust: { colorA: string; colorB: string; count: number; size: number; rise: number };
  /** Palette for the 3D flight globe in the Kit studio. */
  island: { grass: string; grassDark: string; rock: string; rockDark: string; foliage: string; water: string; glow: string };
  /** Three.js lighting preset for every R3F canvas in the world. */
  lighting: {
    ambient: { color: string; intensity: number };
    key: { color: string; intensity: number; position: [number, number, number] };
    rim: { color: string; intensity: number; position: [number, number, number] };
    fog: { color: string; near: number; far: number };
  };
}

export interface KidVersion {
  id: KidVersionId;
  name: { fr: string; en: string };
  ages: string;
  emoji: string;
  /** Minimum touch target in px. */
  touchTarget: number;
  showLabels: boolean;
  /** Piko speaks every hint aloud and the next thing to tap glows brighter. */
  guidedSpotlight: boolean;
  /** Scale multiplier for the 3D toys (bigger toys for smaller hands). */
  toyScale: number;
  /** Which diegetic controls are available. */
  features: {
    tarmacTiles: boolean;
    passportStamps: boolean;
    flightGlobe: boolean;
    bilingualToggle: boolean;
    xpVault: boolean;
    /** Kit studio shows just the Kit and one big ▶ (no menus, no text). */
    oneTapKit: boolean;
  };
}

export const WORLD_THEMES: Record<WorldThemeId, WorldTheme> = {
  "golden-sunset": {
    id: "golden-sunset",
    name: { fr: "Royaume du Soleil Doré", en: "Golden Sunset Kingdom" },
    emoji: "🌅",
    colors: { base: "#0B1A33", accent: "#FBBF24", accent2: "#4C1D95", horizon: "#F59E0B", zenith: "#1E1B4B", text: "#FFF7E0" },
    plate: { tint: "#F59E0B", blend: "soft-light", tintOpacity: 0.35, filter: "saturate(1.08) brightness(1.02)" },
    dust: { colorA: "#FDE68A", colorB: "#FFF7E0", count: 320, size: 7, rise: 1 },
    island: { grass: "#F2C14E", grassDark: "#C98A1B", rock: "#8B5A3C", rockDark: "#5B3424", foliage: "#E8743B", water: "#FCD9A0", glow: "#FBBF24" },
    lighting: {
      ambient: { color: "#FFE7B3", intensity: 0.55 },
      key: { color: "#FFC86B", intensity: 2.2, position: [6, 8, 5] },
      rim: { color: "#8B5CF6", intensity: 1.1, position: [-6, 3, -4] },
      fog: { color: "#3B2257", near: 18, far: 60 },
    },
  },
  "starlight-night": {
    id: "starlight-night",
    name: { fr: "Vol de Nuit Étoilé", en: "Starlight Night Flight" },
    emoji: "🌌",
    colors: { base: "#060D1F", accent: "#38BDF8", accent2: "#6366F1", horizon: "#1E3A8A", zenith: "#020617", text: "#E0F2FE" },
    plate: { tint: "#1E3A8A", blend: "multiply", tintOpacity: 0.68, filter: "saturate(0.82) brightness(0.8) hue-rotate(-10deg)" },
    dust: { colorA: "#7DD3FC", colorB: "#FFFFFF", count: 380, size: 6, rise: 0.55 },
    island: { grass: "#3B5BA9", grassDark: "#24397A", rock: "#2A2F55", rockDark: "#161A33", foliage: "#7DD3FC", water: "#38BDF8", glow: "#38BDF8" },
    lighting: {
      ambient: { color: "#93C5FD", intensity: 0.45 },
      key: { color: "#7DD3FC", intensity: 1.6, position: [4, 9, 6] },
      rim: { color: "#22D3EE", intensity: 1.8, position: [-5, 2, -5] },
      fog: { color: "#0B1530", near: 16, far: 55 },
    },
  },
  "emerald-jungle": {
    id: "emerald-jungle",
    name: { fr: "Îles Jungle d'Émeraude", en: "Emerald Jungle & Waterfall Islands" },
    emoji: "🌴",
    colors: { base: "#064E3B", accent: "#A3E635", accent2: "#14B8A6", horizon: "#6EE7B7", zenith: "#0E7490", text: "#F0FDF4" },
    plate: { tint: "#10B981", blend: "soft-light", tintOpacity: 0.4, filter: "saturate(1.12) hue-rotate(6deg)" },
    dust: { colorA: "#D9F99D", colorB: "#ECFEFF", count: 300, size: 9, rise: 0.7 },
    island: { grass: "#4ADE80", grassDark: "#15803D", rock: "#78716C", rockDark: "#44403C", foliage: "#166534", water: "#67E8F9", glow: "#A3E635" },
    lighting: {
      ambient: { color: "#ECFCCB", intensity: 0.7 },
      key: { color: "#FEF9C3", intensity: 2.0, position: [5, 10, 4] },
      rim: { color: "#2DD4BF", intensity: 0.9, position: [-6, 3, -3] },
      fog: { color: "#A7F3D0", near: 20, far: 65 },
    },
  },
  "cloud-carnival": {
    id: "cloud-carnival",
    name: { fr: "Carnaval des Nuages", en: "Cloud Carnival & Rainbow Skies" },
    emoji: "🎪",
    colors: { base: "#0284C7", accent: "#FB7185", accent2: "#FDE68A", horizon: "#FBCFE8", zenith: "#38BDF8", text: "#FFFFFF" },
    plate: { tint: "#FB7185", blend: "soft-light", tintOpacity: 0.3, filter: "saturate(1.15) brightness(1.05)" },
    dust: { colorA: "#FBCFE8", colorB: "#BAE6FD", count: 340, size: 8, rise: 0.9 },
    island: { grass: "#F9A8D4", grassDark: "#DB2777", rock: "#C4B5FD", rockDark: "#8B5CF6", foliage: "#FDE68A", water: "#7DD3FC", glow: "#FB7185" },
    lighting: {
      ambient: { color: "#FFFFFF", intensity: 0.8 },
      key: { color: "#FFE4E6", intensity: 1.8, position: [6, 9, 6] },
      rim: { color: "#FDE68A", intensity: 1.2, position: [-5, 4, -4] },
      fog: { color: "#BAE6FD", near: 22, far: 70 },
    },
  },
};

export const KID_VERSIONS: Record<KidVersionId, KidVersion> = {
  "little-explorers": {
    id: "little-explorers",
    name: { fr: "Petits Explorateurs", en: "Little Explorers" },
    ages: "2–5",
    emoji: "🧸",
    touchTarget: 96,
    showLabels: false,
    guidedSpotlight: true,
    toyScale: 1.2,
    features: { tarmacTiles: false, passportStamps: false, flightGlobe: false, bilingualToggle: false, xpVault: false, oneTapKit: true },
  },
  "junior-champions": {
    id: "junior-champions",
    name: { fr: "Jeunes Champions", en: "Junior Champions" },
    ages: "6–8",
    emoji: "🏅",
    touchTarget: 72,
    showLabels: true,
    guidedSpotlight: false,
    toyScale: 1,
    features: { tarmacTiles: true, passportStamps: true, flightGlobe: false, bilingualToggle: false, xpVault: false, oneTapKit: false },
  },
  "sky-navigators": {
    id: "sky-navigators",
    name: { fr: "Navigateurs du Ciel", en: "Sky Navigators" },
    ages: "9–12",
    emoji: "🧭",
    touchTarget: 64,
    showLabels: true,
    guidedSpotlight: false,
    toyScale: 0.92,
    features: { tarmacTiles: true, passportStamps: true, flightGlobe: true, bilingualToggle: true, xpVault: true, oneTapKit: false },
  },
};

export const WORLD_THEME_IDS = Object.keys(WORLD_THEMES) as WorldThemeId[];
export const KID_VERSION_IDS = Object.keys(KID_VERSIONS) as KidVersionId[];

export function isWorldThemeId(v: unknown): v is WorldThemeId {
  return typeof v === "string" && v in WORLD_THEMES;
}
export function isKidVersionId(v: unknown): v is KidVersionId {
  return typeof v === "string" && v in KID_VERSIONS;
}

/** Pick a default version from the child's age. */
export function versionForAge(age: number | null | undefined): KidVersionId {
  if (age == null || Number.isNaN(age)) return "junior-champions";
  if (age <= 5) return "little-explorers";
  if (age <= 8) return "junior-champions";
  return "sky-navigators";
}

/** The world speaks French or English; Kinyarwanda learners get the French world (TTS has no rw voice). */
export function worldLangFor(language: string | null | undefined): WorldLang {
  return language === "en" ? "en" : "fr";
}

/** The 6 glowing tarmac tiles → real story slot keys (route: /stories/[slug]/mission/[slot_key]). */
export const TARMAC_TILES = [
  { slotKey: "flipflop_audio", fr: "FlipFlop Audio", en: "FlipFlop Audio", emoji: "🎧", color: "#A78BFA" },
  { slotKey: "story_pdf", fr: "Histoire PDF", en: "Story PDF", emoji: "📖", color: "#38BDF8" },
  { slotKey: "coloring", fr: "Coloriage", en: "Coloring", emoji: "🎨", color: "#FBBF24" },
  { slotKey: "move_explore", fr: "Bouge avec Nimi", en: "Move with Nimi", emoji: "🏃", color: "#F43F5E" },
  { slotKey: "sing_along", fr: "Karaoké", en: "Karaoke", emoji: "🎤", color: "#EC4899" },
  { slotKey: "bonus_video", fr: "Vidéo Bonus", en: "Bonus Video", emoji: "🎬", color: "#34D399" },
] as const;

export type TarmacTileDef = (typeof TARMAC_TILES)[number];
