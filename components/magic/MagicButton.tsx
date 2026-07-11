"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getComponentVariant } from "@/lib/design-system/componentVariants";
import { useThemeMotion } from "@/hooks/useThemeMotion";

interface Props {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "success" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
  icon?: ReactNode;
}

const SIZES = {
  sm: "px-4 py-2 text-xs",
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-4 text-base",
};

// Semantic variants not tied to app theme
const STATIC_VARIANTS = {
  danger: "bg-gradient-to-r from-red-400 to-rose-500 text-white shadow-sm shadow-red-500/20",
  ghost:  "bg-transparent text-gray-700 border border-gray-200 hover:bg-gray-50 hover:text-gray-900",
};

export default function MagicButton({
  children, onClick, variant = "primary", size = "md", disabled, className = "", icon,
}: Props) {
  const { themeId } = useAppTheme();
  const cv = getComponentVariant(themeId);
  const m = useThemeMotion();

  const variantClass =
    variant === "primary"   ? cv.buttonStyle.primary   :
    variant === "secondary" ? cv.buttonStyle.secondary  :
    variant === "success"   ? cv.buttonStyle.success    :
    STATIC_VARIANTS[variant];

  return (
    <motion.button
      whileHover={disabled ? {} : m.buttonHover}
      whileTap={disabled ? {} : m.buttonPress}
      onClick={onClick}
      disabled={disabled}
      className={`font-baloo font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${variantClass} ${SIZES[size]} ${className}`}
      style={{ borderRadius: 'var(--leaf-r-sm)' }}
    >
      {icon}
      {children}
    </motion.button>
  );
}
