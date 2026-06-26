"use client";

import { Check, Download, ExternalLink, FileText } from "lucide-react";
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
  const pdfUrl = mission.media_url ? getStorageUrl(mission.media_url) : null;

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <p className="font-baloo font-black text-white text-[20px]">{mission.title}</p>
        {mission.subtitle && <p className="font-nunito theme-text text-[14px] mt-1">{mission.subtitle}</p>}
      </div>

      {pdfUrl ? (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-100">
            <span className="font-nunito font-bold text-gray-700 text-[13px] truncate">📖 {mission.title}</span>
            <div className="flex gap-2 shrink-0">
              <a href={pdfUrl} download className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition">
                <Download className="w-3 h-3" /> Download
              </a>
              <a href={pdfUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition">
                <ExternalLink className="w-3 h-3" /> Open
              </a>
            </div>
          </div>
          <iframe src={pdfUrl} className="w-full h-[480px]" title={mission.title} />
        </div>
      ) : (
        <div className="theme-card-hover rounded-2xl border theme-border p-8 text-center">
          <div className="w-16 h-16 theme-accent/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText className="w-8 h-8 theme-text-muted" />
          </div>
          <p className="font-baloo font-black text-white text-[18px]">{t("pdfComingSoon")}</p>
          <p className="font-nunito theme-text-muted text-[13px] mt-1">{t("comingSoonTeacher")}</p>
          <p className="font-nunito theme-text-muted text-[12px] mt-2">{t("comingSoonComplete")}</p>
        </div>
      )}

      {!completed ? (
        <button onClick={onComplete} disabled={saving}
          className="w-full font-baloo font-black bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-[18px] rounded-full py-4 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50 transition">
          {saving ? t("saving") : <><Check className="w-5 h-5" /> {t("iReadItBtn")}</>}
        </button>
      ) : (
        <MissionCompleteBanner />
      )}
    </div>
  );
}
