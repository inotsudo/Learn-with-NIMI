"use client";

import Image from "next/image";
import { motion, useReducedMotion, useTransform } from "framer-motion";
import { useParallax } from "@/components/nimi-world/env";

/**
 * A full-bleed official scene behind any screen: the art fills the screen
 * edge to edge (object-cover), drifts with a gentle pointer/gyro parallax,
 * and gets a navy grade so glass panels on top stay readable.
 *
 * `focus` = object-position (fractions) — which part of the square art stays
 * in frame. `shade` darkens toward one side so text there is legible.
 */
export default function WorldBackdrop({
  src,
  focus = { x: 0.5, y: 0.5 },
  portraitFocus,
  shade = "bottom",
  dim = 0.35,
  priority = true,
  portraitTop = false,
}: {
  src: string;
  focus?: { x: number; y: number };
  /** Crop for portrait screens when it should differ from `focus`. */
  portraitFocus?: { x: number; y: number };
  /** "adaptive": bottom on portrait screens, right on landscape (panel beside the art). */
  shade?: "bottom" | "right" | "left" | "full" | "adaptive";
  /** 0 = untouched art, 1 = almost night. */
  dim?: number;
  priority?: boolean;
  /** Tablet portrait (screen wider than 3:5): show the whole square art at the
   *  top, fading into night below — for screens whose panel sits at the bottom,
   *  so the panel never covers the characters' faces. Phones keep full-bleed. */
  portraitTop?: boolean;
}) {
  const reduced = !!useReducedMotion();
  const p = useParallax(!reduced);
  const x = useTransform(p.x, (v) => v * -12);
  const y = useTransform(p.y, (v) => v * -8);

  const gradient = {
    bottom: "linear-gradient(180deg, rgba(6,16,31,0) 25%, rgba(6,16,31,0.55) 62%, rgba(6,16,31,0.94) 100%)",
    right: "linear-gradient(90deg, rgba(6,16,31,0) 30%, rgba(6,16,31,0.6) 62%, rgba(6,16,31,0.9) 100%)",
    left: "linear-gradient(270deg, rgba(6,16,31,0) 30%, rgba(6,16,31,0.6) 62%, rgba(6,16,31,0.9) 100%)",
    full: "rgba(6,16,31,0.45)",
    adaptive: undefined,
  }[shade];

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      <motion.div className={`absolute inset-0${portraitTop ? " wui-backdrop-art--top" : ""}`} style={{ x, y, scale: 1.06 }}>
        <Image
          src={src}
          alt=""
          fill
          priority={priority}
          sizes="(orientation: portrait) 100vh, 100vw"
          className="wui-backdrop-img object-cover"
          style={{
            ["--wui-fx" as string]: `${focus.x * 100}%`, ["--wui-fy" as string]: `${focus.y * 100}%`,
            ["--wui-pfx" as string]: `${(portraitFocus ?? focus).x * 100}%`, ["--wui-pfy" as string]: `${(portraitFocus ?? focus).y * 100}%`,
          }}
        />
      </motion.div>
      <div className="absolute inset-0" style={{ background: `rgba(6,16,31,${dim})` }} />
      {gradient ? <div className="absolute inset-0" style={{ background: gradient }} /> : <div className="wui-shade-adaptive absolute inset-0" />}
      {/* night scrim behind the status bar + airline mark */}
      <div className="absolute inset-x-0 top-0 h-32" style={{ background: "linear-gradient(180deg, rgba(6,16,31,0.6), rgba(6,16,31,0))" }} />
      {/* soft gold light from above, like the official renders */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(70% 50% at 50% 0%, rgba(253,230,138,0.14), transparent 70%)" }} />
    </div>
  );
}
