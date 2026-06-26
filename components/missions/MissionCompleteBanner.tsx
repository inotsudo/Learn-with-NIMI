"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const CONFETTI = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  delay: Math.random() * 0.5,
  color: ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#DDA0DD", "#FF9800", "#E91E63"][i % 8],
}));

interface Props {
  storySlug?: string;
}

export default function MissionCompleteBanner({ storySlug }: Props) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200 }}
      className="relative theme-card border-2 border-green-400/30 rounded-[24px] p-6 text-center overflow-hidden"
    >
      {CONFETTI.map(c => (
        <motion.div key={c.id}
          className="absolute w-2 h-2 rounded-full"
          style={{ left: `${c.x}%`, backgroundColor: c.color }}
          initial={{ top: "-5%", opacity: 1 }}
          animate={{ top: "110%", opacity: [1, 1, 0], rotate: 360 }}
          transition={{ duration: 2, delay: c.delay, ease: "easeIn" }}
        />
      ))}

      <div className="relative z-10">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, delay: 0.2 }}>
          <img src="/assets/star-mascot.svg" alt="" className="w-14 h-14 mx-auto mb-2" />
        </motion.div>

        <motion.p initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
          className="font-baloo font-black text-green-400 text-[24px]">
          Mission Complete! 🎉
        </motion.p>

        <motion.p initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}
          className="font-nunito theme-text text-[14px] mt-1">
          Great job! You earned stars for this mission!
        </motion.p>

        {storySlug && (
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }}>
            <Link href={`/stories/${storySlug}`}
              className="inline-flex items-center gap-2 mt-4 font-baloo font-black bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[16px] rounded-full px-6 py-3 shadow-lg">
              Continue Adventure →
            </Link>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
