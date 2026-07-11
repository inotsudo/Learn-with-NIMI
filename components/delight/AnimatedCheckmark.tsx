"use client";

import { motion } from "framer-motion";
import { useMotion } from "@/hooks/useMotion";
import { CHECKMARK_SUCCESS, type CheckmarkSpec } from "@/lib/design-system/delight";
import { EASE } from "@/lib/design-system/motion";

interface Props {
  spec?: CheckmarkSpec;
  className?: string;
  visible?: boolean;
}

export default function AnimatedCheckmark({ spec = CHECKMARK_SUCCESS, className, visible = true }: Props) {
  const m = useMotion();
  const { size, strokeWidth, colorVar, duration } = spec;

  if (!visible) return null;

  return (
    <motion.div
      {...(m.reduced ? m.instant : m.scaleIn)}
      className={className}
      style={{ width: size, height: size, display: "inline-block" }}
    >
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
        {/* Ambient circle */}
        <motion.circle
          cx="24" cy="24" r="22"
          fill="none"
          stroke={colorVar}
          strokeWidth={strokeWidth - 1}
          opacity={0.15}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: duration * 0.5, ease: EASE.enter }}
        />
        {/* Check stroke */}
        <motion.path
          d="M12 25 L21 34 L36 17"
          fill="none"
          stroke={colorVar}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration, ease: EASE.enter, delay: duration * 0.25 }}
        />
      </svg>
    </motion.div>
  );
}
