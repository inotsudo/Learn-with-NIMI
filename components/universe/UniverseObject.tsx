"use client";

import type { CSSProperties, ReactNode } from "react";
import { motion } from "framer-motion";
import { useMotion } from "@/hooks/useMotion";
import { playTap } from "@/lib/sounds";

type UniverseGesture = "tap" | "open" | "discover" | "enter" | "complete" | "reward";

interface UniverseObjectProps {
  children: ReactNode;
  /** Interaction language primitive (physical feel per gesture). */
  gesture?: UniverseGesture;
  onActivate?: () => void;
  label: string;
  /** Visual glow color (token-sourced at call site). */
  glow?: string;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * UniverseObject — reusable interaction primitive for world objects.
 * tap: scale response + sound hook. open/discover/enter/complete/reward:
 * progressively larger celebratory pops. Keyboard-operable button with
 * 44px minimum target. Sounds are NOT fired globally — only on activation.
 */
export default function UniverseObject({
  children,
  gesture = "tap",
  onActivate,
  label,
  glow,
  disabled = false,
  className = "",
  style,
}: UniverseObjectProps) {
  const m = useMotion();

  const whileTap =
    gesture === "reward" || gesture === "complete"
      ? { scale: 0.92 }
      : gesture === "open"
        ? { scale: 0.94, rotate: -2 }
        : m.buttonPress;
  const whileHover = m.buttonHover;

  return (
    <motion.button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        playTap();
        onActivate?.();
      }}
      whileHover={disabled ? undefined : whileHover}
      whileTap={disabled ? undefined : whileTap}
      className={`universe-touch relative ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${className}`}
      style={glow ? { filter: `drop-shadow(0 0 12px ${glow})`, ...style } : style}
    >
      {children}
    </motion.button>
  );
}
