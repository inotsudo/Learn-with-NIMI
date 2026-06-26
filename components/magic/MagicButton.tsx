"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "success" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
  icon?: ReactNode;
}

const VARIANTS = {
  primary: "bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30",
  secondary: "bg-gradient-to-r from-lavender-400 to-purple-500 text-white shadow-lg shadow-purple-500/20",
  success: "bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-lg shadow-green-500/20",
  danger: "bg-gradient-to-r from-red-400 to-rose-500 text-white shadow-lg shadow-red-500/20",
  ghost: "bg-white/10 text-white border border-white/15 hover:bg-white/15",
};

const SIZES = {
  sm: "px-4 py-2 text-[12px] rounded-xl",
  md: "px-6 py-3 text-[14px] rounded-2xl",
  lg: "px-8 py-4 text-[16px] rounded-2xl",
};

export default function MagicButton({
  children, onClick, variant = "primary", size = "md", disabled, className = "", icon,
}: Props) {
  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.03, y: -1 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={`font-baloo font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {icon}
      {children}
    </motion.button>
  );
}
