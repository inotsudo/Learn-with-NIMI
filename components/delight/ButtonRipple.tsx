"use client";

import { useState, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BUTTON_RIPPLE, type RippleSpec } from "@/lib/design-system/delight";
import { useReducedMotionPreferences } from "@/hooks/useReducedMotionPreferences";
import { EASE } from "@/lib/design-system/motion";

interface Ripple {
  id: number;
  x: number;
  y: number;
}

interface Props {
  children: ReactNode;
  spec?: RippleSpec;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  as?: "div" | "span";
}

export default function ButtonRipple({ children, spec = BUTTON_RIPPLE, className, onClick, as: Tag = "div" }: Props) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const reduced = useReducedMotionPreferences();

  const handleClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!reduced) {
      const rect = e.currentTarget.getBoundingClientRect();
      const id = Date.now();
      setRipples(prev => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
      setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), spec.duration * 1000 + 150);
    }
    onClick?.(e);
  }, [reduced, spec.duration, onClick]);

  return (
    <Tag className={`relative overflow-hidden ${className ?? ""}`} onClick={handleClick}>
      {children}
      {!reduced && (
        <AnimatePresence>
          {ripples.map(r => (
            <motion.span
              key={r.id}
              className="absolute rounded-full pointer-events-none"
              style={{
                left: r.x, top: r.y,
                translateX: "-50%", translateY: "-50%",
                width: 20, height: 20,
                backgroundColor: spec.color,
              }}
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: spec.maxScale, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: spec.duration, ease: EASE.exit }}
            />
          ))}
        </AnimatePresence>
      )}
    </Tag>
  );
}
