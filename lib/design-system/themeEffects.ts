import type { AppThemeId } from "./theme";

// ─── Sub-config interfaces ─────────────────────────────────────────────────

export interface ParticleConfig {
  /** Number of particles to render */
  count: number;
  /** Unicode character shapes used for each particle */
  shapes: string[];
  /** CSS color values, cycled across particles */
  colors: string[];
  /** [min, max] font-size in px */
  sizeRange: [number, number];
  /** [min, max] animation duration in seconds */
  durationRange: [number, number];
  /** [min, max] base opacity, 0–1 */
  opacityRange: [number, number];
}

export interface BackgroundDecorationConfig {
  /** CSS `background` value for the radial ambient gradient layer */
  ambientGradient: string;
  /** Tailwind gradient-direction + color-stop classes for the mesh overlay */
  meshClass: string;
}

export interface HeroDecorationConfig {
  /** Visual effect type rendered by HeroDecoration */
  type: "sparkles" | "rays" | "waves" | "none";
  /** CSS color values for decorative elements */
  colors: string[];
  /** Number of decorative elements */
  count: number;
  /** Peak opacity of the decoration, 0–1 */
  opacity: number;
}

export interface CardDecorationConfig {
  /** Whether to render a shimmer ambient glow inside cards */
  shimmerEnabled: boolean;
  /** CSS color for the shimmer highlight */
  shimmerColor: string;
  /** CSS color for the inner-glow box-shadow */
  glowColor: string;
}

export interface ButtonEffectConfig {
  /** CSS color for the CTA glow / drop-shadow */
  glowColor: string;
  /** CSS color for the press ripple */
  rippleColor: string;
}

export interface BadgeEffectConfig {
  /** CSS color for the badge outer glow */
  glowColor: string;
  /** CSS color for the pulse ring */
  pulseColor: string;
}

export interface PageEffectConfig {
  /** CSS color for the page-level ambient fill */
  ambientColor: string;
  /** CSS color for the radial top-edge glow */
  topGlow: string;
  /** CSS color for the radial bottom-edge glow */
  bottomGlow: string;
}

export interface MotionConfig {
  /** Duration of float oscillation in seconds */
  floatDuration: number;
  /** Vertical travel distance for float oscillation in px */
  floatDistance: number;
  /** Base duration for particle rise animations in seconds */
  particleDuration: number;
  /** CSS timing function for all theme animations */
  easing: string;
  /** Duration of the shimmer sweep across a card in seconds */
  shimmerDuration: number;
}

// ─── Top-level interface ───────────────────────────────────────────────────

export interface ThemeEffects {
  backgroundDecorations: BackgroundDecorationConfig;
  heroDecorations:       HeroDecorationConfig;
  cardDecorations:       CardDecorationConfig;
  buttonEffects:         ButtonEffectConfig;
  badgeEffects:          BadgeEffectConfig;
  pageEffects:           PageEffectConfig;
  particles:             ParticleConfig;
  motion:                MotionConfig;
}

// ─── HP theme effects ──────────────────────────────────────────────────────
// Warm, cozy: gold sparkles, amber ambient, soft green accents

const hpEffects: ThemeEffects = {
  backgroundDecorations: {
    ambientGradient:
      "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(254,243,199,0.30), transparent)," +
      "radial-gradient(ellipse 60% 40% at 80% 110%, rgba(209,250,229,0.20), transparent)",
    meshClass: "from-yellow-50/30 via-transparent to-green-50/20",
  },
  heroDecorations: {
    type:    "sparkles",
    colors:  ["#FFD700", "#FCD34D", "#86EFAC", "#34D399", "#F9A8D4"],
    count:   10,
    opacity: 0.65,
  },
  cardDecorations: {
    shimmerEnabled: true,
    shimmerColor:   "rgba(234,179,8,0.18)",
    glowColor:      "rgba(234,179,8,0.07)",
  },
  buttonEffects: {
    glowColor:   "rgba(22,163,74,0.35)",
    rippleColor: "rgba(22,163,74,0.20)",
  },
  badgeEffects: {
    glowColor:   "rgba(234,179,8,0.45)",
    pulseColor:  "rgba(234,179,8,0.20)",
  },
  pageEffects: {
    ambientColor: "rgba(254,243,199,0.25)",
    topGlow:      "rgba(209,250,229,0.20)",
    bottomGlow:   "rgba(254,243,199,0.15)",
  },
  particles: {
    count:         12,
    shapes:        ["✦", "★", "✶", "✧", "·"],
    colors:        ["#FFD700", "#FCD34D", "#86EFAC", "#6EE7B7", "#F9A8D4", "#FDE68A"],
    sizeRange:     [9, 18],
    durationRange: [5, 9],
    opacityRange:  [0.25, 0.65],
  },
  motion: {
    floatDuration:   3.5,
    floatDistance:   8,
    particleDuration: 7,
    easing:          "ease-in-out",
    shimmerDuration: 1.8,
  },
};

// ─── Ocean theme effects ───────────────────────────────────────────────────
// Cool, aquatic: rising bubbles, light rays, blue-cyan ambient drift

const oceanEffects: ThemeEffects = {
  backgroundDecorations: {
    ambientGradient:
      "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(224,242,254,0.45), transparent)," +
      "radial-gradient(ellipse 70% 50% at 10% 80%,  rgba(207,250,254,0.25), transparent)",
    meshClass: "from-sky-100/40 via-cyan-50/20 to-transparent",
  },
  heroDecorations: {
    type:    "rays",
    colors:  ["rgba(2,132,199,0.08)", "rgba(6,182,212,0.06)", "rgba(255,255,255,0.15)"],
    count:   6,
    opacity: 0.55,
  },
  cardDecorations: {
    shimmerEnabled: true,
    shimmerColor:   "rgba(2,132,199,0.14)",
    glowColor:      "rgba(2,132,199,0.06)",
  },
  buttonEffects: {
    glowColor:   "rgba(2,132,199,0.35)",
    rippleColor: "rgba(2,132,199,0.20)",
  },
  badgeEffects: {
    glowColor:   "rgba(6,182,212,0.45)",
    pulseColor:  "rgba(6,182,212,0.20)",
  },
  pageEffects: {
    ambientColor: "rgba(224,242,254,0.30)",
    topGlow:      "rgba(207,250,254,0.25)",
    bottomGlow:   "rgba(224,242,254,0.20)",
  },
  particles: {
    count:         10,
    shapes:        ["○", "◦", "∘", "°", "·"],
    colors:        [
      "rgba(2,132,199,0.70)",
      "rgba(6,182,212,0.60)",
      "rgba(14,165,233,0.50)",
      "rgba(255,255,255,0.80)",
    ],
    sizeRange:     [5, 14],
    durationRange: [6, 11],
    opacityRange:  [0.15, 0.55],
  },
  motion: {
    floatDuration:   4.5,
    floatDistance:   12,
    particleDuration: 9,
    easing:          "ease-in-out",
    shimmerDuration: 2.2,
  },
};

// ─── Registry & getter ─────────────────────────────────────────────────────

const THEME_EFFECTS: Record<AppThemeId, ThemeEffects> = {
  default: hpEffects,
  hp:      hpEffects,
  ocean:   oceanEffects,
};

/**
 * Returns decorative-effect configuration for the given app theme.
 * Pass the result to FloatingParticles, ThemeBackground, HeroDecoration, or DecorativeOverlay.
 */
export function getThemeEffects(themeId: AppThemeId): ThemeEffects {
  return THEME_EFFECTS[themeId] ?? hpEffects;
}
