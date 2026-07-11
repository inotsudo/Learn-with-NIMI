"use client";

import { motion } from "framer-motion";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { HERO_REACTIONS, type HeroReactionType } from "@/lib/design-system/delight";
import { useReducedMotionPreferences } from "@/hooks/useReducedMotionPreferences";

interface Props {
  reaction?: HeroReactionType;
  mascot?: "nimi" | "piko";
  size?: number;
  className?: string;
}

export default function HeroReaction({ reaction = "idle", mascot = "nimi", size = 64, className }: Props) {
  const { themeId } = useAppTheme();
  const assets      = getThemeAssets(themeId);
  const reduced     = useReducedMotionPreferences();

  const src          = mascot === "piko" ? assets.pikoCircle : assets.nimiCircle;
  const borderColor  = mascot === "piko" ? "border-blue-300" : "border-yellow-400";
  const effectiveKey = reduced && reaction !== "idle" ? "idle" : reaction;
  const spec         = HERO_REACTIONS[effectiveKey];

  return (
    <motion.img
      src={src}
      alt={mascot.toUpperCase()}
      className={`rounded-full object-cover border-4 shadow-lg ${borderColor} ${className ?? ""}`}
      style={{ width: size, height: size }}
      animate={spec.animate}
      transition={spec.transition}
    />
  );
}
