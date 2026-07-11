"use client";

import { BookOpen, X } from "lucide-react";
import { useStoryBook } from "./StoryBookContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";

interface Props {
  title: string;
  onExit?: () => void;
}

export default function BookToolbar({ title, onExit }: Props) {
  const { currentPage, totalPages } = useStoryBook();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const progress = totalPages > 1 ? ((currentPage + 1) / totalPages) * 100 : 100;

  return (
    <div className="mb-3 leaf border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-amber-50 px-3 py-2.5 shadow-sm">
      <div className="flex items-center gap-3">
        {onExit && (
          <button onClick={onExit}
            className="w-9 h-9 rounded-full bg-white border border-ds-border flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition shrink-0 shadow-sm">
            <X size={18} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="rounded-full bg-white p-1.5 shadow-sm">
              <BookOpen className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div className="relative flex-1">
              <img src={assets.reader.chapterHeader} alt="" aria-hidden="true"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none opacity-[0.18]"  loading="lazy" />
              <p className="relative font-baloo font-bold text-ds-text text-[14px] truncate">{title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="relative flex-1 bg-white/80 rounded-full h-1.5 overflow-hidden border border-emerald-100">
              <img src={assets.reader.progress} alt="" aria-hidden="true"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none opacity-[0.45]"  loading="lazy" />
              <div className={`relative h-full bg-gradient-to-r ${assets.storyCard.progressFill} rounded-full transition-all duration-500`}
                style={{ width: `${progress}%` }} />
            </div>
            <span className="text-ds-muted text-[10px] font-bold shrink-0">{currentPage + 1}/{totalPages}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
