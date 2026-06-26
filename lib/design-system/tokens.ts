// ═══════════════════════════════════════════════════════════════
// NIMI Design System — Tokens
// "Magical Learning Kingdom" visual language
// ═══════════════════════════════════════════════════════════════

// ── Colors ────────────────────────────────────────────────────
export const colors = {
  // Primary — the heart of NIMI
  sky: {
    50: "#f0f9ff", 100: "#e0f2fe", 200: "#bae6fd",
    300: "#7dd3fc", 400: "#38bdf8", 500: "#0ea5e9",
    600: "#0284c7", 700: "#0369a1",
  },
  leaf: {
    50: "#f0fdf4", 100: "#dcfce7", 200: "#bbf7d0",
    300: "#86efac", 400: "#4ade80", 500: "#22c55e",
    600: "#16a34a", 700: "#15803d",
  },
  sunshine: {
    50: "#fefce8", 100: "#fef9c3", 200: "#fef08a",
    300: "#fde047", 400: "#facc15", 500: "#eab308",
    600: "#ca8a04", 700: "#a16207",
  },

  // Secondary — warmth and magic
  lavender: { 300: "#c4b5fd", 400: "#a78bfa", 500: "#8b5cf6" },
  coral: { 300: "#fca5a5", 400: "#f87171", 500: "#ef4444" },
  peach: { 300: "#fdba74", 400: "#fb923c", 500: "#f97316" },
  mint: { 300: "#6ee7b7", 400: "#34d399", 500: "#10b981" },

  // Neutral — warm, not cold
  cream: "#fffbeb",
  warmWhite: "#fefdf8",
  parchment: "#faf6ee",
  lightBrown: "#d4a574",
  forestGreen: "#1a4d2e",

  // Night mode
  night: {
    bg: "#0f1729",
    card: "#1a2340",
    darker: "#0a0f1e",
    glow: "rgba(139, 92, 246, 0.15)",
    moonlight: "rgba(226, 232, 240, 0.06)",
  },

  // Day mode
  day: {
    bg: "#e8f4f8",
    card: "#ffffff",
    darker: "#d1e9f0",
    warm: "#fff7ed",
  },
} as const;

// ── Typography ───────────────────────────────────────────────
export const typography = {
  // Font families (loaded via next/font/google in layout.tsx)
  heading: "var(--font-baloo)",
  body: "var(--font-nunito)",

  // Size scale
  sizes: {
    xs: "11px",
    sm: "13px",
    base: "15px",
    lg: "18px",
    xl: "22px",
    "2xl": "28px",
    "3xl": "34px",
    "4xl": "42px",
    hero: "52px",
  },

  // Weight
  weights: {
    normal: 400,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },
} as const;

// ── Spacing ──────────────────────────────────────────────────
export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  "2xl": "32px",
  "3xl": "48px",
  "4xl": "64px",
  page: "max(16px, env(safe-area-inset-left))",
} as const;

// ── Border Radius ────────────────────────────────────────────
export const radii = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  "2xl": "24px",
  "3xl": "28px",
  full: "9999px",
  pill: "9999px",
} as const;

// ── Shadows ──────────────────────────────────────────────────
export const shadows = {
  soft: "0 2px 8px rgba(0,0,0,0.08)",
  card: "0 4px 16px rgba(0,0,0,0.1)",
  elevated: "0 8px 32px rgba(0,0,0,0.15)",
  glow: (color: string) => `0 0 20px ${color}`,
  magical: "0 8px 40px rgba(139, 92, 246, 0.2), 0 2px 8px rgba(0,0,0,0.1)",
  float: "0 12px 40px rgba(0,0,0,0.2)",
} as const;

// ── Motion ───────────────────────────────────────────────────
export const motion = {
  // Durations
  fast: 0.15,
  normal: 0.3,
  slow: 0.6,
  gentle: 1.2,

  // Spring configs
  bouncy: { type: "spring" as const, stiffness: 300, damping: 20 },
  gentleSpring: { type: "spring" as const, stiffness: 120, damping: 14 },
  soft: { type: "spring" as const, stiffness: 80, damping: 12 },

  // Float animation preset
  floatAnim: {
    y: [0, -8, 0],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const },
  },

  // Wiggle preset
  wiggle: {
    rotate: [0, -3, 3, 0],
    transition: { duration: 2, repeat: Infinity },
  },

  // Pulse preset
  pulse: {
    scale: [1, 1.05, 1],
    transition: { duration: 2, repeat: Infinity },
  },
} as const;

// ── Z-Index ──────────────────────────────────────────────────
export const zIndex = {
  background: 0,
  content: 10,
  nav: 20,
  sidebar: 30,
  header: 40,
  dropdown: 50,
  modal: 60,
  toast: 70,
  tooltip: 80,
  fullscreen: 9999,
} as const;

// ── Navigation Locations ─────────────────────────────────────
export const locations = {
  home: { name: "Welcome Meadow", emoji: "🏡" },
  stories: { name: "Story Forest", emoji: "📚" },
  missions: { name: "Adventure Trail", emoji: "🗺️" },
  treasure: { name: "Achievement Castle", emoji: "🏰" },
  community: { name: "Friendship Village", emoji: "👥" },
  creativity: { name: "Art Garden", emoji: "🎨" },
  music: { name: "Melody Valley", emoji: "🎵" },
  talkToNimi: { name: "Nimi's Treehouse", emoji: "🏠" },
  shop: { name: "Star Market", emoji: "🛍️" },
  profile: { name: "My Room", emoji: "🚪" },
  settings: { name: "Wizard's Workshop", emoji: "⚙️" },
  parents: { name: "Parent Tower", emoji: "🏰" },
} as const;

// ── Gamification Icons ───────────────────────────────────────
export const rewards = {
  star: "⭐",
  gem: "💎",
  key: "🗝️",
  scroll: "📜",
  badge: "🏅",
  crown: "👑",
  sticker: "🌟",
  chest: "🎁",
} as const;
