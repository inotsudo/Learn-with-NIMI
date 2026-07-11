"use client";

import React from "react";

type Lang = "en" | "fr" | "rw";

const MISSION_LISTS: Record<Lang, { name: string; emoji: string }[]> = {
  en: [
    { name: "FlipFlop Audio",   emoji: "🎧" },
    { name: "Story PDF",         emoji: "📖" },
    { name: "Coloring Page",     emoji: "🎨" },
    { name: "Move and Explore",  emoji: "👟" },
    { name: "Karaoke & Song",    emoji: "🎤" },
    { name: "Bonus Animation",   emoji: "🎬" },
  ],
  fr: [
    { name: "FlipFlop Audio",    emoji: "🎧" },
    { name: "Histoire PDF",      emoji: "📖" },
    { name: "Coloriage",         emoji: "🎨" },
    { name: "Bouge et Explore",  emoji: "👟" },
    { name: "Karaoké & Chanson", emoji: "🎤" },
    { name: "Vidéo Bonus",       emoji: "🎬" },
  ],
  rw: [
    { name: "FlipFlop Audio",        emoji: "🎧" },
    { name: "Inkuru PDF",            emoji: "📖" },
    { name: "Isura",                 emoji: "🎨" },
    { name: "Vuga no Gushakashaka",  emoji: "👟" },
    { name: "Indirimbo",             emoji: "🎤" },
    { name: "Filime Yongeraho",      emoji: "🎬" },
  ],
};

const COPY: Record<Lang, {
  congratulations: string;
  adventure: string;
  superExplorer: string;
  awardedTo: string;
  tagline: string;
  shieldLine1: string;
  shieldLine2: string;
}> = {
  en: {
    congratulations: "Congratulations, Champion!",
    adventure: "ADVENTURE COMPLETED",
    superExplorer: "★  SUPER EXPLORER  ★",
    awardedTo: "Awarded to:",
    tagline: "Grow With Every Story.",
    shieldLine1: "NIMIPIKO",
    shieldLine2: "CHAMPION",
  },
  fr: {
    congratulations: "Félicitations, Champion !",
    adventure: "MISSIONS ACCOMPLIES",
    superExplorer: "★  SUPER EXPLORATEUR  ★",
    awardedTo: "Décerné à :",
    tagline: "Grandis avec chaque histoire.",
    shieldLine1: "CHAMPION",
    shieldLine2: "NIMIPIKO",
  },
  rw: {
    congratulations: "Uragasiwe, Intwari!",
    adventure: "INZIRA YAKOZWE",
    superExplorer: "★  UMUSHAKASHATSI  ★",
    awardedTo: "Yatanzwe kuri:",
    tagline: "Kura na buri nkuru.",
    shieldLine1: "INTWARI",
    shieldLine2: "NIMIPIKO",
  },
};

interface StarSpec {
  top?: number | string;
  bottom?: number | string;
  left?: number | string;
  right?: number | string;
  size: number;
  fill: string;
  stroke: string;
  rotate: number;
}

const STARS: StarSpec[] = [
  { top: 14,    left: 16,    size: 34, fill: "#FCD34D", stroke: "#F59E0B", rotate: -15 },
  { top: 46,    left: 48,    size: 22, fill: "#FCD34D", stroke: "#F59E0B", rotate:  12 },
  { top: 10,    left: "44%", size: 18, fill: "#FCD34D", stroke: "#F59E0B", rotate:   5 },
  { top: 14,    right: 48,   size: 34, fill: "#FCD34D", stroke: "#F59E0B", rotate:  20 },
  { top: 18,    right: 10,   size: 46, fill: "#A78BFA", stroke: "#7C3AED", rotate:  -8 },
  { top: "26%", right: 12,   size: 22, fill: "#93C5FD", stroke: "#2563EB", rotate:  14 },
  { top: "40%", right: 16,   size: 18, fill: "#FCD34D", stroke: "#F59E0B", rotate:  -8 },
  { top: "53%", right: 12,   size: 20, fill: "#FCD34D", stroke: "#F59E0B", rotate:  10 },
  { bottom: 52, right: 20,   size: 26, fill: "#FDA4AF", stroke: "#F43F5E", rotate:   8 },
  { bottom: 30, right: 54,   size: 18, fill: "#93C5FD", stroke: "#2563EB", rotate:  -5 },
  { bottom: 56, left: 18,    size: 28, fill: "#FCD34D", stroke: "#F59E0B", rotate: -10 },
  { bottom: 32, left: 52,    size: 18, fill: "#4ADE80", stroke: "#15803D", rotate:  15 },
  { top: "28%", left: 12,    size: 24, fill: "#93C5FD", stroke: "#2563EB", rotate: -12 },
  { top: "44%", left: 20,    size: 18, fill: "#FCD34D", stroke: "#F59E0B", rotate:   8 },
];

