"use client";

import { useEffect, useRef } from "react";
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
  meta:      ThemeMetadata | null;
  onClose:   () => void;
  onPreview: (meta: ThemeMetadata) => void;
  onApply:   (meta: ThemeMetadata) => void;
  onUnlock:  (meta: ThemeMetadata) => void;
}

export default function ThemeDetails({ meta, onClose, onPreview, onApply, onUnlock }: Props) {
  const { themeId } = useAppTheme();
  const cv          = getComponentVariant(themeId);
  const panelRef    = useRef<HTMLDivElement>(null);

  const status    = meta ? getThemeStatus(meta, themeId) : "locked";
  const isCurrent = status === "current";
  const isLocked  = status === "locked" || status === "premium" || status === "coming_soon";
  const canApply  = meta?.isInstalled && !isCurrent;

  // Trap focus and handle Escape
  useEffect(() => {
    if (!meta) return;
    const prev = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, [meta, onClose]);

  if (!meta) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${meta.name} details`}
        tabIndex={-1}
        className={`
          fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm
          flex flex-col overflow-y-auto
          bg-white/95 backdrop-blur-sm
          shadow-2xl outline-none
          ${cv.dialogStyle.radius}
        `}
      >
        {/* Header */}
        <div className={`relative h-48 flex-shrink-0 bg-gradient-to-br ${meta.gradientClass} overflow-hidden`}>
          <div className="absolute inset-3">
            <ThemePreview meta={meta} size="lg" className="w-full h-full opacity-80" />
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close details"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 hover:bg-black/30
                       text-white flex items-center justify-center transition-colors
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            ✕
          </button>

          {/* Icon */}
          <div
            className="absolute bottom-3 left-3 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg"
            style={{ backgroundColor: `${meta.accentColor}25`, backdropFilter: "blur(4px)", border: `1px solid ${meta.accentColor}40` }}
          >
            {meta.accentIcon}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 space-y-5">
          {/* Name + badges */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-xl font-extrabold text-gray-900 leading-tight">{meta.name}</h2>
              <ThemeBadge status={status} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${RARITY_COLORS[meta.rarity]}`}>
                {RARITY_LABELS[meta.rarity]}
              </span>
              <span className="text-xs text-gray-400">v{meta.version}</span>
              <span className="text-xs text-gray-400">by {meta.author}</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 leading-relaxed">{meta.longDescription}</p>

          {/* Features */}
          {meta.features.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Features</h3>
              <ul className="space-y-1.5">
                {meta.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-current mt-0.5 flex-shrink-0" style={{ color: meta.accentColor }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Included assets */}
          {meta.includedAssets.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Included Artwork</h3>
              <ul className="space-y-1.5">
                {meta.includedAssets.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="flex-shrink-0">🖼️</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Unlock cost */}
          {isLocked && meta.unlockCost && (
            <div
              className="flex items-center gap-3 p-3 leaf"
              style={{ backgroundColor: `${meta.accentColor}10`, border: `1px solid ${meta.accentColor}20` }}
            >
              <span className="text-2xl">{meta.unlockType === "stars" ? "⭐" : "💎"}</span>
              <div>
                <div className="text-sm font-bold text-gray-900">
                  {meta.unlockCost.toLocaleString()} {meta.unlockType === "stars" ? "Stars" : "Gems"}
                </div>
                <div className="text-xs text-gray-500">to unlock this theme</div>
              </div>
            </div>
          )}

          {meta.estimatedUnlock && (
            <p className="text-xs text-gray-400">Available: {meta.estimatedUnlock}</p>
          )}

          {/* Footer */}
          <p className="text-xs text-gray-400">Last updated {meta.lastUpdated}</p>
        </div>

        {/* Sticky action bar */}
        <div className="sticky bottom-0 p-4 bg-white/95 backdrop-blur-sm border-t border-gray-100 flex gap-3">
          {meta.isInstalled && (
            <button
              onClick={() => onPreview(meta)}
              className="flex-1 py-2.5 leaf text-sm font-semibold border border-gray-200
                         text-gray-700 hover:bg-gray-50 transition-colors focus-visible:outline-none
                         focus-visible:ring-2 focus-visible:ring-offset-1"
            >
              Preview
            </button>
          )}

          {isCurrent ? (
            <div className="flex-1 py-2.5 leaf text-sm font-semibold text-center"
              style={{ backgroundColor: `${meta.accentColor}15`, color: meta.accentColor }}>
              ✓ Active Theme
            </div>
          ) : canApply ? (
            <button
              onClick={() => onApply(meta)}
              className="flex-1 py-2.5 leaf text-sm font-bold text-white transition-colors
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
              style={{ backgroundColor: meta.accentColor }}
            >
              Apply Theme
            </button>
          ) : isLocked && !meta.comingSoon ? (
            <button
              onClick={() => onUnlock(meta)}
              className="flex-1 py-2.5 leaf text-sm font-bold text-white transition-colors
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
              style={{ backgroundColor: meta.accentColor }}
            >
              Unlock Theme
            </button>
          ) : (
            <div className="flex-1 py-2.5 leaf text-sm font-semibold text-center text-gray-400 bg-gray-100">
              Coming Soon
            </div>
          )}
        </div>
      </div>
    </>
  );
}
