"use client";

import { useState, useCallback } from "react";
import { DELIGHT, type DelightSpec } from "@/lib/design-system/delight";

interface CelebrationOptions {
  title?: string;
  subtitle?: string;
  stars?: number;
  spec?: DelightSpec;
  autoDismissMs?: number;
}

interface CelebrationState {
  visible: boolean;
  options: CelebrationOptions;
}

export function useCelebration() {
  const [state, setState] = useState<CelebrationState>({ visible: false, options: {} });

  const show = useCallback((options: CelebrationOptions = {}) => {
    setState({ visible: true, options });
  }, []);

  const hide = useCallback(() => {
    setState(s => ({ ...s, visible: false }));
  }, []);

  return {
    visible: state.visible,
    options: state.options,
    show,
    hide,
    /** Convenience shorthands that pre-fill the matching DELIGHT spec. */
    showStoryComplete: (title = "Story Complete!", stars?: number) =>
      show({ title, stars, spec: DELIGHT.storyComplete }),
    showBadgeEarned: (title = "Badge Earned!", subtitle?: string) =>
      show({ title, subtitle, spec: DELIGHT.badgeEarned }),
    showMissionDone: (stars?: number) =>
      show({ title: "Mission Done!", stars, spec: DELIGHT.missionDone }),
    showWeeklyGoal: () =>
      show({ title: "Weekly Goal!", subtitle: "You crushed it this week.", spec: DELIGHT.weeklyGoal }),
    showCertificate: () =>
      show({ title: "Certificate Unlocked!", spec: DELIGHT.certificateUnlocked }),
    showDailyStreak: (days: number) =>
      show({ title: `${days}-Day Streak! 🔥`, spec: DELIGHT.dailyStreak }),
    showParentApproval: () =>
      show({ title: "Parent Approved!", spec: DELIGHT.parentApproval }),
    showThemeUnlocked: (name: string) =>
      show({ title: `${name} Theme Unlocked!`, spec: DELIGHT.themeUnlocked }),
    showRewardClaimed: (stars: number) =>
      show({ title: "Reward Claimed!", stars, spec: DELIGHT.rewardClaimed }),
  };
}
