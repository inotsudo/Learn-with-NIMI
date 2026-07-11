"use client";

import { motion } from "framer-motion";
import { DURATION, SPRING } from "@/lib/design-system/motion";

interface Props {
  assets: { nimiCircle: string; pikoCircle: string };
}

const CHARS = (assets: Props["assets"]) => [
  { img: assets.nimiCircle, name: "Nimi", desc: "Joyful explorer who loves stories",   border: "border-green-400", bg: "from-green-400 to-emerald-500" },
  { img: assets.pikoCircle, name: "Piko", desc: "Curious robot who loves creativity",  border: "border-blue-400",  bg: "from-blue-400 to-indigo-500"   },
  { img: null,              name: "Zilo", desc: "Nature guardian with grass hair 🌿",  border: "border-lime-400",  bg: "from-lime-400 to-green-500"    },
];

export default function MeetCharactersCard({ assets }: Props) {
  const chars = CHARS(assets);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={SPRING.card}
      className="bg-white border border-ds-border rounded-2xl p-5 shadow-sm">
      <p className="font-baloo font-black text-gray-800 text-center text-[17px] mb-4">Meet Your Story Friends! 👋</p>
      <div className="flex gap-3 justify-center">
        {chars.map((c, idx) => (
          <motion.div key={c.name}
            initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ ...SPRING.bounce, delay: idx * 0.12 }}
            className="flex flex-col items-center gap-2 flex-1">
            <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: DURATION.loopBase, repeat: Infinity, delay: idx * 0.4 }}
              className={`w-16 h-16 rounded-full bg-gradient-to-br ${c.bg} border-4 ${c.border} shadow-lg flex items-center justify-center overflow-hidden`}>
              {c.img
                ? <img src={c.img} alt={c.name} className="w-full h-full object-cover rounded-full" loading="lazy" />
                : <span className="text-2xl">🌿</span>
              }
            </motion.div>
            <p className="font-baloo font-black text-gray-800 text-[14px]">{c.name}</p>
            <p className="font-nunito text-gray-500 text-[10px] text-center leading-tight">{c.desc}</p>
          </motion.div>
        ))}
      </div>
      <p className="font-nunito text-center text-green-700 text-[11px] font-bold mt-4 bg-green-50 rounded-full py-1.5 px-3">
        They will guide you through every adventure! 🌟
      </p>
    </motion.div>
  );
}
