"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect } from "react";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { playCelebration } from "@/lib/sounds";
import Link from "next/link";
import { SPRING, DURATION, EASE } from "@/lib/design-system/motion";
import RewardBurst from "@/components/delight/RewardBurst";
import AnimatedCheckmark from "@/components/delight/AnimatedCheckmark";
import { CONFETTI_BURST } from "@/lib/design-system/delight";

interface Props {
  storySlug?: string;
}

export default function MissionCompleteBanner({ storySlug }: Props) {
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  useEffect(() => { playCelebration(); }, []);

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={SPRING.modal}
      className="relative overflow-hidden leaf-lg border border-[var(--ds-brand-primary)]/30 bg-gradient-to-br from-white via-emerald-50/70 to-amber-50/60 p-6 text-center shadow-[0_16px_34px_rgba(15,23,42,0.08)]"
    >
      <Image src={assets.rewards.celebration} alt="" aria-hidden="true" fill
        className="object-cover pointer-events-none opacity-[0.06]" />

      <RewardBurst active config={CONFETTI_BURST} className="absolute inset-0" />

      <div className="relative z-10">
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ ...SPRING.gentle, delay: 0.2 }}
          className="relative w-14 h-14 mx-auto mb-2"
        >
          <Image src={assets.starMascot} alt="" width={56} height={56} className="w-14 h-14" />
          <Image src={assets.rewards.badgeFrame} alt="" aria-hidden="true" fill
            className="pointer-events-none opacity-60" />
        </motion.div>

        <AnimatedCheckmark className="mx-auto mb-2" />

        <motion.p
          initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: DURATION.base, ease: EASE.enter }}
          className="font-baloo font-black text-[var(--ds-brand-primary)] text-[24px]"
        >
          {t("storyMissionCompleteTitle")}
        </motion.p>

        <motion.p
          initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: DURATION.base, ease: EASE.enter }}
          className="font-nunito text-gray-600 text-[14px] mt-1"
        >
          {t("storyMissionCompleteDesc")}
        </motion.p>

        {storySlug && (
          <motion.div
            initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: DURATION.base, ease: EASE.enter }}
          >
            <Link
              href={`/stories/${storySlug}`}
              className="inline-flex items-center gap-2 mt-4 font-baloo font-black bg-[var(--ds-brand-primary)] hover:bg-[var(--ds-brand-hover)] text-white text-[16px] rounded-full px-6 py-3 shadow-lg transition"
            >
              {t("storyContinueArrow")}
            </Link>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
