"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getComponentVariant } from "@/lib/design-system/componentVariants";
import { useThemeMotion } from "@/hooks/useThemeMotion";

interface Props {
  children: ReactNode;
  variant?: "default" | "glow" | "elevated" | "paper";
  hover?: boolean;
  delay?: number;
  className?: string;
  onClick?: () => void;
}

export default function MagicCard({
  children, variant = "default", hover = true, delay = 0, className = "", onClick,
}: Props) {
  const { themeId } = useAppTheme();
  const cv = getComponentVariant(themeId);
  const m = useThemeMotion();

  const baseStyles = {
    default:  `border ${cv.cardStyle.radius} transition-all shadow-ds-card`,
    glow:     `border ${cv.cardStyle.radius} transition-all shadow-ds-hover`,
    elevated: `border ${cv.cardStyle.radius} transition-all shadow-ds-hover`,
    paper:    `${cv.cardStyle.radius} transition-all shadow-ds-card`,
  };

  const entrance = m.cardEntrance;

  return (
    <motion.div
      initial={entrance.initial}
      animate={entrance.animate}
      transition={{ ...entrance.transition, delay }}
      whileHover={hover && !onClick ? { y: -3 } : hover ? m.cardHoverSm : {}}
      whileTap={onClick ? m.buttonPress : {}}
      onClick={onClick}
      className={`${baseStyles[variant]} ${onClick ? "cursor-pointer" : ""} bg-white border-ds-border ${className}`}
      style={variant === "paper" ? { backgroundColor: "#faf6ee", borderColor: "rgba(180,160,130,0.2)" } : undefined}
    >
      {children}
    </motion.div>
  );
}
