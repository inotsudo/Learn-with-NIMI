"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { DURATION, EASE } from "@/lib/design-system/motion";
import { COIN_POP } from "@/lib/design-system/delight";
import RewardBurst from "./RewardBurst";

interface Props {
  value: number;
  max?: number;
  colorClass?: string;
  height?: number;
  className?: string;
  onComplete?: () => void;
}

export default function ProgressCelebration({
  value,
  max = 100,
  colorClass = "bg-ds-progress-fill",
  height = 8,
  className,
  onComplete,
}: Props) {
  const pct      = Math.min(100, Math.max(0, (value / max) * 100));
  const [burst, setBurst] = useState(false);
  const prevRef  = useRef(value);

  useEffect(() => {
    if (pct >= 100 && prevRef.current < max) {
      setBurst(true);
      onComplete?.();
    }
    prevRef.current = value;
  }, [pct, value, max, onComplete]);

  return (
    <div className={`relative ${className ?? ""}`}>
      <div
        className="w-full bg-gray-100 rounded-full overflow-hidden"
        style={{ height }}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          className={`${colorClass} h-full rounded-full`}
          initial={{ width: "0%" }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: DURATION.progress, ease: EASE.enter }}
        />
      </div>

      <RewardBurst
        active={burst}
        config={COIN_POP}
        onComplete={() => setBurst(false)}
      />
    </div>
  );
}