function StarDecor({ s, i }: { s: StarSpec; i: number }) {
  const gid = `cs${i}`;
  const { size, fill, stroke, rotate, top, bottom, left, right } = s;
  const pos: React.CSSProperties = {};
  if (top    !== undefined) pos.top    = top;
  if (bottom !== undefined) pos.bottom = bottom;
  if (left   !== undefined) pos.left   = left;
  if (right  !== undefined) pos.right  = right;

  return (
    <div style={{ position: "absolute", width: size, height: size,
      transform: `rotate(${rotate}deg)`, zIndex: 2,
      pointerEvents: "none", userSelect: "none", ...pos }}>
      <svg viewBox="0 0 24 24" width={size} height={size} overflow="visible">
        <defs>
          <radialGradient id={gid} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="white" stopOpacity="0.55" />
            <stop offset="100%" stopColor={fill} />
          </radialGradient>
        </defs>
        <path d="M12 2.5l2.3 6.8H21l-5.6 4.1 2.1 6.8L12 16l-5.5 4.2 2.1-6.8L3 9.3h6.7z"
          fill={`url(#${gid})`} stroke={stroke} strokeWidth="0.6" />
      </svg>
    </div>
  );
}

function CheckCircle() {
  return (
    <div style={{
      width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg, #4ADE80 0%, #22C55E 100%)",
      border: "1.5px solid #15803D",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 2px 5px rgba(34,197,94,0.4)",
    }}>
      <svg viewBox="0 0 12 12" width="13" height="13">
        <path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="2"
          fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export interface CertificateRendererProps {
  childName?: string;
  storyTitle?: string;
  language?: Lang;
  bookNumber?: number;
  scale?: number;
}

const BASE_W = 500;
const BASE_H = 720;

export default function CertificateRenderer({
  childName = "Explorer",
  storyTitle,
  language = "en",
  scale = 1,
}: CertificateRendererProps) {
  const missions = MISSION_LISTS[language] ?? MISSION_LISTS.en;
  const copy = COPY[language] ?? COPY.en;

  const title3D: React.CSSProperties = {
    fontFamily: "var(--font-baloo), 'Baloo 2', cursive",
    fontWeight: 900,
    color: "#2563EB",
    WebkitTextStroke: "2px #1E3A8A",
    textShadow: "2px 2px 0 #1E3A8A, 4px 4px 0 rgba(30,58,138,0.45), 4px 5px 14px rgba(0,0,0,0.22)",
    letterSpacing: "-0.02em",
    lineHeight: 1,
  };

  const nimipikoStyle: React.CSSProperties = {
    fontFamily: "var(--font-baloo), 'Baloo 2', cursive",
    fontWeight: 900,
    color: "#FDE047",
    WebkitTextStroke: "3px #1D4ED8",
    textShadow: "2px 2px 0 #D97706, 4px 4px 0 rgba(146,64,14,0.5), 4px 4px 14px rgba(0,0,0,0.3)",
    letterSpacing: "-0.01em",
    lineHeight: 1,
  };

  return (
    <div style={{ width: BASE_W * scale, height: BASE_H * scale, position: "relative", flexShrink: 0 }}>
      <div style={{
        width: BASE_W, height: BASE_H,
        position: "absolute", top: 0, left: 0,
        transform: `scale(${scale})`, transformOrigin: "top left",
        borderRadius: 28, overflow: "hidden",
      }}>

        {/* Background */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: 28,
          background: "linear-gradient(160deg, #FDF4DC 0%, #F8EABC 60%, #F3E0A8 100%)",
        }} />

        {/* Gold border */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: 28,
          border: "6px solid #D4A832", pointerEvents: "none", zIndex: 1,
          boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.5), 0 20px 60px rgba(0,0,0,0.18)",
        }} />

        {/* Inner dashed border */}
        <div style={{
          position: "absolute", inset: 12, borderRadius: 20,
          border: "1.5px dashed rgba(212,168,50,0.5)", pointerEvents: "none", zIndex: 1,
        }} />

        {/* Stars */}
        {STARS.map((s, i) => <StarDecor key={i} s={s} i={i} />)}

        {/* Content */}
        <div style={{
          position: "relative", zIndex: 3, height: "100%",
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "20px 28px 14px",
        }}>

          {/* Book icon */}
          <div style={{ fontSize: 26, lineHeight: 1, marginBottom: 3 }}>📖</div>

          {/* STORY */}
          <div style={{ ...title3D, fontSize: 74 }}>STORY</div>

          {/* CERTIFICATE */}
          <div style={{ ...title3D, fontSize: 55, marginBottom: 8 }}>CERTIFICATE</div>

          {/* Story title (optional) */}
          {storyTitle && (
            <div style={{
              fontFamily: "var(--font-baloo), 'Baloo 2', cursive",
              fontWeight: 800, fontSize: 14, color: "#1E3A8A",
              textAlign: "center", marginBottom: 6, letterSpacing: "0.02em",
              maxWidth: "82%", lineHeight: 1.2,
            }}>
              {storyTitle.toUpperCase()}
            </div>
          )}

          {/* Ribbon */}
          <div style={{
            width: "82%",
            background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 50%, #1E40AF 100%)",
            clipPath: "polygon(18px 0%, calc(100% - 18px) 0%, 100% 50%, calc(100% - 18px) 100%, 18px 100%, 0% 50%)",
            padding: "8px 50px", marginBottom: 8,
            color: "white",
            fontFamily: "var(--font-baloo), 'Baloo 2', cursive",
            fontWeight: 800, fontSize: 14.5, textAlign: "center",
            boxShadow: "0 4px 14px rgba(29,78,216,0.4)",
          }}>
            {copy.congratulations}
          </div>

          {/* ADVENTURE COMPLETED */}
          <div style={{
            fontFamily: "var(--font-baloo), 'Baloo 2', cursive",
            fontWeight: 900, fontSize: 15.5, color: "#1E3A8A",
            letterSpacing: "0.04em", marginBottom: 8,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span>🌿</span><span>{copy.adventure}</span><span>🌿</span>
          </div>

          {/* Body: mascots + checklist */}
          <div style={{
            position: "relative", width: "100%", flex: 1, minHeight: 0,
            display: "flex", alignItems: "center",
          }}>

            {/* Nimi */}
            <img src="/themes/default/characters/nimi.png" alt="Nimi" style={{
              position: "absolute", left: -18, bottom: -4, width: 122, height: "auto",
              zIndex: 5, filter: "drop-shadow(4px 6px 14px rgba(0,0,0,0.18))",
            }} />

            {/* Checklist box */}
            <div style={{
              margin: "0 auto", width: "60%",
              background: "rgba(255,248,220,0.92)",
              border: "2px dashed #C4922A", borderRadius: 16,
              padding: "10px 14px",
              display: "flex", flexDirection: "column", gap: 7,
            }}>
              {missions.map((m, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle />
                  <span style={{
                    fontFamily: "var(--font-baloo), 'Baloo 2', cursive",
                    fontWeight: 700, fontSize: 13, color: "#1F2937", flex: 1,
                  }}>
                    {m.name}
                  </span>
                  <span style={{ fontSize: 15 }}>{m.emoji}</span>
                </div>
              ))}
            </div>

            {/* Piko */}
            <img src="/themes/default/characters/piko.png" alt="Piko" style={{
              position: "absolute", right: -18, top: 10, width: 94, height: "auto",
              zIndex: 5, filter: "drop-shadow(4px 6px 14px rgba(0,0,0,0.18))",
            }} />
          </div>

          {/* Bottom: medallion + NIMIPIKO + shield */}
          <div style={{
            width: "100%", display: "flex", alignItems: "center",
            justifyContent: "space-between", padding: "6px 2px 2px",
          }}>

            {/* Left medallion */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{
                width: 50, height: 50, borderRadius: "50%",
                background: "conic-gradient(from 0deg, #FDE68A 0deg, #F59E0B 90deg, #FCD34D 180deg, #D97706 270deg, #FDE68A 360deg)",
                border: "3px solid #D97706",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22,
                boxShadow: "0 4px 12px rgba(217,119,6,0.45), inset 0 1px 0 rgba(255,255,255,0.3)",
              }}>🌱</div>
              <div style={{ display: "flex", gap: 5, marginTop: -2 }}>
                {["-6deg", "6deg"].map((sk, i) => (
                  <div key={i} style={{
                    width: 9, height: 20, background: "#1D4ED8",
                    clipPath: "polygon(0 0, 100% 0, 100% 78%, 50% 100%, 0 78%)",
                    transform: `skewX(${sk})`,
                  }} />
                ))}
              </div>
            </div>

            {/* Center */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{
                background: "#1D4ED8", color: "white",
                fontFamily: "var(--font-baloo), 'Baloo 2', cursive",
                fontWeight: 800, fontSize: 11, padding: "3px 18px",
                borderRadius: 20, letterSpacing: "0.06em", marginBottom: 2,
              }}>
                {copy.superExplorer}
              </div>
              <div style={{ ...nimipikoStyle, fontSize: 50 }}>NIMIPIKO</div>
            </div>

            {/* Right shield (SVG for proper clipping + border) */}
            <svg viewBox="0 0 54 64" width="54" height="64">
              <defs>
                <linearGradient id="shieldG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#1E3A8A" />
                </linearGradient>
              </defs>
              <path d="M2 2 L52 2 L52 44 L27 62 L2 44 Z"
                fill="url(#shieldG)" stroke="#FCD34D" strokeWidth="2.5" />
              <text x="27" y="20" textAnchor="middle"
                fill="#FCD34D" fontFamily="'Baloo 2', cursive" fontWeight="900" fontSize="8">
                {copy.shieldLine1}
              </text>
              <text x="27" y="32" textAnchor="middle"
                fill="#FCD34D" fontFamily="'Baloo 2', cursive" fontWeight="900" fontSize="8">
                {copy.shieldLine2}
              </text>
              <text x="27" y="50" textAnchor="middle" fontSize="13">🌱</text>
            </svg>
          </div>

          {/* Footer */}
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2, marginTop: 4,
          }}>
            <div style={{
              fontFamily: "var(--font-nunito), 'Nunito', sans-serif",
              fontWeight: 600, fontSize: 12, color: "#6B7280",
            }}>
              {copy.awardedTo}
            </div>
            <div style={{
              fontFamily: "var(--font-baloo), 'Baloo 2', cursive",
              fontWeight: 900, fontSize: 20, color: "#1F2937",
              letterSpacing: "0.05em",
              borderBottom: "2px dashed #D4A832", paddingBottom: 3,
              minWidth: 150, textAlign: "center",
            }}>
              {childName.toUpperCase()}
            </div>
            <div style={{
              fontFamily: "var(--font-nunito), 'Nunito', sans-serif",
              fontWeight: 600, fontSize: 11, color: "#9CA3AF",
              display: "flex", alignItems: "center", gap: 5, marginTop: 1,
            }}>
              <span>—</span><span>🌱</span>
              <span>{copy.tagline}</span>
              <span>🌱</span><span>—</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
