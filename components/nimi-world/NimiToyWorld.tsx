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
import { BoardingPass, PassportControl } from "./JourneyDesk";
import { Caption, EdgeGate, IntroCinematic, Reel, SceneStage, WingSwitcher, type PlacedHotspot, type ReelKind } from "./WorldOverlays";
import { REELS, ZONES, ZONE_ORDER, type WorldZoneId } from "./scenes";
import { TARMAC_TILES, WORLD_THEMES, type WorldThemeId } from "./themes";
import { missionHref, nextSlotKey, type WorldChild, type WorldData } from "./worldData";
import { advanceJourney, hasReached, readJourney, useJourney, type JourneyStep } from "./journey";
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

/** The furthest stop a journey step unlocks (a returning child resumes there). */
const STEP_ZONE: Record<JourneyStep, WorldZoneId> = { control: "control", stamped: "gate", boarded: "cabin", landed: "book" };

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
}

export default function NimiToyWorld({
  data, loading = false, kids = [], activeChildId = null, childAge = null, onSelectChild, onNavigate, parentExtras,
}: NimiToyWorldProps) {
  const { theme, version, lang, copy, cssVars, setTheme, setVersion, setLang } = useNimiTheme();
  const webgl = useWebGL();
  const reduced = !!useReducedMotion();
  const vp = useViewport();
  const little = version.guidedSpotlight;
  const f = version.features;

  const story = data.stories.find((s) => s.id === data.currentStoryId);
  const storyId = story?.id ?? null;
  const step = useJourney(activeChildId, storyId);
  const storyDone = !!story && data.slots.length > 0 && data.slots.every((s) => s.completed);

  // Stops reached so far on this destination's journey; without a story the child may roam freely.
  const reached: WorldZoneId[] = useMemo(() => {
    if (!storyId) return ZONE_ORDER;
    const furthest = step ? STEP_ZONE[step] : "hall";
    return ZONE_ORDER.slice(0, ZONE_ORDER.indexOf(furthest) + 1);
  }, [storyId, step]);

  // Current stop lives in sessionStorage (back from a mission → same scene); a new session resumes at the furthest stop.
  const storedZone = useStored("session", ZONE_KEY) as WorldZoneId | null;
  const zone: WorldZoneId = storedZone && reached.includes(storedZone) ? storedZone : reached[reached.length - 1];
  const setZone = useCallback((z: WorldZoneId) => writeStored("session", ZONE_KEY, z), []);
  const introSeen = useStored("session", INTRO_KEY, "1"); // server: "seen" → no intro in SSR HTML
  const introDone = introSeen === "1";

  const [studio, setStudio] = useState<StudioItem | null>(null);
  const [desk, setDesk] = useState<"passport" | "pass" | null>(null);
  const [parentOpen, setParentOpen] = useState(false);
  const [reel, setReel] = useState<{ kind: ReelKind; then: () => void } | null>(null);
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

  /* ── pointer parallax shared by art + hotspots; the dust gets its own depth ── */
  const p = useParallax(!reduced && !studio && !desk);
  const tx = useTransform(p.x, (v) => v * -16);
  const ty = useTransform(p.y, (v) => v * -11);
  const rotY = useTransform(p.x, (v) => v * 1.3);
  const rotX = useTransform(p.y, (v) => v * -1);
  const parallax: MotionStyle = { x: tx, y: ty, rotateX: rotX, rotateY: rotY, scale: 1.07, transformPerspective: 1400 };

  const hintFor = useCallback((z: WorldZoneId, s: JourneyStep | null = step) => {
    if (loading) return copy.loading;
    switch (z) {
      case "hall": return little ? copy.helloLittle(data.childName) : copy.hello(data.childName);
      case "control": return hasReached(s, "stamped") ? copy.controlDone : little ? copy.controlLittle : copy.control;
      case "gate": return hasReached(s, "boarded") ? copy.gateDone : little ? copy.gateLittle : copy.gate;
      case "cabin": return copy.cabin;
      case "arrival": return f.flightGlobe ? copy.arrivalGlobe : copy.arrival;
      case "book": return storyDone ? copy.bookDone : little ? copy.bookLittle : copy.book;
    }
  }, [loading, little, copy, data.childName, f.flightGlobe, step, storyDone]);
  const hint = hintFor(zone);

  const speak = useCallback((text: string) => { void speakText(text, lang); }, [lang]);

  /** Piko talks: caption for readers, voice for everyone who taps him / for Little Explorers always. */
  const pikoSays = useCallback((text: string | null, voice = little) => {
    setSay(text);
    setCaptionOpen(true);
    setCaptionNonce((n) => n + 1);
    if (voice) speak(text ?? hint);
  }, [little, speak, hint]);

  /** Moves along the journey. Passport control and boarding can't be skipped — Piko sends the child back. */
  const go = useCallback((to: WorldZoneId) => {
    setStudio(null);
    setDesk(null);
    if (to === zone) return;
    const now = readJourney(activeChildId, storyId);
    if (storyId) {
      const toIdx = ZONE_ORDER.indexOf(to);
      if (toIdx >= ZONE_ORDER.indexOf("gate") && !hasReached(now, "stamped")) {
        pikoSays(copy.needPassport, true);
        if (zone === "control") setDesk("passport");
        return;
      }
      if (toIdx >= ZONE_ORDER.indexOf("cabin") && !hasReached(now, "boarded")) {
        pikoSays(copy.needBoarding, true);
        if (zone === "gate") setDesk("pass");
        return;
      }
      if (to === "control") advanceJourney(activeChildId, storyId, "control");
    }
    playTap();
    const arrive = () => {
      setZone(to);
      setSay(null);
      setCaptionOpen(true);
      setCaptionNonce((n) => n + 1);
      setChipsOpen(true);
      setChipsNonce((n) => n + 1);
      if (little) speak(hintFor(to, readJourney(activeChildId, storyId)));
    };
    if (zone === "cabin" && to === "arrival") {
      setReel({ kind: "takeoff", then: () => { advanceJourney(activeChildId, storyId, "landed"); arrive(); } });
    } else if (zone === "arrival" && to === "book") {
      setReel({ kind: "book", then: arrive });
    } else arrive();
  }, [zone, activeChildId, storyId, pikoSays, copy, setZone, little, speak, hintFor]);

  /** Leave the world for a real screen — always through the "PRÊT ?" beat. */
  const launch = useCallback((href: string | null) => {
    setStudio(null);
    setDesk(null);
    if (!href) { pikoSays(copy.noStory, true); return; }
    playPop();
    setReel({ kind: "ready", then: () => onNavigate(href) });
  }, [onNavigate, pikoSays, copy]);

  const nextHref = useMemo(() => {
    const k = nextSlotKey(data);
    if (k) return missionHref(data, k);
    return story ? `/stories/${story.slug}` : "/stories";
  }, [data, story]);

  /** One button for "what's next": the next stop of the journey, then the next mission. */
  const continueJourney = useCallback(() => {
    if (!storyId) { pikoSays(copy.noStory, true); return; }
    const now = readJourney(activeChildId, storyId);
    if (!hasReached(now, "stamped")) { if (zone === "control") { setStudio(null); setDesk("passport"); } else go("control"); return; }
    if (!hasReached(now, "boarded")) { if (zone === "gate") { setStudio(null); setDesk("pass"); } else go("gate"); return; }
    if (!hasReached(now, "landed")) { go(zone === "cabin" ? "arrival" : "cabin"); return; }
    if (zone !== "book") { go("book"); return; }
    launch(nextHref);
  }, [storyId, activeChildId, zone, go, launch, nextHref, pikoSays, copy.noStory]);

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
    if (!data.slots.some((s) => s.slotKey === slotKey)) { pikoSays(copy.soon, true); return; }
    if (t && little) speak(lang === "fr" ? t.fr : t.en);
    launch(missionHref(data, slotKey));
  }, [data, pikoSays, copy.soon, little, speak, lang, launch]);

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
    pikoSays(lang === "fr" ? `${WORLD_THEMES[id].emoji} Bienvenue dans ${w.fr} !` : `${WORLD_THEMES[id].emoji} Welcome to ${w.en}!`);
  }, [setTheme, pikoSays, lang]);

  /* ── journey desks ── */
  const onStamp = useCallback(() => {
    advanceJourney(activeChildId, storyId, "stamped");
    playStar();
    speak(copy.stamped);
  }, [activeChildId, storyId, speak, copy.stamped]);
  const onBoard = useCallback(() => {
    advanceJourney(activeChildId, storyId, "boarded");
    playUnlock();
    speak(copy.boarded);
    go("cabin");
  }, [activeChildId, storyId, speak, copy.boarded, go]);

  /* ── aura hotspots on the artwork (hidden while loading or when cropped off-screen) ── */
  const S = Math.max(vp.w, vp.h);
  const ox = (vp.w - S) * def.fx;
  const oy = (vp.h - S) * def.fy;
  const onScreen = (x: number, y: number) => {
    const X = ox + x * S, Y = oy + y * S;
    return X > 12 && X < vp.w - 12 && Y > 12 && Y < vp.h - 12;
  };
  // The 6 missions are painted in the open book; on narrow phones some fall outside the frame → golden tiles instead.
  const missionSpots = def.hotspots.filter((h) => h.kind === "mission");
  const bookFits = missionSpots.every((h) => onScreen(h.x, h.y));
  const nextSlot = nextSlotKey(data);
  const nextLabel: Partial<Record<WorldZoneId, string>> = { control: copy.toGate, gate: copy.toCabin, cabin: copy.toArrival };
  const hotspots: PlacedHotspot[] = loading ? [] : def.hotspots
    .filter((h) => onScreen(h.x, h.y) && !(h.kind === "mission" && !bookFits))
    .map((spot): PlacedHotspot => {
      switch (spot.kind) {
        case "kit": return { spot, label: copy.kit, strong: little && zone === "hall", onActivate: () => { playPop(); setStudio("kit"); if (little) speak(copy.tapKit); } };
        case "piko":
          if (zone === "book" && storyDone && story) {
            return { spot, label: copy.certificate, strong: true, onActivate: () => launch(`/stories/${story.slug}`) };
          }
          return { spot, label: copy.piko, strong: false, onActivate: () => { playTap(); pikoSays(null, true); } };
        case "desk": return {
          spot, label: copy.desk, strong: !hasReached(step, "stamped"),
          onActivate: () => { if (!story) { pikoSays(copy.noStory, true); return; } playPop(); setDesk("passport"); if (little) speak(copy.openPassport); },
        };
        case "pass": return {
          spot, label: copy.boardingTitle, strong: !hasReached(step, "boarded"),
          onActivate: () => { if (!story) { pikoSays(copy.noStory, true); return; } playPop(); setDesk("pass"); },
        };
        case "story": return { spot, label: story ? `${copy.toBook} — ${story.title}` : copy.toBook, strong: true, onActivate: () => go("book") };
        case "mission": {
          const t = tiles.find((x) => x.slotKey === spot.slotKey);
          const done = !!t?.done;
          return {
            spot,
            label: `${t?.label ?? ""}${done ? ` — ${copy.missionDone}` : ""}`,
            strong: spot.slotKey === nextSlot,
            badge: done ? "✓" : undefined,
            onActivate: () => onTile(spot.slotKey ?? ""),
          };
        }
        case "next": return { spot, label: nextLabel[def.id] ?? copy.continue, strong: false, onActivate: () => (def.next ? go(def.next) : undefined) };
      }
    });
  const kitSpot = def.hotspots.find((h) => h.kind === "kit" || h.kind === "pass") ?? ZONES.hall.hotspots[0];

  // Warm the optimised plates + reels so stops and "PRÊT ?" never flash an empty frame.
  useEffect(() => {
    const t = setTimeout(() => {
      const warm = (src: string) => {
        const { props } = getImageProps({ src, alt: "", fill: true, sizes: "(orientation: portrait) 100vh, 100vw" });
        const img = new window.Image();
        if (props.sizes) img.sizes = props.sizes;
        if (props.srcSet) img.srcset = props.srcSet;
        img.src = props.src;
      };
      [...ZONE_ORDER.map((z) => ZONES[z].plate), ...REELS.ready, ...REELS.takeoff, ...REELS.book].forEach(warm);
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  const showLabels = version.showLabels;
  const captionText = little ? null : captionOpen ? say ?? hint : null;
  const journeyStory = story ? { title: story.title, order: story.order } : null;

  return (
    <div
      className="nw-root"
      style={cssVars}
      data-world-theme={theme.id}
      data-kid-version={version.id}
      data-zone={zone}
      data-journey={step ?? "start"}
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
      {!loading && zone === "hall" && <EdgeGate label={copy.toControl} showLabel={showLabels} onClick={() => go("control")} />}

      {!loading && zone === "book" && !bookFits && (
        <RunwayTiles tiles={tiles} showLabels={showLabels} onSelect={onTile} align="center" ariaLabel={def.name[lang]} />
      )}

      <Caption text={captionText} onReplay={() => speak(say ?? hint)} replayLabel={say ?? hint} />

      <WingSwitcher
        theme={theme.id}
        versionId={version.id}
        lang={lang}
        zone={zone}
        zones={reached}
        showLabels={showLabels}
        bilingual={f.bilingualToggle}
        xp={f.xpVault ? { level: data.level, pct: data.xpPct } : null}
        labels={{ wing: copy.wing, hold: copy.wingHold, worlds: copy.worlds, versions: copy.versions, destinations: copy.destinations, language: copy.language }}
        onTheme={pickTheme}
        onVersion={(id) => { playTap(); setVersion(id); }}
        onLang={(l) => { playTap(); setLang(l); }}
        onZone={go}
        onParent={() => { playUnlock(); setStudio(null); setDesk(null); setParentOpen(true); }}
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
            showTiles={!storyId || hasReached(step, "landed")}
            onContinue={continueJourney}
            onClose={() => setStudio(null)}
            onLaunch={launch}
            onTile={onTile}
            onStory={onStory}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {desk === "passport" && journeyStory && (
          <PassportControl
            key="passport"
            backdrop={plate}
            copy={copy}
            showLabels={showLabels}
            touch={version.touchTarget}
            childName={data.childName}
            story={journeyStory}
            stamped={hasReached(step, "stamped")}
            speak={little ? speak : () => {}}
            onStamp={onStamp}
            onContinue={() => go("gate")}
            onClose={() => setDesk(null)}
          />
        )}
        {desk === "pass" && journeyStory && (
          <BoardingPass
            key="pass"
            backdrop={plate}
            copy={copy}
            showLabels={showLabels}
            touch={version.touchTarget}
            childName={data.childName}
            childAge={childAge}
            story={journeyStory}
            onBoard={onBoard}
            onClose={() => setDesk(null)}
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
            onNavigate={onNavigate}
            onClose={() => setParentOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
