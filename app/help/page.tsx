"use client";

import Image from "next/image";
import AppShell from "@/components/layout/AppShell";
import { PageSurface, HeroBanner } from "@/components/layout/primitives";
import { motion } from "framer-motion";
import { DURATION, EASE } from "@/lib/design-system/motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import HelpActionCards from "@/components/help/HelpActionCards";
import PopularQuestionsCard from "@/components/help/PopularQuestionsCard";
import SupportBanner from "@/components/help/SupportBanner";
export default function HelpSupportPage() {
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);

  return (
    <AppShell>
      <PageSurface>
        <main className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 flex-1 w-full">
          {/* Hero */}
          <HeroBanner zone="communitySquare" className="mb-4">
            <div className="relative z-10 p-5 flex items-center gap-4">
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: DURATION.loopFloat, repeat: Infinity, ease: EASE.standard }}>
                <Image src={assets.nimiCircle} alt="NIMI" width={80} height={80} className="rounded-full object-cover border-4 border-white/50 shadow-lg" />
              </motion.div>
              <div className="flex-1">
                <h1 className="font-baloo font-black text-white text-[24px] sm:text-[30px] leading-tight">{t("helpSupportTitle")}</h1>
                <p className="text-white/80 text-sm mt-1">{t("helpSupportSubtitle")}</p>
              </div>
            </div>
          </HeroBanner>

          <div className="mt-4">
            <HelpActionCards />
          </div>

          <div className="mt-4">
            <PopularQuestionsCard />
          </div>

          <div className="mt-4">
            <SupportBanner />
          </div>
        </main>
      </PageSurface>
    </AppShell>
  );
}
