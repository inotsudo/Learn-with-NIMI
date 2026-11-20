"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion, type MotionStyle } from "framer-motion";
import { INTRO_VIDEO, REELS, ZONES, ZONE_ORDER, type SceneHotspot, type WorldZoneId } from "./scenes";
import { KID_VERSIONS, KID_VERSION_IDS, WORLD_THEMES, WORLD_THEME_IDS, type KidVersionId, type WorldLang, type WorldTheme, type WorldThemeId } from "./themes";

const SPRING = { type: "spring", stiffness: 420, damping: 24 } as const;
const GLASS: CSSProperties = {
  background: "rgba(6, 16, 31, 0.38)",
  border: "1px solid rgba(253, 230, 138, 0.38)",
  backdropFilter: "blur(14px) saturate(1.4)",
  WebkitBackdropFilter: "blur(14px) saturate(1.4)",
};

/* ─── Full-bleed scene: art + mood grade + registered aura hotspots ────── */
export interface PlacedHotspot { spot: SceneHotspot; label: string; strong: boolean; onActivate: () => void }

export function SceneStage({
  src, fx, fy, theme, parallax, hotspots, showChips, introChips, minTouch, priority,
}: {
  src: string;
  fx: number;
  fy: number;
  theme: WorldTheme;
  /** Shared pointer-parallax transform (same for art and hotspots → they never drift apart). */
  parallax: MotionStyle;
  hotspots: PlacedHotspot[];
  showChips: boolean;
  /** Briefly reveal every label when a zone opens (Junior / Navigators). */
  introChips: boolean;
  minTouch: number;
  priority: boolean;
}) {
  return (
    <motion.div className="nw-layer" style={{ ...parallax, zIndex: 1 }}>
      <AnimatePresence initial={false}>
        <motion.div
          key={src}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.035 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* 100vw × 100vh, object-cover, edge to edge — the artwork is the world */}
          <Image
            src={src}
            alt=""
            fill
            priority={priority}
            sizes="(orientation: portrait) 100vh, 100vw"
            className="h-screen w-screen object-cover"
            style={{ objectPosition: `${fx * 100}% ${fy * 100}%`, filter: theme.plate.filter, transition: "filter 1s ease" }}
          />
          {/* non-destructive colour grade for the world theme */}
          <div className="absolute inset-0" style={{ background: theme.plate.tint, mixBlendMode: theme.plate.blend, opacity: theme.plate.tintOpacity, transition: "background 1s ease, opacity 1s ease" }} />
          <div className="nw-cover" style={{ "--fx": fx, "--fy": fy } as CSSProperties}>
            {hotspots.map((h, i) => (
              <AuraHotspot key={`${h.spot.kind}-${i}`} {...h} chip={showChips} showChip={introChips} minPx={minTouch} delay={0.35 + i * 0.12} />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

const GLINTS: [number, number, number][] = [[22, 26, 0], [74, 32, 0.8], [58, 78, 1.6]];

function AuraHotspot({
  spot, label, strong, onActivate, chip, showChip, minPx, delay,
}: PlacedHotspot & { chip: boolean; showChip: boolean; minPx: number; delay: number }) {
  return (
    <motion.button
      type="button"
      className={`nw-aura${strong ? " nw-aura--strong" : ""}`}
      aria-label={label}
      onClick={onActivate}
      style={{ left: `${spot.x * 100}%`, top: `${spot.y * 100}%`, width: `max(${spot.r * 200}%, ${minPx}px)`, x: "-50%", y: "-50%" }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ opacity: { delay, duration: 0.6 }, scale: { ...SPRING, delay } }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.94 }}
    >
      <span className="nw-aura__glow" aria-hidden="true" />
      <span className="nw-aura__ring" aria-hidden="true" />
      {GLINTS.map(([gx, gy, d]) => (
        <span key={`${gx}-${gy}`} className="nw-aura__glint" style={{ left: `${gx}%`, top: `${gy}%`, animationDelay: `${d}s` }} aria-hidden="true" />
      ))}
      {chip && <span className={`nw-chip${showChip ? " nw-chip--show" : ""}`} aria-hidden="true">{label}</span>}
    </motion.button>
  );
}

/** Light spilling in from the edge of the frame (used where the art has no gate to touch). */
export function EdgeGate({ label, showLabel, onClick }: { label: string; showLabel: boolean; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="nw-aura nw-edge-gate absolute"
      style={{ right: 0, width: 220, x: "50%", y: "-50%", zIndex: 4 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8, duration: 0.8 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.95 }}
    >
      <span className="nw-aura__glow" aria-hidden="true" />
      <span className="nw-aura__ring" aria-hidden="true" />
      <span
        className="absolute right-[58%] top-1/2 flex -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 font-baloo text-sm font-extrabold text-white"
        style={GLASS}
        aria-hidden="true"
      >
        <span className="text-lg">✈️</span>
        {showLabel && <span className="nw-edge-gate__label">{label}</span>}
        <span style={{ color: "#FDE68A" }}>›</span>
      </span>
    </motion.button>
  );
}

/* ─── Piko's caption (Junior / Navigators; Little Explorers hear it) ───── */
export function Caption({ text, onReplay, replayLabel }: { text: string | null; onReplay: () => void; replayLabel: string }) {
  return (
    <AnimatePresence>
      {text && (
        <motion.div
          key={text}
          className="absolute left-4 top-4 flex max-w-[min(420px,calc(100vw-110px))] items-center gap-3 rounded-2xl py-2 pl-3 pr-2 sm:left-6 sm:top-5"
          style={{ ...GLASS, zIndex: 6 }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35 }}
          role="status"
          aria-live="polite"
        >
          <span className="font-baloo text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: "#FDE68A" }}>Piko</span>
          <span className="font-baloo text-[15px] font-bold leading-snug text-white">{text}</span>
          <button type="button" onClick={onReplay} aria-label={replayLabel} className="nw-toy-btn grid h-9 w-9 shrink-0 place-items-center rounded-full text-base" style={{ background: "rgba(253,230,138,0.18)" }}>
            <span aria-hidden="true">🔊</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Aviation wing switcher (top-right) ───────────────────────────────── */
function WingGlyph() {
  return (
    <svg viewBox="0 0 48 24" width="30" height="15" aria-hidden="true">
      <defs>
        <linearGradient id="nw-wing-gold" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#FFF3C4" />
          <stop offset="1" stopColor="#D4A830" />
        </linearGradient>
      </defs>
      <g fill="url(#nw-wing-gold)">
        <path d="M24 9c-6-6-15-7-23-5 5 1 7 3 9 5-3-1-6-1-8 0 5 1 8 3 10 6-2-.5-4-.4-5 .3 5 .4 10 2 13 5l4-3z" />
        <path d="M24 9c6-6 15-7 23-5-5 1-7 3-9 5 3-1 6-1 8 0-5 1-8 3-10 6 2-.5 4-.4 5 .3-5 .4-10 2-13 5l-4-3z" />
        <circle cx="24" cy="12" r="4.2" />
      </g>
      <circle cx="24" cy="12" r="2" fill="#06101F" />
    </svg>
  );
}

const HOLD_MS = 3000;
const RING = 2 * Math.PI * 31;

export function WingSwitcher({
  theme, versionId, lang, zone, showLabels, bilingual, xp, labels,
  onTheme, onVersion, onLang, onZone, onParent,
}: {
  theme: WorldThemeId;
  versionId: KidVersionId;
  lang: WorldLang;
  zone: WorldZoneId;
  showLabels: boolean;
  bilingual: boolean;
  /** Sky Navigators: XP level ring around the emblem. */
  xp: { level: number; pct: number } | null;
  labels: { wing: string; hold: string; worlds: string; versions: string; destinations: string; language: string };
  onTheme: (id: WorldThemeId) => void;
  onVersion: (id: KidVersionId) => void;
  onLang: (l: WorldLang) => void;
  onZone: (z: WorldZoneId) => void;
  onParent: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);

  const start = () => {
    fired.current = false;
    setHolding(true);
    timer.current = setTimeout(() => { fired.current = true; setHolding(false); setOpen(false); onParent(); }, HOLD_MS);
  };
  const end = (activate: boolean) => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    setHolding(false);
    if (activate && !fired.current) setOpen((o) => !o);
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const chip = (active: boolean): CSSProperties => ({
    background: active ? "linear-gradient(135deg, #FDE68A, #D4A830)" : "rgba(255,247,224,0.07)",
    color: active ? "#06101F" : "#FFF7E0",
    border: `1px solid ${active ? "#FFF7E0" : "rgba(253,230,138,0.3)"}`,
  });

  return (
    <div className="absolute right-3 top-3 sm:right-5 sm:top-5" style={{ zIndex: 8 }}>
      {open && <button type="button" aria-hidden="true" tabIndex={-1} className="fixed inset-0 cursor-default" onClick={() => setOpen(false)} />}
      <button
        type="button"
        aria-label={`${labels.wing} — ${labels.hold}`}
        aria-expanded={open}
        className="nw-toy-btn relative grid h-[62px] w-[62px] place-items-center rounded-full transition-transform active:scale-95"
        style={{ ...GLASS, touchAction: "none" }}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); start(); }}
        onPointerUp={() => end(true)}
        onPointerCancel={() => end(false)}
        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !e.repeat) { e.preventDefault(); start(); } }}
        onKeyUp={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); end(true); } }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <svg className="absolute inset-0" viewBox="0 0 70 70" aria-hidden="true">
          {xp && (
            <circle cx="35" cy="35" r="31" fill="none" stroke="#FDE68A" strokeOpacity="0.85" strokeWidth="3" strokeLinecap="round"
              strokeDasharray={RING} strokeDashoffset={RING * (1 - xp.pct / 100)} transform="rotate(-90 35 35)" />
          )}
          <circle cx="35" cy="35" r="31" fill="none" stroke="#FFF7E0" strokeWidth="3.5" strokeLinecap="round"
            strokeDasharray={RING} strokeDashoffset={holding ? 0 : RING} transform="rotate(-90 35 35)"
            style={{ transition: holding ? `stroke-dashoffset ${HOLD_MS}ms linear` : "stroke-dashoffset 0.25s ease" }} />
        </svg>
        <WingGlyph />
        {xp && (
          <span className="absolute -bottom-1 -right-1 grid h-6 min-w-6 place-items-center rounded-full px-1 font-baloo text-[12px] font-black" style={{ background: "linear-gradient(135deg,#FDE68A,#D4A830)", color: "#06101F" }}>
            {xp.level}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 top-[72px] w-[min(320px,calc(100vw-24px))] rounded-3xl p-4 font-baloo"
            style={GLASS}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={SPRING}
            role="dialog"
            aria-label={labels.wing}
          >
            <Section title={labels.worlds} show={showLabels}>
              <div className="grid grid-cols-4 gap-2">
                {WORLD_THEME_IDS.map((id) => {
                  const t = WORLD_THEMES[id];
                  const active = id === theme;
                  return (
                    <button key={id} type="button" aria-label={t.name[lang]} aria-pressed={active} onClick={() => onTheme(id)} className="nw-toy-btn flex flex-col items-center gap-1">
                      <span className="grid h-12 w-12 place-items-center rounded-full text-xl"
                        style={{ background: `linear-gradient(160deg, ${t.colors.zenith}, ${t.colors.horizon} 70%, ${t.colors.base})`, boxShadow: active ? `0 0 0 3px #FDE68A, 0 0 18px ${t.colors.accent}` : "0 0 0 1px rgba(255,255,255,0.25)" }}>
                        <span aria-hidden="true">{t.emoji}</span>
                      </span>
                      {showLabels && <span className="text-center text-[10px] font-bold leading-tight text-white/85">{t.name[lang].split(" ").slice(0, 3).join(" ")}</span>}
                    </button>
                  );
                })}
              </div>
            </Section>
            <Section title={labels.versions} show={showLabels}>
              <div className="flex flex-col gap-1.5">
                {KID_VERSION_IDS.map((id) => {
                  const v = KID_VERSIONS[id];
                  const active = id === versionId;
                  return (
                    <button key={id} type="button" aria-label={`${v.name[lang]} ${v.ages}`} aria-pressed={active} onClick={() => onVersion(id)}
                      className="nw-toy-btn flex items-center gap-2 rounded-full px-3 py-1.5 text-left text-sm font-extrabold" style={chip(active)}>
                      <span aria-hidden="true" className="text-lg">{v.emoji}</span>
                      {showLabels ? <span className="flex-1">{v.name[lang]}</span> : <span className="flex-1" />}
                      <span className="text-xs opacity-80">{v.ages}</span>
                    </button>
                  );
                })}
              </div>
            </Section>
            {bilingual && (
              <Section title={labels.language} show={showLabels}>
                <div className="flex gap-2">
                  {(["fr", "en"] as const).map((l) => (
                    <button key={l} type="button" aria-pressed={lang === l} onClick={() => onLang(l)} className="nw-toy-btn flex-1 rounded-full px-3 py-1.5 text-sm font-extrabold" style={chip(lang === l)}>
                      {l === "fr" ? "🇫🇷 Français" : "🇬🇧 English"}
                    </button>
                  ))}
                </div>
              </Section>
            )}
            <Section title={labels.destinations} show={showLabels}>
              <div className="grid grid-cols-4 gap-2">
                {ZONE_ORDER.map((z) => {
                  const d = ZONES[z];
                  const active = z === zone;
                  return (
                    <button key={z} type="button" aria-label={d.name[lang]} aria-pressed={active} onClick={() => { setOpen(false); onZone(z); }} className="nw-toy-btn flex flex-col items-center gap-1">
                      <span className="relative block h-14 w-14 overflow-hidden rounded-2xl" style={{ boxShadow: active ? "0 0 0 3px #FDE68A" : "0 0 0 1px rgba(255,255,255,0.25)" }}>
                        <Image src={d.plate} alt="" fill sizes="56px" className="object-cover" style={{ objectPosition: `${d.fx * 100}% ${d.fy * 100}%` }} />
                      </span>
                      {showLabels && <span className="text-center text-[10px] font-bold leading-tight text-white/85">{d.name[lang]}</span>}
                    </button>
                  );
                })}
              </div>
            </Section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Section({ title, show, children }: { title: string; show: boolean; children: ReactNode }) {
  return (
    <section className="mb-3 last:mb-0" aria-label={title}>
      {show && <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "#FDE68A" }}>{title}</p>}
      {children}
    </section>
  );
}

