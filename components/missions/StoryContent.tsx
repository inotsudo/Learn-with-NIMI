"use client";

import { useRef, useState, useEffect } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform, animate as fmAnimate } from "framer-motion";
import type { MotionValue } from "framer-motion";
import { Volume2, ChevronLeft, ChevronRight } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";
import type { Mission, StoryPage } from "@/lib/queries";
import { useLanguage } from "@/contexts/LanguageContext";
import { speakText, stopSpeaking } from "@/lib/speech";
import MissionCompleteBanner from "./MissionCompleteBanner";

interface StoryContentProps {
  mission: Mission;
  storyPages: StoryPage[];
  onComplete: () => void;
  completed: boolean;
  saving?: boolean;
}

// ── Book physical constants ──────────────────────────────────────────
const BW = 188;
const BH = 264;
const BD = 40;

const SPINE_GRADIENT = "linear-gradient(to bottom,#010b1e 0%,#0b1e4a 20%,#162f6e 50%,#0b1e4a 80%,#010b1e 100%)";
const PAGE_TEXTURE   = `repeating-linear-gradient(to right,#f9f5ec 0px,#f9f5ec 2px,#ddd5c4 2px,#ddd5c4 3px,#eee8d8 3px,#eee8d8 5px,#ccc4b2 5px,#ccc4b2 6px)`;

type BookPhase = "closed" | "straightening" | "flipping" | "open";

const SPARKLES = [
  { style: { top: -16, left: 22   }, delay: 0,   size: 18 },
  { style: { top: 10,  right: -6  }, delay: 0.7, size: 14 },
  { style: { bottom: 32, left: -8 }, delay: 1.3, size: 16 },
  { style: { top: 55,  right: 2   }, delay: 0.4, size: 12 },
  { style: { bottom: 10, right: 12 }, delay: 1.8, size: 14 },
  { style: { top: -8, left: 80    }, delay: 0.9, size: 11 },
];

// ── Gutter crease ────────────────────────────────────────────────────
function OpenBinding() {
  return (
    <div style={{
      width: 8, flexShrink: 0,
      background: "linear-gradient(to right,rgba(0,0,0,0.18) 0%,rgba(0,0,0,0.04) 40%,rgba(0,0,0,0.04) 60%,rgba(0,0,0,0.18) 100%)",
      boxShadow: "-6px 0 14px rgba(0,0,0,0.12),6px 0 14px rgba(0,0,0,0.12)",
    }} />
  );
}

// ── Single page ──────────────────────────────────────────────────────
function PagePanel({ page, side }: { page: StoryPage | null; side: "left" | "right" }) {
  const url = page?.image_url ? getStorageUrl(page.image_url) : null;
  return (
    <div className="relative flex-1 overflow-hidden select-none" style={{ background: "#faf7f2" }}>
      {url && <img src={url} alt="" className="absolute inset-0 w-full h-full object-contain" draggable={false} />}
      {side === "left"  && <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 36, background: "linear-gradient(to right,transparent,rgba(0,0,0,0.07))", pointerEvents: "none" }} />}
      {side === "right" && <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 36, background: "linear-gradient(to left,transparent,rgba(0,0,0,0.07))", pointerEvents: "none" }} />}
      {side === "left"  && <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 4, background: "linear-gradient(to right,rgba(0,0,0,0.05),transparent)", pointerEvents: "none" }} />}
      {side === "right" && <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 4, background: "linear-gradient(to left,rgba(0,0,0,0.05),transparent)", pointerEvents: "none" }} />}
    </div>
  );
}

// ── Single strip (1/N slice of the turning page) ─────────────────────
const STRIPS = 10;

interface StripProps {
  index: number;
  total: number;
  fwd: boolean;
  p: MotionValue<number>;
  frontPage: StoryPage | null;
  frontSide: "left" | "right";
  backPage:  StoryPage | null;
  backSide:  "left" | "right";
}

