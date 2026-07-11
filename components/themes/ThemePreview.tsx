"use client";

import type { ThemeMetadata } from "@/lib/design-system/themeMetadata";

interface Props {
  meta: ThemeMetadata;
  /** Size variant — "sm" for cards, "lg" for modals */
  size?: "sm" | "lg";
  className?: string;
}

/**
 * Mini app-UI mockup rendered entirely from theme metadata (gradient + accent color).
 * No images required — works for both installed and coming-soon themes.
 */
export default function ThemePreview({ meta, size = "sm", className = "" }: Props) {
  const isLg = size === "lg";

  const barH   = isLg ? "h-8"    : "h-5";
  const cardH  = isLg ? "h-16"   : "h-10";
  const cardR  = isLg ? "rounded-xl" : "rounded-lg";
  const textW  = isLg ? "w-28 h-2.5" : "w-16 h-1.5";
  const text2W = isLg ? "w-20 h-2"   : "w-10 h-1";
  const dotS   = isLg ? "w-3 h-3"    : "w-2 h-2";

  return (
    <div
      className={`relative overflow-hidden ${isLg ? "rounded-2xl" : "rounded-xl"} ${className}`}
      aria-hidden="true"
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradientClass} opacity-20`} />
      <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px]" />

      {/* Content */}
      <div className="relative p-2 space-y-2">
        {/* Top bar */}
        <div className={`${barH} rounded-lg flex items-center justify-between px-2`}
          style={{ backgroundColor: `${meta.accentColor}15`, border: `1px solid ${meta.accentColor}25` }}>
          <div className={`${dotS} rounded-full`} style={{ backgroundColor: meta.accentColor }} />
          <div className={`${textW} rounded-full bg-current opacity-10`} />
          <div className={`${dotS} rounded-full opacity-30`} style={{ backgroundColor: meta.accentColor }} />
        </div>

        {/* Card mockup 1 */}
        <div className={`${cardH} ${cardR} flex items-center gap-2 px-2`}
          style={{ backgroundColor: `${meta.accentColor}10`, border: `1px solid ${meta.accentColor}20` }}>
          <div className={`${isLg ? "w-10 h-10" : "w-7 h-7"} rounded-lg flex-shrink-0`}
            style={{ backgroundColor: `${meta.accentColor}30` }}>
            <div className="w-full h-full flex items-center justify-center text-sm">
              {meta.accentIcon}
            </div>
          </div>
          <div className="flex-1 space-y-1">
            <div className={`${textW} rounded-full`} style={{ backgroundColor: `${meta.accentColor}40` }} />
            <div className={`${text2W} rounded-full`} style={{ backgroundColor: `${meta.accentColor}25` }} />
          </div>
        </div>

        {/* Card mockup 2 */}
        <div className={`${cardH} ${cardR} flex items-center gap-2 px-2 opacity-70`}
          style={{ backgroundColor: `${meta.accentColor}08`, border: `1px solid ${meta.accentColor}15` }}>
          <div className={`${isLg ? "w-10 h-10" : "w-7 h-7"} rounded-lg flex-shrink-0`}
            style={{ backgroundColor: `${meta.accentColor}20` }} />
          <div className="flex-1 space-y-1">
            <div className={`${textW} rounded-full`} style={{ backgroundColor: `${meta.accentColor}30` }} />
            <div className={`${text2W} rounded-full`} style={{ backgroundColor: `${meta.accentColor}20` }} />
          </div>
        </div>
      </div>

      {/* Gradient overlay */}
      <div className={`absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-white/40 to-transparent`} />
    </div>
  );
}
