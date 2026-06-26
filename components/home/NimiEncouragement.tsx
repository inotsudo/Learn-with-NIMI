"use client";

import { motion } from "framer-motion";

interface Props { childName: string; }

export default function NimiEncouragement({ childName }: Props) {
  return (
    <div className="relative theme-card border-2 theme-border rounded-[20px] overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)]">
      {/* Sparkle dots */}
      {[
        { top: "10%", left: "30%", delay: 0 }, { top: "20%", right: "25%", delay: 0.5 },
        { bottom: "15%", left: "50%", delay: 1 }, { top: "50%", right: "15%", delay: 1.5 },
        { bottom: "30%", left: "20%", delay: 0.8 },
      ].map(({ delay, ...pos }, i) => (
        <motion.span key={i} className="absolute text-yellow-400/30 text-[10px] pointer-events-none"
          style={pos}
          animate={{ opacity: [0.2, 0.7, 0.2], scale: [1, 1.4, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, delay }}>✦</motion.span>
      ))}

      <div className="relative z-10 p-5 sm:p-6 flex items-center gap-4">
        {/* LEFT — NIMI robot, ASSET: nimi-robot-waving.png */}
        <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity }}
          className="shrink-0" data-asset="nimi-robot-full-body-waving">
          <img src="/nimi-logo-circle.png" alt="NIMI"
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-[3px] theme-border-strong/50 shadow-xl" />
        </motion.div>

        {/* CENTER — message */}
        <div className="flex-1 min-w-0">
          <p className="font-black font-baloo text-yellow-300 text-[24px] sm:text-[28px] leading-tight">
            You&apos;re doing amazing, {childName}! 🌟
          </p>
          <p className="font-nunito theme-text text-[16px] mt-1.5 leading-snug">
            Keep learning, keep smiling, and remember...<br/>
            <span className="font-black text-white">you can do big things!</span> 💪
          </p>
        </div>

        {/* RIGHT — star characters + trophy, ASSETS: star-characters.png, small-trophy.png, piko-small.png */}
        <div className="hidden sm:flex items-end gap-3 shrink-0">
          <motion.img src="/assets/star-mascot.svg" alt="" className="w-12 h-12"
            animate={{ y: [0, -5, 0], rotate: [0, 8, 0] }} transition={{ duration: 2.5, repeat: Infinity }} />
          <motion.img src="/assets/trophy.svg" alt="" className="w-10 h-10"
            animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, delay: 0.3 }} />
          <motion.img src="/assets/star-mascot.svg" alt="" className="w-10 h-10"
            animate={{ y: [0, -4, 0], rotate: [0, -8, 0] }} transition={{ duration: 2.5, repeat: Infinity, delay: 0.6 }} />
          <motion.img src="/piko-logo-circle.png.png" alt="PIKO"
            className="w-10 h-10 rounded-full border-2 border-blue-400/50 shadow-lg"
            animate={{ y: [0, -3, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.8 }} />
        </div>
      </div>
    </div>
  );
}