/* ─── Cinematic reels built from the scene stills (full-bleed) ─────────── */
export function Reel({ kind, onDone }: { kind: "ready" | "takeoff"; onDone: () => void }) {
  const frames = useMemo(() => (kind === "ready" ? [REELS.ready] : REELS.takeoff), [kind]);
  const per = kind === "ready" ? 1300 : 900;
  const [i, setI] = useState(0);
  // The reel's clock starts once the first still has painted (or after 1.5 s on a slow network).
  const [ready, setReady] = useState(false);
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; }, [onDone]);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1500);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const ids = frames.map((_, k) => setTimeout(() => setI(k), k * per));
    const end = setTimeout(() => done.current(), frames.length * per);
    return () => { ids.forEach(clearTimeout); clearTimeout(end); };
  }, [ready, frames, per]);
  return (
    <motion.div className="nw-layer" style={{ zIndex: 40, background: "#06101F" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} aria-hidden="true">
      <AnimatePresence>
        <motion.div key={frames[i]} className="absolute inset-0" initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1.12 }} exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 0.35 }, scale: { duration: per / 1000 + 0.4, ease: "linear" } }}>
          <Image src={frames[i]} alt="" fill sizes="(orientation: portrait) 100vh, 100vw" className="h-screen w-screen object-cover" priority onLoad={() => setReady(true)} />
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Intro cinematic: Intro.mp4 boarding cut, full-bleed ──────────────── */
export function IntroCinematic({ onDone, skipLabel, showLabel }: { onDone: () => void; skipLabel: string; showLabel: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();
  const finished = useRef(false);
  const doneRef = useRef(onDone);
  useEffect(() => { doneRef.current = onDone; }, [onDone]);
  const finish = () => { if (!finished.current) { finished.current = true; doneRef.current(); } };

  useEffect(() => {
    const end = () => { if (!finished.current) { finished.current = true; doneRef.current(); } };
    if (reduce) { end(); return; }
    const v = video.current;
    // If the clip can't start (autoplay blocked / slow network) don't hold the child hostage.
    const guard = setTimeout(() => { if (!v || v.currentTime < 0.2) end(); }, 5000);
    v?.play().catch(end);
    return () => clearTimeout(guard);
  }, [reduce]);

  return (
    <motion.div className="nw-layer" style={{ zIndex: 50, pointerEvents: "auto", background: "#06101F" }}
      initial={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.06 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
      <video
        ref={video}
        className="absolute inset-0 h-screen w-screen object-cover"
        src={INTRO_VIDEO.src}
        poster={INTRO_VIDEO.poster}
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={finish}
        aria-hidden="true"
      />
      <motion.button
        type="button"
        onClick={finish}
        aria-label={skipLabel}
        className="nw-toy-btn absolute bottom-6 right-6 flex items-center gap-2 rounded-full px-5 py-3 font-baloo font-extrabold text-white"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING, delay: 1.2 }}
        whileTap={{ scale: 0.92 }}
        style={{ ...GLASS, minWidth: 72, minHeight: 64, justifyContent: "center" }}
      >
        {showLabel && <span className="text-lg">{skipLabel}</span>}
        <span aria-hidden="true" className="text-xl" style={{ color: "#FDE68A" }}>⏭</span>
      </motion.button>
    </motion.div>
  );
}
