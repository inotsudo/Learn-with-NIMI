"use client";

import { useState, useCallback } from "react";
import { CONFETTI_BURST, STAR_BURST, COIN_POP, type BurstConfig } from "@/lib/design-system/delight";

interface RewardAnimationState {
  active: boolean;
  config: BurstConfig;
}

export function useRewardAnimation() {
  const [state, setState] = useState<RewardAnimationState>({ active: false, config: CONFETTI_BURST });

  const clear = useCallback(() => setState(s => ({ ...s, active: false })), []);

  const burst = useCallback((config: BurstConfig = CONFETTI_BURST) => {
    setState({ active: true, config });
  }, []);

  const stars = useCallback(() => burst(STAR_BURST), [burst]);
  const coins  = useCallback(() => burst(COIN_POP), [burst]);

  return {
    active: state.active,
    config: state.config,
    burst,
    stars,
    coins,
    clear,
    isAnimating: state.active,
  };
}
