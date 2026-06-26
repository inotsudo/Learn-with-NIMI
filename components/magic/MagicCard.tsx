"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useKidTheme } from "@/contexts/ThemeProvider";

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
  const { theme } = useKidTheme();

  const baseStyles = {
    default: `border rounded-[24px] transition-all`,
    glow: `border rounded-[24px] transition-all shadow-lg`,
    elevated: `border rounded-[24px] transition-all shadow-xl`,
    paper: `rounded-[24px] transition-all shadow-md`,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 120 }}
      whileHover={hover && !onClick ? { y: -3 } : hover ? { y: -3, scale: 1.01 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      onClick={onClick}
      className={`${baseStyles[variant]} ${onClick ? "cursor-pointer" : ""} ${className}`}
      style={{
        backgroundColor: variant === "paper" ? "#faf6ee" : theme.bgCard,
        borderColor: variant === "paper" ? "rgba(180,160,130,0.2)" : theme.border,
      }}
    >
      {children}
    </motion.div>
  );
}
