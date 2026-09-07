"use client";

import { BookOpen, X } from "lucide-react";
import { useStoryBook } from "./StoryBookContext";

interface Props {
  title: string;
  onExit?: () => void;
}

export default function BookToolbar({ title, onExit }: Props) {
  const { currentPage, totalPages } = useStoryBook();
  const progress = totalPages > 1 ? ((currentPage + 1) / totalPages) * 100 : 100;

  return (
    <div
      className="mb-3 rounded-2xl px-3 py-2.5"
      style={{ background: "linear-gradient(160deg, #0D1E3A, #0A1828)", border: "1px solid rgba(201,168,76,0.28)", boxShadow: "0 8px 20px rgba(10,28,48,0.18)" }}
    >
      <div className="flex items-center gap-3">
        {onExit && (
          <button onClick={onExit}
            className="w-9 h-9 rounded-full flex items-center justify-center transition shrink-0"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(201,168,76,0.25)", color: "rgba(240,232,212,0.75)" }}>
            <X size={18} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="rounded-full p-1.5" style={{ background: "rgba(201,168,76,0.14)" }}>
              <BookOpen className="h-3.5 w-3.5" style={{ color: "#E8BC56" }} />
            </div>
            <p className="font-baloo font-bold text-sm truncate" style={{ color: "#F0E8D4" }}>{title}</p>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="relative flex-1 rounded-full h-1.5 overflow-hidden" style={{ background: "rgba(255,255,255,0.10)" }}>
              <div className="relative h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: "linear-gradient(90deg,#C9A84C,#F5C842)" }} />
            </div>
            <span className="text-3xs font-bold shrink-0" style={{ color: "rgba(240,232,212,0.55)" }}>{currentPage + 1}/{totalPages}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
