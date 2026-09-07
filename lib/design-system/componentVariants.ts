import type { AppThemeId } from "./theme";

// ─── Zone identity ────────────────────────────────────────────────────────
// One entry per named campus landmark. Adding a theme = adding entries here.

export type ZoneId =
  | "library"         // The Library / Story Experience
  | "activityGrounds" // The Activity Grounds / Missions
  | "communitySquare" // Community Square
  | "profile"         // My Profile
  | "treasureRoom"    // The Treasure Room / Shop
  | "familyHub"       // Family Hub / Parents
  | "achievement"     // Treasure / Achievement vault
  | "nimiChat"        // Talk to Nimi
  | "creative";       // Creative Studio

export interface ZoneGradients {
  library:         string;
  activityGrounds: string;
  communitySquare: string;
  profile:         string;
  treasureRoom:    string;
  familyHub:       string;
  achievement:     string;
  nimiChat:        string;
  creative:        string;
}

// ─── Content gradients ────────────────────────────────────────────────────
// Gradient stop strings (from-X to-Y or from-X via-Y to-Z).
// Consumers prefix with `bg-gradient-to-{direction}` at the call site.
// Exception: creationCards stores full classes including direction + ring.

export interface ContentGradients {
  /** Community creation card pool — cycled by index */
  creationCards:    { bg: string; ring: string }[];
  /** Story intro panel backgrounds — indexed by INTRO_ITEMS slot (0-3) */
  storyIntro:       string[];
  /** Mission path node colors — keyed by MISSION_META key */
  missionPath:      Record<string, string>;
  /** Activity category progress bar gradient — keyed by ActivityCategory */
  activityProgress: Record<string, string>;
  /** Achievement badge backgrounds — 6 slots, ordered by BADGES array */
  achievementBadges: string[];
}

// ─── Sub-variant interfaces ────────────────────────────────────────────────

export interface CardVariant {
  radius:     string;
  shadow:     string;
  border:     string;
  background: string;
  overlay:    string;
}

export interface HeroVariant {
  overlayOpacity:   string;
  gradientStrength: "soft" | "moderate" | "strong";
  titleWeight:      string;
  imageScale:       string;
}

export interface ButtonVariant {
  /** Full class string for gradient primary button (MagicButton) */
  primary:     string;
  /** Full class string for secondary/ghost button */
  secondary:   string;
  /** Full class string for success button (MagicButton success variant) */
  success:     string;
  /** Background + hover + text only — no radius/size — for inline dialog buttons */
  primaryBg:   string;
  /** Border + hover + text only — no radius/size — for inline dialog cancel buttons */
  secondaryBg: string;
  radius:      string;
  shadow:      string;
  hoverScale:  string;
}

export interface BadgeVariant {
  shape:     string;
  border:    string;
  fill:      string;
  iconStyle: string;
}

export interface PanelVariant {
  background: string;
  border:     string;
  radius:     string;
  shadow:     string;
}

export interface DialogVariant {
  background: string;
  border:     string;
  radius:     string;
  shadow:     string;
  overlay:    string;
  /** Full responsive radius for mobile bottom-sheet + desktop modal pattern */
  containerRadius: string;
}

export interface NavigationVariant {
  background:        string;
  border:            string;
  activeItem:        string;
  hoverItem:         string;
  /** Gradient classes for the floating NIMI action button */
  fabGradient:       string;
  /** Glow shadow for the floating NIMI action button */
  fabShadow:         string;
  /** Background for the active icon container in BottomNavBar */
  activeIconBg:      string;
  /** Text/icon color for active nav icons */
  activeIconColor:   string;
  /** Text/icon color for inactive nav icons */
  inactiveIconColor: string;
}

export interface ProgressVariant {
  track:  string;
  fill:   string;
  radius: string;
  height: string;
}

export interface BackgroundVariant {
  page:        string;
  subtle:      string;
  accent:      string;
  /** Border class that pairs with the accent background */
  accentBorder: string;
}

