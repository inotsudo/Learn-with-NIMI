"use client";

import { motion } from "framer-motion";

export interface RunwayTile {
  slotKey: string;
  emoji: string;
  label: string;
  done: boolean;
  next: boolean;
  disabled: boolean;
}

const SPRING = { type: "spring", stiffness: 420, damping: 22 } as const;

/**
 * The 6 missions as glowing golden glass floor tiles, perspective-tilted like
 * runway panels. `floor` = pinned along the bottom edge of the scene;
 * `inline` = laid out inside the opened Kit studio.
 */
export default function RunwayTiles({
  tiles, showLabels, onSelect, align = "center", inline = false, ariaLabel,
}: {
  tiles: RunwayTile[];
  showLabels: boolean;
  onSelect: (slotKey: string) => void;
  align?: "start" | "center" | "end";
  inline?: boolean;
  ariaLabel: string;
}) {
  const justify = align === "start" ? "flex-start" : align === "end" ? "flex-end" : "center";
  return (
    <nav
      className="nw-runway"
      aria-label={ariaLabel}
      style={inline ? { position: "relative", bottom: "auto", justifyContent: "center", padding: 0 } : { justifyContent: justify }}
    >
      <div className="nw-runway__deck">
        {tiles.map((t, i) => (
          <motion.button
            key={t.slotKey}
            type="button"
            className={`nw-tile${t.done ? " nw-tile--done" : ""}${t.next ? " nw-tile--next" : ""}`}
            aria-label={`${t.label}${t.done ? " ✓" : ""}`}
            disabled={t.disabled}
            onClick={() => onSelect(t.slotKey)}
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: t.disabled ? 0.45 : 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.05 * i }}
            whileHover={t.disabled ? undefined : { y: -8, scale: 1.04 }}
            whileTap={t.disabled ? undefined : { scale: 0.92 }}
          >
            <span className="nw-tile__icon" aria-hidden="true">{t.emoji}</span>
            {showLabels && <span className="nw-tile__label">{t.label}</span>}
            {t.done && <span className="nw-tile__check" aria-hidden="true">✓</span>}
          </motion.button>
        ))}
      </div>
    </nav>
  );
}
