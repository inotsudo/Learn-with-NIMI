/**
 * Canonical design constants for Nimipiko.
 *
 * These are the single source of truth for spacing, sizing, typography, and
 * border-radius values used across shared components. Prefer these over
 * arbitrary Tailwind classes so that future theme changes require edits in
 * one place.
 *
 * Usage:
 *   import { DS } from "@/lib/design-system/designConstants";
 *   <div className={DS.radius.card}>…</div>
 */

export const DS = {
  /** Border-radius tokens — always use Tailwind class names, never arbitrary px. */
  radius: {
    /** Primary card / panel radius */
    card:    "rounded-2xl",
    /** Wider card (story hero, feature block) */
    cardLg:  "rounded-3xl",
    /** Pill / badge / chip */
    pill:    "rounded-full",
    /** Primary action button */
    button:  "rounded-2xl",
    /** Small input / tag */
    input:   "rounded-xl",
    /** Dialog / bottom-sheet on mobile */
    dialog:  "rounded-t-3xl sm:rounded-3xl",
  },

  /** Spacing tokens (Tailwind padding / gap classes) */
  spacing: {
    /** Standard card inner padding */
    card:    "p-4",
    /** Wider card inner padding */
    cardLg:  "p-5 sm:p-6",
    /** Section vertical gap */
    section: "space-y-4",
    /** Tight gap between elements */
    tight:   "gap-2",
    /** Standard gap between elements */
    base:    "gap-3",
    /** Wide gap between elements */
    wide:    "gap-4",
  },

  /** Typography size tokens (Tailwind text-* classes only, never text-[Npx]). */
  text: {
    xs2:  "text-2xs",   // 10 px
    xs:   "text-xs",    // 12 px
    sm:   "text-sm",    // 14 px
    base: "text-base",  // 16 px
    lg:   "text-lg",    // 18 px
    xl:   "text-xl",    // 20 px
    h3:   "text-xl font-black",
    h2:   "text-2xl font-black",
    h1:   "text-3xl sm:text-4xl font-black",
  },

  /** Shadow tokens — always use the DS semantic shadow utilities. */
  shadow: {
    card:  "shadow-ds-card",
    hover: "shadow-ds-hover",
    nav:   "shadow-ds-nav",
    cta:   "shadow-ds-cta",
  },

  /** Color tokens — always use the DS semantic class names. */
  color: {
    action:       "bg-ds-action",
    actionSubtle: "bg-ds-action-subtle",
    page:         "bg-ds-page",
    card:         "bg-ds-card",
    progress:     "bg-ds-progress-fill",
    brand:        "text-ds-brand",
    muted:        "text-ds-muted",
    text:         "text-ds-text",
  },

  /** Border tokens */
  border: {
    default: "border-ds-border",
    brand:   "border-ds-border-brand",
    strong:  "border-ds-border-strong",
  },
} as const;
