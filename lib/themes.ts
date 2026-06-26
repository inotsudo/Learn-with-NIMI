export interface KidTheme {
  id: string;
  name: string;
  emoji: string;
  preview: string;
  bg: string;
  bgCard: string;
  bgDarker: string;
  bgCardHover: string;
  bgCardActive: string;
  accent: string;
  accentSolid: string;
  accentSoft: string;
  accentMuted: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textFaint: string;
  stars: string;
  sidebar: string;
  navActive: string;
}

export const THEMES: KidTheme[] = [
  {
    id: "galaxy",
    name: "Galaxy",
    emoji: "🌌",
    preview: "from-purple-600 via-indigo-600 to-blue-700",
    bg: "#150b35", bgCard: "#1c1055", bgDarker: "#0f0830",
    bgCardHover: "#251466", bgCardActive: "#1a0e3e",
    accent: "from-purple-500 to-indigo-600", accentSolid: "#7c3aed",
    accentSoft: "rgba(139, 92, 246, 0.15)", accentMuted: "rgba(139, 92, 246, 0.25)",
    border: "rgba(139, 92, 246, 0.15)", borderStrong: "rgba(139, 92, 246, 0.3)",
    text: "#e9d5ff", textMuted: "#c4b5fd", textFaint: "rgba(196, 181, 253, 0.4)",
    stars: "text-purple-300", sidebar: "#0f0a2a", navActive: "from-purple-500 to-indigo-600",
  },
  {
    id: "ocean",
    name: "Ocean",
    emoji: "🌊",
    preview: "from-sky-400 via-blue-500 to-cyan-400",
    bg: "#0c2d4a", bgCard: "#0f3a5e", bgDarker: "#082240",
    bgCardHover: "#134a72", bgCardActive: "#0b3050",
    accent: "from-sky-400 to-cyan-500", accentSolid: "#38bdf8",
    accentSoft: "rgba(56, 189, 248, 0.15)", accentMuted: "rgba(56, 189, 248, 0.25)",
    border: "rgba(56, 189, 248, 0.2)", borderStrong: "rgba(56, 189, 248, 0.35)",
    text: "#bae6fd", textMuted: "#7dd3fc", textFaint: "rgba(125, 211, 252, 0.4)",
    stars: "text-sky-300", sidebar: "#0a2540", navActive: "from-sky-400 to-cyan-500",
  },
  {
    id: "forest",
    name: "Forest",
    emoji: "🌿",
    preview: "from-green-400 via-emerald-500 to-lime-400",
    bg: "#0a2a15", bgCard: "#0f3a1e", bgDarker: "#071f0d",
    bgCardHover: "#134a28", bgCardActive: "#0c3218",
    accent: "from-green-400 to-emerald-500", accentSolid: "#34d399",
    accentSoft: "rgba(52, 211, 153, 0.15)", accentMuted: "rgba(52, 211, 153, 0.25)",
    border: "rgba(52, 211, 153, 0.2)", borderStrong: "rgba(52, 211, 153, 0.35)",
    text: "#bbf7d0", textMuted: "#86efac", textFaint: "rgba(134, 239, 172, 0.4)",
    stars: "text-emerald-300", sidebar: "#082510", navActive: "from-green-400 to-emerald-500",
  },
  {
    id: "sunset",
    name: "Sunset",
    emoji: "🌅",
    preview: "from-orange-400 via-rose-500 to-pink-500",
    bg: "#2d1520", bgCard: "#3a1a28", bgDarker: "#200e18",
    bgCardHover: "#4a2035", bgCardActive: "#32182a",
    accent: "from-orange-400 to-rose-500", accentSolid: "#fb923c",
    accentSoft: "rgba(251, 146, 60, 0.15)", accentMuted: "rgba(251, 146, 60, 0.25)",
    border: "rgba(251, 146, 60, 0.2)", borderStrong: "rgba(251, 146, 60, 0.35)",
    text: "#fed7aa", textMuted: "#fdba74", textFaint: "rgba(253, 186, 116, 0.4)",
    stars: "text-orange-300", sidebar: "#25101a", navActive: "from-orange-400 to-rose-500",
  },
  {
    id: "candy",
    name: "Candy",
    emoji: "🍬",
    preview: "from-pink-400 via-fuchsia-400 to-violet-500",
    bg: "#2a0f30", bgCard: "#381545", bgDarker: "#1e0a22",
    bgCardHover: "#451a55", bgCardActive: "#30103a",
    accent: "from-pink-400 to-fuchsia-500", accentSolid: "#f472b6",
    accentSoft: "rgba(244, 114, 182, 0.15)", accentMuted: "rgba(244, 114, 182, 0.25)",
    border: "rgba(244, 114, 182, 0.2)", borderStrong: "rgba(244, 114, 182, 0.35)",
    text: "#fbcfe8", textMuted: "#f9a8d4", textFaint: "rgba(249, 168, 212, 0.4)",
    stars: "text-pink-300", sidebar: "#220c28", navActive: "from-pink-400 to-fuchsia-500",
  },
  {
    id: "sunshine",
    name: "Sunshine",
    emoji: "☀️",
    preview: "from-yellow-300 via-amber-400 to-orange-400",
    bg: "#2a2008", bgCard: "#3a2c10", bgDarker: "#1f1805",
    bgCardHover: "#4a3a15", bgCardActive: "#30260c",
    accent: "from-yellow-400 to-amber-500", accentSolid: "#fbbf24",
    accentSoft: "rgba(251, 191, 36, 0.15)", accentMuted: "rgba(251, 191, 36, 0.25)",
    border: "rgba(251, 191, 36, 0.2)", borderStrong: "rgba(251, 191, 36, 0.35)",
    text: "#fef9c3", textMuted: "#fde047", textFaint: "rgba(253, 224, 71, 0.4)",
    stars: "text-yellow-300", sidebar: "#22190a", navActive: "from-yellow-400 to-amber-500",
  },
  {
    id: "rainbow",
    name: "Rainbow",
    emoji: "🌈",
    preview: "from-red-400 via-yellow-400 via-green-400 to-blue-400",
    bg: "#1a1030", bgCard: "#251545", bgDarker: "#120a22",
    bgCardHover: "#301a58", bgCardActive: "#1f1238",
    accent: "from-red-400 via-yellow-400 to-blue-400", accentSolid: "#a78bfa",
    accentSoft: "rgba(167, 139, 250, 0.15)", accentMuted: "rgba(167, 139, 250, 0.25)",
    border: "rgba(167, 139, 250, 0.2)", borderStrong: "rgba(167, 139, 250, 0.35)",
    text: "#ddd6fe", textMuted: "#c4b5fd", textFaint: "rgba(196, 181, 253, 0.4)",
    stars: "text-violet-300", sidebar: "#150c28", navActive: "from-red-400 via-yellow-400 to-blue-400",
  },
  {
    id: "space",
    name: "Space",
    emoji: "🚀",
    preview: "from-indigo-500 via-violet-600 to-purple-700",
    bg: "#08081a", bgCard: "#0e0e28", bgDarker: "#050512",
    bgCardHover: "#151535", bgCardActive: "#0a0a20",
    accent: "from-indigo-400 to-violet-500", accentSolid: "#818cf8",
    accentSoft: "rgba(129, 140, 248, 0.15)", accentMuted: "rgba(129, 140, 248, 0.25)",
    border: "rgba(129, 140, 248, 0.15)", borderStrong: "rgba(129, 140, 248, 0.3)",
    text: "#c7d2fe", textMuted: "#a5b4fc", textFaint: "rgba(165, 180, 252, 0.4)",
    stars: "text-indigo-300", sidebar: "#06061a", navActive: "from-indigo-400 to-violet-500",
  },
];

export function getTheme(id: string): KidTheme {
  return THEMES.find(t => t.id === id) ?? THEMES[0];
}

const THEME_KEY = "nimipiko_child_theme";

export function getSavedTheme(childId: string): string {
  try {
    const saved = localStorage.getItem(`${THEME_KEY}_${childId}`);
    return saved ?? "galaxy";
  } catch {
    return "galaxy";
  }
}

export function saveTheme(childId: string, themeId: string) {
  try {
    localStorage.setItem(`${THEME_KEY}_${childId}`, themeId);
  } catch {}
}
