"use client";

import { useId, useMemo } from "react";
import type { ThemeEffects } from "@/lib/design-system/themeEffects";

// Deterministic LCG pseudo-random — stable across SSR and CSR hydration
function drand(seed: number): number {
  return (((1664525 * seed + 1013904223) >>> 0) / 0x100000000);
}

interface Props {
  effects: ThemeEffects;
  /** Additional classes on the container — must be `absolute` or `fixed` positioned by the parent */
  className?: string;
}

/**
 * Renders theme-specific floating particles (sparkles for HP, bubbles for Ocean)
 * using pure CSS keyframe animations.
 *
 * Usage: place inside a `relative overflow-hidden` ancestor.
 * The component is aria-hidden, pointer-events-none, and auto-disables
 * when the user prefers reduced motion.
 */
export default function FloatingParticles({ effects, className = "" }: Props) {
  const rawId  = useId();
  // Strip chars that are invalid in CSS identifiers (e.g. ":" from React's useId)
  const uid    = rawId.replace(/[^a-zA-Z0-9]/g, "x");
  const kfName = `${uid}float`;
  const ptCls  = `${uid}pt`;

  const { particles, motion } = effects;

  // Deterministic particle descriptors — one per particle, stable across renders
  const items = useMemo(() => (
    Array.from({ length: particles.count }, (_, i) => {
      const s = i * 7 + 3;
      const opLo = particles.opacityRange[0] +
        drand(s + 5) * (particles.opacityRange[1] - particles.opacityRange[0]) * 0.4;
      const opHi = particles.opacityRange[0] +
        drand(s + 6) * (particles.opacityRange[1] - particles.opacityRange[0]);
      return {
        left:  2  + drand(s)     * 96,
        top:   5  + drand(s + 1) * 80,
        size:  particles.sizeRange[0] + drand(s + 2) * (particles.sizeRange[1] - particles.sizeRange[0]),
        dur:   particles.durationRange[0] + drand(s + 3) * (particles.durationRange[1] - particles.durationRange[0]),
        delay: drand(s + 4) * (particles.durationRange[0] * 0.8),
        opLo,
        opHi,
        dy:    -(motion.floatDistance * 0.5 + drand(s + 7) * motion.floatDistance),
        shape: particles.shapes[i % particles.shapes.length],
        color: particles.colors[i % particles.colors.length],
      };
    })
  ), [particles, motion.floatDistance]);

  // Injected CSS: keyframe + class + reduced-motion override
  const css = `
    @keyframes ${kfName} {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50%       { transform: translateY(var(--ni-dy)) rotate(12deg); }
    }
    .${ptCls} {
      animation-name:            ${kfName};
      animation-timing-function: ${motion.easing};
      animation-iteration-count: infinite;
      will-change:               transform, opacity;
    }
    @media (prefers-reduced-motion: reduce) {
      .${ptCls} { animation: none !important; opacity: 0 !important; }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div
        aria-hidden="true"
        className={`absolute inset-0 overflow-hidden pointer-events-none select-none ${className}`}
      >
        {items.map((p, i) => (
          <span
            key={i}
            className={`${ptCls} absolute leading-none`}
            style={{
              left:              `${p.left}%`,
              top:               `${p.top}%`,
              fontSize:          `${p.size.toFixed(1)}px`,
              color:             p.color,
              opacity:           p.opLo,
              animationDuration: `${p.dur.toFixed(1)}s`,
              animationDelay:    `${p.delay.toFixed(1)}s`,
              // CSS custom property consumed by the keyframe
              "--ni-dy":         `${p.dy.toFixed(1)}px`,
            } as React.CSSProperties}
          >
            {p.shape}
          </span>
        ))}
      </div>
    </>
  );
}
