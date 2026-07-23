"use client";

import { useState } from "react";
import { getMilestoneBadgeMeta } from "@/lib/milestoneBadges";

type Size = "sm" | "md" | "lg" | "xl";

interface Props {
  slug: string | null;
  size?: Size;
  imageUrl?: string | null;
}

const SIZE_CLS: Record<Size, { outer: string; ring: string; icon: string; label: number }> = {
  sm: { outer: "w-10 h-10",  ring: "ring-2",     icon: "text-2xl", label: 4 },
  md: { outer: "w-16 h-16",  ring: "ring-[3px]", icon: "text-3xl", label: 5 },
  lg: { outer: "w-24 h-24",  ring: "ring-4",     icon: "text-5xl", label: 6 },
  xl: { outer: "w-32 h-32",  ring: "ring-[5px]", icon: "text-6xl", label: 8 },
};

export default function BadgeCircle({ slug, size = "md", imageUrl }: Props) {
  // Separate error flags so a failed local file doesn't also break the Supabase URL
  const [adminImgOk, setAdminImgOk] = useState(true);
  const [localImgOk, setLocalImgOk] = useState(true);
  const cls = SIZE_CLS[size];
  const milestoneMeta = slug ? getMilestoneBadgeMeta(slug) : null;

  // 1. Supabase Storage URL from badge_images table (admin-uploaded)
  if (imageUrl && adminImgOk) {
    return (
      <div className={`${cls.outer} rounded-full ${cls.ring} ring-yellow-400 shadow-lg overflow-hidden`}>
        <img
          src={imageUrl}
          alt={milestoneMeta?.label ?? slug ?? "badge"}
          onError={() => setAdminImgOk(false)}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  // 2. Milestone emoji (no image needed)
  if (milestoneMeta) {
    return (
      <div className={`${cls.outer} rounded-full ${cls.ring} ring-yellow-400 bg-gradient-to-b from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg`}>
        <span className={cls.icon}>{milestoneMeta.emoji}</span>
      </div>
    );
  }

  // 3. Slug-based image — /badges/<slug>.png — falls back to champion on error
  if (slug && localImgOk) {
    return (
      <div className={`${cls.outer} rounded-full ${cls.ring} ring-yellow-400 shadow-lg overflow-hidden`}>
        <img
          src={`/badges/${slug}.png`}
          alt={slug}
          onError={() => setLocalImgOk(false)}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  // 4. Champion fallback (null slug, or any image failed to load)
  return (
    <div className={`${cls.outer} rounded-full ${cls.ring} ring-yellow-400 bg-gradient-to-b from-blue-600 to-blue-900 flex flex-col items-center justify-center shadow-lg overflow-hidden`}>
      <span className="text-yellow-300 leading-none" style={{ fontSize: cls.label }}>⭐</span>
      <span className={cls.icon}>🏅</span>
      <span className="text-yellow-200 font-black text-center leading-tight tracking-wide" style={{ fontSize: cls.label }}>NIMIPIKO<br/>CHAMPION</span>
    </div>
  );
}