function Strip({ index, total, fwd, p, frontPage, frontSide, backPage, backSide }: StripProps) {
  const t    = index / (total - 1);   // 0 = binding edge, 1 = outer edge
  const sign = fwd ? -1 : 1;

  // ── Upgrade 1 + 8: nonlinear rotation per strip ──────────────────
  // Outer strips lead the binding strips (they peel first like real paper).
  // Within-strip curvature uses sin² so the belly is maximally curved
  // at the outer half, tapering to 0 at both binding and outer edge.
  const startDelay = (1 - t) * 0.18;         // outer (t=1) → 0, binding (t=0) → 0.18
  const rotateY = useTransform(p, (progress: number) => {
    const adj   = Math.max(0, Math.min(1.25, (progress - startDelay) / (1 - startDelay + 0.001)));
    const base  = adj * 180 * sign;
    const bell  = Math.sin(adj * Math.PI);    // 0→1→0 as adj goes 0→0.5→1
    const extra = Math.sin(t * Math.PI) * 70 * sign * bell; // Upgrade 8: sin curve over strip positions
    return base + extra;
  });

  // ── Upgrade 7: corner lift — outer strips rotateX ────────────────
  const liftMag = t > 0.65 ? ((t - 0.65) / 0.35) * -14 * sign : 0;
  const rotateX = useTransform(p, (progress: number) => {
    const adj = Math.max(0, Math.min(1, (progress - startDelay) / (1 - startDelay + 0.001)));
    return liftMag * Math.sin(adj * Math.PI); // peaks at midpoint, 0 at start/end
  });

  // ── Upgrade 2: spine compression — inner strips scaleX ───────────
  const compressMag = t < 0.35 ? (1 - t / 0.35) * 0.07 : 0;
  const scaleX = useTransform(p, (progress: number) => {
    const adj = Math.max(0, Math.min(1, (progress - startDelay) / (1 - startDelay + 0.001)));
    return 1 - compressMag * Math.sin(adj * Math.PI);
  });

  // ── Upgrade 5: self-shadow — each strip darkens near edge-on ─────
  const shadowOp = useTransform(p, (progress: number) => {
    const adj = Math.max(0, Math.min(1, (progress - startDelay) / (1 - startDelay + 0.001)));
    return 0.38 * Math.sin(adj * Math.PI);
  });

  // ── Upgrade 4: paper highlight — light catches the strip mid-peel ─
  const highlightOp = useTransform(p, (progress: number) => {
    const adj   = Math.max(0, Math.min(1, (progress - startDelay) / (1 - startDelay + 0.001)));
    const peak  = 0.38; // highlight peaks slightly before edge-on
    const gauss = Math.exp(-((adj - peak) ** 2) / (2 * 0.055 ** 2));
    return 0.72 * gauss;
  });

  // Strip width = 1/N of the right-page width
  // Front shows slice i of frontPage; back shows slice (N-1-i) of backPage
  return (
    <motion.div
      style={{
        position: "absolute", top: 0, bottom: 0,
        ...(fwd
          ? { left: `calc(50% + 4px + ${index} * (100% - 50% - 4px) / ${total})`,
              width: `calc((100% - 50% - 4px) / ${total})` }
          : { right: `calc(50% + 4px + ${index} * (100% - 50% - 4px) / ${total})`,
              width: `calc((100% - 50% - 4px) / ${total})` }),
        transformOrigin: fwd ? "0% 50%" : "100% 50%",
        transformStyle: "preserve-3d",
        rotateY,
        rotateX,
        scaleX,
      }}
    >
      {/* Front face */}
      <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: 0, bottom: 0, display: "flex",
          left: `${(fwd ? -index : -(total - 1 - index)) * 100}%`,
          width: `${total * 100}%`,
        }}>
          <PagePanel page={frontPage} side={frontSide} />
        </div>
        {/* Upgrade 5 — self-shadow */}
        <motion.div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,1)", opacity: shadowOp, pointerEvents: "none" }} />
        {/* Upgrade 4 — specular highlight sweep */}
        <motion.div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(90deg,transparent 5%,rgba(255,255,255,0.85) 50%,transparent 95%)",
          opacity: highlightOp, pointerEvents: "none",
        }} />
      </div>

      {/* Back face */}
      <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)", overflow: "hidden" }}>
        {/* Warm paper texture flash */}
        <div style={{ position: "absolute", inset: 0, background: PAGE_TEXTURE, opacity: 0.35 }} />
        <div style={{
          position: "absolute", top: 0, bottom: 0, display: "flex",
          left: `${(fwd ? -(total - 1 - index) : -index) * 100}%`,
          width: `${total * 100}%`,
        }}>
          <PagePanel page={backPage} side={backSide} />
        </div>
      </div>
    </motion.div>
  );
}

