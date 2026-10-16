"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useMotion } from "@/hooks/useMotion";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import {
  resolveUniverseCharacter,
  type UniverseCharacterId,
  type UniverseCharacterState,
} from "@/lib/universe/characters";
import { useAppTheme } from "@/contexts/AppThemeProvider";

interface UniverseCharacterProps {
  character?: UniverseCharacterId;
  state?: UniverseCharacterState;
  /** Diameter in px (character renders in a circle frame). */
  size?: number;
  /** Entrance preset name — token-backed, instant when reduced motion. */
  entrance?: "pop" | "rise" | "none";
  /** Idle loop on/off (default on; auto-off under reduced motion). */
  idle?: boolean;
  className?: string;
  priority?: boolean;
}

/**
 * UniverseCharacter — reusable Nimi / Piko / Zilo renderer.
 * Nimi uses live registry art; Piko falls back to the circle logo;
 * Zilo renders an initial disc until approved art lands (never breaks).
 */
export default function UniverseCharacter({
  character = "nimi",
  state = "idle",
  size = 96,
  entrance = "pop",
  idle = true,
  className = "",
  priority = false,
}: UniverseCharacterProps) {
  const m = useMotion();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const resolved = resolveUniverseCharacter(character, state, assets);

  const entrancePreset =
    entrance === "none" || m.reduced
      ? m.instant
      : entrance === "rise"
        ? m.fadeUp
        : m.scaleIn;
  const idleLoop = idle && !m.reduced ? m.floatSoft : m.static;

  return (
    <motion.div
      className={`relative shrink-0 overflow-hidden rounded-full ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={resolved.alt}
      initial={entrancePreset.initial}
      animate={{ ...entrancePreset.animate, ...idleLoop.animate }}
      transition={{ ...entrancePreset.transition, ...idleLoop.transition }}
    >
      {resolved.src ? (
        <Image
          src={resolved.src}
          alt=""
          fill
          sizes={`${size}px`}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-full w-full items-center justify-center font-baloo text-3xl font-black text-[#07111F]"
          style={{ background: "linear-gradient(135deg, #F5C842, #C9A84C)", fontFamily: "var(--font-baloo)" }}
        >
          {resolved.fallbackInitial}
        </span>
      )}
      {resolved.pending && (
        <span className="sr-only">(Final artwork pending — placeholder shown.)</span>
      )}
    </motion.div>
  );
}
