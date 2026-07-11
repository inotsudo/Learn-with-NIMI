"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { type AppThemeId, type Theme, getAppTheme, defaultTheme, APP_THEMES } from "@/lib/design-system/theme";
import { applyThemeVars } from "@/lib/design-system/theme";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";

const STORAGE_KEY = "nimipiko_app_theme";

interface AppThemeCtx {
  /** Effective theme ID: previewThemeId while previewing, savedThemeId otherwise.
   *  All 47+ existing callers (getThemeAssets / getComponentVariant) automatically
   *  reflect preview mode by reading this single field — no changes needed. */
  themeId:      AppThemeId;
  theme:        Theme;
  /** The theme last saved to localStorage */
  savedThemeId: AppThemeId;
  /** The theme currently being previewed (null when not in preview mode) */
  previewThemeId: AppThemeId | null;
  /** True while a preview is active */
  isPreviewMode:  boolean;
  /** Apply the theme immediately without saving; restores on cancel */
  startPreview:   (id: AppThemeId) => void;
  /** Commit the previewed theme to localStorage and exit preview mode */
  applyPreview:   () => void;
  /** Discard the preview and restore the saved theme */
  cancelPreview:  () => void;
  /** Persist a new theme directly (no preview) */
  setThemeId:     (id: AppThemeId) => void;
}

const Ctx = createContext<AppThemeCtx>({
  themeId:        "default",
  theme:          defaultTheme,
  savedThemeId:   "default",
  previewThemeId: null,
  isPreviewMode:  false,
  startPreview:   () => {},
  applyPreview:   () => {},
  cancelPreview:  () => {},
  setThemeId:     () => {},
});

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [savedThemeId,   setSavedThemeId]   = useState<AppThemeId>("default");
  const [previewThemeId, setPreviewThemeId] = useState<AppThemeId | null>(null);

  // Effective theme: preview overrides saved while active
  const themeId: AppThemeId = previewThemeId ?? savedThemeId;

  // Read persisted theme on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as AppThemeId | null;
    if (saved && saved in APP_THEMES) setSavedThemeId(saved);
  }, []);

  // Apply CSS vars whenever the effective theme changes
  useEffect(() => {
    const theme = getAppTheme(themeId);
    const assets = getThemeAssets(themeId);
    document.documentElement.dataset.themeId = themeId;
    document.documentElement.style.setProperty("--theme-accent", theme.brand.primary);
    document.documentElement.style.setProperty("--theme-surface-page", theme.surface.page);
    document.documentElement.style.setProperty(
      "--app-world-bg-image",
      `linear-gradient(135deg, rgba(255,255,255,0.90), rgba(245,250,244,0.94)), url('${assets.backgrounds.app}')`
    );
    document.documentElement.style.setProperty(
      "--app-world-page-image",
      `linear-gradient(180deg, rgba(255,255,255,0), rgba(255,255,255,0.84)), url('${assets.backgrounds.page}')`
    );
    document.documentElement.style.setProperty(
      "--app-world-decoration-image",
      `url('${assets.decorations.floating2}')`
    );
    applyThemeVars(theme);
  }, [themeId]);

  // ── Preview controls ────────────────────────────────────────────────────────

  const startPreview = (id: AppThemeId) => {
    setPreviewThemeId(id);
  };

  const applyPreview = () => {
    if (!previewThemeId) return;
    localStorage.setItem(STORAGE_KEY, previewThemeId);
    setSavedThemeId(previewThemeId);
    setPreviewThemeId(null);
  };

  const cancelPreview = () => {
    setPreviewThemeId(null);
    // CSS vars are restored by the useEffect above reacting to themeId change
  };

  // ── Direct set (no preview) ─────────────────────────────────────────────────

  const setThemeId = (id: AppThemeId) => {
    setPreviewThemeId(null);
    localStorage.setItem(STORAGE_KEY, id);
    setSavedThemeId(id);
  };

  return (
    <Ctx.Provider value={{
      themeId,
      theme:          getAppTheme(themeId),
      savedThemeId,
      previewThemeId,
      isPreviewMode:  previewThemeId !== null,
      startPreview,
      applyPreview,
      cancelPreview,
      setThemeId,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAppTheme(): AppThemeCtx {
  return useContext(Ctx);
}
