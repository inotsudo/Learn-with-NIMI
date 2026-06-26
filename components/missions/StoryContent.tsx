"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { getStorageUrl } from "@/lib/queries";
import type { Mission, StoryPage } from "@/lib/queries";
import { useLanguage } from "@/contexts/LanguageContext";
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
}

export default function StoryContent({ mission, storyPages, onComplete, completed }: StoryContentProps) {
  const { t } = useLanguage();

  const storyData: StoryBookData = useMemo(() => {
    const pages: BookPage[] = storyPages.map(p => ({
      id: p.id,
      imageUrl: p.image_url ? getStorageUrl(p.image_url) : "",
      narrationAudio: p.audio_url ?? undefined,
    }));

    return {
      title: mission.title || t("todaysStoryLabel"),
      subtitle: mission.subtitle ?? undefined,
      pages,
    };
  }, [mission, storyPages, t]);

  if (storyPages.length === 0) {
    return (
      <div className="theme-card rounded-3xl p-8 text-center">
        <span className="text-5xl block mb-3">📖</span>
        <p className="font-baloo font-bold text-white text-[18px]">{t("noPagesTitle")}</p>
        <p className="theme-text-faint text-[13px] mt-1">{t("noPagesHint")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ minHeight: "70vh" }}>
      <StoryBook
        story={storyData}
        onComplete={onComplete}
        completed={completed}
      />
      {completed && <MissionCompleteBanner />}
    </div>
  );
}
