"use client";

import "./world.css";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, useReducedMotion, useTransform, type MotionStyle } from "framer-motion";
import { getImageProps } from "next/image";
import { useNimiTheme } from "./NimiThemeProvider";
import { useParallax, useViewport, useWebGL } from "./env";
import DustField from "./DustField";
import KitStudio, { type StudioItem } from "./KitStudio";
import ParentPortal from "./ParentPortal";
import RunwayTiles, { type RunwayTile } from "./RunwayTiles";
import { Caption, EdgeGate, IntroCinematic, Reel, SceneStage, WingSwitcher, type PlacedHotspot } from "./WorldOverlays";
import { REELS, ZONES, ZONE_ORDER, type WorldZoneId } from "./scenes";
import { TARMAC_TILES, WORLD_THEMES, type WorldThemeId } from "./themes";
import { missionHref, nextSlotKey, type WorldChild, type WorldData } from "./worldData";
import { useStored, writeStored } from "./useStored";
import { speakText, stopSpeaking } from "@/lib/speech";
import { playPop, playStar, playTap, playUnlock } from "@/lib/sounds";

const ZONE_KEY = "nimipiko_world_zone";
const INTRO_KEY = "nimipiko_world_intro_seen";
const CAPTION_MS = 6000;
const CHIPS_MS = 2800;

const THEME_WELCOME: Record<WorldThemeId, { fr: string; en: string }> = {
  "golden-sunset": { fr: "le Royaume du Soleil Doré", en: "the Golden Sunset Kingdom" },
  "starlight-night": { fr: "le Vol de Nuit Étoilé", en: "the Starlight Night Flight" },
  "emerald-jungle": { fr: "les Îles Jungle d'Émeraude", en: "the Emerald Jungle Islands" },
  "cloud-carnival": { fr: "le Carnaval des Nuages", en: "the Cloud Carnival" },
};

export interface NimiToyWorldProps {
  data: WorldData;
  loading?: boolean;
  kids?: WorldChild[];
  activeChildId?: string | null;
  childAge?: number | null;
  onSelectChild?: (id: string) => void;
  onNavigate: (href: string) => void;
  /** Parent-only notices (trial, subscription) — shown inside the Parent Portal, never in the child's world. */
  parentExtras?: ReactNode;
  /** Public demo: navigation is simulated by Piko instead of leaving the world. */
  demo?: boolean;
  skipIntro?: boolean;
  initialZone?: WorldZoneId;
}

