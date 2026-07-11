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
  | "nimiChat";       // Talk to Nimi

export interface ZoneGradients {
  library:         string;
  activityGrounds: string;
  communitySquare: string;
  profile:         string;
  treasureRoom:    string;
  familyHub:       string;
  achievement:     string;
  nimiChat:        string;
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

// ─── HP theme variant ──────────────────────────────────────────────────────

const hpVariant: ComponentVariant = {
  cardStyle: {
    radius:     "rounded-3xl",
    shadow:     "shadow-[0_4px_20px_rgba(234,179,8,0.10)]",
    border:     "border border-yellow-100",
    background: "bg-white",
    overlay:    "bg-gradient-to-br from-yellow-50/40 to-transparent",
  },
  heroStyle: {
    overlayOpacity:   "0.35",
    gradientStrength: "moderate",
    titleWeight:      "font-black",
    imageScale:       "scale-100",
  },
  buttonStyle: {
    primary:     "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-sm shadow-green-500/20 hover:shadow-md hover:shadow-green-500/25",
    secondary:   "bg-white border border-ds-border hover:bg-gray-50 text-ds-text",
    success:     "bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-sm shadow-green-500/15",
    primaryBg:   "bg-green-600 hover:bg-green-700 text-white",
    secondaryBg: "border border-ds-border text-ds-text hover:bg-gray-50",
    radius:      "rounded-2xl",
    shadow:      "shadow-md",
    hoverScale:  "hover:scale-[1.02]",
  },
  badgeStyle: {
    shape:     "rounded-full",
    border:    "border-2 border-yellow-300",
    fill:      "bg-yellow-50",
    iconStyle: "text-yellow-500",
  },
  panelStyle: {
    background: "bg-white",
    border:     "border border-ds-border",
    radius:     "rounded-2xl",
    shadow:     "shadow-sm",
  },
  dialogStyle: {
    background:      "bg-white",
    border:          "border border-ds-border",
    radius:          "rounded-3xl",
    shadow:          "shadow-2xl",
    overlay:         "bg-black/50 backdrop-blur-sm",
    containerRadius: "rounded-t-[32px] sm:rounded-3xl",
  },
  navigationStyle: {
    background:        "bg-white",
    border:            "border-t border-ds-border",
    activeItem:        "bg-green-50 text-green-700 border border-green-100",
    hoverItem:         "hover:bg-gray-50",
    fabGradient:       "bg-gradient-to-br from-green-400 via-green-500 to-emerald-600",
    fabShadow:         "shadow-[0_0_20px_rgba(22,163,74,0.4)]",
    activeIconBg:      "bg-green-50",
    activeIconColor:   "text-green-600",
    inactiveIconColor: "text-gray-400",
  },
  progressStyle: {
    track:  "bg-gray-100",
    fill:   "bg-green-500",
    radius: "rounded-full",
    height: "h-2",
  },
  backgroundStyle: {
    page:        "bg-gray-50",
    subtle:      "bg-white",
    accent:      "bg-green-50",
    accentBorder: "border border-green-100",
  },
  chipStyle: {
    background:  "bg-gray-100 hover:bg-gray-200",
    border:      "border border-ds-border",
    radius:      "rounded-full",
    text:        "text-ds-text",
    scrollFill:  "bg-green-500",
    scrollTrack: "bg-gray-100",
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
      "from-yellow-400 to-amber-500",
      "from-pink-400 to-fuchsia-500",
      "from-blue-400 to-cyan-500",
      "from-green-400 to-emerald-500",
      "from-purple-400 to-violet-500",
      "from-orange-400 to-red-500",
    ],
  },
};

// ─── Ocean theme variant ───────────────────────────────────────────────────