// ── 10-strip page curl ────────────────────────────────────────────────
function PageFlipAnimation({
  flipDir, currentLeft, currentRight, nextLeft, nextRight, onDone,
}: {
  flipDir: 1 | -1;
  currentLeft: StoryPage | null;
  currentRight: StoryPage | null;
  nextLeft: StoryPage | null;
  nextRight: StoryPage | null;
  onDone: () => void;
}) {
  const fwd = flipDir === 1;
  const p   = useMotionValue(0);

  // Upgrade 9 — receiving-page shadow
  const castShadow  = useTransform(p, [0, 0.3, 0.6, 1], [0, 0.50, 0.45, 0]);
  // Incoming spread is dim while covered, brightens as flip settles
  const newOpacity  = useTransform(p, [0, 0.72, 1], [0.62, 0.62, 1]);

  // Upgrade 3 — perspective origin follows the curl midpoint
  const perspNum    = useTransform(p, [0, 0.45, 1], fwd ? [52, 45, 50] : [48, 55, 50]);
  const perspOrigin = useTransform(perspNum, (v: number) => `${v}% 50%`);

  // Upgrade 10 — spring-driven flip (slow lift, float, settle)
  useEffect(() => {
    const ctrl = fmAnimate(p, 1, {
      type:      "spring" as const,
      stiffness: 88,
      damping:   16,
      mass:      0.75,
    });
    ctrl.then(onDone);
    return () => ctrl.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const frontPage = fwd ? currentRight : currentLeft;
  const frontSide = (fwd ? "right" : "left") as "left" | "right";
  const backPage  = fwd ? nextLeft    : nextRight;
  const backSide  = (fwd ? "left"   : "right") as "left" | "right";

  return (
    <div className="absolute inset-0">

      {/* Layer 0 — incoming spread, dimmed while covered */}
      <motion.div className="absolute inset-0 flex" style={{ opacity: newOpacity }}>
        <PagePanel page={nextLeft}  side="left" />
        <OpenBinding />
        <PagePanel page={nextRight} side="right" />
      </motion.div>

      {/* Layer 1 — non-turning current page + Upgrade 9 cast shadow */}
      <div className="absolute inset-y-0" style={fwd ? { left: 0, right: "50%", display: "flex" } : { left: "50%", right: 0, display: "flex" }}>
        <PagePanel page={fwd ? currentLeft : currentRight} side={fwd ? "left" : "right"} />
        <motion.div style={{
          position: "absolute", inset: 0,
          background: fwd
            ? "linear-gradient(to left,rgba(0,0,0,0.55) 0%,rgba(0,0,0,0.07) 65%,transparent 100%)"
            : "linear-gradient(to right,rgba(0,0,0,0.55) 0%,rgba(0,0,0,0.07) 65%,transparent 100%)",
          opacity: castShadow, pointerEvents: "none",
        }} />
      </div>

      {/* Layer 2 — binding crease */}
      <div className="absolute inset-y-0" style={{
        left: "calc(50% - 4px)", width: 8, zIndex: 10,
        background: "linear-gradient(to right,rgba(0,0,0,0.18) 0%,rgba(0,0,0,0.04) 40%,rgba(0,0,0,0.04) 60%,rgba(0,0,0,0.18) 100%)",
        boxShadow: "-6px 0 14px rgba(0,0,0,0.12),6px 0 14px rgba(0,0,0,0.12)",
      }} />

      {/* Upgrade 6 — page thickness stack at the binding */}
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} style={{
          position: "absolute", top: 0, bottom: 0,
          ...(fwd
            ? { left: `calc(50% + 4px + ${i * 0.45}px)`, width: 1.5 }
            : { right: `calc(50% + 4px + ${i * 0.45}px)`, width: 1.5 }),
          background: i % 2 === 0 ? "#faf7f2" : "#f0ebdf",
          zIndex: 4,
          opacity: 0.9,
        }} />
      ))}

      {/* Layer 3 — 10-strip curl with Upgrade 3 moving perspective */}
      <motion.div
        style={{
          position: "absolute", inset: 0,
          perspective: 620,
          perspectiveOrigin: perspOrigin,
          overflow: "visible",
          zIndex: 5,
        }}
      >
        {Array.from({ length: STRIPS }).map((_, i) => (
          <Strip
            key={i}
            index={i}
            total={STRIPS}
            fwd={fwd}
            p={p}
            frontPage={frontPage}
            frontSide={frontSide}
            backPage={backPage}
            backSide={backSide}
          />
        ))}
      </motion.div>
    </div>
  );
}

