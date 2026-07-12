"use client";

import React, { memo } from "react";
import { motion } from "framer-motion";

interface Props {
  variant?: "meadow" | "forest" | "castle" | "village" | "treehouse" | "workshop" | "market";
}

// ── Bottom landscape (fades up into nothing) ───────────────
function BottomScene({ src, height = 250, opacity = 0.12 }: { src: string; height?: number; opacity?: number }) {
  return (
    <div className="absolute bottom-0 left-0 right-0" style={{
      height,
      opacity,
      maskImage: "linear-gradient(to top, black 20%, transparent 100%)",
      WebkitMaskImage: "linear-gradient(to top, black 20%, transparent 100%)",
    }}>
      <img src={src} alt="" className="w-full h-full object-cover object-bottom" draggable={false}  loading="lazy" />
    </div>
  );
}

// ── Side element (fades inward) ────────────────────────────
function SideElement({ src, side, bottom = 0, width = 200, height = 250, opacity = 0.1 }: {
  src: string; side: "left" | "right"; bottom?: number; width?: number; height?: number; opacity?: number;
}) {
  const fadeDir = side === "left" ? "to right" : "to left";
  return (
    <div className="absolute" style={{
      [side]: 0, bottom, width, height, opacity,
      maskImage: `linear-gradient(${fadeDir}, black 10%, transparent 80%), linear-gradient(to top, black 30%, transparent 90%)`,
      WebkitMaskImage: `linear-gradient(${fadeDir}, black 10%, transparent 80%), linear-gradient(to top, black 30%, transparent 90%)`,
      maskComposite: "intersect",
      WebkitMaskComposite: "source-in" as React.CSSProperties["WebkitMaskComposite"],
    }}>
      <img src={src} alt="" className="w-full h-full object-cover" draggable={false}
        style={side === "right" ? { transform: "scaleX(-1)" } : undefined}  loading="lazy" />
    </div>
  );
}

