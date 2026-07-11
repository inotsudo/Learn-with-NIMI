"use client";

import { useEffect, useRef } from "react";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getComponentVariant } from "@/lib/design-system/componentVariants";
import type { ThemeMetadata } from "@/lib/design-system/themeMetadata";
import ThemePreview from "./ThemePreview";
import ThemeBadge from "./ThemeBadge";
import { getThemeStatus } from "@/lib/design-system/themeMetadata";

interface Props {
  meta:    ThemeMetadata | null;
  onClose: () => void;
}

export default function ThemeUnlockModal({ meta, onClose }: Props) {
  const { themeId } = useAppTheme();
  const cv          = getComponentVariant(themeId);
  const closeRef    = useRef<HTMLButtonElement>(null);

  const status = meta ? getThemeStatus(meta, themeId) : "locked";

  useEffect(() => {
    if (!meta) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [meta, onClose]);

  if (!meta) return null;

  const unlockIcon = meta.unlockType === "stars" ? "⭐"
    : meta.unlockType === "gems"        ? "💎"
    : meta.unlockType === "subscription" ? "👑"
    : meta.unlockType === "achievement"  ? "🏆"
    : meta.unlockType === "seasonal"     ? "🌸"
    : "🔓";

  const unlockLabel = meta.unlockType === "stars"        ? `${meta.unlockCost?.toLocaleString()} Stars`
    : meta.unlockType === "gems"          ? `${meta.unlockCost?.toLocaleString()} Gems`
    : meta.unlockType === "subscription"  ? "Premium Subscription"
    : meta.unlockType === "achievement"   ? "Special Achievement"
    : meta.unlockType === "seasonal"      ? "Seasonal Event"
    : "Unlock";

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 ${cv.dialogStyle.overlay} flex items-center justify-center p-4`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Unlock ${meta.name}`}
        className={`
          fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none
        `}
      >
        <div
          className={`
            relative w-full max-w-sm pointer-events-auto
            ${cv.dialogStyle.background} ${cv.dialogStyle.border} ${cv.dialogStyle.radius} ${cv.dialogStyle.shadow}
            overflow-hidden
          `}
        >
          {/* Header gradient */}
          <div className={`relative h-40 bg-gradient-to-br ${meta.gradientClass} overflow-hidden`}>
            <div className="absolute inset-3 opacity-80">
              <ThemePreview meta={meta} size="lg" className="w-full h-full" />
            </div>
            {/* Locked overlay */}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <span className="text-5xl">🔒</span>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-extrabold text-gray-900">{meta.name}</h2>
              <ThemeBadge status={status} />
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">{meta.description}</p>

            {/* Unlock requirement */}
            <div
              className="flex items-center gap-3 p-4 leaf"
              style={{ backgroundColor: `${meta.accentColor}10`, border: `1px solid ${meta.accentColor}25` }}
            >
              <span className="text-3xl">{unlockIcon}</span>
              <div>
                <div className="text-sm font-bold text-gray-900">Unlock for {unlockLabel}</div>
                {meta.estimatedUnlock && (
                  <div className="text-xs text-gray-500 mt-0.5">Available: {meta.estimatedUnlock}</div>
                )}
                {!meta.estimatedUnlock && meta.unlockType === "stars" && (
                  <div className="text-xs text-gray-500 mt-0.5">Earn stars by completing lessons</div>
                )}
                {!meta.estimatedUnlock && meta.unlockType === "gems" && (
                  <div className="text-xs text-gray-500 mt-0.5">Earn gems from the Reward Shop</div>
                )}
              </div>
            </div>

            {/* CTA */}
            <div className="flex gap-3">
              <button
                ref={closeRef}
                onClick={onClose}
                className="flex-1 py-2.5 leaf text-sm font-semibold border border-gray-200
                           text-gray-700 hover:bg-gray-50 transition-colors focus-visible:outline-none
                           focus-visible:ring-2 focus-visible:ring-offset-1"
              >
                Close
              </button>
              {meta.comingSoon ? (
                <div className="flex-1 py-2.5 leaf text-sm font-semibold text-center text-gray-400 bg-gray-100">
                  Coming Soon
                </div>
              ) : (
                <button
                  className="flex-1 py-2.5 leaf text-sm font-bold text-white transition-colors
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                  style={{ backgroundColor: meta.accentColor }}
                  onClick={onClose}
                >
                  Learn More
                </button>
              )}
            </div>
          </div>

          {/* Close X */}
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/20 hover:bg-black/30
                       text-white text-sm flex items-center justify-center transition-colors
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            ✕
          </button>
        </div>
      </div>
    </>
  );
}
