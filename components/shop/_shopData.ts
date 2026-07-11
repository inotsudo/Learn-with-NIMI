export type ShopCategory = "costumes" | "frames" | "titles" | "powerups";
export type EquipSlot = "nimi_outfit" | "piko_outfit" | "frame" | "title_badge";

export interface ShopItem {
  id: string;
  category: ShopCategory;
  nameKey: string;
  descKey: string;
  emoji: string;
  bg: string;
  price: number;
  consumable?: boolean;
  slot?: EquipSlot;
  // Frame visual — applied to profile cards
  frameRing?: string;
  frameBg?: string;
  // Frame visual — applied to the full-width profile hero
  heroGradient?: string;
  heroDecos?: string[];
  // Title visual — color applied to badge pill
  titleColor?: string;
}

export const SHOP_ITEMS: ShopItem[] = [
  // ── NIMI Costumes ───────────────────────────────────────────────────────
  {
    id: "costume-nimi-superhero",
    category: "costumes", slot: "nimi_outfit",
    nameKey: "costumeNimiSuperhero", descKey: "costumeNimiSuperheroDesc",
    emoji: "🦸", bg: "bg-gradient-to-br from-red-400 to-orange-500", price: 80,
  },
  {
    id: "costume-nimi-astronaut",
    category: "costumes", slot: "nimi_outfit",
    nameKey: "costumeNimiAstronaut", descKey: "costumeNimiAstronautDesc",
    emoji: "🚀", bg: "bg-gradient-to-br from-slate-500 to-blue-700", price: 100,
  },
  {
    id: "costume-nimi-wizard",
    category: "costumes", slot: "nimi_outfit",
    nameKey: "costumeNimiWizard", descKey: "costumeNimiWizardDesc",
    emoji: "🧙", bg: "bg-gradient-to-br from-purple-500 to-violet-700", price: 90,
  },
  {
    id: "costume-nimi-dino",
    category: "costumes", slot: "nimi_outfit",
    nameKey: "costumeNimiDino", descKey: "costumeNimiDinoDesc",
    emoji: "🦕", bg: "bg-gradient-to-br from-emerald-400 to-green-600", price: 75,
  },
  // ── PIKO Costumes ───────────────────────────────────────────────────────
  {
    id: "costume-piko-ninja",
    category: "costumes", slot: "piko_outfit",
    nameKey: "costumePikoNinja", descKey: "costumePikoNinjaDesc",
    emoji: "🥷", bg: "bg-gradient-to-br from-gray-700 to-slate-900", price: 80,
  },
  {
    id: "costume-piko-doctor",
    category: "costumes", slot: "piko_outfit",
    nameKey: "costumePikoDoctor", descKey: "costumePikoDoctorDesc",
    emoji: "🩺", bg: "bg-gradient-to-br from-blue-300 to-cyan-500", price: 70,
  },
  {
    id: "costume-piko-robot",
    category: "costumes", slot: "piko_outfit",
    nameKey: "costumePikoRobot", descKey: "costumePikoRobotDesc",
    emoji: "🤖", bg: "bg-gradient-to-br from-zinc-300 to-slate-500", price: 110,
  },
  {
    id: "costume-piko-chef",
    category: "costumes", slot: "piko_outfit",
    nameKey: "costumePikoChef", descKey: "costumePikoChefDesc",
    emoji: "👨‍🍳", bg: "bg-gradient-to-br from-amber-300 to-orange-400", price: 65,
  },
  // ── Profile Frames ──────────────────────────────────────────────────────
  {
    id: "frame-rainbow",
    category: "frames", slot: "frame",
    nameKey: "frameRainbow", descKey: "frameRainbowDesc",
    emoji: "🌈", bg: "bg-gradient-to-br from-pink-300 via-purple-300 to-blue-300", price: 80,
    frameRing: "ring-4 ring-offset-2 ring-pink-400",
    frameBg: "bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50",
    heroGradient: "linear-gradient(135deg, #f43f5e 0%, #a855f7 40%, #3b82f6 75%, #10b981 100%)",
    heroDecos: ["🌈", "✨", "🦋", "🌸", "🌟"],
  },
  {
    id: "frame-galaxy",
    category: "frames", slot: "frame",
    nameKey: "frameGalaxy", descKey: "frameGalaxyDesc",
    emoji: "🔮", bg: "bg-gradient-to-br from-indigo-600 to-purple-800", price: 110,
    frameRing: "ring-4 ring-offset-2 ring-violet-500",
    frameBg: "bg-gradient-to-br from-indigo-50 via-purple-50 to-slate-100",
    heroGradient: "linear-gradient(135deg, #0f0c29 0%, #302b63 45%, #24243e 100%)",
    heroDecos: ["⭐", "🌟", "💫", "✨", "🔮"],
  },
  {
    id: "frame-ocean",
    category: "frames", slot: "frame",
    nameKey: "frameOcean", descKey: "frameOceanDesc",
    emoji: "🌊", bg: "bg-gradient-to-br from-cyan-400 to-blue-600", price: 70,
    frameRing: "ring-4 ring-offset-2 ring-cyan-400",
    frameBg: "bg-gradient-to-br from-cyan-50 to-blue-50",
    heroGradient: "linear-gradient(135deg, #0891b2 0%, #1d4ed8 60%, #1e3a8a 100%)",
    heroDecos: ["🌊", "🐠", "🐋", "🦈", "🐚"],
  },
  {
    id: "frame-jungle",
    category: "frames", slot: "frame",
    nameKey: "frameJungle", descKey: "frameJungleDesc",
    emoji: "🌿", bg: "bg-gradient-to-br from-green-400 to-emerald-600", price: 60,
    frameRing: "ring-4 ring-offset-2 ring-green-400",
    frameBg: "bg-gradient-to-br from-green-50 to-emerald-50",
    heroGradient: "linear-gradient(135deg, #14532d 0%, #15803d 50%, #065f46 100%)",
    heroDecos: ["🌿", "🦜", "🌺", "🦋", "🌱"],
  },
  {
    id: "frame-golden",
    category: "frames", slot: "frame",
    nameKey: "frameGolden", descKey: "frameGoldenDesc",
    emoji: "✨", bg: "bg-gradient-to-br from-yellow-400 to-amber-500", price: 130,
    frameRing: "ring-4 ring-offset-2 ring-yellow-400",
    frameBg: "bg-gradient-to-br from-yellow-50 to-amber-50",
    heroGradient: "linear-gradient(135deg, #92400e 0%, #d97706 40%, #fbbf24 75%, #92400e 100%)",
    heroDecos: ["✨", "👑", "💛", "🌟", "🏆"],
  },
  // ── Titles ──────────────────────────────────────────────────────────────
  {
    id: "title-explorer",
    category: "titles", slot: "title_badge",
    nameKey: "titleExplorer", descKey: "titleExplorerDesc",
    emoji: "🗺️", bg: "bg-gradient-to-br from-teal-300 to-cyan-500", price: 30,
    titleColor: "bg-teal-100 text-teal-700",
  },
  {
    id: "title-wizard",
    category: "titles", slot: "title_badge",
    nameKey: "titleWizard", descKey: "titleWizardDesc",
    emoji: "🪄", bg: "bg-gradient-to-br from-purple-400 to-violet-600", price: 50,
    titleColor: "bg-purple-100 text-purple-700",
  },
  {
    id: "title-star-reader",
    category: "titles", slot: "title_badge",
    nameKey: "titleStarReader", descKey: "titleStarReaderDesc",
    emoji: "⭐", bg: "bg-gradient-to-br from-yellow-400 to-orange-500", price: 60,
    titleColor: "bg-amber-100 text-amber-700",
  },
  {
    id: "title-champion",
    category: "titles", slot: "title_badge",
    nameKey: "titleChampion", descKey: "titleChampionDesc",
    emoji: "🏆", bg: "bg-gradient-to-br from-orange-400 to-red-500", price: 90,
    titleColor: "bg-orange-100 text-orange-700",
  },
  {
    id: "title-hero",
    category: "titles", slot: "title_badge",
    nameKey: "titleHero", descKey: "titleHeroDesc",
    emoji: "🦸", bg: "bg-gradient-to-br from-blue-400 to-indigo-600", price: 70,
    titleColor: "bg-blue-100 text-blue-700",
  },
  // ── Power-Ups ────────────────────────────────────────────────────────────
  {
    id: "streakShield",
    category: "powerups",
    nameKey: "rewardStreakShield", descKey: "rewardStreakShieldDesc",
    emoji: "🛡️", bg: "bg-gradient-to-br from-blue-400 to-indigo-600", price: 30,
    consumable: true,
  },
];

export const SHOP_ITEM_MAP = Object.fromEntries(SHOP_ITEMS.map(i => [i.id, i]));
