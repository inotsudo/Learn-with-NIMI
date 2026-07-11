"use client";

import { useId, useMemo } from "react";
import type { ThemeEffects } from "@/lib/design-system/themeEffects";

// Deterministic LCG pseudo-random — stable across SSR and CSR hydration
function drand(seed: number): number {
  return (((1664525 * seed + 1013904223) >>> 0) / 0x100000000);
}

const SPARKLE_SHAPES = ["✦", "★", "✶", "✧", "⋆"];

interface Props {
  effects: ThemeEffects;
  /** Additional classes on the container */
  className?: string;
}

/**
 * Renders hero-area decorative elements for the active app theme.
 *
 * HP  → "sparkles": floating gold/green star-sparkle shapes
 * Ocean → "rays":   diagonal translucent light-ray columns
 *
 * Usage: place inside a `relative overflow-hidden` hero container.
 * The component is aria-hidden, pointer-events-none, and zero-layout-impact.
 * Animations are suppressed automatically under prefers-reduced-motion.
 */
export default function HeroDecoration({ effects, className = "" }: Props) {
  const rawId = useId();
  const uid   = rawId.replace(/[^a-zA-Z0-9]/g, "x");

  const { heroDecorations, motion } = effects;
  const { type, colors, count, opacity } = heroDecorations;

  // ── Sparkle descriptors (HP) ──────────────────────────────────────────────
  const sparkles = useMemo(() => {
    if (type !== "sparkles") return [];
    return Array.from({ length: count }, (_, i) => {
      const s = i * 11 + 5;
      return {
        left:  5  + drand(s)     * 90,
        top:   5  + drand(s + 1) * 85,
        size:  10 + drand(s + 2) * 14,
        dur:   motion.floatDuration * 0.7 + drand(s + 3) * motion.floatDuration * 0.8,
        delay: drand(s + 4) * 3.5,
        color: colors[i % colors.length],
        shape: SPARKLE_SHAPES[i % SPARKLE_SHAPES.length],
      };
    });
  }, [type, count, colors, motion.floatDuration]);

  // ── Ray descriptors (Ocean) ───────────────────────────────────────────────
  const rays = useMemo(() => {
    if (type !== "rays") return [];
    return Array.from({ length: count }, (_, i) => {
      const s = i * 13 + 7;
      return {
        left:   5 + (i / Math.max(count - 1, 1)) * 90,
        rotate: -35 + drand(s)     * 50,         // -35° … +15°
        width:  1  + drand(s + 1) * 2.5,         // 1–3.5 px
        color:  colors[i % colors.length],
        dur:    3  + drand(s + 2) * 4,
        delay:  drand(s + 3) * 2.5,
      };
    });
  }, [type, count, colors]);

  if (type === "none" || (type !== "sparkles" && type !== "rays")) return null;

  // ── Injected CSS ──────────────────────────────────────────────────────────
  const sparkleKf  = `${uid}sparkle`;
  const sparkleCls = `${uid}sp`;
  const rayKf      = `${uid}ray`;
  const rayCls     = `${uid}ry`;

  const css = type === "sparkles" ? `
    @keyframes ${sparkleKf} {
      0%,100% { transform: scale(1)   rotate(0deg);  opacity: ${(opacity * 0.35).toFixed(2)}; }
      50%      { transform: scale(1.4) rotate(22deg); opacity: ${opacity.toFixed(2)}; }
    }
    .${sparkleCls} {
      animation-name:            ${sparkleKf};
      animation-timing-function: ${motion.easing};
      animation-iteration-count: infinite;
      will-change:               transform, opacity;
    }
    @media (prefers-reduced-motion: reduce) {
      .${sparkleCls} { animation: none !important; opacity: ${(opacity * 0.4).toFixed(2)} !important; }
    }
  ` : `
    @keyframes ${rayKf} {
      0%,100% { opacity: ${(opacity * 0.25).toFixed(2)}; }
      50%      { opacity: ${opacity.toFixed(2)}; }
    }
    .${rayCls} {
      animation-name:            ${rayKf};
      animation-timing-function: ${motion.easing};
      animation-iteration-count: infinite;
      will-change:               opacity;
    }
    @media (prefers-reduced-motion: reduce) {
      .${rayCls} { animation: none !important; opacity: ${(opacity * 0.3).toFixed(2)} !important; }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div
        aria-hidden="true"
        className={`absolute inset-0 overflow-hidden pointer-events-none select-none ${className}`}
      >
        {/* HP — sparkles */}
        {type === "sparkles" && sparkles.map((s, i) => (
          <span
            key={i}
            className={`${sparkleCls} absolute leading-none`}
            style={{
              left:              `${s.left.toFixed(1)}%`,
              top:               `${s.top.toFixed(1)}%`,
              fontSize:          `${s.size.toFixed(1)}px`,
              color:             s.color,
              animationDuration: `${s.dur.toFixed(1)}s`,
              animationDelay:    `${s.delay.toFixed(1)}s`,
            }}
          >
            {s.shape}
          </span>
        ))}

        {/* Ocean — light rays */}
        {type === "rays" && rays.map((r, i) => (
          <div
            key={i}
            className={`${rayCls} absolute top-0 h-full`}
            style={{
              left:              `${r.left.toFixed(1)}%`,
              width:             `${r.width.toFixed(1)}px`,
              background:        `linear-gradient(to bottom, ${r.color}, transparent 75%)`,
              transform:         `rotate(${r.rotate.toFixed(1)}deg)`,
              transformOrigin:   "top center",
              animationDuration: `${r.dur.toFixed(1)}s`,
              animationDelay:    `${r.delay.toFixed(1)}s`,
            }}
          />
        ))}
      </div>
    </>
  );
}
