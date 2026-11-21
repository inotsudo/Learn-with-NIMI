"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import { WORLD } from "@/lib/design-system/world";

type Variant = "gold" | "glass" | "light";

/**
 * The pressable 3D button of the NIMIPIKO world: a gold foil pill with real
 * depth (it sinks when pressed), a slow foil glint, 56px+ touch target.
 */
export default function GoldButton({
  variant = "gold",
  loading = false,
  full = false,
  icon,
  children,
  className = "",
  disabled,
  ...rest
}: Omit<HTMLMotionProps<"button">, "children"> & {
  variant?: Variant;
  loading?: boolean;
  full?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  const off = disabled || loading;
  return (
    <motion.button
      type="button"
      {...rest}
      disabled={off}
      aria-busy={loading || undefined}
      className={`wui-btn wui-btn--${variant}${full ? " w-full" : ""} ${className}`}
      whileHover={off ? undefined : { y: -2 }}
      whileTap={off ? undefined : { y: 5, scale: 0.98 }}
      transition={WORLD.spring.press}
    >
      {variant === "gold" && <span className="wui-btn__shine" aria-hidden="true" />}
      {loading ? (
        <span className="inline-block h-5 w-5 shrink-0 animate-spin rounded-full border-[3px] border-current border-t-transparent" aria-hidden="true" />
      ) : (
        icon && <span className="relative flex shrink-0 items-center text-[1.15em]" aria-hidden="true">{icon}</span>
      )}
      {/* min-w-0 + truncate: a long label (or translation) ends in "…" instead of spilling out of the pill */}
      <span className="relative min-w-0 truncate">{children}</span>
    </motion.button>
  );
}
