"use client";

import { Heart, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Creation } from "./types";

const AVATAR_COLORS = [
  "from-green-500 to-emerald-600",
  "from-blue-500 to-cyan-500",
  "from-orange-400 to-pink-400",
  "from-green-500 to-teal-500",
  "from-green-500 to-emerald-600",
];

function avatarColorFor(name: string) {
  const code = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

interface Props {
  creation: Creation;
  onLike: (creationId: string) => void;
  isLoadingLike?: boolean;
}

export default function GalleryCard({ creation, onLike, isLoadingLike = false }: Props) {
  const { t } = useLanguage();
  const title = creation.description?.trim() || t("myCreationFallback").replace("{name}", creation.childName);

  return (
    <div className="bg-white border border-ds-border shadow-ds-card overflow-hidden hover:shadow-md transition-shadow" style={{ borderRadius: 'var(--leaf-r)' }}>
      <div className="relative aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
        {creation.imageUrl ? (
          <img
            src={creation.imageUrl}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-5xl">🎨</span>
        )}
        {creation.type === "challenge" && (
          <span className="absolute top-2 right-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-white text-[9px] font-black rounded-full px-2 py-0.5 shadow">🏆 Challenge</span>
        )}
        {creation.type === "certificate" && (
          <span className="absolute top-2 right-2 text-white text-[9px] font-black px-2 py-0.5 shadow" style={{ backgroundColor: 'var(--nimi-green)', borderRadius: 'var(--leaf-r-sm)' }}>📜 Certificate</span>
        )}
        {creation.type === "sticker" && (
          <span className="absolute top-2 right-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-[9px] font-black rounded-full px-2 py-0.5 shadow">⭐ Sticker</span>
        )}
        {creation.status === "pending" && (
          <span className="absolute top-2 left-2 bg-amber-400 text-amber-900 text-[10px] font-black rounded-full px-2.5 py-1 shadow">
            {t("statusPendingLabel")}
          </span>
        )}
        {creation.status === "rejected" && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-black rounded-full px-2.5 py-1 shadow">
            {t("statusRejectedLabel")}
          </span>
        )}
      </div>

      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarColorFor(creation.childName)} flex items-center justify-center text-[14px] shrink-0 border border-gray-200 shadow-sm`}>
            {creation.childAvatar || creation.childName?.[0]?.toUpperCase() || "?"}
          </div>
          <p className="text-xs font-bold text-gray-500 truncate">{creation.childName}</p>
        </div>

        <p className="text-sm font-black text-ds-text truncate">{title}</p>

        <button
          onClick={() => onLike(creation.id)}
          disabled={isLoadingLike}
          className="flex items-center gap-1 mt-2 text-sm font-bold text-gray-500 hover:text-pink-500 transition-colors"
        >
          {isLoadingLike ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Heart
              className="w-4 h-4"
              fill={creation.likedByUser ? "currentColor" : "none"}
              color={creation.likedByUser ? "#ec4899" : "currentColor"}
            />
          )}
          <span>{creation.likes}</span>
        </button>
      </div>
    </div>
  );
}