const oceanVariant: ComponentVariant = {
  cardStyle: {
    radius:     "rounded-[28px]",
    shadow:     "shadow-[0_4px_24px_rgba(2,132,199,0.14)]",
    border:     "border border-sky-100",
    background: "bg-white/90 backdrop-blur-sm",
    overlay:    "bg-gradient-to-br from-sky-50/50 to-cyan-50/30",
  },
  heroStyle: {
    overlayOpacity:   "0.45",
    gradientStrength: "strong",
    titleWeight:      "font-black",
    imageScale:       "scale-105",
  },
  buttonStyle: {
    primary:     "bg-gradient-to-r from-cyan-500 to-sky-600 text-white shadow-sm shadow-sky-500/20 hover:shadow-md hover:shadow-sky-500/25",
    secondary:   "bg-white/80 border border-sky-200 hover:bg-sky-50 text-ds-text backdrop-blur-sm",
    success:     "bg-gradient-to-r from-teal-400 to-cyan-500 text-white shadow-sm shadow-teal-500/15",
    primaryBg:   "bg-sky-600 hover:bg-sky-700 text-white",
    secondaryBg: "border border-sky-200 text-ds-text hover:bg-sky-50",
    radius:      "rounded-2xl",
    shadow:      "shadow-[0_2px_12px_rgba(2,132,199,0.20)]",
    hoverScale:  "hover:scale-[1.02]",
  },
  badgeStyle: {
    shape:     "rounded-2xl",
    border:    "border-2 border-sky-200",
    fill:      "bg-sky-50",
    iconStyle: "text-sky-500",
  },
  panelStyle: {
    background: "bg-white/80 backdrop-blur-sm",
    border:     "border border-sky-100",
    radius:     "rounded-2xl",
    shadow:     "shadow-[0_2px_8px_rgba(2,132,199,0.10)]",
  },
  dialogStyle: {
    background:      "bg-white/95 backdrop-blur-md",
    border:          "border border-sky-100",
    radius:          "rounded-[28px]",
    shadow:          "shadow-[0_8px_40px_rgba(2,132,199,0.20)]",
    overlay:         "bg-sky-900/30 backdrop-blur-sm",
    containerRadius: "rounded-t-[32px] sm:rounded-[28px]",
  },
  navigationStyle: {
    background:        "bg-white/90 backdrop-blur-sm",
    border:            "border-t border-sky-100",
    activeItem:        "bg-sky-50 text-sky-700 border border-sky-100",
    hoverItem:         "hover:bg-sky-50/60",
    fabGradient:       "bg-gradient-to-br from-sky-400 via-sky-500 to-cyan-600",
    fabShadow:         "shadow-[0_0_20px_rgba(2,132,199,0.4)]",
    activeIconBg:      "bg-sky-50",
    activeIconColor:   "text-sky-600",
    inactiveIconColor: "text-gray-400",
  },
  progressStyle: {
    track:  "bg-sky-50",
    fill:   "bg-sky-500",
    radius: "rounded-full",
    height: "h-2",
  },
  backgroundStyle: {
    page:        "bg-sky-50/50",
    subtle:      "bg-white/70 backdrop-blur-sm",
    accent:      "bg-sky-50",
    accentBorder: "border border-sky-100",
  },
  chipStyle: {
    background:  "bg-sky-50 hover:bg-sky-100",
    border:      "border border-sky-200",
    radius:      "rounded-full",
    text:        "text-ds-text",
    scrollFill:  "bg-sky-500",
    scrollTrack: "bg-sky-50",
  },
  zoneGradients: {
    library:         "from-teal-500 via-cyan-400 to-sky-500",
    activityGrounds: "from-sky-500 via-cyan-400 to-teal-400",
    communitySquare: "from-blue-400 via-sky-400 to-cyan-400",
    profile:         "from-cyan-500 via-sky-400 to-blue-400",
    treasureRoom:    "from-teal-400 via-cyan-500 to-sky-400",
    familyHub:       "from-sky-500 via-blue-500 to-indigo-400",
    achievement:     "from-sky-400 via-cyan-400 to-teal-400",
    nimiChat:        "from-blue-500 via-sky-500 to-cyan-500",
  },
  contentGradients: {
    creationCards: [
      { bg: "bg-gradient-to-br from-sky-400 to-blue-500",    ring: "ring-sky-300/40"  },
      { bg: "bg-gradient-to-br from-cyan-400 to-sky-500",    ring: "ring-cyan-300/40" },
      { bg: "bg-gradient-to-br from-teal-400 to-cyan-500",   ring: "ring-teal-300/40" },
      { bg: "bg-gradient-to-br from-blue-400 to-indigo-500", ring: "ring-blue-300/40" },
      { bg: "bg-gradient-to-br from-sky-300 to-blue-400",    ring: "ring-sky-200/40"  },
      { bg: "bg-gradient-to-br from-cyan-300 to-teal-400",   ring: "ring-cyan-200/40" },
    ],
    storyIntro: [
      "from-sky-500 to-blue-600",
      "from-teal-500 to-cyan-600",
      "from-blue-500 to-indigo-600",
      "from-cyan-500 to-sky-600",
    ],
    missionPath: {
      flipflop_audio: "from-sky-500 to-blue-600",
      story_pdf:      "from-blue-400 to-cyan-500",
      coloring:       "from-teal-500 to-cyan-600",
      move_explore:   "from-cyan-500 to-sky-600",
      sing_along:     "from-sky-400 to-blue-500",
      bonus_video:    "from-blue-500 to-indigo-600",
    },
    activityProgress: {
      morning:   "from-sky-400 to-blue-500",
      movement:  "from-cyan-400 to-sky-500",
      artistic:  "from-teal-400 to-cyan-500",
      histoire:  "from-blue-400 to-indigo-500",
      zoom:      "from-sky-400 to-cyan-500",
      discovery: "from-teal-400 to-sky-500",
      flipflop:  "from-indigo-400 to-sky-500",
      coloring:  "from-cyan-400 to-blue-500",
    },
    achievementBadges: [
      "from-sky-400 to-blue-500",
      "from-cyan-400 to-sky-500",
      "from-teal-400 to-cyan-500",
      "from-blue-400 to-indigo-500",
      "from-sky-300 to-blue-400",
      "from-cyan-300 to-teal-400",
    ],
  },
};

// ─── Registry & getter ─────────────────────────────────────────────────────

const COMPONENT_VARIANTS: Record<AppThemeId, ComponentVariant> = {
  default: defaultVariant,
  hp:      hpVariant,
  ocean:   oceanVariant,
};

/**
 * Returns component-level style variant tokens for the given app theme.
 * Always use this function — never import hp/ocean variant objects directly.
 */
export function getComponentVariant(themeId: AppThemeId): ComponentVariant {
  return COMPONENT_VARIANTS[themeId] ?? defaultVariant;
}
