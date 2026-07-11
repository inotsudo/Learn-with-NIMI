"use client";
import { motion } from "framer-motion";

export type CampusZone =
  | "library"
  | "activityBoard"
  | "activityGarden"
  | "trophyRoom"
  | "communitySquare";

type Deco = {
  emoji: string;
  right: string;
  top: string;
  size: number;
  delay: number;
  dur: number;
  spin: boolean;
};

// All decorations use negative `top` so they float in the gap above the section,
// never overlapping with section header controls.
const DECO: Record<CampusZone, Deco[]> = {
  library: [
    { emoji: "📚", right: "6px",  top: "-18px", size: 20, delay: 0,   dur: 3.2, spin: false },
    { emoji: "🍃", right: "30px", top: "-6px",  size: 14, delay: 0.7, dur: 2.8, spin: true  },
    { emoji: "💡", right: "54px", top: "-20px", size: 16, delay: 1.1, dur: 3.5, spin: false },
  ],
  activityBoard: [
    { emoji: "⭐", right: "6px",  top: "-18px", size: 20, delay: 0,   dur: 2.8, spin: false },
    { emoji: "✦",  right: "30px", top: "-4px",  size: 14, delay: 0.6, dur: 2.5, spin: false },
    { emoji: "🌟", right: "52px", top: "-20px", size: 16, delay: 1.0, dur: 3.1, spin: false },
  ],
  activityGarden: [
    { emoji: "🌸", right: "6px",  top: "-18px", size: 20, delay: 0.3, dur: 3.0, spin: true  },
    { emoji: "🦋", right: "28px", top: "-6px",  size: 16, delay: 1.0, dur: 4.1, spin: false },
    { emoji: "🌿", right: "52px", top: "-20px", size: 14, delay: 0.5, dur: 2.9, spin: true  },
  ],
  trophyRoom: [
    { emoji: "🏆", right: "6px",  top: "-18px", size: 20, delay: 0.2, dur: 3.1, spin: false },
    { emoji: "⭐", right: "28px", top: "-4px",  size: 14, delay: 0.8, dur: 2.7, spin: false },
    { emoji: "🎀", right: "52px", top: "-20px", size: 16, delay: 1.2, dur: 3.6, spin: false },
  ],
  communitySquare: [
    { emoji: "🎈", right: "6px",  top: "-18px", size: 20, delay: 0.4, dur: 4.0, spin: false },
    { emoji: "🐦", right: "28px", top: "-6px",  size: 14, delay: 1.1, dur: 3.8, spin: false },
    { emoji: "🌳", right: "52px", top: "-20px", size: 18, delay: 0.6, dur: 3.2, spin: false },
  ],
};

// Decorative ambient elements anchored to the top-right of any campus zone section.
// Parent must have `position: relative` and `overflow: visible` (the default).
export function ZoneDecorations({ zone }: { zone: CampusZone }) {
  return (
    <>
      {DECO[zone].map((d, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute leading-none pointer-events-none select-none"
          style={{ fontSize: d.size, right: d.right, top: d.top, opacity: 0.28, zIndex: 1 }}
          animate={{
            y: [0, -5, 0],
            rotate: d.spin ? [0, 12, -8, 0] : [0, 3, -2, 0],
            scale: [1, 1.06, 1],
          }}
          transition={{ duration: d.dur, repeat: Infinity, ease: "easeInOut", delay: d.delay }}
        >
          {d.emoji}
        </motion.span>
      ))}
    </>
  );
}
