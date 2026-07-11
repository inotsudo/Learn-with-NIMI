import type { AppThemeId } from "./theme";

// ─── Type definitions ──────────────────────────────────────────────────────

export type ThemeStatus =
  | "current"
  | "installed"
  | "locked"
  | "premium"
  | "coming_soon";

export type ThemeRarity = "common" | "rare" | "epic" | "legendary";

export type ThemeUnlockType =
  | "free"
  | "stars"
  | "gems"
  | "subscription"
  | "achievement"
  | "seasonal";

export type ThemeCategory =
  | "featured"
  | "installed"
  | "free"
  | "premium"
  | "educational"
  | "seasonal"
  | "fantasy"
  | "nature"
  | "sci-fi";

export const THEME_CATEGORIES: { id: ThemeCategory; label: string; emoji: string }[] = [
  { id: "featured",    label: "Featured",    emoji: "⭐" },
  { id: "installed",   label: "Installed",   emoji: "✅" },
  { id: "free",        label: "Free",        emoji: "🎁" },
  { id: "premium",     label: "Premium",     emoji: "💎" },
  { id: "educational", label: "Educational", emoji: "📚" },
  { id: "seasonal",    label: "Seasonal",    emoji: "🌸" },
  { id: "fantasy",     label: "Fantasy",     emoji: "🧙" },
  { id: "nature",      label: "Nature",      emoji: "🌿" },
  { id: "sci-fi",      label: "Sci-Fi",      emoji: "🚀" },
];

// ─── Core interface ────────────────────────────────────────────────────────

export interface ThemeMetadata {
  /** Matches AppThemeId for installed themes; arbitrary string for future ones */
  id:               AppThemeId | string;
  name:             string;
  description:      string;
  longDescription:  string;
  author:           string;
  version:          string;
  categories:       ThemeCategory[];
  rarity:           ThemeRarity;
  unlockType:       ThemeUnlockType;
  /** Star/gem cost when unlockType is "stars" or "gems" */
  unlockCost?:      number;
  /** Relative path to a 4:3 preview image */
  previewImage:     string;
  /** Relative path to a large hero/banner image */
  heroImage:        string;
  /** Single emoji used as the accent icon */
  accentIcon:       string;
  /** Hex color used for card accents and tinted UI */
  accentColor:      string;
  /** Tailwind gradient classes for the card visual header */
  gradientClass:    string;
  isPremium:        boolean;
  isInstalled:      boolean;
  comingSoon:       boolean;
  /** Human-readable estimated availability, e.g. "Summer 2026" */
  estimatedUnlock?: string;
  /** Short feature bullet points shown in the details panel */
  features:         string[];
  /** Artwork / assets bundled with this theme */
  includedAssets:   string[];
  lastUpdated:      string;
}

// ─── Registry ──────────────────────────────────────────────────────────────

