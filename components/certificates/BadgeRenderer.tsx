"use client";

type Lang = "en" | "fr" | "rw";

export interface BadgeRendererProps {
  title: string;
  subtitle?: string;
  language?: Lang;
  scale?: number;
}

const D = 260;
const CX = D / 2;
const CY = D / 2;
const R_RING = 122;
const R_NAVY = 100;
const R_TEXT = 110;

export default function BadgeRenderer({
  title,
  subtitle,
  scale = 1,
}: BadgeRendererProps) {
  const topArc = `M ${CX - R_TEXT} ${CY} A ${R_TEXT} ${R_TEXT} 0 0 1 ${CX + R_TEXT} ${CY}`;
  const botArc = `M ${CX - R_TEXT} ${CY} A ${R_TEXT} ${R_TEXT} 0 0 0 ${CX + R_TEXT} ${CY}`;

  return (
    <div style={{
      width: D * scale, height: D * scale,
      position: "relative", flexShrink: 0,
    }}>
      <div style={{
        width: D, height: D,
        position: "absolute", top: 0, left: 0,
        transform: `scale(${scale})`, transformOrigin: "top left",
      }}>
        {/* SVG base: ring + curved text */}
        <svg
          viewBox={`0 0 ${D} ${D}`} width={D} height={D}
          style={{ position: "absolute", top: 0, left: 0 }}
        >
          <defs>
            <radialGradient id="bgr" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="45%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </radialGradient>
            <radialGradient id="nbg" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#1E40AF" />
              <stop offset="100%" stopColor="#1E3A8A" />
            </radialGradient>
            <radialGradient id="starg" cx="30%" cy="25%" r="75%">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="100%" stopColor="#D97706" />
            </radialGradient>
            <filter id="gshadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="rgba(0,0,0,0.35)" />
            </filter>
            <path id="topArcPath" d={topArc} />
            <path id="botArcPath" d={botArc} />
          </defs>

          {/* Outer gold ring */}
          <circle cx={CX} cy={CY} r={R_RING} fill="url(#bgr)" filter="url(#gshadow)" />

          {/* Ring highlight */}
          <circle cx={CX} cy={CY} r={R_RING - 6} fill="none"
            stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />
          <circle cx={CX} cy={CY} r={R_NAVY + 8} fill="none"
            stroke="rgba(255,255,255,0.18)" strokeWidth="1" />

          {/* Decorative ring lines (filigree effect) */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
            const rad = (deg * Math.PI) / 180;
            const x1 = CX + (R_NAVY + 2) * Math.cos(rad);
            const y1 = CY + (R_NAVY + 2) * Math.sin(rad);
            const x2 = CX + (R_RING - 4) * Math.cos(rad);
            const y2 = CY + (R_RING - 4) * Math.sin(rad);
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            );
          })}

          {/* Small gold stars at 3/9 o'clock */}
          {[-1, 1].map((side, i) => {
            const sx = CX + side * (R_RING - 14) - 7;
            const sy = CY - 7;
            return (
              <path key={i}
                d="M7 0.5l1.4 4.1H13l-3.4 2.5 1.3 4.1L7 9l-3.3 2.2 1.3-4.1L1.6 4.6H6z"
                fill="url(#starg)" stroke="#D97706" strokeWidth="0.4"
                transform={`translate(${sx}, ${sy})`}
              />
            );
          })}

          {/* Inner navy circle */}
          <circle cx={CX} cy={CY} r={R_NAVY} fill="url(#nbg)" />

          {/* Sparkles */}
          {[
            { x: CX - 28, y: CY - 24, s: 9 },
            { x: CX + 22, y: CY + 28, s: 7 },
            { x: CX - 10, y: CY + 36, s: 5 },
          ].map((sp, i) => (
            <text key={i} x={sp.x} y={sp.y} fontSize={sp.s}
              fill="rgba(255,255,255,0.35)" textAnchor="middle">✦</text>
          ))}

          {/* Top curved title text */}
          <text fill="#FDE047" fontFamily="'Baloo 2', cursive" fontWeight="900"
            fontSize="13" letterSpacing="2.5">
            <textPath href="#topArcPath" startOffset="50%" textAnchor="middle">
              {title.toUpperCase()}
            </textPath>
          </text>

          {/* Bottom curved subtitle text */}
          {subtitle && (
            <text fill="#FDE047" fontFamily="'Baloo 2', cursive" fontWeight="900"
              fontSize="10" letterSpacing="1.5">
              <textPath href="#botArcPath" startOffset="50%" textAnchor="middle">
                {subtitle.toUpperCase()}
              </textPath>
            </text>
          )}

          {/* Open book at bottom center of navy circle */}
          <text x={CX} y={CY + R_NAVY - 16} textAnchor="middle" fontSize="16">📖</text>
        </svg>

        {/* Nimi character */}
        <img
          src="/themes/default/characters/nimi.png"
          alt="Nimi"
          style={{
            position: "absolute",
            left: "20%", top: "24%",
            width: "38%", height: "auto",
            filter: "drop-shadow(2px 4px 8px rgba(0,0,0,0.22))",
            zIndex: 2,
          }}
         loading="lazy" />

        {/* Piko character */}
        <img
          src="/themes/default/characters/piko.png"
          alt="Piko"
          style={{
            position: "absolute",
            right: "18%", top: "38%",
            width: "25%", height: "auto",
            filter: "drop-shadow(2px 4px 8px rgba(0,0,0,0.22))",
            zIndex: 2,
          }}
         loading="lazy" />
      </div>
    </div>
  );
}
