"use client";

import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeMetadata } from "@/lib/design-system/themeMetadata";
import { getComponentVariant } from "@/lib/design-system/componentVariants";

interface Props {
  resultCount: number;
  className?: string;
}

export default function ThemeHeader({ resultCount, className = "" }: Props) {
  const { themeId, isPreviewMode, previewThemeId, cancelPreview, applyPreview } = useAppTheme();
  const cv = getComponentVariant(themeId);

  const currentMeta = getThemeMetadata(themeId);
  const previewMeta = previewThemeId ? getThemeMetadata(previewThemeId) : null;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Preview banner */}
      {isPreviewMode && previewMeta && (
        <div
          className="flex items-center justify-between gap-3 px-4 py-3 leaf text-sm"
          style={{
            backgroundColor: `${previewMeta.accentColor}15`,
            border: `1px solid ${previewMeta.accentColor}30`,
          }}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            <span>{previewMeta.accentIcon}</span>
            <span className="font-medium text-gray-800">
              Previewing <strong>{previewMeta.name}</strong>
            </span>
            <span className="text-gray-500">— navigate the app to see changes</span>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={cancelPreview}
              className="px-3 py-1 rounded-lg text-xs font-semibold text-gray-600 border border-gray-200
                         hover:bg-white transition-colors focus-visible:outline-none focus-visible:ring-2"
            >
              Cancel
            </button>
            <button
              onClick={applyPreview}
              className="px-3 py-1 rounded-lg text-xs font-semibold text-white transition-colors
                         focus-visible:outline-none focus-visible:ring-2"
              style={{ backgroundColor: previewMeta.accentColor }}
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Page title */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Theme Gallery
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {resultCount} theme{resultCount !== 1 ? "s" : ""} available
            {currentMeta && (
              <span className="ml-1 text-gray-400">
                · Active: <span className="font-medium text-gray-600">{currentMeta.name}</span>
              </span>
            )}
          </p>
        </div>

        {/* Current theme accent chip */}
        {currentMeta && (
          <div
            className={`inline-flex items-center gap-2 px-3 py-2 ${cv.cardStyle.radius} text-sm font-medium flex-shrink-0`}
            style={{
              backgroundColor: `${currentMeta.accentColor}12`,
              border: `1px solid ${currentMeta.accentColor}25`,
              color: currentMeta.accentColor,
            }}
          >
            <span>{currentMeta.accentIcon}</span>
            <span>{currentMeta.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}
