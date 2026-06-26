"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

type LoaderVariant = "home" | "stories" | "missions" | "community" | "treasure" | "shop" | "settings" | "default";

interface Props {
  variant?: LoaderVariant;
  fullPage?: boolean;
  message?: string;
}

const MESSAGE_KEYS: Record<LoaderVariant, string[]> = {
  home: ["loaderHomeReady", "loaderHomeMagic", "loaderHomeDoor"],
  stories: ["loaderStoriesBook", "loaderStoriesArriving", "loaderStoriesFlutter"],
  missions: ["loaderMissionsMap", "loaderMissionsGather", "loaderMissionsTrail"],
  community: ["loaderCommunityFriends", "loaderCommunityButterflies", "loaderCommunityCelebrate"],
  treasure: ["loaderTreasurePolish", "loaderTreasureCount", "loaderTreasureChest"],
  shop: ["loaderShopStars", "loaderShopArrange", "loaderShopSparkle"],
  settings: ["loaderSettingsWizard", "loaderSettingsPrepare"],
  default: ["loaderDefaultMagic", "loaderDefaultNimi", "loaderDefaultPage"],
};

// ── Nimi mascot walking with bouncing stars ─────────────────
function NimiWalking() {
  return (
    <div className="relative w-40 h-28">
      {/* Stars being collected */}
      {[0, 1, 2].map(i => (
        <motion.div key={i} className="absolute" style={{ top: 0, left: 50 + i * 25 }}
          animate={{
            y: [0, -15, 40],
            x: [0, -10, -20],
            opacity: [0, 1, 0],
            scale: [0.5, 1, 0.3],
          }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.6 }}>
          <span className="text-lg">⭐</span>
        </motion.div>
      ))}

      {/* Nimi bouncing */}
      <motion.div className="absolute bottom-0 left-1/2 -translate-x-1/2"
        animate={{ y: [0, -12, 0], rotate: [0, 3, -3, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}>
        <img src="/nimi-logo-circle.png" alt="Nimi" className="w-16 h-16 rounded-full border-3 border-yellow-400/50 shadow-xl" draggable={false} />
      </motion.div>

      {/* Sparkle trail */}
      {[0, 1, 2, 3].map(i => (
        <motion.div key={`s${i}`} className="absolute bottom-3" style={{ left: 20 + i * 12 }}
          animate={{ opacity: [0, 0.6, 0], scale: [0.3, 0.8, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}>
          <span className="text-[10px]">✨</span>
        </motion.div>
      ))}
    </div>
  );
}

// ── Book opening animation ─────────────────────────────────
function BookOpening() {
  return (
    <div className="relative w-32 h-28 flex items-center justify-center">
      {/* Book base */}
      <motion.div className="relative"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity }}>
        <span className="text-6xl">📖</span>
      </motion.div>

      {/* Sparkles emerging from book */}
      {[0, 1, 2, 3, 4].map(i => (
        <motion.div key={i} className="absolute" style={{ left: "50%", top: "40%" }}
          animate={{
            y: [-5, -30 - i * 8],
            x: [(i - 2) * 5, (i - 2) * 15],
            opacity: [0, 0.8, 0],
            scale: [0.3, 1, 0.5],
          }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.25 }}>
          <span className="text-sm">{["✨", "⭐", "🌟", "💫", "✦"][i]}</span>
        </motion.div>
      ))}
    </div>
  );
}

