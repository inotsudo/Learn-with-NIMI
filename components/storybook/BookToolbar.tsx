"use client";

import { X } from "lucide-react";
import { useStoryBook } from "./StoryBookContext";

interface Props {
  title: string;
  onExit?: () => void;
}

export default function BookToolbar({ title, onExit }: Props) {
  const { currentPage, totalPages } = useStoryBook();
  const progress = totalPages > 1 ? ((currentPage + 1) / totalPages) * 100 : 100;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      {onExit && (
        <button onClick={onExit}
          className="w-9 h-9 rounded-full bg-white/10 backdrop-blur border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 transition shrink-0">
          <X size={18} />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-baloo font-bold text-white text-[14px] truncate">{title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <div className="flex-1 bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }} />
          </div>
          <span className="text-white/30 text-[10px] font-bold shrink-0">{currentPage + 1}/{totalPages}</span>
        </div>
      </div>
    </div>
  );
}