// ── 5-face 3D closed book ────────────────────────────────────────────
function Book3D({ phase, cover, title, onStraightenDone, onClick }: {
  phase: BookPhase; cover: StoryPage | null; title: string;
  onStraightenDone: () => void; onClick: () => void;
}) {
  const isMoving = phase === "straightening";
  return (
    <div style={{ perspective: 1400 }} onClick={isMoving ? undefined : onClick}
      className={isMoving ? "" : "cursor-pointer"}>
      <motion.div
        style={{ width: BW, height: BH, transformStyle: "preserve-3d", position: "relative" }}
        initial={{ rotateY: -30, rotateX: -16 }}
        animate={isMoving ? { rotateY: 0, rotateX: 0 } : { rotateY: -30, rotateX: -16 }}
        whileHover={!isMoving ? { rotateY: -36, rotateX: -20 } : undefined}
        transition={isMoving
          ? { type: "spring", stiffness: 200, damping: 28 }
          : { type: "spring", stiffness: 120, damping: 20 }}
        onAnimationComplete={() => { if (isMoving) onStraightenDone(); }}
      >
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", overflow: "hidden", borderRadius: "1px 8px 8px 1px", boxShadow: "inset -2px 0 6px rgba(0,0,0,0.12)" }}>
          {cover?.image_url ? (
            <img src={getStorageUrl(cover.image_url)} alt="Cover" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} draggable={false} />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, background: "linear-gradient(160deg,#1e3a8a 0%,#4338ca 100%)" }}>
              <span style={{ fontSize: 48 }}>📖</span>
              <p style={{ color: "white", fontWeight: 900, fontSize: 18, textAlign: "center", lineHeight: 1.3 }}>{title}</p>
            </div>
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(255,255,255,0.14) 0%,transparent 45%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 22, background: "linear-gradient(to right,rgba(0,0,0,0.28),transparent)", pointerEvents: "none" }} />
        </div>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: BD, transformOrigin: "left center", transform: "rotateY(90deg)", backfaceVisibility: "hidden", overflow: "hidden", background: SPINE_GRADIENT, boxShadow: "inset -2px 0 6px rgba(0,0,0,0.4)" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "8%", background: "linear-gradient(to bottom,#000510,#060e26)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "8%", background: "linear-gradient(to top,#000510,#060e26)" }} />
          {[18, 32, 50, 68, 82].map(p => (
            <div key={p} style={{ position: "absolute", left: 0, right: 0, top: `${p}%` }}>
              <div style={{ height: 2, background: "rgba(0,0,0,0.5)" }} />
              <div style={{ height: 1, background: "rgba(255,255,255,0.07)" }} />
            </div>
          ))}
          <div style={{ position: "absolute", top: "8%", bottom: "8%", right: 8, width: 1, background: "linear-gradient(to bottom,transparent,rgba(251,191,36,0.5) 25%,rgba(251,191,36,0.72) 50%,rgba(251,191,36,0.5) 75%,transparent)" }} />
          <div style={{ position: "absolute", inset: "18px 0", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <p style={{ fontSize: 7, fontWeight: 900, letterSpacing: "0.25em", color: "rgba(253,230,138,0.38)", writingMode: "vertical-rl", transform: "rotate(180deg)", userSelect: "none", overflow: "hidden" }}>{title}</p>
          </div>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: BD, transformOrigin: "top center", transform: "rotateX(-90deg)", backfaceVisibility: "hidden", background: PAGE_TEXTURE }} />
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: BD, transformOrigin: "right center", transform: "rotateY(-90deg)", backfaceVisibility: "hidden", background: PAGE_TEXTURE }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: BD, transformOrigin: "bottom center", transform: "rotateX(90deg)", backfaceVisibility: "hidden", background: PAGE_TEXTURE }} />
      </motion.div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────