export interface ChipVariant {
  /** Background + hover background */
  background:  string;
  border:      string;
  radius:      string;
  text:        string;
  /** Scroll-indicator fill color */
  scrollFill:  string;
  /** Scroll-indicator track color */
  scrollTrack: string;
}

// ─── Top-level interface ───────────────────────────────────────────────────

export interface ComponentVariant {
  cardStyle:        CardVariant;
  heroStyle:        HeroVariant;
  buttonStyle:      ButtonVariant;
  badgeStyle:       BadgeVariant;
  panelStyle:       PanelVariant;
  dialogStyle:      DialogVariant;
  navigationStyle:  NavigationVariant;
  progressStyle:    ProgressVariant;
  backgroundStyle:  BackgroundVariant;
  chipStyle:        ChipVariant;
  zoneGradients:    ZoneGradients;
  contentGradients: ContentGradients;
}

// ─── Default (Nimipiko World) variant ─────────────────────────────────────

const defaultVariant: ComponentVariant = {
  cardStyle: {
    radius:     "rounded-3xl",
    shadow:     "shadow-[0_4px_20px_rgba(26,168,106,0.08)]",
    border:     "border border-emerald-100",
    background: "bg-white",
    overlay:    "bg-gradient-to-br from-emerald-50/30 to-transparent",
  },
  heroStyle: {
    overlayOpacity:   "0.25",
    gradientStrength: "soft",
    titleWeight:      "font-black",
    imageScale:       "scale-100",
  },
  buttonStyle: {
    primary:     "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm shadow-emerald-500/20 hover:shadow-md hover:shadow-emerald-500/25",
    secondary:   "bg-white border border-ds-border hover:bg-gray-50 text-ds-text",
    success:     "bg-gradient-to-r from-emerald-400 to-green-500 text-white shadow-sm shadow-emerald-500/15",
    primaryBg:   "bg-emerald-600 hover:bg-emerald-700 text-white",
    secondaryBg: "border border-ds-border text-ds-text hover:bg-gray-50",
    radius:      "rounded-2xl",
    shadow:      "shadow-md",
    hoverScale:  "hover:scale-[1.02]",
  },
  badgeStyle: {
    shape:     "rounded-full",
    border:    "border-2 border-emerald-200",
    fill:      "bg-emerald-50",
    iconStyle: "text-emerald-500",
  },
  panelStyle: {
    background: "bg-white",
    border:     "border border-emerald-100/70",
    radius:     "rounded-2xl",
    shadow:     "shadow-sm",
  },
  dialogStyle: {
    background:      "bg-white",
    border:          "border border-emerald-100",
    radius:          "rounded-3xl",
    shadow:          "shadow-2xl",
    overlay:         "bg-black/40 backdrop-blur-sm",
    containerRadius: "rounded-t-[32px] sm:rounded-3xl",
  },
  navigationStyle: {
    background:        "bg-white",
    border:            "border-t border-emerald-100",
    activeItem:        "bg-emerald-50 text-emerald-700 border border-emerald-100",
    hoverItem:         "hover:bg-emerald-50/60",
    fabGradient:       "bg-gradient-to-br from-emerald-400 via-emerald-500 to-green-600",
    fabShadow:         "shadow-[0_0_20px_rgba(26,168,106,0.4)]",
    activeIconBg:      "bg-emerald-50",
    activeIconColor:   "text-emerald-600",
    inactiveIconColor: "text-gray-400",
  },
  progressStyle: {
    track:  "bg-emerald-50",
    fill:   "bg-emerald-500",
    radius: "rounded-full",
    height: "h-2",
  },
  backgroundStyle: {
    page:         "bg-gray-50",
    subtle:       "bg-white",
    accent:       "bg-emerald-50",
    accentBorder: "border border-emerald-100",
  },
  chipStyle: {
    background:  "bg-emerald-50 hover:bg-emerald-100",
    border:      "border border-emerald-200",
    radius:      "rounded-full",
    text:        "text-ds-text",
    scrollFill:  "bg-emerald-500",
    scrollTrack: "bg-emerald-50",
  },
  zoneGradients: {
    library:         "from-green-400 via-emerald-400 to-teal-500",
    activityGrounds: "from-amber-500 via-orange-500 to-rose-500",
    communitySquare: "from-sky-400 via-cyan-400 to-teal-500",
    profile:         "from-emerald-500 via-green-500 to-teal-400",
    treasureRoom:    "from-amber-400 via-yellow-500 to-orange-500",
    familyHub:       "from-sky-500 via-blue-500 to-indigo-500",
    achievement:     "from-yellow-400 via-amber-400 to-orange-400",
    nimiChat:        "from-violet-500 via-purple-500 to-indigo-500",
    creative:        "from-rose-400 via-pink-500 to-purple-500",
  },
  contentGradients: {
    creationCards: [
      { bg: "bg-gradient-to-br from-yellow-400 to-orange-500",  ring: "ring-yellow-300/40" },
      { bg: "bg-gradient-to-br from-pink-400 to-rose-500",      ring: "ring-pink-300/40"   },
      { bg: "bg-gradient-to-br from-blue-400 to-indigo-500",    ring: "ring-blue-300/40"   },
      { bg: "bg-gradient-to-br from-green-400 to-emerald-500",  ring: "ring-green-300/40"  },
      { bg: "bg-gradient-to-br from-purple-400 to-violet-500",  ring: "ring-purple-300/40" },
      { bg: "bg-gradient-to-br from-cyan-400 to-blue-500",      ring: "ring-cyan-300/40"   },
    ],
    storyIntro: [
      "from-rose-500 to-pink-600",
      "from-fuchsia-500 to-purple-600",
      "from-blue-500 to-indigo-600",
      "from-violet-500 to-purple-600",
    ],
    missionPath: {
      flipflop_audio: "from-sky-500 to-blue-600",
      story_pdf:      "from-blue-500 to-cyan-600",
      coloring:       "from-orange-500 to-pink-600",
      move_explore:   "from-green-500 to-emerald-600",
      sing_along:     "from-pink-500 to-rose-600",
      bonus_video:    "from-red-500 to-orange-600",
    },
    activityProgress: {
      morning:   "from-purple-400 to-pink-500",
      movement:  "from-pink-400 to-pink-600",
      artistic:  "from-orange-400 to-orange-600",
      histoire:  "from-amber-600 to-yellow-700",
      zoom:      "from-green-400 to-green-600",
      discovery: "from-teal-400 to-blue-500",
      flipflop:  "from-indigo-400 to-indigo-600",
      coloring:  "from-yellow-400 to-yellow-500",
    },
    achievementBadges: [
      "from-yellow-400 to-amber-500",   // story-explorer
      "from-pink-400 to-fuchsia-500",   // kind-heart
      "from-blue-400 to-cyan-500",      // healthy-hero
      "from-green-400 to-emerald-500",  // rainbow-star
      "from-purple-400 to-violet-500",  // music-master
      "from-orange-400 to-red-500",     // super-champion
    ],
  },
};