const THEME_REGISTRY: ThemeMetadata[] = [
  // ── Default (Nimipiko World) — the base theme ─────────────────────────────
  {
    id:              "default",
    name:            "Nimipiko World",
    description:     "Clean whites and fresh greens. The everyday NIMIPIKO look.",
    longDescription:
      "Nimipiko World is the clean, minimal baseline — crisp white surfaces, " +
      "fresh green accents, and soft shadows. Always free, always first.",
    author:          "NIMIPIKO Studio",
    version:         "1.0.0",
    categories:      ["featured", "installed", "free", "educational"],
    rarity:          "common",
    unlockType:      "free",
    previewImage:    "/themes/default/preview.png",
    heroImage:       "/themes/default/hero.png",
    accentIcon:      "🌍",
    accentColor:     "#16a34a",
    gradientClass:   "from-green-400 via-emerald-400 to-teal-400",
    isPremium:       false,
    isInstalled:     true,
    comingSoon:      false,
    features: [
      "Crisp white card surfaces",
      "Fresh green accent color",
      "Soft neutral shadows",
      "Clean typography",
    ],
    includedAssets: ["Nimi & Piko character artwork"],
    lastUpdated: "2026-07-04",
  },

  // ── HP (Happy Place) — shipped ────────────────────────────────────────────
  {
    id:              "hp",
    name:            "Happy Place",
    description:     "Warm, playful, and full of golden energy. The original NIMIPIKO experience.",
    longDescription:
      "Happy Place is the classic NIMIPIKO design language — warm greens and golden yellows, cozy " +
      "card shadows, and playful sparkle animations. Crafted to feel like a sunny afternoon adventure.",
    author:          "NIMIPIKO Studio",
    version:         "2.0.0",
    categories:      ["featured", "installed", "free", "educational"],
    rarity:          "common",
    unlockType:      "free",
    previewImage:    "/themes/hp/preview.png",
    heroImage:       "/themes/hp/hero.png",
    accentIcon:      "✨",
    accentColor:     "#16a34a",
    gradientClass:   "from-green-400 via-emerald-500 to-yellow-400",
    isPremium:       false,
    isInstalled:     true,
    comingSoon:      false,
    features: [
      "Warm golden sparkle particles",
      "Cozy card shadows & warm borders",
      "Green navigation with gold accents",
      "Emerald progress bars",
      "Playful floating-dust animations",
    ],
    includedAssets: [
      "Nimi & Piko character artwork",
      "Star mascot & trophy illustrations",
      "Hero imagery — desktop & mobile",
      "Story cover & completion art",
    ],
    lastUpdated: "2026-06-15",
  },

  // ── Ocean Dream — shipped ─────────────────────────────────────────────────
  {
    id:              "ocean",
    name:            "Ocean Dream",
    description:     "Dive into cool blues and glass surfaces. A serene underwater adventure.",
    longDescription:
      "Ocean Dream transforms NIMIPIKO into a calm aquatic world. Glass-morphism card surfaces, " +
      "rising bubble particles, and light-ray hero decorations create an immersive deep-sea " +
      "learning environment.",
    author:          "NIMIPIKO Studio",
    version:         "1.0.0",
    categories:      ["free", "nature"],
    rarity:          "rare",
    unlockType:      "free",
    previewImage:    "/themes/ocean/preview.png",
    heroImage:       "/themes/ocean/hero.png",
    accentIcon:      "🌊",
    accentColor:     "#0284c7",
    gradientClass:   "from-sky-400 via-cyan-500 to-blue-600",
    isPremium:       false,
    isInstalled:     false,
    comingSoon:      true,
    features: [
      "Glass-morphism card surfaces with backdrop blur",
      "Rising bubble particle system",
      "Diagonal light-ray hero decorations",
      "Cool-blue navigation with sky accents",
      "Aqua progress bars",
    ],
    includedAssets: [
      "Nimi & Piko character artwork",
      "Ocean hero imagery — desktop & mobile",
      "Community & story illustrations",
    ],
    lastUpdated: "2026-06-20",
  },

  // ── Galactic Explorer — coming soon, premium ──────────────────────────────
  {
    id:              "galactic",
    name:            "Galactic Explorer",
    description:     "Blast off into a neon-lit cosmos. Stars, nebulae, and interstellar learning.",
    longDescription:
      "Galactic Explorer takes NIMIPIKO into deep space with dark backgrounds, neon purple and " +
      "cyan accents, and a starfield particle system. Coming soon for Premium members.",
    author:          "NIMIPIKO Studio",
    version:         "0.9.0",
    categories:      ["premium", "sci-fi", "featured"],
    rarity:          "epic",
    unlockType:      "subscription",
    previewImage:    "/themes/galactic/preview.png",
    heroImage:       "/themes/galactic/hero.png",
    accentIcon:      "🚀",
    accentColor:     "#7c3aed",
    gradientClass:   "from-violet-600 via-purple-700 to-indigo-900",
    isPremium:       true,
    isInstalled:     false,
    comingSoon:      true,
    estimatedUnlock: "Q3 2026",
    features: [
      "Dark space background with starfield",
      "Neon purple & cyan color palette",
      "Comet-trail particle animations",
      "Cosmic card glow effects",
      "Space-age navigation UI",
    ],
    includedAssets: [
      "Nimi & Piko in astronaut suits",
      "Planet and nebula hero artwork",
      "Galaxy-themed story covers",
    ],
    lastUpdated: "2026-06-01",
  },

  // ── Forest Magic — coming soon, premium ───────────────────────────────────
  {
    id:              "forest_magic",
    name:            "Forest Magic",
    description:     "Step into an enchanted forest where every leaf sparkles with possibility.",
    longDescription:
      "Forest Magic wraps NIMIPIKO in deep earth tones, emerald canopy greens, and warm amber " +
      "lantern glows. Firefly particles and hand-drawn botanical borders create a storybook feel.",
    author:          "NIMIPIKO Studio",
    version:         "0.8.0",
    categories:      ["fantasy", "nature", "premium"],
    rarity:          "epic",
    unlockType:      "stars",
    unlockCost:      500,
    previewImage:    "/themes/forest_magic/preview.png",
    heroImage:       "/themes/forest_magic/hero.png",
    accentIcon:      "🌿",
    accentColor:     "#166534",
    gradientClass:   "from-green-800 via-emerald-700 to-lime-600",
    isPremium:       true,
    isInstalled:     false,
    comingSoon:      true,
    estimatedUnlock: "Q4 2026",
    features: [
      "Deep forest dark-green palette",
      "Firefly particle animations",
      "Hand-drawn botanical border accents",
      "Warm amber lantern card glow",
      "Enchanted mushroom navigation icons",
    ],
    includedAssets: [
      "Nimi & Piko in forest ranger outfits",
      "Enchanted forest hero artwork",
      "Botanical story cover illustrations",
    ],
    lastUpdated: "2026-05-15",
  },

  // ── Sunshine Valley — coming soon, seasonal ───────────────────────────────
  {
    id:              "sunshine_valley",
    name:            "Sunshine Valley",
    description:     "Limited seasonal theme bursting with summer warmth, sunflowers, and rainbow energy.",
    longDescription:
      "Sunshine Valley is a limited-edition seasonal theme celebrating summer learning. " +
      "Expect vibrant warm yellows, coral pinks, and a cheerful sunflower aesthetic.",
    author:          "NIMIPIKO Studio",
    version:         "0.7.0",
    categories:      ["seasonal", "featured"],
    rarity:          "legendary",
    unlockType:      "seasonal",
    previewImage:    "/themes/sunshine_valley/preview.png",
    heroImage:       "/themes/sunshine_valley/hero.png",
    accentIcon:      "☀️",
    accentColor:     "#d97706",
    gradientClass:   "from-yellow-400 via-orange-400 to-pink-400",
    isPremium:       false,
    isInstalled:     false,
    comingSoon:      true,
    estimatedUnlock: "Summer 2026",
    features: [
      "Vibrant warm yellow & coral palette",
      "Sunflower petal particle system",
      "Rainbow gradient card borders",
      "Summer-inspired typography accents",
      "Seasonal hero artwork",
    ],
    includedAssets: [
      "Nimi & Piko in summer outfits",
      "Sunflower field hero imagery",
      "Rainbow-themed achievement art",
    ],
    lastUpdated: "2026-06-01",
  },

  // ── Night Sky — coming soon, premium ─────────────────────────────────────
  {
    id:              "night_sky",
    name:            "Night Sky",
    description:     "A tranquil midnight theme for focused evening learning under the stars.",
    longDescription:
      "Night Sky transforms NIMIPIKO into a calm nocturnal experience. Deep navy backgrounds, " +
      "silver constellation accents, and a soft moon-glow create the perfect winding-down atmosphere.",
    author:          "NIMIPIKO Studio",
    version:         "0.6.0",
    categories:      ["premium", "fantasy", "nature"],
    rarity:          "rare",
    unlockType:      "gems",
    unlockCost:      50,
    previewImage:    "/themes/night_sky/preview.png",
    heroImage:       "/themes/night_sky/hero.png",
    accentIcon:      "🌙",
    accentColor:     "#1e40af",
    gradientClass:   "from-slate-900 via-blue-950 to-indigo-900",
    isPremium:       true,
    isInstalled:     false,
    comingSoon:      true,
    estimatedUnlock: "Q3 2026",
    features: [
      "Deep navy midnight color palette",
      "Constellation particle system",
      "Moon-glow card shimmer",
      "Silver accent borders and text",
      "Starfield hero decoration",
    ],
    includedAssets: [
      "Nimi & Piko in stargazer outfits",
      "Midnight observatory hero artwork",
      "Constellation achievement badges",
    ],
    lastUpdated: "2026-05-20",
  },
];