export default function StoryContent({ mission, storyPages, onComplete, completed, saving: _saving }: StoryContentProps) {
  const { t, language } = useLanguage();

  const [phase, setPhase]             = useState<BookPhase>("closed");
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [isFlipping, setIsFlipping]   = useState(false);
  const [nextIndex, setNextIndex]     = useState(0);
  const [flipDir, setFlipDir]         = useState<1 | -1>(1);
  const [isSpeaking, setIsSpeaking]   = useState(false);
  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const touchStartX = useRef<number | null>(null);

  const isOpen       = phase === "open";
  const totalSpreads = Math.max(0, Math.ceil((storyPages.length - 1) / 2));
  const leftPage     = storyPages[1 + spreadIndex * 2]     ?? null;
  const rightPage    = storyPages[1 + spreadIndex * 2 + 1] ?? null;
  const nextLeftPage  = storyPages[1 + nextIndex * 2]      ?? null;
  const nextRightPage = storyPages[1 + nextIndex * 2 + 1]  ?? null;
  const isFirst      = spreadIndex === 0;
  const isLast       = spreadIndex >= totalSpreads - 1;

  useEffect(() => { if (!completed) onComplete(); /* eslint-disable-next-line */ }, []);
  useEffect(() => () => { stopSpeaking(); audioRef.current?.pause(); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "ArrowRight") goTo(spreadIndex + 1);
      if (e.key === "ArrowLeft")  goTo(spreadIndex - 1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    /* eslint-disable-next-line */
  }, [isOpen, spreadIndex, totalSpreads, isFlipping]);

  // ── Audio ─────────────────────────────────────────────────────────
  const stopAll = () => {
    stopSpeaking();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setIsSpeaking(false);
  };

  const playOnePage = (page: StoryPage | null, then: () => void) => {
    if (!page) { then(); return; }
    if (page.audio_url) {
      const au = new Audio(getStorageUrl(page.audio_url));
      audioRef.current = au;
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        audioRef.current = null;
        then();
      };
      const fallback = () => {
        if (settled) return;
        settled = true;
        audioRef.current = null;
        page.text && language !== "rw" ? speakText(page.text, language, { onEnd: then }) : then();
      };
      au.addEventListener("ended", done);
      au.addEventListener("error", fallback);
      au.play().catch(fallback);
      return;
    }
    page.text && language !== "rw" ? speakText(page.text, language, { onEnd: then }) : then();
  };

  const playSpread = () => {
    stopAll();
    if (!leftPage && !rightPage) return;
    setIsSpeaking(true);
    playOnePage(leftPage, () => playOnePage(rightPage, () => setIsSpeaking(false)));
  };

  const goTo = (idx: number) => {
    if (idx < 0 || idx >= totalSpreads || idx === spreadIndex || isFlipping) return;
    stopAll();
    setFlipDir(idx > spreadIndex ? 1 : -1);
    setNextIndex(idx);
    setIsFlipping(true);
  };

  const onFlipDone = () => {
    setSpreadIndex(nextIndex);
    setIsFlipping(false);
  };

  if (storyPages.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur rounded-3xl shadow-sm p-8 text-center space-y-2">
        <p className="text-4xl">📖</p>
        <p className="font-bold text-white">{t("noPagesTitle")}</p>
        <p className="text-sm text-purple-300">{t("noPagesHint")}</p>
      </div>
    );
  }

  const coverPage = storyPages[0] ?? null;

  return (
    <div className="space-y-3">

      {/* Title */}
      <div className="text-center px-4">
        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-0.5">{t("todaysStoryLabel")}</p>
        <p className="font-black text-white text-base leading-tight">{mission.title}</p>
        {mission.subtitle && <p className="text-xs text-purple-300 mt-0.5">{mission.subtitle}</p>}
      </div>

      <AnimatePresence mode="wait">

        {/* ── CLOSED / STRAIGHTENING ─────────────────────────── */}
        {(phase === "closed" || phase === "straightening") && (
          <motion.div
            key="pre-open"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-4 py-2"
          >
            <div style={{ position: "relative", display: "inline-block" }}>
              {/* Ambient glow */}
              {phase === "closed" && (
                <motion.div
                  animate={{ opacity: [0.3, 0.65, 0.3], scale: [0.85, 1.1, 0.85] }}
                  transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut" }}
                  style={{ position: "absolute", inset: "-20% -15%", background: "radial-gradient(ellipse,rgba(99,102,241,0.22),transparent 70%)", borderRadius: "50%", filter: "blur(16px)", zIndex: 0 }}
                />
              )}
              {/* Sparkles */}
              {phase === "closed" && SPARKLES.map((s, i) => (
                <motion.span key={i}
                  style={{ position: "absolute", fontSize: s.size, zIndex: 10, lineHeight: 1, ...s.style }}
                  animate={{ opacity: [0.25, 1, 0.25], scale: [0.7, 1.25, 0.7], rotate: [0, 18, 0] }}
                  transition={{ repeat: Infinity, duration: 2.2 + i * 0.35, delay: s.delay, ease: "easeInOut" }}
                >⭐</motion.span>
              ))}
              {/* Bobbing wrapper */}
              <motion.div
                style={{ position: "relative", zIndex: 5 }}
                animate={phase === "closed" ? { y: [0, -7, 0, -4, 0] } : { y: 0 }}
                transition={phase === "closed"
                  ? { repeat: Infinity, duration: 3.6, ease: "easeInOut" }
                  : { duration: 0.2 }}
              >
                <Book3D
                  phase={phase}
                  cover={coverPage}
                  title={mission.title}
                  onClick={() => setPhase("straightening")}
                  onStraightenDone={() => setPhase("flipping")}
                />
              </motion.div>
            </div>

            {/* Ground shadow */}
            <div style={{ width: 150, height: 14, background: "rgba(0,0,0,0.28)", filter: "blur(14px)", borderRadius: "50%", marginTop: -18 }} />

            {/* CTA button */}
            {phase === "closed" && (
              <motion.button
                onClick={() => setPhase("straightening")}
                animate={{ scale: [1, 1.07, 1] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                style={{ background: "linear-gradient(135deg,#f59e0b 0%,#ef4444 100%)", color: "white", borderRadius: 28, padding: "10px 28px", fontWeight: 900, fontSize: 15, letterSpacing: "0.04em", border: "none", cursor: "pointer", boxShadow: "0 4px 16px rgba(239,68,68,0.42),0 2px 4px rgba(0,0,0,0.12)" }}
              >
                📖 Open Book!
              </motion.button>
            )}
          </motion.div>
        )}

        {/* ── COVER FLIP (book opening) ───────────────────────── */}
        {phase === "flipping" && (
          <motion.div
            key="cover-flip"
            initial={{ opacity: 1 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            className="px-2"
          >
            <div
              className="relative overflow-hidden"
              style={{
                aspectRatio: "4/3",
                maxHeight: 480,
                borderRadius: 12,
                boxShadow: "0 1px 0 rgba(255,255,255,0.8) inset,0 2px 4px rgba(0,0,0,0.08),0 12px 32px rgba(0,0,0,0.20),0 40px 80px rgba(0,0,0,0.18)",
              }}
            >
              {/* First spread revealed behind the cover */}
              <div className="absolute inset-0 flex">
                <PagePanel page={storyPages[1] ?? null} side="left" />
                <OpenBinding />
                <PagePanel page={storyPages[2] ?? null} side="right" />
              </div>

              {/* Cover sits on the right half and flips left */}
              <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", right: 0, perspective: 1200 }}>
                <motion.div
                  style={{ position: "absolute", inset: 0, transformOrigin: "left center", transformStyle: "preserve-3d" }}
                  initial={{ rotateY: 0 }}
                  animate={{ rotateY: -162 }}
                  transition={{ duration: 0.62, ease: [0.4, 0, 0.2, 1] as [number,number,number,number] }}
                  onAnimationComplete={() => setPhase("open")}
                >
                  <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", overflow: "hidden" }}>
                    {coverPage?.image_url ? (
                      <img src={getStorageUrl(coverPage.image_url)} alt="Cover"
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} draggable={false} />
                    ) : (
                      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, background: "linear-gradient(160deg,#1e3a8a 0%,#4338ca 100%)" }}>
                        <span style={{ fontSize: 48 }}>📖</span>
                        <p style={{ color: "white", fontWeight: 900, fontSize: 18, textAlign: "center", lineHeight: 1.3 }}>{mission.title}</p>
                      </div>
                    )}
                  </div>
                  <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)", background: "linear-gradient(to right,#d6c9b0 0%,#e8dfc8 30%,#f0e8d4 100%)" }}>
                    <div style={{ position: "absolute", inset: 12, border: "1px solid rgba(0,0,0,0.06)", borderRadius: 4 }} />
                  </div>
                </motion.div>
              </div>

              {/* Binding crease */}
              <div style={{
                position: "absolute", top: 0, bottom: 0,
                left: "calc(50% - 4px)", width: 8, zIndex: 10,
                background: "linear-gradient(to right,rgba(0,0,0,0.18) 0%,rgba(0,0,0,0.04) 40%,rgba(0,0,0,0.04) 60%,rgba(0,0,0,0.18) 100%)",
                boxShadow: "-6px 0 14px rgba(0,0,0,0.12),6px 0 14px rgba(0,0,0,0.12)",
              }} />
            </div>
          </motion.div>
        )}

        {/* ── READING SPREAD ──────────────────────────────────── */}
        {phase === "open" && (
          <motion.div
            key="reading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="px-2"
          >
            <div
              className="relative overflow-hidden"
              style={{
                aspectRatio: "4/3",
                maxHeight: 480,
                borderRadius: 12,
                boxShadow: "0 1px 0 rgba(255,255,255,0.8) inset,0 2px 4px rgba(0,0,0,0.08),0 12px 32px rgba(0,0,0,0.20),0 40px 80px rgba(0,0,0,0.18)",
              }}
              onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
              onTouchEnd={e => {
                if (touchStartX.current === null) return;
                const dx = touchStartX.current - e.changedTouches[0].clientX;
                if (dx > 48) goTo(spreadIndex + 1);
                else if (dx < -48) goTo(spreadIndex - 1);
                touchStartX.current = null;
              }}
            >
              {/* Pages — 3D flip when navigating, static spread otherwise */}
              {isFlipping ? (
                <PageFlipAnimation
                  flipDir={flipDir}
                  currentLeft={leftPage}
                  currentRight={rightPage}
                  nextLeft={nextLeftPage}
                  nextRight={nextRightPage}
                  onDone={onFlipDone}
                />
              ) : (
                <div className="absolute inset-0 flex">
                  <PagePanel page={leftPage}  side="left" />
                  <OpenBinding />
                  <PagePanel page={rightPage} side="right" />
                </div>
              )}

              {/* Top edge paper highlight */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(to bottom,rgba(255,255,255,0.55),transparent)", pointerEvents: "none", zIndex: 50 }} />

              {/* Nav arrows — hidden during flip */}
              {!isFlipping && !isFirst && (
                <button onClick={() => goTo(spreadIndex - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full flex items-center justify-center bg-white/85 backdrop-blur-sm shadow-lg border border-white/50 hover:scale-110 active:scale-95 transition-transform text-gray-600">
                  <ChevronLeft size={20} strokeWidth={2.5} />
                </button>
              )}
              {!isFlipping && !isLast && (
                <button onClick={() => goTo(spreadIndex + 1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full flex items-center justify-center bg-white/85 backdrop-blur-sm shadow-lg border border-white/50 hover:scale-110 active:scale-95 transition-transform text-gray-600">
                  <ChevronRight size={20} strokeWidth={2.5} />
                </button>
              )}

              {/* Progress dots */}
              {!isFlipping && totalSpreads > 1 && (
                <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 5, zIndex: 40, alignItems: "center" }}>
                  {Array.from({ length: totalSpreads }).map((_, i) => (
                    <motion.button key={i} onClick={() => goTo(i)}
                      animate={{ width: i === spreadIndex ? 20 : 6, background: i === spreadIndex ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.45)" }}
                      transition={{ duration: 0.25 }}
                      style={{ height: 6, borderRadius: 3, border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
                    />
                  ))}
                </div>
              )}

              {/* "The End" badge */}
              {!isFlipping && isLast && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  style={{ position: "absolute", bottom: 34, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.60)", backdropFilter: "blur(8px)", color: "white", borderRadius: 20, padding: "5px 18px", fontWeight: 900, fontSize: 12, letterSpacing: "0.1em", whiteSpace: "nowrap", zIndex: 40 }}
                >
                  ✨ The End
                </motion.div>
              )}

              {/* Wide swipe zones */}
              {!isFlipping && !isFirst && <button onClick={() => goTo(spreadIndex - 1)} className="absolute inset-y-0 left-0 w-1/5 z-20" aria-hidden />}
              {!isFlipping && !isLast  && <button onClick={() => goTo(spreadIndex + 1)} className="absolute inset-y-0 right-0 w-1/5 z-20" aria-hidden />}
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Audio button */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center"
        >
          <button
            onClick={() => { if (isSpeaking) stopAll(); else playSpread(); }}
            aria-label={isSpeaking ? "Stop" : "Listen"}
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all active:scale-95 ${
              isSpeaking ? "bg-blue-600 text-white shadow-blue-200" : "bg-white/10 backdrop-blur text-blue-200 border border-white/20 hover:bg-white/20"
            }`}
          >
            <Volume2 size={20} />
          </button>
        </motion.div>
      )}

      {completed && <MissionCompleteBanner />}
    </div>
  );
}
