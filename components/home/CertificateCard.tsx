"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { CheckCircle2, Lock } from "lucide-react";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";

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
  "bg-pink-400", "bg-violet-400", "bg-orange-400", "bg-cyan-400",
  "bg-red-500", "bg-blue-500", "bg-green-500", "bg-amber-400",
];

const CONFETTI_POS = [
  "top-[5%] left-[8%]", "top-[3%] left-[25%]", "top-[7%] left-[45%]", "top-[4%] right-[20%]", "top-[6%] right-[8%]",
  "top-[15%] left-[5%]", "top-[12%] right-[12%]", "top-[20%] left-[18%]", "top-[18%] right-[25%]",
  "bottom-[25%] left-[10%]", "bottom-[20%] right-[8%]", "bottom-[30%] left-[30%]",
  "bottom-[15%] left-[5%]", "bottom-[10%] right-[15%]", "bottom-[8%] left-[22%]",
];

function CertificateVisual({ storyTitle, earned }: { storyTitle: string; earned: boolean }) {
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  return (
    <div className="relative overflow-hidden border border-[var(--ds-border-primary)]/60 bg-gradient-to-br from-white via-[var(--ds-brand-soft)]/35 to-white shadow-[0_16px_34px_rgba(15,23,42,0.08)]" style={{ borderRadius: 'var(--leaf-r)' }}>
      <div className="absolute inset-x-3 top-3 h-1 rounded-full bg-gradient-to-r from-[var(--ds-brand-primary)]/80 via-[var(--ds-brand-hover)]/70 to-transparent" />
      <img src={assets.rewards.certificateFrame} alt="" aria-hidden="true"
        className="absolute inset-0 w-full h-full object-fill pointer-events-none opacity-[0.07]"  loading="lazy" />

      {/* Confetti */}
      {earned && CONFETTI_POS.map((pos, i) => (
        <motion.div key={i}
          className={`absolute w-1.5 h-1.5 rounded-full ${CONFETTI_COLORS[i % CONFETTI_COLORS.length]} ${pos}`}
          animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.3, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.2 }} />
      ))}

      <div className="relative z-10 py-4 px-5 text-center">
        <img src={assets.storyComplete} alt="Story Complete!"
          className={`h-[28px] sm:h-[36px] w-auto mx-auto mb-2 drop-shadow-lg ${earned ? "" : "grayscale opacity-50"}`}  loading="lazy" />

        <p className="text-yellow-300 text-[14px] sm:text-[16px] font-black">{t("storyCertCongrats")}</p>
        <p className="text-ds-text text-[10px] sm:text-[11px] font-bold">{t("storyCertYouEarned")}</p>
        <p className="text-gray-900 text-[18px] sm:text-[22px] font-black mt-0.5">{t("storyCertTitle")}</p>

        <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-gray-300 to-transparent mx-auto my-2" />

        <p className="text-gray-400 text-[9px] font-bold">{t("storyCertStoryLabel")}</p>
        <p className="text-yellow-300 text-[12px] sm:text-[14px] font-black uppercase">{storyTitle}</p>

        {/* Mission icons */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-3">
          {["flipflop", "pdf", "coloring", "move", "sing", "video"].map(icon => (
            <div key={icon} className="relative">
              <img src={`/assets/icon-${icon}.svg`} alt="" className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg shadow"  loading="lazy" />
              {earned && <CheckCircle2 className="absolute -top-0.5 -right-0.5 w-3 h-3 text-[var(--ds-brand-primary)] bg-[var(--ds-brand-subtle)] rounded-full" />}
            </div>
          ))}
        </div>

        {/* Star medal */}
        <motion.img src={assets.starMascot} alt=""
          className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mt-3 drop-shadow-lg"
          animate={earned ? { scale: [1, 1.08, 1], rotate: [0, 3, -3, 0] } : {}}
          transition={{ duration: 3, repeat: Infinity }} />

        {/* Characters + Signatures */}
        <div className="flex items-end justify-between mt-3 px-1 sm:px-4">
          <div className="flex flex-col items-center gap-0.5">
            <img src={assets.nimiCircle} alt="NIMI" className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-yellow-400 shadow-lg"  loading="lazy" />
            <p className="text-gray-400 text-[7px]">{t("storyCertSigned")}</p>
            <p className="text-ds-text text-[9px] sm:text-[10px] font-black italic">Nimi 💜</p>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <img src={assets.pikoCircle} alt="PIKO" className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-blue-400 shadow-lg"  loading="lazy" />
            <p className="text-gray-400 text-[7px]">{t("storyCertSigned")}</p>
            <p className="text-ds-text text-[9px] sm:text-[10px] font-black italic">Piko 💜</p>
          </div>
        </div>
      </div>

      {/* Lock overlay for teaser */}
      {!earned && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-20" style={{ borderRadius: 'var(--leaf-r)' }}>
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}
            className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center border-2 border-gray-200 shadow-xl">
            <Lock className="w-7 h-7 text-gray-400" />
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default function CertificateCard({ storyTitle, storySlug, childName, isComplete, missionsComplete, totalMissions }: Props) {
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);

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
    <div className="relative overflow-hidden max-w-2xl mx-auto" style={{ borderRadius: 'var(--leaf-r)' }}>
      <CertificateVisual storyTitle={storyTitle} earned={false} />
      {/* Bottom overlay with progress */}
      <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-gray-900 via-gray-900/95 to-transparent rounded-b-2xl p-4 pt-10 shadow-[0_-8px_22px_rgba(15,23,42,0.18)]">
        <div className="text-center">
          <p className="text-yellow-300 text-[16px] sm:text-[18px] font-black">
            {missionsComplete === 0 ? t("storyCertCompleteToEarn") : t("storyCertMoreToGo").replace("{n}", String(totalMissions - missionsComplete))}
          </p>
          <div className="flex items-center gap-2 justify-center mt-2">
            <div className="bg-white/20 rounded-full h-3 overflow-hidden flex-1 max-w-[200px]">
              <motion.div className={`bg-gradient-to-r ${assets.storyCard.progressFill} h-full rounded-full`}
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
