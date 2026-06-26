"use client";

import { Check, Play } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";
import type { Mission } from "@/lib/queries";
import { useLanguage } from "@/contexts/LanguageContext";
import MissionCompleteBanner from "./MissionCompleteBanner";

interface WatchContentProps {
  mission: Mission;
  onComplete: () => void;
  completed: boolean;
  saving: boolean;
}

export default function WatchContent({ mission, onComplete, completed, saving }: WatchContentProps) {
  const { t } = useLanguage();
  const videoUrl = mission.media_url ? getStorageUrl(mission.media_url) : null;

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <p className="font-baloo font-black text-white text-[20px]">{mission.title}</p>
        {mission.subtitle && <p className="font-nunito theme-text text-[14px] mt-1">{mission.subtitle}</p>}
      </div>

      {videoUrl ? (
        <div className="bg-black rounded-2xl overflow-hidden shadow-2xl">
          <video src={videoUrl} controls playsInline onEnded={onComplete} className="w-full rounded-2xl" />
        </div>
      ) : (
        <div className="theme-card-hover rounded-2xl border theme-border p-8 text-center">
          <div className="w-16 h-16 theme-accent/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Play className="w-8 h-8 theme-text-muted" />
          </div>
          <p className="font-baloo font-black text-white text-[18px]">{t("videoComingSoon")}</p>
          <p className="font-nunito theme-text-muted text-[13px] mt-1">{t("comingSoonTeacher")}</p>
          <p className="font-nunito theme-text-muted text-[12px] mt-2">{t("comingSoonComplete")}</p>
        </div>
      )}

      {!completed ? (
        <button onClick={onComplete} disabled={saving}
          className="w-full font-baloo font-black bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[18px] rounded-full py-4 shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 disabled:opacity-50 transition">
          {saving ? t("saving") : <><Check className="w-5 h-5" /> {t("iWatchedItBtn")}</>}
        </button>
      ) : (
        <MissionCompleteBanner />
      )}
    </div>
  );
}