// ── Growing tree ───────────────────────────────────────────
function GrowingTree() {
  return (
    <div className="relative w-28 h-32 flex items-end justify-center">
      {/* Trunk growing */}
      <motion.div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 bg-amber-700/40 rounded-t-full origin-bottom"
        animate={{ height: [0, 30, 30] }}
        transition={{ duration: 2, repeat: Infinity }} />

      {/* Leaves blooming */}
      <motion.div className="absolute bottom-6 left-1/2 -translate-x-1/2"
        animate={{ scale: [0, 0, 1], opacity: [0, 0, 1] }}
        transition={{ duration: 2, repeat: Infinity }}>
        <span className="text-5xl">🌳</span>
      </motion.div>

      {/* Flowers popping */}
      {[0, 1].map(i => (
        <motion.div key={i} className="absolute bottom-0"
          style={{ left: i === 0 ? 5 : undefined, right: i === 1 ? 5 : undefined }}
          animate={{ scale: [0, 0, 0, 1], opacity: [0, 0, 0, 1], y: [0, 0, 0, -5] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}>
          <span className="text-lg">{i === 0 ? "🌸" : "🌼"}</span>
        </motion.div>
      ))}
    </div>
  );
}

// ── Treasure chest ─────────────────────────────────────────
function TreasureChest() {
  return (
    <div className="relative w-32 h-28 flex items-center justify-center">
      <motion.div animate={{ rotate: [0, -5, 5, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}>
        <span className="text-6xl">🎁</span>
      </motion.div>

      {/* Stars floating into chest */}
      {[0, 1, 2].map(i => (
        <motion.div key={i} className="absolute"
          style={{ top: -10, left: 30 + i * 25 }}
          animate={{
            y: [0, 50],
            opacity: [0.8, 0],
            scale: [1, 0.3],
          }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }}>
          <span className="text-lg">⭐</span>
        </motion.div>
      ))}

      {/* Glow */}
      <motion.div className="absolute inset-0 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(251,191,36,0.15) 0%, transparent 70%)" }}
        animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }} />
    </div>
  );
}

// ── Butterflies scatter ────────────────────────────────────
function ButterfliesLoading() {
  const colors = ["text-pink-400", "text-purple-400", "text-yellow-400", "text-blue-400"];
  return (
    <div className="relative w-36 h-28">
      {colors.map((c, i) => (
        <motion.div key={i} className={`absolute ${c}`}
          style={{ left: "50%", top: "50%" }}
          animate={{
            x: [0, (i % 2 === 0 ? 30 : -30), (i % 2 === 0 ? -20 : 20), 0],
            y: [0, (i < 2 ? -25 : 25), (i < 2 ? 15 : -15), 0],
            rotate: [0, 15, -15, 0],
          }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}>
          <span className="text-2xl">🦋</span>
        </motion.div>
      ))}

      {/* Center glow */}
      <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 2, repeat: Infinity }}>
        <span className="text-3xl">✨</span>
      </motion.div>
    </div>
  );
}

// ── Shopping / market ──────────────────────────────────────
function MarketLoading() {
  return (
    <div className="relative w-36 h-28 flex items-center justify-center">
      <motion.div animate={{ y: [0, -8, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}>
        <span className="text-5xl">🛍️</span>
      </motion.div>

      {[0, 1, 2].map(i => (
        <motion.div key={i} className="absolute"
          style={{ bottom: 30 + i * 5, left: 50 + i * 15 }}
          animate={{
            y: [20, -10, 20],
            opacity: [0, 1, 0],
            rotate: [0, 360],
          }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}>
          <span className="text-sm">⭐</span>
        </motion.div>
      ))}
    </div>
  );
}

const VARIANT_ANIMATION: Record<LoaderVariant, () => React.JSX.Element> = {
  home: NimiWalking,
  stories: BookOpening,
  missions: GrowingTree,
  community: ButterfliesLoading,
  treasure: TreasureChest,
  shop: MarketLoading,
  settings: NimiWalking,
  default: NimiWalking,
};

export default function MagicLoader({ variant = "default", fullPage = true, message }: Props) {
  const { t } = useLanguage();
  const [msgIndex, setMsgIndex] = useState(0);
  const keys = MESSAGE_KEYS[variant];
  const messages = keys.map(k => t(k));

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % messages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [messages.length]);

  const Animation = VARIANT_ANIMATION[variant];

  const content = (
    <div className="flex flex-col items-center gap-4">
      <Animation />

      <AnimatePresence mode="wait">
        <motion.p key={msgIndex}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="font-nunito font-bold theme-text-muted text-[14px] text-center max-w-[240px]">
          {message ?? messages[msgIndex]}
        </motion.p>
      </AnimatePresence>

      {/* Progress dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <motion.div key={i} className="w-2 h-2 rounded-full"
            style={{ backgroundColor: "var(--theme-accent, #7c3aed)" }}
            animate={{ scale: [1, 1.4, 1], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
        ))}
      </div>
    </div>
  );

  if (!fullPage) return content;

  return (
    <div className="min-h-screen theme-bg flex items-center justify-center">
      {content}
    </div>
  );
}