// ─── Airways variant ──────────────────────────────────────────────────────

const airwaysVariant: ComponentVariant = {
  cardStyle: {
    radius:     "rounded-2xl",
    shadow:     "shadow-[0_4px_20px_rgba(0,0,0,0.10)]",
    border:     "border border-[var(--ds-border-primary)]",
    background: "bg-[var(--ds-surface-card)]",
    overlay:    "bg-gradient-to-br from-[var(--ds-brand-subtle)]/20 to-transparent",
  },
  heroStyle: {
    overlayOpacity:   "0.30",
    gradientStrength: "moderate",
    titleWeight:      "font-black",
    imageScale:       "scale-100",
  },
  buttonStyle: {
    primary:     "bg-[var(--ds-brand-primary)] text-[var(--ds-nav-bg)] shadow-sm hover:opacity-90",
    secondary:   "bg-[var(--ds-surface-card)] border border-[var(--ds-border-primary)] hover:bg-[var(--ds-surface-card-hover)] text-[var(--ds-text-primary)]",
    success:     "bg-[var(--ds-brand-primary)] text-[var(--ds-nav-bg)] shadow-sm",
    primaryBg:   "bg-[var(--ds-brand-primary)] hover:bg-[var(--ds-brand-hover)] text-[var(--ds-nav-bg)]",
    secondaryBg: "border border-[var(--ds-border-primary)] text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-card-hover)]",
    radius:      "rounded-xl",
    shadow:      "shadow-md",
    hoverScale:  "hover:scale-[1.02]",
  },
  badgeStyle: {
    shape:     "rounded-full",
    border:    "border-2 border-[var(--ds-border-brand)]",
    fill:      "bg-[var(--ds-brand-subtle)]",
    iconStyle: "text-[var(--ds-text-brand)]",
  },
  panelStyle: {
    background: "bg-[var(--ds-surface-card)]",
    border:     "border border-[var(--ds-border-primary)]",
    radius:     "rounded-2xl",
    shadow:     "shadow-sm",
  },
  dialogStyle: {
    background:      "bg-[var(--ds-surface-card)]",
    border:          "border border-[var(--ds-border-primary)]",
    radius:          "rounded-2xl",
    shadow:          "shadow-2xl",
    overlay:         "bg-black/60 backdrop-blur-sm",
    containerRadius: "rounded-t-[28px] sm:rounded-2xl",
  },
  navigationStyle: {
    background:        "bg-[var(--ds-nav-bg)]",
    border:            "border-t border-[var(--ds-nav-border)]",
    activeItem:        "bg-[var(--ds-nav-active-bg)] text-[var(--ds-nav-active-text)]",
    hoverItem:         "hover:bg-[var(--ds-nav-active-bg)]/50",
    fabGradient:       "bg-[var(--ds-brand-primary)]",
    fabShadow:         "shadow-[var(--ds-shadow-cta)]",
    activeIconBg:      "bg-[var(--ds-nav-active-bg)]",
    activeIconColor:   "text-[var(--ds-nav-active-text)]",
    inactiveIconColor: "text-[var(--ds-nav-inactive-icon)]",
  },
  progressStyle: {
    track:  "bg-[var(--ds-surface-card-hover)]",
    fill:   "bg-[var(--ds-brand-primary)]",
    radius: "rounded-full",
    height: "h-2",
  },
  backgroundStyle: {
    page:         "bg-[#f8f2e7]",
    subtle:       "bg-[#f8f2e7]",
    accent:       "bg-[var(--ds-brand-subtle)]",
    accentBorder: "border border-[var(--ds-border-brand)]",
  },
  chipStyle: {
    background:  "bg-[var(--ds-brand-subtle)] hover:bg-[var(--ds-brand-subtle)]/80",
    border:      "border border-[var(--ds-border-brand)]/50",
    radius:      "rounded-full",
    text:        "text-[var(--ds-text-primary)]",
    scrollFill:  "bg-[var(--ds-brand-primary)]",
    scrollTrack: "bg-[var(--ds-brand-subtle)]",
  },
  // Airways zone gradients — content areas use warm amber/gold; structural zones use Airways navy
  zoneGradients: {
    library:         "from-amber-500 via-yellow-400 to-amber-500",
    activityGrounds: "from-amber-500 via-orange-500 to-rose-500",
    communitySquare: "from-sky-400 via-cyan-400 to-teal-500",
    profile:         "from-yellow-400 via-amber-400 to-amber-500",
    treasureRoom:    "from-amber-400 via-yellow-500 to-orange-500",
    familyHub:       "from-[#06101F] via-[#1A3558] to-[#0d2244]",
    achievement:     "from-yellow-400 via-amber-400 to-orange-400",
    nimiChat:        "from-violet-500 via-purple-500 to-indigo-500",
    creative:        "from-rose-400 via-pink-500 to-purple-500",
  },
  contentGradients: defaultVariant.contentGradients,
};

// ─── Registry & getter ─────────────────────────────────────────────────────

const COMPONENT_VARIANTS: Record<AppThemeId, ComponentVariant> = {
  default: defaultVariant,
  airways: airwaysVariant,
};

export function getComponentVariant(themeId: AppThemeId): ComponentVariant {
  return COMPONENT_VARIANTS[themeId] ?? defaultVariant;
}
