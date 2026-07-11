"use client";

import type { ThemeEffects } from "@/lib/design-system/themeEffects";

interface Props {
  effects: ThemeEffects;
  /**
   * CSS z-index for the overlay layers.
   * Default 0 — sits above the element's default paint order but below
   * any explicitly z-indexed children.
   */
  overlayZ?: number;
  /** Additional classes on the outer container */
  className?: string;
}

/**
 * Renders a two-layer decorative overlay inside a card, panel, or container.
 *
 * Layer 1 — inner ambient glow: a subtle inset box-shadow tinted to the theme.
 * Layer 2 — shimmer highlight:  a diagonal highlight stripe at the top-left
 *            corner, visible at rest and fading out toward the bottom-right.
 *            Disabled automatically when `cardDecorations.shimmerEnabled` is false.
 *
 * Usage: place as the **first child** of a `relative overflow-hidden` element.
 * The `rounded-[inherit]` on the overlay ensures it clips to the parent's
 * border-radius automatically.
 *
 * The component is aria-hidden, pointer-events-none, and zero-layout-impact.
 * No animation runs — effects are static CSS, so there is zero render cost
 * and no prefers-reduced-motion concern.
 */
export default function DecorativeOverlay({ effects, overlayZ = 0, className = "" }: Props) {
  const { cardDecorations } = effects;

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 overflow-hidden rounded-[inherit] pointer-events-none select-none ${className}`}
      style={{ zIndex: overlayZ }}
    >
      {/* Layer 1 — inset ambient glow edge */}
      <div
        className="absolute inset-0 rounded-[inherit]"
        style={{ boxShadow: `inset 0 0 28px ${cardDecorations.glowColor}` }}
      />

      {/* Layer 2 — static shimmer highlight stripe (top-left corner) */}
      {cardDecorations.shimmerEnabled && (
        <div
          className="absolute inset-0 rounded-[inherit]"
          style={{
            background: `linear-gradient(
              135deg,
              ${cardDecorations.shimmerColor} 0%,
              transparent 45%
            )`,
          }}
        />
      )}
    </div>
  );
}
