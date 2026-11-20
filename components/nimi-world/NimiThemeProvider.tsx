"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, type CSSProperties, type ReactNode } from "react";
import {
  KID_VERSIONS, WORLD_THEMES, isKidVersionId, isWorldThemeId, versionForAge,
  type KidVersion, type KidVersionId, type WorldLang, type WorldTheme, type WorldThemeId,
} from "./themes";
import { COPY, type WorldCopy } from "./scenes";
import { readStored, useStored, writeStored } from "./useStored";

interface NimiThemeCtx {
  theme: WorldTheme;
  version: KidVersion;
  lang: WorldLang;
  copy: WorldCopy;
  /** True when a parent pinned the version instead of following the child's age. */
  versionPinned: boolean;
  setTheme: (id: WorldThemeId) => void;
  /** Pin a version (parent portal). `null` goes back to the age-based default. */
  setVersion: (id: KidVersionId | null) => void;
  setLang: (lang: WorldLang) => void;
  /** CSS variables to spread on the world root element. */
  cssVars: CSSProperties;
}

interface Prefs { theme?: WorldThemeId; version?: KidVersionId; lang?: WorldLang }

const Ctx = createContext<NimiThemeCtx | null>(null);
const storageKey = (childId: string | null | undefined) => `nimipiko_world_prefs${childId ? `_${childId}` : ""}`;

function parsePrefs(raw: string | null): Prefs {
  try {
    const p = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    return {
      theme: isWorldThemeId(p.theme) ? p.theme : undefined,
      version: isKidVersionId(p.version) ? p.version : undefined,
      lang: p.lang === "fr" || p.lang === "en" ? p.lang : undefined,
    };
  } catch {
    return {};
  }
}

export function NimiThemeProvider({
  children, childId, childAge, defaultLang = "fr",
  forceTheme, forceVersion,
}: {
  children: ReactNode;
  /** Prefs are remembered per child, so siblings keep their own world. */
  childId?: string | null;
  childAge?: number | null;
  defaultLang?: WorldLang;
  /** Demo / preview overrides (e.g. ?theme=…&version=… on /world); the child can still change them. */
  forceTheme?: WorldThemeId;
  forceVersion?: KidVersionId;
}) {
  const key = storageKey(childId);
  const raw = useStored("local", key);
  const prefs = useMemo(() => parsePrefs(raw), [raw]);

  // URL overrides win on load, then behave like any saved preference.
  useEffect(() => {
    if (!forceTheme && !forceVersion) return;
    const cur = parsePrefs(readStored("local", key));
    writeStored("local", key, JSON.stringify({ ...cur, ...(forceTheme ? { theme: forceTheme } : {}), ...(forceVersion ? { version: forceVersion } : {}) }));
  }, [key, forceTheme, forceVersion]);

  const update = useCallback((patch: Prefs) => {
    const next = { ...parsePrefs(readStored("local", key)), ...patch };
    writeStored("local", key, JSON.stringify(next)); // undefined keys (e.g. version: auto) drop out
  }, [key]);

  const setTheme = useCallback((id: WorldThemeId) => update({ theme: id }), [update]);
  const setVersion = useCallback((id: KidVersionId | null) => update({ version: id ?? undefined }), [update]);
  const setLang = useCallback((l: WorldLang) => update({ lang: l }), [update]);

  const themeId: WorldThemeId = prefs.theme ?? forceTheme ?? "golden-sunset";
  const pinnedVersion: KidVersionId | null = prefs.version ?? forceVersion ?? null;
  const lang: WorldLang = prefs.lang ?? defaultLang;
  const versionId = pinnedVersion ?? versionForAge(childAge);

  const value = useMemo<NimiThemeCtx>(() => {
    const theme = WORLD_THEMES[themeId];
    const version = KID_VERSIONS[versionId];
    const c = theme.colors;
    const cssVars = {
      "--world-base": c.base,
      "--world-accent": c.accent,
      "--world-accent-2": c.accent2,
      "--world-horizon": c.horizon,
      "--world-zenith": c.zenith,
      "--world-text": c.text,
      "--world-touch": `${version.touchTarget}px`,
    } as CSSProperties;
    return {
      theme, version, lang, copy: COPY[lang], versionPinned: pinnedVersion !== null,
      setTheme, setVersion, setLang, cssVars,
    };
  }, [themeId, versionId, pinnedVersion, lang, setTheme, setVersion, setLang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Re-provides the world context inside an R3F <Canvas> (separate reconciler). */
export function NimiThemeBridge({ value, children }: { value: NimiThemeCtx; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export type { NimiThemeCtx };

export function useNimiTheme(): NimiThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNimiTheme must be used inside <NimiThemeProvider>");
  return ctx;
}

/**
 * Theme-reactive Three.js lighting rig. Renders inside an R3F <Canvas>.
 */
export function WorldLights({ theme }: { theme: WorldTheme }) {
  const l = theme.lighting;
  return (
    <>
      <ambientLight color={l.ambient.color} intensity={l.ambient.intensity} />
      <hemisphereLight args={[theme.colors.horizon, theme.colors.base, 0.45]} />
      <directionalLight color={l.key.color} intensity={l.key.intensity} position={l.key.position} />
      {/* decay 0 keeps the stylised (pre-physical-units) falloff the presets were tuned for */}
      <pointLight color={l.rim.color} intensity={l.rim.intensity} decay={0} distance={30} position={l.rim.position} />
      <fog attach="fog" args={[l.fog.color, l.fog.near, l.fog.far]} />
    </>
  );
}
