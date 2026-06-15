"use client";

import { Button } from "@/components/ui/button";
import { Check, Download, ExternalLink } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";
import type { Mission } from "@/lib/queries";
import { useLanguage } from "@/contexts/LanguageContext";
import MissionCompleteBanner from "./MissionCompleteBanner";

interface ReadContentProps {
  mission: Mission;
  onComplete: () => void;
  completed: boolean;
  saving: boolean;
}

export default function ReadContent({ mission, onComplete, completed, saving }: ReadContentProps) {
  const { t } = useLanguage();
  const pdfUrl = getStorageUrl(mission.media_url);

  return (
    <div className="space-y-4">
      {mission.subtitle && (
        <p className="text-gray-600 font-bold text-sm text-center">{mission.subtitle}</p>
      )}

      {pdfUrl && (
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border-2 border-cyan-100">
          <div className="bg-cyan-50 px-4 py-3 flex items-center justify-between border-b border-cyan-100 gap-2">
            <span className="font-black text-cyan-700 text-sm truncate">📖 {mission.title}</span>
            <div className="flex gap-2 shrink-0">
              <a href={pdfUrl} download
                className="flex items-center gap-1 text-xs font-bold text-cyan-700 bg-cyan-100 hover:bg-cyan-200 px-2.5 py-1.5 rounded-full transition">
                <Download className="w-3 h-3" /> {t("download")}
              </a>
              <a href={pdfUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-xs font-bold text-cyan-700 bg-cyan-100 hover:bg-cyan-200 px-2.5 py-1.5 rounded-full transition">
                <ExternalLink className="w-3 h-3" /> {t("openLabel")}
              </a>
            </div>
          </div>
          <iframe src={pdfUrl} className="w-full h-[480px]" title={mission.title} />
        </div>
      )}

      {!completed ? (
        <Button onClick={onComplete} disabled={saving}
          className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-black text-lg rounded-full py-4 shadow-lg flex items-center justify-center gap-2 disabled:opacity-70">
          {saving ? t("savingLabel") : <><Check className="w-5 h-5" /> {t("iReadItBtn")}</>}
        </Button>
      ) : (
        <MissionCompleteBanner />
      )}
    </div>
  );
}
