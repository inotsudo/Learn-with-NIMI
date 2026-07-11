"use client";

import type { ThemeEffects } from "@/lib/design-system/themeEffects";

interface Props {
  effects: ThemeEffects;
  /** Additional classes on the container */
  className?: string;
}

/**
 * Renders a multi-layer decorative background for the active app theme.
 * Layers (bottom to top):
 *   1. Tailwind gradient mesh
 *   2. CSS radial ambient gradient
 *   3. Top-edge radial glow
 *   4. Bottom-edge radial glow
 *
 * Usage: place as the first child inside a `relative` ancestor that fills
 * the desired area (page, section, card, etc.).
 * The component is aria-hidden, pointer-events-none, and zero-layout-impact.
 */
export default function ThemeBackground({ effects, className = "" }: Props) {
  const { backgroundDecorations, pageEffects } = effects;

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 overflow-hidden pointer-events-none select-none ${className}`}
    >
      {/* Layer 1 — Tailwind gradient mesh */}
      <div className={`absolute inset-0 bg-gradient-to-br ${backgroundDecorations.meshClass}`} />

      {/* Layer 2 — Radial ambient gradient (CSS, not Tailwind, for multi-stop support) */}
      <div
        className="absolute inset-0"
        style={{ background: backgroundDecorations.ambientGradient }}
      />

      {/* Layer 3 — Top-edge glow */}
      <div
        className="absolute top-0 inset-x-0 h-64"
        style={{
          background: `radial-gradient(ellipse 70% 100% at 50% 0%, ${pageEffects.topGlow}, transparent)`,
        }}
      />

      {/* Layer 4 — Bottom-edge glow */}
      <div
        className="absolute bottom-0 inset-x-0 h-48"
        style={{
          background: `radial-gradient(ellipse 60% 100% at 50% 100%, ${pageEffects.bottomGlow}, transparent)`,
        }}
      />
    </div>
  );
}
