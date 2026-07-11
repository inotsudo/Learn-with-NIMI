"use client";

import { motion } from "framer-motion";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { SPRING } from "@/lib/design-system/motion";

const REACTIONS: Record<string, string[]> = {
  story:  ["You listened to every page! 📚", "What a great story explorer! 🌟", "You followed every word! 🎧"],
  read:   ["You read every single page! 📖", "Incredible reader! 🌟", "Look at you go, bookworm! 📚"],
  color:  ["Your artwork is beautiful! 🎨", "What amazing colors you chose! ✨", "You're a real artist! 🖌️"],
  move:   ["You did all the moves! 💪", "Super dancer right there! 🕺", "Look at those awesome moves! 🤸"],
  sing:   ["I heard you singing along! 🎵", "What a beautiful voice! 🎶", "You're a superstar! ⭐"],
  watch:  ["You watched the whole thing! 🎬", "Great job paying attention! 👀", "Movie time champion! 🍿"],
};

const COLORS: Record<string, string> = {
  story:  "border-amber-200 bg-amber-50",
  read:   "border-amber-200 bg-amber-50",
  color:  "border-orange-200 bg-orange-50",
  move:   "border-pink-200 bg-pink-50",
  sing:   "border-purple-200 bg-purple-50",
  watch:  "border-indigo-200 bg-indigo-50",
};

const TEXT_COLORS: Record<string, string> = {
  story:  "text-amber-800",
  read:   "text-amber-800",
  color:  "text-orange-800",
  move:   "text-pink-800",
  sing:   "text-purple-800",
  watch:  "text-indigo-800",
};

interface NimiReactionProps {
  missionType: string;
}

export default function NimiReaction({ missionType }: NimiReactionProps) {
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const reactions = REACTIONS[missionType] ?? REACTIONS.story;
  // deterministic pick from the list (no random so it doesn't re-render differently on re-mount)
  const reaction = reactions[0];
  const borderBg = COLORS[missionType] ?? "border-emerald-200 bg-emerald-50";
  const textColor = TEXT_COLORS[missionType] ?? "text-emerald-800";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...SPRING.card, delay: 0.1 }}
      className="flex items-center gap-3"
    >
      <motion.img
        src={assets.nimiCircle}
        alt="Nimi"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        className="w-14 h-14 rounded-full border-4 border-yellow-300 shadow-lg flex-shrink-0"
      />
      <div className={`relative flex-1 leaf border ${borderBg} px-4 py-3 shadow-sm`}>
        {/* Speech tail */}
        <div className="absolute left-[-6px] top-[14px] w-3 h-3 rotate-45 border-l border-b border-inherit bg-inherit" style={{ borderColor: "inherit" }} />
        <p className={`font-baloo font-black text-[15px] ${textColor} leading-snug`}>{reaction}</p>
      </div>
    </motion.div>
  );
}