// ─── Getters ───────────────────────────────────────────────────────────────

export function getAllThemes(): ThemeMetadata[] {
  return THEME_REGISTRY;
}

export function getThemeMetadata(id: string): ThemeMetadata | undefined {
  return THEME_REGISTRY.find(t => t.id === id);
}

export function getThemesByCategory(category: ThemeCategory): ThemeMetadata[] {
  if (category === "installed") return THEME_REGISTRY.filter(t => t.isInstalled);
  return THEME_REGISTRY.filter(t => t.categories.includes(category));
}

export function searchThemes(query: string): ThemeMetadata[] {
  const q = query.toLowerCase().trim();
  if (!q) return THEME_REGISTRY;
  return THEME_REGISTRY.filter(t =>
    t.name.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q) ||
    t.categories.some(c => c.includes(q)) ||
    t.author.toLowerCase().includes(q)
  );
}

/** Derive the status badge label for a given metadata + current theme */
export function getThemeStatus(meta: ThemeMetadata, currentThemeId: string): ThemeStatus {
  if (meta.id === currentThemeId)  return "current";
  if (meta.comingSoon)             return "coming_soon";
  if (meta.isPremium)              return "premium";
  if (meta.isInstalled)            return "installed";
  return "locked";
}

/** Rarity display helpers */
export const RARITY_LABELS: Record<ThemeRarity, string> = {
  common:    "Common",
  rare:      "Rare",
  epic:      "Epic",
  legendary: "Legendary",
};

export const RARITY_COLORS: Record<ThemeRarity, string> = {
  common:    "text-gray-500  bg-gray-100",
  rare:      "text-blue-600  bg-blue-50",
  epic:      "text-violet-600 bg-violet-50",
  legendary: "text-amber-600  bg-amber-50",
};
