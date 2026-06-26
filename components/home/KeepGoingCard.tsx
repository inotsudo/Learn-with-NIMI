"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

export default function KeepGoingCard() {
  return (
    <div className="bg-gradient-to-b from-purple-600/15 to-indigo-600/10 border theme-border rounded-[20px] p-4 flex flex-col items-center text-center justify-center h-full relative overflow-hidden">
      <motion.span className="absolute top-3 right-3 text-yellow-400/30 text-[10px]"
        animate={{ opacity: [0.2, 0.7, 0.2] }} transition={{ duration: 2, repeat: Infinity }}>✦</motion.span>

      <div className="bg-green-500/15 border border-green-400/25 rounded-xl px-3 py-1.5 mb-3">
        <h3 className="font-black text-green-300 text-[11px] tracking-wide">Keep Going!</h3>
      </div>

      <p className="theme-text-faint text-[10px] leading-snug max-w-[120px]">
        Every story you complete makes you a star!
      </p>

      <motion.div animate={{ y: [0, -4, 0], rotate: [0, 3, -3, 0] }}
        transition={{ duration: 3, repeat: Infinity }} className="mt-3 relative">
        <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-500/20 border border-yellow-300/30">
          <Star className="w-6 h-6 text-white fill-white" />
        </div>
        <motion.span className="absolute -top-1 -right-1 text-yellow-300/60 text-[10px]"
          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}>✦</motion.span>
      </motion.div>

      <motion.img src="/nimi-logo-circle.png" alt="NIMI"
        className="w-9 h-9 rounded-full border-2 border-yellow-400/50 shadow-md mt-2"
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 2, repeat: Infinity, delay: 1 }} />
    </div>
  );
}
