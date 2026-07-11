"use client";

import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getComponentVariant } from "@/lib/design-system/componentVariants";
import {
  getThemeStatus,
  RARITY_COLORS,
  RARITY_LABELS,
  type ThemeMetadata,
} from "@/lib/design-system/themeMetadata";
import ThemeBadge from "./ThemeBadge";
import ThemePreview from "./ThemePreview";
import type { AppThemeId } from "@/lib/design-system/theme";

interface Props {
  meta:        ThemeMetadata;
  onPreview:   (meta: ThemeMetadata) => void;
  onApply:     (meta: ThemeMetadata) => void;
  onShowDetails: (meta: ThemeMetadata) => void;
  className?: string;
}

export default function ThemeCard({ meta, onPreview, onApply, onShowDetails, className = "" }: Props) {
  const { themeId } = useAppTheme();
  const cv          = getComponentVariant(themeId);
  const status      = getThemeStatus(meta, themeId);

  const isCurrent   = status === "current";
  const isLocked    = status === "locked" || status === "premium" || status === "coming_soon";
  const canInstall  = meta.isInstalled && !isCurrent;
  const canPreview  = meta.isInstalled;

  return (
    <article
      className={`
        group relative flex flex-col overflow-hidden cursor-pointer
        bg-white border border-gray-100
        ${cv.cardStyle.radius} ${cv.cardStyle.shadow}
        transition-all duration-300 hover:-translate-y-1 hover:shadow-lg
        focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-current/30
        ${className}
      `}
      style={isCurrent ? { outline: `2px solid ${meta.accentColor}`, outlineOffset: "0px" } : undefined}
      onClick={() => onShowDetails(meta)}
    >
      {/* Gradient header / preview */}
      <div className="relative h-36 overflow-hidden flex-shrink-0">
        <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradientClass}`} />

        {/* Mini UI mockup */}
        <div className="absolute inset-2">
          <ThemePreview meta={meta} size="sm" className="w-full h-full" />
        </div>

        {/* Accent icon */}
        <div
          className="absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center text-lg shadow-md"
          style={{ backgroundColor: `${meta.accentColor}20`, border: `1px solid ${meta.accentColor}40` }}
        >
          {meta.accentIcon}
        </div>

        {/* Rarity badge */}
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${RARITY_COLORS[meta.rarity]}`}>
          {RARITY_LABELS[meta.rarity]}
        </div>

        {/* Coming soon / locked overlay */}
        {isLocked && (
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center">
            <span className="text-2xl">{status === "coming_soon" ? "⏳" : "🔒"}</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 p-3 flex flex-col gap-2">
        {/* Name + status */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold text-gray-900 leading-tight">{meta.name}</h3>
          <ThemeBadge status={status} />
        </div>

        {/* Description */}
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{meta.description}</p>

        {/* Unlock info for locked themes */}
        {isLocked && meta.unlockCost && (
          <div className="flex items-center gap-1 text-xs text-amber-600 font-medium">
            <span>{meta.unlockType === "stars" ? "⭐" : "💎"}</span>
            <span>{meta.unlockCost.toLocaleString()} {meta.unlockType === "stars" ? "stars" : "gems"}</span>
          </div>
        )}
        {isLocked && meta.estimatedUnlock && (
          <div className="text-xs text-gray-400">{meta.estimatedUnlock}</div>
        )}

        {/* Actions */}
        <div
          className="mt-auto flex gap-2 pt-1"
          onClick={e => e.stopPropagation()}
        >
          {canPreview && (
            <button
              onClick={() => onPreview(meta)}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold border border-gray-200
                         text-gray-700 hover:bg-gray-50 transition-colors focus-visible:outline-none
                         focus-visible:ring-2 focus-visible:ring-offset-1"
            >
              Preview
            </button>
          )}

          {isCurrent && (
            <div className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-center"
              style={{ backgroundColor: `${meta.accentColor}15`, color: meta.accentColor }}>
              ✓ Active
            </div>
          )}

          {canInstall && (
            <button
              onClick={() => onApply(meta)}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
              style={{ backgroundColor: meta.accentColor }}
            >
              Apply
            </button>
          )}

          {isLocked && (
            <button
              disabled
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-gray-400 bg-gray-100 cursor-not-allowed"
            >
              {status === "coming_soon" ? "Coming Soon" : "Unlock"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
