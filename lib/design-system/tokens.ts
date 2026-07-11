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


// ═══════════════════════════════════════════════════════════════
// HOMEPAGE / MARKETING Design Tokens  (hp namespace)
// CSS mirror: styles/homepage.css  §1 :root custom properties
// Tailwind mirror: tailwind.config.ts  extend.colors["hp-*"]
// ═══════════════════════════════════════════════════════════════

export const hp = {

  // ── Colors ─────────────────────────────────────────────────
  color: {
    // Primary green — CTA buttons, "every story." headline
    green: {
      50:  "#F0FDF4",
      100: "#DCFCE7",
      400: "#22C55E",  // lighter accent / Grow icon
      500: "#16A34A",  // primary CTA + green headline
      600: "#15803D",  // hover
      700: "#166534",  // pressed
    },

    // Activity pill colors (right-side hero overlay)
    // These are the background colors of the labeled pill buttons.
    activityPill: {
      read:    "#F97316",  // orange
      create:  "#EC4899",  // hot pink
      explore: "#10B981",  // teal
      move:    "#22C55E",  // emerald
      sing:    "#EAB308",  // amber
      grow:    "#16A34A",  // dark green
    },

    // Activity icon circle colors (bottom row — intentionally different from pills)
    // The design uses distinct hues for the icon circles vs. the pill buttons.
    activityIcon: {
      read:    "#F97316",  // orange   (same)
      create:  "#EC4899",  // pink     (same)
      explore: "#3B82F6",  // blue     (different from pill teal)
      move:    "#F59E0B",  // amber    (different from pill emerald)
      sing:    "#8B5CF6",  // violet   (different from pill amber)
      grow:    "#22C55E",  // emerald  (different from pill dark green)
    },

    // Neutrals
    dark:    "#111827",  // heading text, icon fills
    surface: "#FFFFFF",  // page bg, card bg, nav bg
    gray: {
      50:  "#F9FAFB",  // hover backgrounds
      100: "#F3F4F6",  // drawer dividers
      200: "#E5E7EB",  // card borders, secondary button outline
      400: "#9CA3AF",  // placeholder text, muted icons
      500: "#6B7280",  // subtitle / body text
      700: "#374151",  // nav link default
      900: "#111827",  // alias for dark
    },
  },

  // ── Shadows ────────────────────────────────────────────────
  // Each shadow is element-specific, not a generic size scale.
  shadow: {
    nav:      "0 2px 8px rgba(0,0,0,0.06)",
    card:     "0 4px 16px rgba(0,0,0,0.08)",
    cardHover:"0 8px 28px rgba(0,0,0,0.14)",
    cta:      "0 4px 12px rgba(22,163,74,0.35)",  // green-tinted CTA glow
    pill:     "0 3px 10px rgba(0,0,0,0.18)",
    play:     "0 2px 8px rgba(0,0,0,0.20)",
    char:     "0 8px 32px rgba(0,0,0,0.12)",      // character illustration
  },

  // ── Border Radius ──────────────────────────────────────────
  radius: {
    sm:   "8px",      // drawer nav items, small chips
    md:   "12px",     // medium cards, tooltips
    card: "16px",     // story cards
    pill: "9999px",   // all pill buttons + icon circles
  },

  // ── Transitions ────────────────────────────────────────────
  // Single easing curve throughout — physical, no bounce.
  ease: "cubic-bezier(0.4, 0, 0.2, 1)",
  duration: {
    fast: "150ms",  // micro-interactions (scale, color swap)
    base: "200ms",  // standard hover states
    slow: "300ms",  // drawer open/close, modals
  },

  // ── Z-Index Scale ──────────────────────────────────────────
  // Closed set — nothing uses an arbitrary z-value.
  z: {
    base:    0,
    card:    1,
    overlay: 10,
    sticky:  50,
    nav:     100,
    drawer:  200,   // overlay = 200, panel = 201 (calc in CSS)
    modal:   300,
    toast:   400,
  },

  // ── Breakpoints ────────────────────────────────────────────
  // Numeric px values matching tailwind.config.ts screens.
  breakpoint: {
    xs:  375,
    sm:  640,
    md:  768,
    lg:  1024,
    xl:  1280,
    xxl: 1536,
  },

  // ── Layout ─────────────────────────────────────────────────
  layout: {
    containerMaxPx:    1280,
    containerPadPx:    40,    // desktop gutter
    containerPadSmPx:  20,    // mobile gutter
    navHeightPx:       72,
    heroMinHPx:        580,
    heroTextRatio:     0.32,  // left column share
    heroIllustRatio:   0.68,  // right column share
    sectionGapPx:      64,    // desktop section rhythm
    sectionGapSmPx:    40,    // mobile section rhythm
    cardGapPx:         20,    // story card grid gap
    storyGridCols: {
      desktop: 4,
      laptop:  3,
      tablet:  2,
      mobile:  2,
    },
  },

  // ── Typography ─────────────────────────────────────────────
  font: {
    display: "var(--font-baloo), 'Baloo 2', cursive",
    body:    "var(--font-nunito), 'Nunito', sans-serif",
    size: {
      heroFluid: "clamp(40px, 4.5vw, 64px)",  // continuous scaling, no breakpoint jumps
      h2:        "1.5rem",
      body:      "1.125rem",
      sm:        "0.875rem",
      xs:        "0.8125rem",
    },
    weight: {
      regular:   400,
      medium:    500,
      semibold:  600,
      bold:      700,
      extrabold: 800,
    },
  },

} as const;

// ── Derived types ──────────────────────────────────────────────
// Use these to enforce valid activity keys wherever activity-keyed
// maps or switch statements appear in the codebase.
export type HpActivityPillKey = keyof typeof hp.color.activityPill;
export type HpActivityIconKey = keyof typeof hp.color.activityIcon;
