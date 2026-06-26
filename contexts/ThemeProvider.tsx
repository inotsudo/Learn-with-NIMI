"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { getTheme, getSavedTheme, saveTheme, type KidTheme, THEMES } from "@/lib/themes";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

interface ThemeCtx {
  theme: KidTheme;
  themeId: string;
  setThemeId: (id: string) => void;
  allThemes: KidTheme[];
}

const Ctx = createContext<ThemeCtx>({
  theme: getTheme("galaxy"),
  themeId: "galaxy",
  setThemeId: () => {},
  allThemes: THEMES,
});

export const useKidTheme = () => useContext(Ctx);

export function KidThemeProvider({ childId: propChildId, children }: { childId: string | null; children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState("galaxy");
  const [activeChildId, setActiveChildId] = useState<string | null>(propChildId);

  // On mount, resolve the active child from props or localStorage
  useEffect(() => {
    const id = propChildId ?? (typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null);
    if (id) {
      setActiveChildId(id);
      setThemeIdState(getSavedTheme(id));
    }
  }, [propChildId]);

  // Listen for child switches (child selector fires storage events)
  useEffect(() => {
    const onStorage = () => {
      const id = localStorage.getItem(ACTIVE_CHILD_KEY);
      if (id && id !== activeChildId) {
        setActiveChildId(id);
        setThemeIdState(getSavedTheme(id));
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onStorage);

    // Also listen for custom child-switch event
    const onChildSwitch = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id) { setActiveChildId(id); setThemeIdState(getSavedTheme(id)); }
    };
    window.addEventListener("app:childSwitch", onChildSwitch);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onStorage);
      window.removeEventListener("app:childSwitch", onChildSwitch);
    };
  }, [activeChildId]);

  const setThemeId = useCallback((id: string) => {
    setThemeIdState(id);
    if (activeChildId) saveTheme(activeChildId, id);
  }, [activeChildId]);

  const theme = getTheme(themeId);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--theme-bg", theme.bg);
    root.style.setProperty("--theme-card", theme.bgCard);
    root.style.setProperty("--theme-darker", theme.bgDarker);
    root.style.setProperty("--theme-card-hover", theme.bgCardHover);
    root.style.setProperty("--theme-card-active", theme.bgCardActive);
    root.style.setProperty("--theme-accent", theme.accentSolid);
    root.style.setProperty("--theme-accent-soft", theme.accentSoft);
    root.style.setProperty("--theme-accent-muted", theme.accentMuted);
    root.style.setProperty("--theme-border", theme.border);
    root.style.setProperty("--theme-border-strong", theme.borderStrong);
    root.style.setProperty("--theme-text", theme.text);
    root.style.setProperty("--theme-text-muted", theme.textMuted);
    root.style.setProperty("--theme-text-faint", theme.textFaint);
    root.style.setProperty("--theme-sidebar", theme.sidebar);
  }, [theme]);

  return (
    <Ctx.Provider value={{ theme, themeId, setThemeId, allThemes: THEMES }}>
      {children}
    </Ctx.Provider>
  );
}
