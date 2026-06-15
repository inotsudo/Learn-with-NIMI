"use client";

import { motion } from "framer-motion";
import { Settings, Plus, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Child } from "@/lib/queries";

const AVATAR_COLORS = [
  "from-pink-400 to-rose-500",
  "from-purple-400 to-indigo-500",
  "from-yellow-400 to-orange-500",
  "from-green-400 to-teal-500",
  "from-blue-400 to-cyan-500",
  "from-fuchsia-400 to-pink-500",
];

interface Props {
  children: Child[];
  onSelect: (child: Child) => void;
  onAddChild: () => void;
}

export default function WhoIsPlaying({ children, onSelect, onAddChild }: Props) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">

      {/* Background sparkles */}
      {[...Array(20)].map((_, i) => (
        <motion.div key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-white/20"
          style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
          animate={{ opacity: [0.1, 0.6, 0.1], scale: [0.8, 1.4, 0.8] }}
          transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
        />
      ))}

      {/* NIMI logo */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="flex items-center gap-3 mb-2"
      >
        <img src="/nimi-logo-circle.png" alt="NIMI"
          className="w-14 h-14 rounded-full border-3 border-yellow-300 shadow-xl" />
        <div>
          <p className="font-black text-3xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-yellow-200 to-cyan-300">
            NIMIPIKO
          </p>
          <p className="text-purple-300 text-[11px] font-semibold tracking-widest uppercase">
            Where Stories Come to Life
          </p>
        </div>
        <img src="/piko-logo-circle.png.png" alt="PIKO"
          className="w-14 h-14 rounded-full border-3 border-blue-300 shadow-xl" />
      </motion.div>

      {/* Who's playing? */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-white text-2xl sm:text-3xl font-black mb-8 mt-4 tracking-wide drop-shadow-lg text-center"
      >
        Who&apos;s playing today? 🌟
      </motion.p>

      {/* Child cards */}
      <div className={`grid gap-5 mb-8 ${
        children.length === 1 ? "grid-cols-1" :
        children.length === 2 ? "grid-cols-2" :
        children.length <= 4 ? "grid-cols-2 sm:grid-cols-2" :
        "grid-cols-2 sm:grid-cols-3"
      }`}>
        {children.map((child, idx) => (
          <motion.button
            key={child.id}
            onClick={() => onSelect(child)}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 * idx + 0.3, type: "spring", stiffness: 260, damping: 20 }}
            whileHover={{ scale: 1.06, y: -4 }}
            whileTap={{ scale: 0.94 }}
            className="flex flex-col items-center gap-3 group"
          >
            {/* Avatar circle */}
            <div className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} flex items-center justify-center shadow-2xl border-4 border-white/30 group-hover:border-white/60 transition-all`}>
              {child.avatar_url && child.avatar_url.startsWith("http") ? (
                <img src={child.avatar_url} alt={child.name}
                  className="w-full h-full rounded-full object-cover" />
              ) : child.avatar_url ? (
                <span className="text-5xl sm:text-6xl select-none">{child.avatar_url}</span>
              ) : (
                <span className="text-5xl sm:text-6xl select-none">
                  {["🦁","🐧","🦊","🐬","🦋","🐸"][idx % 6]}
                </span>
              )}
            </div>

            {/* Name badge */}
            <div className="bg-white/15 backdrop-blur px-5 py-1.5 rounded-full border border-white/20">
              <p className="text-white font-black text-base sm:text-lg tracking-wide">
                {child.name}
              </p>
            </div>

            {/* Stars row */}
            <div className="flex gap-0.5">
              {[...Array(3)].map((_, s) => (
                <Star key={s} className="w-3.5 h-3.5 fill-yellow-300 text-yellow-300 drop-shadow" />
              ))}
            </div>
          </motion.button>
        ))}

        {/* Add new child card */}
        <motion.button
          onClick={onAddChild}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 * children.length + 0.3, type: "spring" }}
          whileHover={{ scale: 1.06, y: -4 }}
          whileTap={{ scale: 0.94 }}
          className="flex flex-col items-center gap-3 group"
        >
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-white/10 border-4 border-dashed border-white/30 group-hover:border-white/60 flex items-center justify-center transition-all">
            <Plus className="w-10 h-10 text-white/60 group-hover:text-white transition-colors" />
          </div>
          <div className="bg-white/10 backdrop-blur px-5 py-1.5 rounded-full border border-white/20">
            <p className="text-white/70 font-bold text-base group-hover:text-white transition-colors">
              Add child
            </p>
          </div>
        </motion.button>
      </div>

      {/* Parent zone button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        onClick={() => router.push("/parents")}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white/60 hover:text-white text-xs font-semibold transition-all"
      >
        <Settings className="w-3.5 h-3.5" />
        Parent Zone
      </motion.button>
    </div>
  );
}
