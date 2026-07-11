"use client";

import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getAllThemes, getThemeMetadata } from "@/lib/design-system/themeMetadata";
import { getComponentVariant } from "@/lib/design-system/componentVariants";
import type { AppThemeId } from "@/lib/design-system/theme";

interface Props {
  className?: string;
}

/** Compact quick-switcher — shows only installed themes as icon chips. */
export default function ThemeSwitcher({ className = "" }: Props) {
  const { themeId, setThemeId } = useAppTheme();
  const cv = getComponentVariant(themeId);

  const installed = getAllThemes().filter(t => t.isInstalled);

  return (
    <div
      className={`inline-flex items-center gap-1 p-1 ${cv.panelStyle.background} ${cv.panelStyle.border} ${cv.panelStyle.radius} ${cv.panelStyle.shadow} ${className}`}
      role="group"
      aria-label="Quick theme switcher"
    >
      {installed.map(meta => {
        const isActive = meta.id === themeId;
        return (
          <button
            key={meta.id}
            onClick={() => {
              if (meta.id !== themeId) setThemeId(meta.id as AppThemeId);
            }}
            aria-label={`Switch to ${meta.name}`}
            aria-pressed={isActive}
            title={meta.name}
            className={`
              w-8 h-8 rounded-lg flex items-center justify-center text-base
              transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
              ${isActive
                ? "shadow-sm scale-110"
                : "hover:scale-110 hover:bg-black/5"
              }
            `}
            style={isActive
              ? { backgroundColor: `${meta.accentColor}20`, border: `1.5px solid ${meta.accentColor}60` }
              : undefined
            }
          >
            {meta.accentIcon}
          </button>
        );
      })}
    </div>
  );
}
