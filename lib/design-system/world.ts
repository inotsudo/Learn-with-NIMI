/**
 * NIMIPIKO "World" design tokens — the hybrid 3D look shared by every screen
 * (official Pixar scenes full-bleed + glass + gold + touchable 3D objects).
 * Source of truth for the look: docs/brand/official/README.md and the
 * Airways boarding-pass art (navy night sky, gold foil, cream paper).
 */

export const WORLD = {
  color: {
    night: "#06101F",      // deepest navy — app background, system bars
    navy: "#0B1A33",       // panels
    navyLift: "#1A3558",   // raised navy, gradients
    gold: "#C9A84C",       // foil gold
    goldBright: "#E8BC56", // gold text on navy
    goldLight: "#FDE68A",  // glow, highlights
    cream: "#FFF7E0",      // text on navy
    paper: "#FBF4DE",      // passport / boarding-pass paper
    paperDeep: "#F1E3BC",
    ink: "#0B1A33",        // text on paper
    inkSoft: "#8A6A1E",    // labels on paper
    stampRed: "#B4232A",
    success: "#34D399",
    danger: "#F87171",
  },
  /** Official scene art (public/now/scenes) per screen. */
  scene: (n: number) => `/now/scenes/scene-${n}.png`,
  radius: { chip: 999, field: 16, card: 24, ticket: 22 },
  /** Springs for every press / pop (Framer Motion). */
  spring: {
    press: { type: "spring", stiffness: 520, damping: 28 },
    pop: { type: "spring", stiffness: 380, damping: 22 },
    soft: { type: "spring", stiffness: 160, damping: 22 },
  },
  /** Minimum touch target in px (Little Explorers use 96 in the world). */
  touch: 52,
} as const;

export type WorldColor = keyof typeof WORLD.color;
