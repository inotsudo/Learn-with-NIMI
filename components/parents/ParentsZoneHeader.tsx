"use client";

import { ChevronDown, ImagePlus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  onUploadClick?: () => void;
}

export default function ParentsZoneHeader({ onUploadClick }: Props) {
  const { t } = useLanguage();

  return (
    <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
      <div>
        <h1 className="font-black text-2xl sm:text-3xl text-white">{t("navParentsZone")}</h1>
        <p className="text-purple-200 text-sm mt-1">{t("parentsZoneSubtitle")}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {onUploadClick && (
          <button
            onClick={onUploadClick}
            className="flex items-center gap-1.5 bg-purple-600 text-white font-black rounded-full px-4 py-2 shadow hover:bg-purple-700 transition text-sm"
          >
            <ImagePlus className="w-4 h-4" />
            {t("uploadArtworkBtn")}
          </button>
        )}
        <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur border-2 border-white/15 rounded-full px-4 py-2 shadow-sm text-sm font-bold text-purple-100">
          <span>{t("thisWeek")}</span>
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