// ── Floating cloud (soft edges all around) ─────────────────
function Cloud({ src, x, y, opacity = 0.06, scale = 1, duration = 50 }: {
  src: string; x: string; y: string; opacity?: number; scale?: number; duration?: number;
}) {
  return (
    <motion.div className="absolute" style={{
      left: x, top: y, opacity, width: 220 * scale,
      maskImage: "radial-gradient(ellipse 50% 50%, black 20%, transparent 70%)",
      WebkitMaskImage: "radial-gradient(ellipse 50% 50%, black 20%, transparent 70%)",
    }}
      animate={{ x: [0, 25, 0] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
    >
      <img src={src} alt="" className="w-full h-auto" draggable={false}  loading="lazy" />
    </motion.div>
  );
}

// ── Background scenery (fills most of view, very faded) ────
function BackdropScene({ src, opacity = 0.06 }: { src: string; opacity?: number }) {
  return (
    <div className="absolute inset-0" style={{
      opacity,
      maskImage: "linear-gradient(to top, black 0%, transparent 60%), linear-gradient(to bottom, transparent 0%, black 30%)",
      WebkitMaskImage: "linear-gradient(to top, black 0%, transparent 60%), linear-gradient(to bottom, transparent 0%, black 30%)",
      maskComposite: "intersect",
      WebkitMaskComposite: "source-in" as React.CSSProperties["WebkitMaskComposite"],
    }}>
      <img src={src} alt="" className="w-full h-full object-cover object-bottom" draggable={false}  loading="lazy" />
    </div>
  );
}

// ── Birds flying across ────────────────────────────────────
function Birds() {
  const paths = [
    { startX: -30, y: "12%", delay: 0, dur: 18, scale: 1.2 },
    { startX: -30, y: "8%", delay: 6, dur: 22, scale: 0.9 },
    { startX: -30, y: "15%", delay: 12, dur: 20, scale: 1 },
  ];
  return (
    <>
      {paths.map((b, i) => (
        <motion.div key={i} className="absolute" style={{ top: b.y, opacity: 0.12 }}
          animate={{ x: [b.startX, typeof window !== "undefined" ? window.innerWidth + 50 : 1500] }}
          transition={{ duration: b.dur, repeat: Infinity, delay: b.delay, ease: "linear" }}>
          <svg width={30 * b.scale} height={20 * b.scale} viewBox="0 0 30 20" fill="none">
            <motion.path d="M15,12 Q10,4 2,6" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"
              animate={{ d: ["M15,12 Q10,4 2,6", "M15,12 Q10,8 2,10", "M15,12 Q10,4 2,6"] }}
              transition={{ duration: 0.4, repeat: Infinity }} />
            <motion.path d="M15,12 Q20,4 28,6" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"
              animate={{ d: ["M15,12 Q20,4 28,6", "M15,12 Q20,8 28,10", "M15,12 Q20,4 28,6"] }}
              transition={{ duration: 0.4, repeat: Infinity }} />
          </svg>
        </motion.div>
      ))}
    </>
  );
}

// ── Butterflies ────────────────────────────────────────────
function Butterflies() {
  const data = [
    { x: "20%", y: "35%", color: "rgba(244,114,182,0.5)", delay: 0, sz: 28 },
    { x: "60%", y: "45%", color: "rgba(167,139,250,0.4)", delay: 3, sz: 24 },
    { x: "80%", y: "30%", color: "rgba(251,191,36,0.4)", delay: 6, sz: 26 },
    { x: "40%", y: "55%", color: "rgba(52,211,153,0.4)", delay: 9, sz: 22 },
  ];
  return (
    <>
      {data.map((b, i) => (
        <motion.div key={i} className="absolute" style={{ left: b.x, top: b.y }}
          animate={{
            x: [0, 30, -20, 15, 0],
            y: [0, -20, -10, -30, 0],
          }}
          transition={{ duration: 12 + i * 2, repeat: Infinity, delay: b.delay, ease: "easeInOut" }}>
          <svg width={b.sz} height={b.sz * 0.75} viewBox="0 0 28 20">
            <motion.ellipse cx="9" cy="7" rx="8" ry="6" fill={b.color}
              animate={{ rx: [8, 2, 8] }}
              transition={{ duration: 0.5, repeat: Infinity }} />
            <motion.ellipse cx="19" cy="7" rx="8" ry="6" fill={b.color}
              animate={{ rx: [8, 2, 8] }}
              transition={{ duration: 0.5, repeat: Infinity }} />
            <ellipse cx="14" cy="10" rx="1.5" ry="7" fill={b.color} opacity={0.6} />
          </svg>
        </motion.div>
      ))}
    </>
  );
}

// ── Falling leaves ─────────────────────────────────────────
function FallingLeaves() {
  const leaves = [
    { x: "10%", delay: 0, dur: 10 }, { x: "30%", delay: 3, dur: 12 },
    { x: "55%", delay: 7, dur: 11 }, { x: "75%", delay: 2, dur: 13 },
    { x: "90%", delay: 5, dur: 10 },
  ];
  return (
    <>
      {leaves.map((l, i) => (
        <motion.div key={i} className="absolute" style={{ left: l.x, top: "-2%", opacity: 0.15 }}
          animate={{
            y: [0, typeof window !== "undefined" ? window.innerHeight + 20 : 900],
            x: [0, (i % 2 === 0 ? 40 : -40), (i % 2 === 0 ? -20 : 20), 0],
            rotate: [0, 180, 360],
          }}
          transition={{ duration: l.dur, repeat: Infinity, delay: l.delay, ease: "easeIn" }}>
          <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
            <path d="M10,0 Q18,6 14,14 Q10,20 7,24 Q3,18 0,14 Q-3,6 10,0Z"
              fill={i % 3 === 0 ? "rgba(134,239,172,0.7)" : i % 3 === 1 ? "rgba(251,191,36,0.6)" : "rgba(248,113,113,0.5)"} />
            <line x1="7" y1="24" x2="12" y2="3" stroke="white" strokeWidth="0.5" opacity="0.3" />
          </svg>
        </motion.div>
      ))}
    </>
  );
}

// ── Sparkles ───────────────────────────────────────────────
function Sparkles() {
  const data = [
    { x: "18%", y: "30%" }, { x: "42%", y: "50%" }, { x: "70%", y: "25%" },
    { x: "85%", y: "45%" }, { x: "30%", y: "65%" }, { x: "55%", y: "15%" },
  ];
  return (
    <>
      {data.map((s, i) => (
        <motion.div key={i} className="absolute" style={{ left: s.x, top: s.y }}
          animate={{
            opacity: [0, 0.5, 0],
            scale: [0.3, 1, 0.3],
            rotate: [0, 90, 180],
          }}
          transition={{ duration: 2.5, repeat: Infinity, delay: i * 1.3, ease: "easeInOut" }}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path d="M9 0L10.5 7L18 9L10.5 11L9 18L7.5 11L0 9L7.5 7Z" fill="white" opacity="0.5" />
          </svg>
        </motion.div>
      ))}
    </>
  );
}

// ── Animated flowers (swaying) ─────────────────────────────
function SwayingFlowers() {
  const flowers = [
    { x: "3%", e: "🌻", s: 26 }, { x: "8%", e: "🌷", s: 22 },
    { x: "90%", e: "🌸", s: 24 }, { x: "95%", e: "🌼", s: 20 },
    { x: "6%", e: "🌿", s: 18 }, { x: "93%", e: "🌺", s: 22 },
  ];
  return (
    <>
      {flowers.map((f, i) => (
        <motion.div key={i} className="absolute" style={{
          left: f.x, bottom: 10, fontSize: f.s, opacity: 0.15,
          transformOrigin: "bottom center",
        }}
          animate={{ rotate: [0, 6, -6, 4, -4, 0] }}
          transition={{ duration: 4 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}>
          {f.e}
        </motion.div>
      ))}
    </>
  );
}

// ── Rain ───────────────────────────────────────────────────
function Rain() {
  const drops = Array.from({ length: 40 }, (_, i) => ({
    x: `${(i * 2.5) % 100}%`,
    delay: (i * 0.15) % 2,
    dur: 0.8 + (i % 5) * 0.15,
    h: 14 + (i % 4) * 4,
    opacity: 0.08 + (i % 3) * 0.04,
  }));
  return (
    <>
      {drops.map((d, i) => (
        <motion.div key={i} className="absolute" style={{ left: d.x, top: -20 }}
          animate={{ y: [0, typeof window !== "undefined" ? window.innerHeight + 30 : 950] }}
          transition={{ duration: d.dur, repeat: Infinity, delay: d.delay, ease: "linear" }}>
          <div style={{
            width: 1.5,
            height: d.h,
            borderRadius: 2,
            opacity: d.opacity,
            background: "linear-gradient(to bottom, transparent, rgba(148,197,248,0.8))",
          }} />
        </motion.div>
      ))}
      {/* Splash ripples at bottom */}
      {Array.from({ length: 8 }, (_, i) => (
        <motion.div key={`sp${i}`} className="absolute rounded-full"
          style={{
            left: `${10 + (i * 12) % 85}%`,
            bottom: 5 + (i % 3) * 8,
            width: 8, height: 3,
            border: "1px solid rgba(148,197,248,0.15)",
            borderRadius: "50%",
          }}
          animate={{ scale: [0, 1.5, 0], opacity: [0.3, 0, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.25, ease: "easeOut" }}
        />
      ))}
    </>
  );
}

// ── Water flowing ──────────────────────────────────────────
function WaterFlow() {
  return (
    <div className="absolute bottom-0 left-0 right-0" style={{ height: 80, opacity: 0.1 }}>
      {/* Water body */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(to bottom, transparent 0%, rgba(56,189,248,0.15) 30%, rgba(56,189,248,0.25) 60%, rgba(14,165,233,0.2) 100%)",
        maskImage: "linear-gradient(to top, black 60%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to top, black 60%, transparent 100%)",
      }} />

      {/* Wave lines */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1440 80" preserveAspectRatio="none">
        {/* Main wave — top edge */}
        <motion.path
          d="M0,20 Q120,8 240,20 Q360,32 480,20 Q600,8 720,20 Q840,32 960,20 Q1080,8 1200,20 Q1320,32 1440,20"
          stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" fill="none"
          animate={{ d: [
            "M0,20 Q120,8 240,20 Q360,32 480,20 Q600,8 720,20 Q840,32 960,20 Q1080,8 1200,20 Q1320,32 1440,20",
            "M0,18 Q120,12 240,22 Q360,28 480,18 Q600,12 720,22 Q840,28 960,18 Q1080,12 1200,22 Q1320,28 1440,18",
            "M0,20 Q120,8 240,20 Q360,32 480,20 Q600,8 720,20 Q840,32 960,20 Q1080,8 1200,20 Q1320,32 1440,20",
          ]}}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Secondary wave */}
        <motion.path
          d="M0,35 Q180,25 360,35 Q540,45 720,35 Q900,25 1080,35 Q1260,45 1440,35"
          stroke="rgba(255,255,255,0.15)" strokeWidth="2" fill="none"
          animate={{ d: [
            "M0,35 Q180,25 360,35 Q540,45 720,35 Q900,25 1080,35 Q1260,45 1440,35",
            "M0,33 Q180,28 360,37 Q540,42 720,33 Q900,28 1080,37 Q1260,42 1440,33",
            "M0,35 Q180,25 360,35 Q540,45 720,35 Q900,25 1080,35 Q1260,45 1440,35",
          ]}}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        />

        {/* Deeper ripple */}
        <motion.path
          d="M0,50 Q200,42 400,50 Q600,58 800,50 Q1000,42 1200,50 Q1350,55 1440,48"
          stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" fill="none"
          animate={{ d: [
            "M0,50 Q200,42 400,50 Q600,58 800,50 Q1000,42 1200,50 Q1350,55 1440,48",
            "M0,48 Q200,44 400,52 Q600,55 800,48 Q1000,44 1200,52 Q1350,53 1440,50",
            "M0,50 Q200,42 400,50 Q600,58 800,50 Q1000,42 1200,50 Q1350,55 1440,48",
          ]}}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        />
      </svg>

      {/* Shimmer highlights moving across */}
      <motion.div className="absolute" style={{
        top: 15, width: 120, height: 8, borderRadius: 4,
        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
      }}
        animate={{ left: ["-10%", "110%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />
      <motion.div className="absolute" style={{
        top: 35, width: 80, height: 6, borderRadius: 3,
        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
      }}
        animate={{ left: ["-10%", "110%"] }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear", delay: 3 }}
      />
    </div>
  );
}

// ── Twinkling stars ────────────────────────────────────────
function StarField() {
  const stars = [
    { x: "8%", y: "6%" }, { x: "22%", y: "14%" }, { x: "45%", y: "5%" },
    { x: "68%", y: "10%" }, { x: "85%", y: "8%" }, { x: "35%", y: "20%" },
    { x: "55%", y: "24%" }, { x: "78%", y: "16%" }, { x: "15%", y: "28%" },
    { x: "92%", y: "22%" }, { x: "5%", y: "40%" }, { x: "60%", y: "35%" },
  ];
  return (
    <>
      {stars.map((s, i) => (
        <motion.div key={i} className="absolute"
          style={{ left: s.x, top: s.y }}
          animate={{ opacity: [0.05, 0.3, 0.05], scale: [0.8, 1.4, 0.8] }}
          transition={{ duration: 3 + (i % 4), repeat: Infinity, delay: i * 0.6, ease: "easeInOut" }}>
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path d="M7 0L8.5 5.5L14 7L8.5 8.5L7 14L5.5 8.5L0 7L5.5 5.5Z" fill="white" opacity="0.8" />
          </svg>
        </motion.div>
      ))}
    </>
  );
}

// ── Fireflies ──────────────────────────────────────────────
function Fireflies() {
  const flies = [
    { x: "12%", y: "50%" }, { x: "28%", y: "62%" }, { x: "48%", y: "55%" },
    { x: "65%", y: "68%" }, { x: "82%", y: "48%" }, { x: "38%", y: "72%" },
    { x: "58%", y: "42%" }, { x: "75%", y: "58%" },
  ];
  return (
    <>
      {flies.map((f, i) => (
        <motion.div key={i} className="absolute rounded-full"
          style={{
            left: f.x, top: f.y, width: 10, height: 10,
            background: "radial-gradient(circle, rgba(253,224,71,0.8) 0%, transparent 70%)",
            boxShadow: "0 0 16px 4px rgba(253,224,71,0.3)",
          }}
          animate={{
            opacity: [0, 0.9, 0],
            x: [0, (i % 2 === 0 ? 18 : -18), 0],
            y: [0, -14, 0],
          }}
          transition={{ duration: 3 + i * 0.4, repeat: Infinity, delay: i * 0.8, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}

// ── Variant compositions ───────────────────────────────────
const variantMap: Record<string, () => React.JSX.Element> = {

  // Home — Welcome Meadow
  meadow: () => (
    <>
      <StarField />
      <Fireflies />
      <Birds />
      <Butterflies />
      <Sparkles />
      <FallingLeaves />
      <BottomScene src="/magic/hills.jpg" height={300} opacity={0.14} />
      <SideElement src="/magic/tree.jpg" side="left" width={250} height={300} opacity={0.12} />
      <SideElement src="/magic/tree2.jpg" side="right" width={220} height={280} opacity={0.1} />
      <WaterFlow />
      <SwayingFlowers />
      <Cloud src="/magic/cloud.jpg" x="20%" y="2%" opacity={0.07} scale={1} duration={50} />
      <Cloud src="/magic/cloud.jpg" x="65%" y="5%" opacity={0.05} scale={0.7} duration={60} />
    </>
  ),

  // Stories — Story Forest
  forest: () => (
    <>
      <StarField />
      <Fireflies />
      <Rain />
      <FallingLeaves />
      <Butterflies />
      <Sparkles />
      <BottomScene src="/magic/trees.jpg" height={320} opacity={0.16} />
      <SideElement src="/magic/tree.jpg" side="left" width={280} height={350} opacity={0.14} />
      <SideElement src="/magic/tree2.jpg" side="right" width={260} height={330} opacity={0.12} />
      <WaterFlow />
      <SwayingFlowers />
      <Cloud src="/magic/clouds.jpg" x="15%" y="1%" opacity={0.05} scale={1.2} duration={55} />
    </>
  ),

  // Treasure — Achievement Castle
  castle: () => (
    <>
      <StarField />
      <Sparkles />
      <Birds />
      <BackdropScene src="/magic/mountains.jpg" opacity={0.08} />
      <BottomScene src="/magic/hills.jpg" height={200} opacity={0.1} />
      <SideElement src="/magic/castle.jpg" side="right" width={200} height={280} opacity={0.1} bottom={20} />
      <Cloud src="/magic/cloud.jpg" x="10%" y="3%" opacity={0.06} scale={0.9} duration={50} />
      <Cloud src="/magic/cloud.jpg" x="50%" y="1%" opacity={0.04} scale={0.7} duration={65} />
    </>
  ),

  // Community — Friendship Village
  village: () => (
    <>
      <StarField />
      <Fireflies />
      <Butterflies />
      <Birds />
      <Sparkles />
      <WaterFlow />
      <BottomScene src="/magic/hills.jpg" height={280} opacity={0.12} />
      <SideElement src="/magic/tree.jpg" side="left" width={200} height={260} opacity={0.1} />
      <SideElement src="/magic/tree2.jpg" side="right" width={180} height={240} opacity={0.08} />
      <SwayingFlowers />
      <Cloud src="/magic/cloud.jpg" x="25%" y="3%" opacity={0.06} scale={0.8} duration={48} />
      <Cloud src="/magic/clouds.jpg" x="60%" y="2%" opacity={0.04} scale={0.6} duration={55} />
    </>
  ),

  // Talk to Nimi — Treehouse
  treehouse: () => (
    <>
      <StarField />
      <Fireflies />
      <Rain />
      <FallingLeaves />
      <Butterflies />
      <Sparkles />
      <BottomScene src="/magic/trees.jpg" height={300} opacity={0.15} />
      <SideElement src="/magic/tree.jpg" side="left" width={280} height={350} opacity={0.14} />
      <SideElement src="/magic/tree2.jpg" side="right" width={250} height={320} opacity={0.12} />
      <WaterFlow />
      <SwayingFlowers />
      <Cloud src="/magic/cloud.jpg" x="35%" y="3%" opacity={0.05} scale={0.6} duration={50} />
    </>
  ),

  // Settings — Wizard's Workshop
  workshop: () => (
    <>
      <StarField />
      <Sparkles />
      <BackdropScene src="/magic/mountains.jpg" opacity={0.07} />
      <BottomScene src="/magic/hills.jpg" height={180} opacity={0.08} />
      <SideElement src="/magic/castle.jpg" side="right" width={180} height={250} opacity={0.08} bottom={10} />
    </>
  ),

  // Shop — Star Market
  market: () => (
    <>
      <StarField />
      <Sparkles />
      <Birds />
      <BottomScene src="/magic/hills.jpg" height={240} opacity={0.1} />
      <SideElement src="/magic/castle.jpg" side="left" width={180} height={250} opacity={0.08} bottom={10} />
      <SideElement src="/magic/tree.jpg" side="right" width={200} height={260} opacity={0.1} />
      <SwayingFlowers />
      <Cloud src="/magic/cloud.jpg" x="40%" y="2%" opacity={0.06} scale={0.8} duration={50} />
    </>
  ),
};

function MagicBackground({ variant = "meadow" }: Props) {
  const Variant = variantMap[variant] ?? variantMap.meadow;
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      <Variant />
    </div>
  );
}

export default memo(MagicBackground);
