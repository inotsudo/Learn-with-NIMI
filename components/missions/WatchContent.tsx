"use client";

import { Button } from "@/components/ui/button";
import { Check, Star } from "lucide-react";
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
  const videoUrl = getStorageUrl(mission.media_url);

  return (
    <div className="space-y-4">
      {videoUrl && (
        <div className="bg-black rounded-3xl overflow-hidden shadow-2xl">
          <video src={videoUrl} controls playsInline
            onEnded={onComplete}
            className="w-full rounded-3xl" />
        </div>
      )}

      {mission.subtitle && (
        <div className="bg-white rounded-2xl p-4 border-2 border-green-100 shadow-sm flex items-start gap-2">
          <Star className="w-5 h-5 text-green-600 fill-green-100 shrink-0 mt-0.5" />
          <p className="text-gray-600 text-sm leading-relaxed">{mission.subtitle}</p>
        </div>
      )}

      {!completed ? (
        <Button onClick={onComplete} disabled={saving}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-black text-lg rounded-full py-4 shadow-lg flex items-center justify-center gap-2 disabled:opacity-70">
          {saving ? t("savingLabel") : <><Check className="w-5 h-5" /> {t("markCompleteBtn")}</>}
        </Button>
      ) : (
        <MissionCompleteBanner />
      )}
    </div>
  );
}
