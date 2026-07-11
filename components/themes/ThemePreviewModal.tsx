"use client";

import { useEffect, useRef } from "react";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getComponentVariant } from "@/lib/design-system/componentVariants";
import { getThemeStatus, type ThemeMetadata } from "@/lib/design-system/themeMetadata";
import ThemePreview from "./ThemePreview";
import ThemeBadge from "./ThemeBadge";
import type { AppThemeId } from "@/lib/design-system/theme";

interface Props {
  meta:    ThemeMetadata | null;
  onClose: () => void;
}

/**
 * Full-screen preview modal.
 * On open → calls `startPreview(id)` so the entire app immediately reflects the
 * previewed theme (all CSS vars update, all getThemeAssets/getComponentVariant
 * calls see the new themeId automatically).
 * Cancel → `cancelPreview()` to restore the saved theme.
 * Apply  → `applyPreview()` to persist it.
 */
export default function ThemePreviewModal({ meta, onClose }: Props) {
  const { themeId, startPreview, applyPreview, cancelPreview, isPreviewMode } = useAppTheme();
  const cv       = getComponentVariant(themeId);
  const applyRef = useRef<HTMLButtonElement>(null);

  const status = meta ? getThemeStatus(meta, themeId) : "locked";

  // Start preview when meta changes (modal opens)
  useEffect(() => {
    if (!meta?.isInstalled) return;
    startPreview(meta.id as AppThemeId);
    return () => {
      // Clean up preview when the modal unmounts without an explicit action
      cancelPreview();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta?.id]);

  useEffect(() => {
    if (!meta) return;
    applyRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleCancel(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [meta]);

  if (!meta) return null;

  const handleCancel = () => {
    cancelPreview();
    onClose();
  };

  const handleApply = () => {
    applyPreview();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 ${cv.dialogStyle.overlay}`}
        aria-hidden="true"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Preview ${meta.name}`}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none p-0 sm:p-4"
      >
        <div
          className={`
            w-full sm:max-w-lg pointer-events-auto
            ${cv.dialogStyle.containerRadius} ${cv.dialogStyle.background} ${cv.dialogStyle.shadow}
            overflow-hidden
          `}
        >
          {/* Header gradient strip */}
          <div className={`relative h-52 bg-gradient-to-br ${meta.gradientClass} overflow-hidden`}>
            <div className="absolute inset-4">
              <ThemePreview meta={meta} size="lg" className="w-full h-full" />
            </div>

            {/* Live badge */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full
                            bg-black/30 backdrop-blur-sm text-white text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live Preview
            </div>

            {/* Close */}
            <button
              onClick={handleCancel}
              aria-label="Close preview"
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/25 hover:bg-black/35
                         text-white flex items-center justify-center transition-colors
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                  <span>{meta.accentIcon}</span>
                  {meta.name}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">{meta.description}</p>
              </div>
              <ThemeBadge status={status} />
            </div>

            <div
              className="text-sm text-gray-600 p-3 leaf"
              style={{ backgroundColor: `${meta.accentColor}10`, border: `1px solid ${meta.accentColor}20` }}
            >
              <strong>You are now previewing this theme.</strong> Navigate around the app to see
              how it looks everywhere. Come back here to apply or cancel.
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 py-3 leaf text-sm font-semibold border border-gray-200
                           text-gray-700 hover:bg-gray-50 transition-colors focus-visible:outline-none
                           focus-visible:ring-2 focus-visible:ring-offset-1"
              >
                Cancel Preview
              </button>
              <button
                ref={applyRef}
                onClick={handleApply}
                className="flex-1 py-3 leaf text-sm font-bold text-white transition-all
                           hover:opacity-90 active:scale-[.98]
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                style={{ backgroundColor: meta.accentColor }}
              >
                Apply Theme ✓
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