export default function NimiToyWorld({
  data, loading = false, kids = [], activeChildId = null, childAge = null, onSelectChild, onNavigate, parentExtras, demo = false, skipIntro = false, initialZone,
}: NimiToyWorldProps) {
  const { theme, version, lang, copy, cssVars, setTheme, setVersion, setLang } = useNimiTheme();
  const webgl = useWebGL();
  const reduced = !!useReducedMotion();
  const vp = useViewport();
  const little = version.guidedSpotlight;
  const f = version.features;

  // Zone + intro live in sessionStorage: back from a mission → same scene; intro once per session.
  const storedZone = useStored("session", ZONE_KEY) as WorldZoneId | null;
  const zone: WorldZoneId = storedZone && ZONE_ORDER.includes(storedZone) ? storedZone : initialZone ?? "hall";
  const setZone = useCallback((z: WorldZoneId) => writeStored("session", ZONE_KEY, z), []);
  const introSeen = useStored("session", INTRO_KEY, "1"); // server: "seen" → no intro in SSR HTML
  const introDone = skipIntro || introSeen === "1";
  useEffect(() => { if (initialZone) writeStored("session", ZONE_KEY, initialZone); }, [initialZone]);

  const [studio, setStudio] = useState<StudioItem | null>(null);
  const [parentOpen, setParentOpen] = useState(false);
  const [reel, setReel] = useState<{ kind: "ready" | "takeoff"; then: () => void } | null>(null);
  const [say, setSay] = useState<string | null>(null);
  const [captionOpen, setCaptionOpen] = useState(true);
  const [captionNonce, setCaptionNonce] = useState(0);
  const [chipsOpen, setChipsOpen] = useState(true);
  const [chipsNonce, setChipsNonce] = useState(0);

  // auto-hide Piko's caption and the entry labels (timer callbacks, not synchronous effect state)
  useEffect(() => {
    if (!captionOpen) return;
    const t = setTimeout(() => { setCaptionOpen(false); setSay(null); }, CAPTION_MS);
    return () => clearTimeout(t);
  }, [captionOpen, captionNonce]);
  useEffect(() => {
    if (!chipsOpen) return;
    const t = setTimeout(() => setChipsOpen(false), CHIPS_MS);
    return () => clearTimeout(t);
  }, [chipsOpen, chipsNonce]);
  useEffect(() => () => stopSpeaking(), []);

  const def = ZONES[zone];
  const plate = loading ? REELS.loading : def.plate;
  const story = data.stories.find((s) => s.id === data.currentStoryId);

  /* ── pointer parallax shared by art + hotspots; the dust gets its own depth ── */
  const p = useParallax(!reduced && !studio);
  const tx = useTransform(p.x, (v) => v * -16);
  const ty = useTransform(p.y, (v) => v * -11);
  const rotY = useTransform(p.x, (v) => v * 1.3);
  const rotX = useTransform(p.y, (v) => v * -1);
  const parallax: MotionStyle = { x: tx, y: ty, rotateX: rotX, rotateY: rotY, scale: 1.07, transformPerspective: 1400 };

  const hintFor = useCallback((z: WorldZoneId) => {
    if (loading) return copy.loading;
    switch (z) {
      case "hall": return little ? copy.helloLittle(data.childName) : copy.hello(data.childName);
      case "tarmac": return little ? copy.tarmacLittle : copy.tarmac;
      case "cabin": return copy.cabin;
      case "islands": return f.flightGlobe ? copy.islandsGlobe : copy.islands;
    }
  }, [loading, little, copy, data.childName, f.flightGlobe]);
  const hint = hintFor(zone);

  const speak = useCallback((text: string) => { void speakText(text, lang); }, [lang]);

  /** Piko talks: caption for readers, voice for everyone who taps him / for Little Explorers always. */
  const pikoSays = useCallback((text: string | null, voice = little) => {
    setSay(text);
    setCaptionOpen(true);
    setCaptionNonce((n) => n + 1);
    if (voice) speak(text ?? hint);
  }, [little, speak, hint]);

  const go = useCallback((to: WorldZoneId) => {
    setStudio(null);
    if (to === zone) return;
    playTap();
    const arrive = () => {
      setZone(to);
      setSay(null);
      setCaptionOpen(true);
      setCaptionNonce((n) => n + 1);
      setChipsOpen(true);
      setChipsNonce((n) => n + 1);
      if (little) speak(hintFor(to));
    };
    if (zone === "cabin" && to === "islands") setReel({ kind: "takeoff", then: arrive });
    else arrive();
  }, [zone, setZone, little, speak, hintFor]);

  /** Leave the world for a real screen — always through the "PRÊT ?" beat. */
  const launch = useCallback((href: string | null) => {
    setStudio(null);
    if (!href) { pikoSays(copy.noStory, true); return; }
    playPop();
    setReel({ kind: "ready", then: () => (demo ? pikoSays(copy.demo, true) : onNavigate(href)) });
  }, [demo, onNavigate, pikoSays, copy]);

  const nextHref = useMemo(() => {
    const k = nextSlotKey(data);
    if (k) return missionHref(data, k);
    return story ? `/stories/${story.slug}` : "/stories";
  }, [data, story]);

  const tiles: RunwayTile[] = useMemo(() => {
    const next = nextSlotKey(data);
    return TARMAC_TILES.map((t) => {
      const slot = data.slots.find((x) => x.slotKey === t.slotKey);
      return {
        slotKey: t.slotKey,
        emoji: t.emoji,
        label: lang === "fr" ? t.fr : t.en,
        done: !!slot?.completed,
        next: slot?.slotKey === next,
        disabled: !slot || !data.currentStoryId,
      };
    });
  }, [data, lang]);

  const onTile = useCallback((slotKey: string) => {
    const t = TARMAC_TILES.find((x) => x.slotKey === slotKey);
    if (t && little) speak(lang === "fr" ? t.fr : t.en);
    launch(missionHref(data, slotKey));
  }, [little, speak, lang, launch, data]);

  const onStory = useCallback((id: string) => {
    const s = data.stories.find((x) => x.id === id);
    if (!s) return;
    if (!s.unlocked) { pikoSays(`🔒 ${s.title} — ${copy.locked}`, true); return; }
    launch(`/stories/${s.slug}`);
  }, [data.stories, pikoSays, copy.locked, launch]);

  const pickTheme = useCallback((id: WorldThemeId) => {
    playStar();
    setTheme(id);
    const w = THEME_WELCOME[id];
    pikoSays(lang === "fr" ? `${WORLD_THEMES[id].emoji} Bienvenue dans ${w.fr} !` : `${WORLD_THEMES[id].emoji} Welcome to ${w.en}!`);
  }, [setTheme, pikoSays, lang]);

  /* ── aura hotspots on the artwork (hidden while loading or when cropped off-screen) ── */
  const S = Math.max(vp.w, vp.h);
  const ox = (vp.w - S) * def.fx;
  const oy = (vp.h - S) * def.fy;
  const onScreen = (x: number, y: number) => {
    const X = ox + x * S, Y = oy + y * S;
    return X > 12 && X < vp.w - 12 && Y > 12 && Y < vp.h - 12;
  };
  const nextLabel: Record<WorldZoneId, string> = { hall: copy.toTarmac, tarmac: copy.toCabin, cabin: copy.toIslands, islands: copy.toHall };
  const hotspots: PlacedHotspot[] = loading ? [] : def.hotspots.filter((h) => onScreen(h.x, h.y)).map((spot) => {
    switch (spot.kind) {
      case "kit": return { spot, label: copy.kit, strong: little, onActivate: () => { playPop(); setStudio("kit"); if (little) speak(copy.tapKit); } };
      case "piko": return { spot, label: copy.piko, strong: false, onActivate: () => { playTap(); pikoSays(null, true); } };
      case "story": return { spot, label: story ? `${copy.story} — ${story.title}` : copy.story, strong: false, onActivate: () => (story ? onStory(story.id) : pikoSays(copy.noStory, true)) };
      case "next": return { spot, label: nextLabel[def.id], strong: false, onActivate: () => go(def.next) };
    }
  });
  const kitSpot = def.hotspots.find((h) => h.kind === "kit") ?? ZONES.hall.hotspots[0];

  // Warm the optimised plates + reels so zone changes and "PRÊT ?" never flash an empty frame.
  useEffect(() => {
    const t = setTimeout(() => {
      const warm = (src: string) => {
        const { props } = getImageProps({ src, alt: "", fill: true, sizes: "(orientation: portrait) 100vh, 100vw" });
        const img = new window.Image();
        if (props.sizes) img.sizes = props.sizes;
        if (props.srcSet) img.srcset = props.srcSet;
        img.src = props.src;
      };
      [...ZONE_ORDER.map((z) => ZONES[z].plate), REELS.ready, ...REELS.takeoff].forEach(warm);
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  const showLabels = version.showLabels;
  const captionText = little ? null : captionOpen ? say ?? hint : null;

  return (
    <div
      className="nw-root"
      style={cssVars}
      data-world-theme={theme.id}
      data-kid-version={version.id}
      data-zone={zone}
      onContextMenu={(e) => e.preventDefault()}
    >
      <h1 className="sr-only">NIMIPIKO Airways — {def.name[lang]}</h1>

      {/* Layer 1 — the full-bleed artwork, graded for the theme, with aura hotspots registered to it */}
      <SceneStage
        src={plate}
        fx={def.fx}
        fy={def.fy}
        theme={theme}
        parallax={parallax}
        hotspots={hotspots}
        showChips={showLabels}
        introChips={chipsOpen}
        minTouch={version.touchTarget}
        priority
      />

      {/* Layer 2 — floating light (Three.js points; CSS motes without WebGL) */}
      <div className="nw-layer" style={{ zIndex: 2 }}>
        <DustField theme={theme} px={p.x} py={p.y} webgl={webgl} reduced={reduced} />
      </div>

      {/* Layer 3+ — in-world controls */}
      {!loading && zone === "hall" && <EdgeGate label={copy.toTarmac} showLabel={showLabels} onClick={() => go("tarmac")} />}

      {f.tarmacTiles && def.runway && !loading && (
        <RunwayTiles tiles={tiles} showLabels={showLabels} onSelect={onTile} align={def.runway} ariaLabel={copy.kit} />
      )}

      <Caption text={captionText} onReplay={() => speak(say ?? hint)} replayLabel={say ?? hint} />

      <WingSwitcher
        theme={theme.id}
        versionId={version.id}
        lang={lang}
        zone={zone}
        showLabels={showLabels}
        bilingual={f.bilingualToggle}
        xp={f.xpVault ? { level: data.level, pct: data.xpPct } : null}
        labels={{ wing: copy.wing, hold: copy.wingHold, worlds: copy.worlds, versions: copy.versions, destinations: copy.destinations, language: copy.language }}
        onTheme={pickTheme}
        onVersion={(id) => { playTap(); setVersion(id); }}
        onLang={(l) => { playTap(); setLang(l); }}
        onZone={go}
        onParent={() => { playUnlock(); setStudio(null); setParentOpen(true); }}
      />

      <AnimatePresence>
        {studio && (
          <KitStudio
            key="studio"
            data={data}
            backdrop={plate}
            kitArt={{ x: kitSpot.x, y: kitSpot.y }}
            webgl={webgl}
            startItem={studio}
            tiles={tiles}
            nextHref={nextHref}
            onClose={() => setStudio(null)}
            onLaunch={launch}
            onTile={onTile}
            onStory={onStory}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reel && <Reel key={reel.kind} kind={reel.kind} onDone={() => { const then = reel.then; setReel(null); then(); }} />}
      </AnimatePresence>

      <AnimatePresence>
        {!introDone && <IntroCinematic key="intro" onDone={() => writeStored("session", INTRO_KEY, "1")} skipLabel={copy.skip} showLabel={showLabels} />}
      </AnimatePresence>

      <AnimatePresence>
        {parentOpen && (
          <ParentPortal
            data={data}
            kids={kids}
            activeChildId={activeChildId}
            childAge={childAge}
            extras={parentExtras}
            onSelectChild={onSelectChild}
            onNavigate={(href) => { if (demo) { setParentOpen(false); pikoSays(copy.demo, true); } else onNavigate(href); }}
            onClose={() => setParentOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
