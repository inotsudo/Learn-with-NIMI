"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { SPRING, DURATION } from "@/lib/design-system/motion";
import { Settings, Plus, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Child } from "@/lib/queries";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import ChildAvatar from "@/components/avatar/ChildAvatar";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { getThemeEffects } from "@/lib/design-system/themeEffects";

const AVATAR_COLORS = [
  "from-pink-400 to-rose-500",
  "from-green-500 to-emerald-600",
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
  const { themeId, theme } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const effects = getThemeEffects(themeId);
  const m = useThemeMotion();

  return (
    <div className={`min-h-screen bg-gradient-to-b ${theme.gradients.pageBg} flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden`}>

      {/* Background sparkles */}
      {[...Array(20)].map((_, i) => (
        <motion.div key={i}
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            backgroundColor: effects.particles.colors[i % effects.particles.colors.length],
            opacity: 0.4,
          }}
          animate={{ opacity: [0.1, 0.6, 0.1], scale: [0.8, 1.4, 0.8] }}
          transition={{ duration: DURATION.loopBase + Math.random() * DURATION.loopBase, repeat: Infinity, delay: Math.random() * 2 }}
        />
      ))}

      {/* NIMI logo */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: DURATION.slow }}
        className="flex items-center gap-3 mb-2"
      >
        <Image src={assets.nimiCircle} alt="NIMI" width={56} height={56}
          className="rounded-full border-3 border-yellow-300 shadow-xl" />
        <div>
          <p className="font-black text-3xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-yellow-200 to-cyan-300">
            NIMIPIKO
          </p>
          <p className="text-gray-500 text-[11px] font-semibold tracking-widest uppercase">
            Where Stories Come to Life
          </p>
        </div>
        <Image src={assets.pikoCircle} alt="PIKO" width={56} height={56}
          className="rounded-full border-3 border-blue-300 shadow-xl" />
      </motion.div>

      {/* Who's playing? */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DURATION.base, delay: 0.2 }}
        className="text-gray-900 text-2xl sm:text-3xl font-black mb-8 mt-4 tracking-wide text-center"
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
            transition={{ ...SPRING.gentle, delay: 0.1 * idx + 0.3 }}
            whileHover={m.cardHover}
            whileTap={m.dangerPress}
            className="flex flex-col items-center gap-3 group"
          >
            {/* Avatar circle */}
            <div className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} flex items-center justify-center shadow-2xl border-4 border-white/50 group-hover:border-white transition-all overflow-hidden`}>
              <ChildAvatar avatarUrl={child.avatar_url} name={child.name} size={128} />
            </div>

            {/* Name badge */}
            <div className="bg-white shadow-sm px-5 py-1.5 rounded-full border border-ds-border">
              <p className="text-gray-900 font-black text-base sm:text-lg tracking-wide">
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
          transition={{ ...SPRING.bounce, delay: 0.1 * children.length + 0.3 }}
          whileHover={m.cardHover}
          whileTap={m.dangerPress}
          className="flex flex-col items-center gap-3 group"
        >
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gray-50 border-4 border-dashed border-gray-300 group-hover:border-gray-400 flex items-center justify-center transition-all">
            <Plus className="w-10 h-10 text-gray-400 group-hover:text-gray-600 transition-colors" />
          </div>
          <div className="bg-white shadow-sm px-5 py-1.5 rounded-full border border-ds-border">
            <p className="text-gray-500 font-bold text-base group-hover:text-gray-700 transition-colors">
              Add child
            </p>
          </div>
        </motion.button>
      </div>

      {/* Parent zone button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: DURATION.base, delay: 0.8 }}
        onClick={() => router.push("/parents")}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-gray-50 border border-ds-border text-gray-500 hover:text-gray-700 text-xs font-semibold transition-all shadow-sm"
      >
        <Settings className="w-3.5 h-3.5" />
        Parent Zone
      </motion.button>
    </div>
  );
}
