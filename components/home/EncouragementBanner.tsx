"use client";

import { motion } from "framer-motion";

interface Props { childName: string; }

const ACTIVITIES = [
  { emoji: "📖", label: "Read" },
  { emoji: "🎵", label: "Sing" },
  { emoji: "🎨", label: "Create" },
  { emoji: "🤸", label: "Move" },
  { emoji: "🎬", label: "Watch" },
];

export default function EncouragementBanner({ childName }: Props) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-purple-600/25 to-indigo-600/15 border theme-border rounded-[20px] p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4">
      <motion.div className="relative shrink-0"
        animate={{ y: [0, -3, 0] }} transition={{ duration: 3, repeat: Infinity }}>
        <img src="/nimi-logo-circle.png" alt="NIMI"
          className="w-14 h-14 rounded-full border-[3px] theme-border-strong/40 shadow-xl shadow-purple-500/20" />
        <div className="absolute -bottom-1 -right-1 w-5 h-5 theme-accent rounded-full border-2 border-[#1a1040] flex items-center justify-center">
          <span className="text-[8px]">💬</span>
        </div>
      </motion.div>
      <div className="flex-1 text-center sm:text-left">
        <h3 className="font-black text-white text-[15px]">
          You&apos;re doing amazing, {childName}!
        </h3>
        <p className="theme-text-faint text-[12px] mt-0.5">
          Keep learning, keep smiling, and remember… you can do big things! 😊
        </p>
      </div>
      <div className="flex gap-2.5 shrink-0">
        {ACTIVITIES.map((a, i) => (
          <motion.div key={a.label}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.07, type: "spring", stiffness: 300 }}
            className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 bg-white/[0.06] border border-white/[0.1] rounded-xl flex items-center justify-center text-lg">
              {a.emoji}
            </div>
            <span className="text-[8px] font-bold theme-text-faint">{a.label}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
