"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { getStorageUrl } from "@/lib/queries";
import type { Mission, StoryPage } from "@/lib/queries";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import MissionCompleteBanner from "./MissionCompleteBanner";
import type { StoryBookData, BookPage } from "../storybook/types";
import "../storybook/storybook.css";

const StoryBook = dynamic(() => import("../storybook/StoryBook"), { ssr: false });

interface StoryContentProps {
  mission: Mission;
  storyPages: StoryPage[];
  onComplete: () => void;
  completed: boolean;
  saving?: boolean;
  pagesLoading?: boolean;
}

// Book-shaped skeleton shown while pages fetch — matches the real StoryBook layout
function BookSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      {/* toolbar row */}
      <div className="leaf border border-emerald-100 bg-white/80 px-3 py-2.5 flex items-center gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-3 rounded-full bg-gray-200 w-2/3" />
          <div className="h-1.5 rounded-full bg-gray-100 w-full" />
        </div>
        <div className="h-3 w-8 rounded-full bg-gray-200 shrink-0" />
      </div>
      {/* page area — same 3/4 aspect ratio as MobilePageViewer */}
      <div
        className="w-full leaf-lg border border-amber-100 bg-[#faf6ee] flex items-center justify-center"
        style={{ aspectRatio: "3/4" }}
      >
        <div className="w-12 h-12 border-[3px] border-amber-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
      {/* controls row */}
      <div className="flex items-center justify-center gap-3 leaf border border-emerald-100 bg-white/80 py-3">
        {[48, 40, 64, 40, 48].map((s, i) => (
          <div key={i} className="rounded-full bg-gray-200" style={{ width: s, height: s }} />
        ))}
      </div>
    </div>
  );
}

export default function StoryContent({ mission, storyPages, onComplete, completed, pagesLoading }: StoryContentProps) {
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);

  const storyData: StoryBookData = useMemo(() => {
    const pages: BookPage[] = storyPages.map(p => ({
      id: p.id,
      imageUrl: p.image_url ? getStorageUrl(p.image_url) : "",
      narrationAudio: p.audio_url ?? undefined,
      text: p.text ?? undefined,
    }));

    return {
      title: mission.title || t("todaysStoryLabel"),
      subtitle: mission.subtitle ?? undefined,
      pages,
    };
  }, [mission, storyPages, t]);

  return (
    <div className="flex flex-col gap-4">
      {/* Story Time header — always visible, even while pages load */}
      <div className="relative overflow-hidden leaf border border-amber-200/60 bg-gradient-to-r from-amber-50/80 via-yellow-50/40 to-[#fffdf8] p-5 text-center shadow-sm">
        <div className="pointer-events-none absolute left-3 top-3 space-y-[5px] opacity-[0.12]">
          {[28, 22, 28, 20, 24].map((w, i) => (
            <div key={i} className="h-[1.5px] rounded-full bg-amber-700" style={{ width: w }} />
          ))}
        </div>
        <div className="pointer-events-none absolute right-3 top-3 space-y-[5px] opacity-[0.12]">
          {[28, 20, 28, 22, 24].map((w, i) => (
            <div key={i} className="h-[1.5px] rounded-full bg-amber-700" style={{ width: w }} />
          ))}
        </div>

        <motion.img
          src={assets.nimiHappy}
          alt="NIMI"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10 mx-auto mb-3 h-16 w-16 rounded-full border-4 border-yellow-300 object-cover shadow-md"
        />

        <div className="relative z-10 mb-2 flex items-center justify-center gap-2">
          <span className="select-none text-base">📚</span>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">
            {t("storyTime")}
          </span>
          <span className="select-none text-base">🎧</span>
        </div>

        <p className="relative z-10 font-baloo font-black text-[18px] text-ds-text">{mission.title}</p>
        {mission.subtitle && (
          <p className="relative z-10 mt-1 text-center text-[13px] text-gray-500">{mission.subtitle}</p>
        )}
      </div>

      {pagesLoading ? (
        <BookSkeleton />
      ) : storyPages.length === 0 ? (
        <div className="leaf-lg border border-amber-100 bg-gradient-to-br from-amber-50/80 via-yellow-50/40 to-[#fffdf8] p-8 text-center shadow-[0_16px_34px_rgba(15,23,42,0.08)]">
          <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.5, repeat: Infinity }}
            className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm text-2xl select-none">
            📚
          </motion.div>
          <p className="font-baloo font-bold text-ds-text text-[18px]">{t("noPagesTitle")}</p>
          <p className="text-gray-500 text-[13px] mt-1">{t("noPagesHint")}</p>
        </div>
      ) : (
        <StoryBook
          story={storyData}
          onComplete={onComplete}
          completed={completed}
        />
      )}

      {completed && <MissionCompleteBanner />}
    </div>
  );
}
