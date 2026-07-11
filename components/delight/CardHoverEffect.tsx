"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { CARD_TILT } from "@/lib/design-system/delight";
import type { ReactNode } from "react";

interface Props extends Omit<HTMLMotionProps<"div">, "whileHover" | "whileTap"> {
  children: ReactNode;
  variant?: "lift" | "tilt";
  tapFeedback?: boolean;
}

export default function CardHoverEffect({ children, variant = "lift", tapFeedback = true, className, ...rest }: Props) {
  const m = useThemeMotion();

  return (
    <motion.div
      whileHover={variant === "tilt" ? CARD_TILT : m.cardHover}
      whileTap={tapFeedback ? m.buttonPress : undefined}
      className={`transition-shadow hover:shadow-ds-hover ${className ?? ""}`}
      style={{ perspective: 600 }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
