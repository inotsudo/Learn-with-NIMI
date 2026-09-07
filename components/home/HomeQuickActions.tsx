"use client";

import Link from "next/link";
import { motion } from "framer-motion";

interface Props {
  curStorySlug?: string | null;
}

const cards = (adventureHref: string) => [
  {
    label:    "My Journey",
    subtitle: "View progress",
    emoji:    "🗺️",
    href:     "/stories",
    bubble:   "linear-gradient(145deg,#4AABF5,#2680D4)",
    card_bg:  "#FFFFFF",
    shadow:   "rgba(38,128,212,0.18)",
    arrow_bg: "linear-gradient(135deg,#3B9EF5,#1D72D0)",
  },
  {
    label:    "Adventure Book",
    subtitle: "Continue story",
    emoji:    "📖",
    href:     adventureHref,
    bubble:   "linear-gradient(145deg,#5B8DEF,#3062C8)",
    card_bg:  "#FFFFFF",
    shadow:   "rgba(48,98,200,0.16)",
    arrow_bg: "linear-gradient(135deg,#4C8EDE,#2F66C0)",
  },
  {
    label:    "Daily Mission",
    subtitle: "Do today's activity",
    emoji:    "🎯",
    href:     adventureHref,
    bubble:   "linear-gradient(145deg,#F46060,#D83030)",
    card_bg:  "#FFFFFF",
    shadow:   "rgba(216,48,48,0.16)",
    arrow_bg: "linear-gradient(135deg,#F07070,#D84848)",
  },
  {
    label:    "Star Shop",
    subtitle: "Spend your stars",
    emoji:    "🎁",
    href:     "/shop",
    bubble:   "linear-gradient(145deg,#EE72B0,#C84080)",
    card_bg:  "#FFFFFF",
    shadow:   "rgba(200,64,128,0.16)",
    arrow_bg: "linear-gradient(135deg,#E8709A,#C84878)",
  },
];

export default function HomeQuickActions({ curStorySlug }: Props) {
  const adventureHref = curStorySlug ? `/stories/${curStorySlug}` : "/stories";

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards(adventureHref).map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: i * 0.06 }}
          whileHover={{ y: -5, boxShadow: `0 20px 44px ${c.shadow}` }}
          whileTap={{ scale: 0.97 }}
          style={{
            background:   c.card_bg,
            border:       "1.5px solid rgba(0,0,0,0.06)",
            boxShadow:    `0 4px 16px ${c.shadow}`,
            borderRadius: "20px",
          }}
        >
          <Link href={c.href} className="flex items-center gap-3 px-4 py-3.5">

            {/* Vibrant icon bubble */}
            <motion.div
              whileHover={{ scale: 1.12, rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.45 }}
              className="shrink-0 w-[54px] h-[54px] rounded-full flex items-center justify-center select-none"
              style={{
                background: c.bubble,
                boxShadow:  `0 6px 18px ${c.shadow}, inset 0 1px 0 rgba(255,255,255,0.40)`,
                fontSize:   28,
              }}
            >
              {c.emoji}
            </motion.div>

            {/* Label + subtitle */}
            <div className="flex-1 min-w-0">
              <p className="font-baloo font-black text-[14px] leading-tight" style={{ color: "#0D1E3A" }}>
                {c.label}
              </p>
              <p className="font-baloo text-[11px] mt-0.5" style={{ color: "rgba(13,30,58,0.48)" }}>
                {c.subtitle}
              </p>
            </div>

            {/* Arrow */}
            <div
              className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: c.arrow_bg, boxShadow: "0 3px 8px rgba(0,0,0,0.18)" }}
            >
              <svg viewBox="0 0 12 12" width={11} height={11} fill="none">
                <path d="M2.5 6h7M6.5 3.5L9.5 6l-3 2.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

          </Link>
        </motion.div>
      ))}
    </div>
  );
}
