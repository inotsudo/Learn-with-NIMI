"use client";

import { useState, useCallback, useRef } from "react";

interface ProgressAnimationState {
  progress: number;
  isComplete: boolean;
}

export function useProgressAnimation(initial = 0, max = 100) {
  const [state, setState] = useState<ProgressAnimationState>({
    progress: initial,
    isComplete: initial >= max,
  });
  const onCompleteRef = useRef<(() => void) | undefined>(undefined);

  const animateTo = useCallback((target: number, onComplete?: () => void) => {
    onCompleteRef.current = onComplete;
    const clamped = Math.min(max, Math.max(0, target));
    setState(prev => {
      const nowComplete = clamped >= max && !prev.isComplete;
      if (nowComplete) setTimeout(() => onCompleteRef.current?.(), 600);
      return { progress: clamped, isComplete: clamped >= max };
    });
  }, [max]);

  const reset = useCallback((value = 0) => {
    setState({ progress: Math.max(0, value), isComplete: false });
  }, []);

  return {
    progress: state.progress,
    isComplete: state.isComplete,
    animateTo,
    reset,
    max,
  };
}
