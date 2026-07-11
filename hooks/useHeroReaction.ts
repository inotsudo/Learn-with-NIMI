"use client";

import { useState, useCallback, useRef } from "react";
import type { HeroReactionType } from "@/lib/design-system/delight";

const RETURN_TO_IDLE_MS = 3000;

export function useHeroReaction(defaultReaction: HeroReactionType = "idle") {
  const [reaction, setReaction] = useState<HeroReactionType>(defaultReaction);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const react = useCallback((type: HeroReactionType) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setReaction(type);
    if (type !== "idle") {
      timerRef.current = setTimeout(() => setReaction("idle"), RETURN_TO_IDLE_MS);
    }
  }, []);

  return { reaction, react };
}
