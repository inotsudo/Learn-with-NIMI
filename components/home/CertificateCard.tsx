"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Lock } from "lucide-react";

interface Props {
  storyTitle: string;
  storySlug: string;
  childName: string;
  isComplete: boolean;
  missionsComplete: number;
  totalMissions: number;
}

const CONFETTI_COLORS = [
  "bg-red-400", "bg-blue-400", "bg-green-400", "bg-yellow-400",
  "bg-pink-400", "theme-accent-muted", "bg-orange-400", "bg-cyan-400",
  "bg-red-500", "bg-blue-500", "bg-green-500", "bg-amber-400",
];

const CONFETTI_POS = [
  "top-[5%] left-[8%]", "top-[3%] left-[25%]", "top-[7%] left-[45%]", "top-[4%] right-[20%]", "top-[6%] right-[8%]",
  "top-[15%] left-[5%]", "top-[12%] right-[12%]", "top-[20%] left-[18%]", "top-[18%] right-[25%]",
  "bottom-[25%] left-[10%]", "bottom-[20%] right-[8%]", "bottom-[30%] left-[30%]",
  "bottom-[15%] left-[5%]", "bottom-[10%] right-[15%]", "bottom-[8%] left-[22%]",
];

function CertificateVisual({ storyTitle, earned }: { storyTitle: string; earned: boolean }) {
  return (
    <div className={`relative theme-card rounded-2xl border-2 theme-border overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)]`}>
      {/* Confetti */}
      {earned && CONFETTI_POS.map((pos, i) => (
        <motion.div key={i}
          className={`absolute w-1.5 h-1.5 rounded-full ${CONFETTI_COLORS[i % CONFETTI_COLORS.length]} ${pos}`}
          animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.3, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.2 }} />
      ))}

      <div className="relative z-10 py-4 px-5 text-center">
        <img src="/story-complete.png" alt="Story Complete!"
          className={`h-[28px] sm:h-[36px] w-auto mx-auto mb-2 drop-shadow-lg ${earned ? "" : "grayscale opacity-50"}`} />

        <p className="text-yellow-300 text-[14px] sm:text-[16px] font-black">Congratulations!</p>
        <p className="theme-text text-[10px] sm:text-[11px] font-bold">You earned your</p>
        <p className="text-white text-[18px] sm:text-[22px] font-black mt-0.5">STORY CERTIFICATE</p>

        <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-purple-400/40 to-transparent mx-auto my-2" />

        <p className="theme-text-muted text-[9px] font-bold">Story:</p>
        <p className="text-yellow-300 text-[12px] sm:text-[14px] font-black uppercase">{storyTitle}</p>

        {/* Mission icons */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-3">
          {["flipflop", "pdf", "coloring", "move", "sing", "video"].map(icon => (
            <div key={icon} className="relative">
              <img src={`/assets/icon-${icon}.svg`} alt="" className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg shadow" />
              {earned && <CheckCircle2 className="absolute -top-0.5 -right-0.5 w-3 h-3 text-green-600 bg-green-100 rounded-full" />}
            </div>
          ))}
        </div>

        {/* Star medal */}
        <motion.img src="/assets/star-mascot.svg" alt=""
          className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mt-3 drop-shadow-lg"
          animate={earned ? { scale: [1, 1.08, 1], rotate: [0, 3, -3, 0] } : {}}
          transition={{ duration: 3, repeat: Infinity }} />

        {/* Characters + Signatures */}
        <div className="flex items-end justify-between mt-3 px-1 sm:px-4">
          <div className="flex flex-col items-center gap-0.5">
            <img src="/nimi-logo-circle.png" alt="NIMI" className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-yellow-400 shadow-lg" />
            <p className="theme-text-muted text-[7px]">Signed:</p>
            <p className="theme-text text-[9px] sm:text-[10px] font-black italic">Nimi 💜</p>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <img src="/piko-logo-circle.png.png" alt="PIKO" className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-blue-400 shadow-lg" />
            <p className="theme-text-muted text-[7px]">Signed:</p>
            <p className="theme-text text-[9px] sm:text-[10px] font-black italic">Piko 💜</p>
          </div>
        </div>
      </div>

      {/* Lock overlay for teaser */}
      {!earned && (
        <div className="absolute inset-0 theme-bg/40 flex items-center justify-center z-20 rounded-2xl">
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}
            className="w-14 h-14 theme-card-active backdrop-blur rounded-full flex items-center justify-center border-2 theme-border-strong/30 shadow-xl">
            <Lock className="w-7 h-7 theme-text-muted" />
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default function CertificateCard({ storyTitle, storySlug, childName, isComplete, missionsComplete, totalMissions }: Props) {

  if (isComplete) {
    return (
      <Link href={`/stories/${storySlug}`}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.01 }}
          className="cursor-pointer max-w-2xl mx-auto">
          <CertificateVisual storyTitle={storyTitle} earned />
        </motion.div>
      </Link>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl max-w-2xl mx-auto">
      <CertificateVisual storyTitle={storyTitle} earned={false} />
      {/* Bottom overlay with progress */}
      <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-[#1c1055] via-[#1c1055]/95 to-transparent rounded-b-2xl p-4 pt-10">
        <div className="text-center">
          <p className="text-yellow-300 text-[16px] sm:text-[18px] font-black">
            {missionsComplete === 0 ? "Complete missions to earn this!" : `${totalMissions - missionsComplete} more to go!`}
          </p>
          <div className="flex items-center gap-2 justify-center mt-2">
            <div className="theme-darker rounded-full h-3 overflow-hidden flex-1 max-w-[200px]">
              <motion.div className="bg-gradient-to-r from-yellow-400 to-amber-500 h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${totalMissions > 0 ? (missionsComplete / totalMissions) * 100 : 0}%` }}
                transition={{ duration: 1 }} />
            </div>
            <span className="text-yellow-300 text-[14px] font-black">{missionsComplete}/{totalMissions}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
