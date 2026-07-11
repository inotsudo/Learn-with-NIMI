"use client";

import { useId } from "react";
import type { AvatarConfig, HairStyle, EyeShape, MouthStyle, OutfitStyle, AccessoryStyle } from "@/lib/avatarConfig";
import { darkenHex, lightenHex } from "@/lib/avatarConfig";

// ViewBox: 0 0 200 240
// Face ellipse: cx=100 cy=90 rx=56 ry=58  (top y=32, bottom y=148, sides x=44/156)
// Eyes:  LX=78  RX=122  EY=90
// Neck:  y=144–160   Body: y=153–240
// Light direction: top-left → highlights upper-left, shadows lower-right

interface Props {
  config: AvatarConfig;
  size?: number;
  className?: string;
}

// ─── Color helpers ────────────────────────────────────────────────────────────
const h  = (hex: string) => `#${hex}`;
const dk = (hex: string, n: number) => darkenHex(hex, n);
const lt = (hex: string, n: number) => lightenHex(hex, n);

const LINE    = "#1A0800";
const LINE_OP = 0.72;

// ─── Gradient defs ────────────────────────────────────────────────────────────

function GradDefs({ p, sk, hc, ec, bg }: { p: string; sk: string; hc: string; ec: string; bg: string }) {
  return (
    <defs>
      {/* Face — radial 3-D roundness, light from top-left */}
      <radialGradient id={`${p}face`} cx="38%" cy="28%" r="72%">
        <stop offset="0%"   stopColor={h(lt(sk, 38))} />
        <stop offset="48%"  stopColor={h(sk)} />
        <stop offset="100%" stopColor={h(dk(sk, 30))} />
      </radialGradient>

      {/* Ear */}
      <radialGradient id={`${p}ear`} cx="50%" cy="42%" r="65%">
        <stop offset="0%"   stopColor={h(sk)} />
        <stop offset="100%" stopColor={h(dk(sk, 30))} />
      </radialGradient>

      {/* Hair — shine → body → deep shadow */}
      <linearGradient id={`${p}hair`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor={h(lt(hc, 60))} stopOpacity="0.85" />
        <stop offset="16%"  stopColor={h(hc)} />
        <stop offset="100%" stopColor={h(dk(hc, 38))} />
      </linearGradient>

      {/* Iris */}
      <radialGradient id={`${p}iris`} cx="33%" cy="28%" r="72%">
        <stop offset="0%"   stopColor={h(lt(ec, 50))} />
        <stop offset="50%"  stopColor={h(ec)} />
        <stop offset="100%" stopColor={h(dk(ec, 44))} />
      </radialGradient>

      {/* Sclera — warm white */}
      <radialGradient id={`${p}sclera`} cx="35%" cy="28%" r="75%">
        <stop offset="0%"   stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#E8ECF5" />
      </radialGradient>

      {/* Background — lighter center */}
      <radialGradient id={`${p}bg`} cx="50%" cy="36%" r="62%">
        <stop offset="0%"   stopColor={h(lt(bg, 28))} />
        <stop offset="100%" stopColor={h(bg)} />
      </radialGradient>

      {/* Neck shadow */}
      <linearGradient id={`${p}neck`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor={h(dk(sk, 24))} />
        <stop offset="100%" stopColor={h(sk)} />
      </linearGradient>

      {/* Soft cheek blush — userSpaceOnUse for correct position */}
      <radialGradient id={`${p}blushL`} cx="65" cy="110" r="18" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stopColor="#FF8FAB" stopOpacity="0.52" />
        <stop offset="100%" stopColor="#FF8FAB" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${p}blushR`} cx="135" cy="110" r="18" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stopColor="#FF8FAB" stopOpacity="0.52" />
        <stop offset="100%" stopColor="#FF8FAB" stopOpacity="0" />
      </radialGradient>

      {/* Arm skin — for smooth arm tubes */}
      <linearGradient id={`${p}armL`} x1="1" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor={h(lt(sk, 20))} />
        <stop offset="100%" stopColor={h(dk(sk, 18))} />
      </linearGradient>
      <linearGradient id={`${p}armR`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%"   stopColor={h(lt(sk, 20))} />
        <stop offset="100%" stopColor={h(dk(sk, 18))} />
      </linearGradient>
    </defs>
  );
}

// ─── Background sparkles ──────────────────────────────────────────────────────

function Sparkles() {
  // 4-pointed star shapes at fixed positions around the character
  const stars: [number, number, number, number][] = [
    [22, 50, 5.5, 12],  [178, 56, 4.5, 0],  [12, 148, 5, 20],
    [188, 132, 4, -15], [38, 205, 4.5, 8],  [162, 200, 5, -10],
    [52, 20, 4, 30],    [148, 22, 4.5, -5],
  ];
  return (
    <g opacity="0.55">
      {stars.map(([x, y, r, rot], i) => {
        const s = r * 0.35;
        return (
          <path key={i}
            d={`M ${x} ${y-r} L ${x+s} ${y-s} L ${x+r} ${y} L ${x+s} ${y+s} L ${x} ${y+r} L ${x-s} ${y+s} L ${x-r} ${y} L ${x-s} ${y-s} Z`}
            fill="white" transform={`rotate(${rot} ${x} ${y})`}
          />
        );
      })}
    </g>
  );
}

// ─── Arms ─────────────────────────────────────────────────────────────────────

function WavingArm({ sk }: { sk: string }) {
  const c  = h(sk);
  const sh = h(dk(sk, 24));
  const hi = h(lt(sk, 26));

  return (
    <g>
      {/* Shadow layer */}
      <path d="M 64 162 C 52 148 36 130 20 100"
        stroke={sh} strokeWidth="34" fill="none" strokeLinecap="round" />
      {/* Skin fill */}
      <path d="M 64 162 C 52 148 36 130 20 100"
        stroke={c}  strokeWidth="28" fill="none" strokeLinecap="round" />
      {/* Highlight (top-left edge) */}
      <path d="M 60 157 C 48 143 32 125 16 96"
        stroke={hi} strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.4" />
      {/* Outline */}
      <path d="M 64 162 C 52 148 36 130 20 100"
        stroke={LINE} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity={LINE_OP} />
      {/* Elbow crease hint */}
      <path d="M 38 130 Q 34 136 30 130"
        stroke={sh} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.35" />

      {/* Palm */}
      <circle cx="17" cy="92" r="18" fill={c} stroke={LINE} strokeWidth="2.5" strokeOpacity={LINE_OP} />
      <ellipse cx="12" cy="87" rx="8" ry="5" fill={hi} opacity="0.32" transform="rotate(-20 12 87)" />
      <ellipse cx="22" cy="98" rx="10" ry="7" fill={sh} opacity="0.2" />

      {/* 4 fingers fanning upward-left */}
      {([
        [4,  81, -30],
        [11, 75, -14],
        [19, 73,   2],
        [27, 77,  16],
      ] as [number, number, number][]).map(([cx, cy, rot], i) => (
        <g key={i}>
          <ellipse cx={cx} cy={cy} rx={5.5} ry={9}
            fill={c} stroke={LINE} strokeWidth="1.5" strokeOpacity={LINE_OP}
            transform={`rotate(${rot} ${cx} ${cy})`} />
          {/* Finger crease */}
          <ellipse cx={cx} cy={cy + 2} rx={3.5} ry={1.5}
            fill={sh} opacity="0.18" transform={`rotate(${rot} ${cx} ${cy + 2})`} />
        </g>
      ))}
      {/* Thumb */}
      <ellipse cx="3" cy="96" rx="5" ry="7.5"
        fill={c} stroke={LINE} strokeWidth="1.5" strokeOpacity={LINE_OP}
        transform="rotate(-38 3 96)" />
    </g>
  );
}

function RestingArm({ sk }: { sk: string }) {
  const c  = h(sk);
  const sh = h(dk(sk, 24));
  const hi = h(lt(sk, 26));

  return (
    <g>
      <path d="M 136 162 C 150 168 162 176 168 190"
        stroke={sh} strokeWidth="32" fill="none" strokeLinecap="round" />
      <path d="M 136 162 C 150 168 162 176 168 190"
        stroke={c}  strokeWidth="26" fill="none" strokeLinecap="round" />
      <path d="M 134 160 C 148 166 160 174 165 188"
        stroke={hi} strokeWidth="9"  fill="none" strokeLinecap="round" opacity="0.4" />
      <path d="M 136 162 C 150 168 162 176 168 190"
        stroke={LINE} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity={LINE_OP} />

      {/* Palm */}
      <circle cx="170" cy="195" r="16" fill={c} stroke={LINE} strokeWidth="2.5" strokeOpacity={LINE_OP} />
      <ellipse cx="165" cy="191" rx="8" ry="5" fill={hi} opacity="0.28" transform="rotate(15 165 191)" />
      <ellipse cx="173" cy="200" rx="10" ry="7" fill={sh} opacity="0.18" />

      {/* 4 fingers pointing down */}
      {([
        [163, 207, 12],
        [169, 209,  0],
        [175, 208,-12],
        [179, 203,-22],
      ] as [number, number, number][]).map(([cx, cy, rot], i) => (
        <g key={i}>
          <ellipse cx={cx} cy={cy} rx={5} ry={8.5}
            fill={c} stroke={LINE} strokeWidth="1.5" strokeOpacity={LINE_OP}
            transform={`rotate(${rot} ${cx} ${cy})`} />
          <ellipse cx={cx} cy={cy - 2} rx={3} ry={1.5}
            fill={sh} opacity="0.18" transform={`rotate(${rot} ${cx} ${cy - 2})`} />
        </g>
      ))}
    </g>
  );
}

// ─── Hair ─────────────────────────────────────────────────────────────────────

function HairBack({ style, p }: { style: HairStyle; p: string }) {
  const f  = `url(#${p}hair)`;
  const lo = LINE_OP;

  switch (style) {
    case "straight":
      return <>
        <path d="M 44 90 C 38 114 36 155 40 204 C 44 216 58 218 64 208 C 60 180 58 146 60 108 Z"
          fill={f} stroke={LINE} strokeWidth="2" strokeOpacity={lo} />
        <path d="M 156 90 C 162 114 164 155 160 204 C 156 216 142 218 136 208 C 140 180 142 146 140 108 Z"
          fill={f} stroke={LINE} strokeWidth="2" strokeOpacity={lo} />
        {/* Strand lines on panels */}
        {[116, 128, 140, 152, 168, 184, 200].map(y => (
          <path key={y}
            d={`M 44 ${y} Q 52 ${y+2} 58 ${y}`}
            stroke="white" strokeWidth="1" fill="none" opacity="0.18" />
        ))}
        {[116, 128, 140, 152, 168, 184, 200].map(y => (
          <path key={y}
            d={`M 142 ${y} Q 150 ${y+2} 158 ${y}`}
            stroke="white" strokeWidth="1" fill="none" opacity="0.18" />
        ))}
      </>;

    case "braids":
      return <>
        <path d="M 57 122 C 51 146 49 174 53 202 C 57 214 68 216 73 207 C 71 190 71 168 73 148 Z"
          fill={f} stroke={LINE} strokeWidth="2" strokeOpacity={lo} />
        <path d="M 143 122 C 149 146 151 174 147 202 C 143 214 132 216 127 207 C 129 190 129 168 127 148 Z"
          fill={f} stroke={LINE} strokeWidth="2" strokeOpacity={lo} />
        {[152, 164, 176, 188, 200].map(y => (
          <g key={y}>
            <path d={`M 55 ${y} Q 64 ${y+5} 72 ${y} Q 64 ${y+11} 55 ${y+6} Z`} fill={LINE} opacity="0.1" />
            <path d={`M 128 ${y} Q 136 ${y+5} 144 ${y} Q 136 ${y+11} 128 ${y+6} Z`} fill={LINE} opacity="0.1" />
          </g>
        ))}
      </>;

    case "ponytail":
      return (
        <path d="M 97 36 C 93 58 92 82 94 124 C 95 154 93 178 91 206 C 93 216 107 216 109 206 C 107 178 105 154 106 124 C 108 82 107 58 103 36 Z"
          fill={f} stroke={LINE} strokeWidth="2" strokeOpacity={lo} />
      );

    case "afro":
      return <>
        <circle cx="100" cy="70" r="72" fill={f} />
        {([[38,80],[42,59],[54,42],[70,28],[88,20],[112,20],[130,28],[146,42],[158,59],[162,80]] as [number,number][]).map(([cx,cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="16" fill={f} />
        ))}
      </>;

    case "curly":
      return <>
        {([[50,84],[150,84],[68,63],[132,63],[100,54]] as [number,number][]).map(([cx,cy],i) => (
          <circle key={i} cx={cx} cy={cy} r="22" fill={f} />
        ))}
      </>;

    case "spiky":
    case "buns":
    case "short":
    default:
      return null;
  }
}

// Hair cap arch — draws the filled top-half of the head + horizontal strand lines
function HairCapWithStrands({ p }: { p: string }) {
  const f  = `url(#${p}hair)`;
  const lo = LINE_OP;
  return (
    <>
      <path d="M 44 90 A 56 58 0 0 1 156 90 Z" fill={f} stroke={LINE} strokeWidth="2.2" strokeOpacity={lo} />
      {/* Large shine */}
      <path d="M 58 66 Q 80 50 100 46 Q 120 50 142 66"
        stroke="white" strokeWidth="9" fill="none" strokeLinecap="round" opacity="0.2" />
      {/* Secondary strand lines following the head curve */}
      <path d="M 60 78 Q 80 68 100 66 Q 120 68 140 78"
        stroke="white" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.16" />
      <path d="M 52 90 Q 76 80 100 78 Q 124 80 148 90"
        stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.12" />
    </>
  );
}

function HairTop({ style, p }: { style: HairStyle; p: string }) {
  const f  = `url(#${p}hair)`;
  const lo = LINE_OP;

  switch (style) {
    case "buns":
      return <>
        <HairCapWithStrands p={p} />
        {/* Organic bun blobs — not perfect circles */}
        <path d="M 68 24 C 82 22 92 32 90 46 C 88 60 79 68 66 68 C 53 68 43 60 43 46 C 43 32 54 24 68 24 Z"
          fill={f} stroke={LINE} strokeWidth="2" strokeOpacity={lo} />
        <path d="M 132 24 C 146 24 157 32 157 46 C 157 60 147 68 134 68 C 121 68 112 60 112 46 C 112 32 122 22 132 24 Z"
          fill={f} stroke={LINE} strokeWidth="2" strokeOpacity={lo} />
        {/* Bun shines — top-left lit */}
        <ellipse cx="60" cy="38" rx="9" ry="6" fill="white" opacity="0.25" transform="rotate(-25 60 38)" />
        <ellipse cx="127" cy="36" rx="9" ry="6" fill="white" opacity="0.25" transform="rotate(22 127 36)" />
        {/* Bun spiral detail */}
        <path d="M 66 46 Q 73 40 66 36 Q 59 40 63 48"
          stroke={LINE} strokeWidth="1.5" fill="none" opacity="0.18" />
        <path d="M 134 46 Q 141 40 134 36 Q 127 40 131 48"
          stroke={LINE} strokeWidth="1.5" fill="none" opacity="0.18" />
        {/* Hair ties */}
        <ellipse cx="66" cy="66" rx="13" ry="5" fill={LINE} opacity="0.2" />
        <ellipse cx="134" cy="66" rx="13" ry="5" fill={LINE} opacity="0.2" />
      </>;

    case "afro": {
      return <>
        {([[100,20],[78,28],[122,28],[60,46],[140,46]] as [number,number][]).map(([cx,cy],i) => (
          <circle key={i} cx={cx} cy={cy} r="14" fill={f} />
        ))}
        {/* Afro outline arc */}
        <path d="M 38 82 C 38 20 162 20 162 82"
          stroke={LINE} strokeWidth="2.5" fill="none" strokeOpacity={lo} />
        {/* Shine — top-left */}
        <ellipse cx="78" cy="44" rx="24" ry="12" fill="white" opacity="0.16" transform="rotate(-25 78 44)" />
        {/* Texture dots */}
        {([[68,36],[82,28],[96,24],[112,28],[126,36],[58,54],[142,54]] as [number,number][]).map(([cx,cy],i) => (
          <circle key={i} cx={cx} cy={cy} r="2.5" fill={LINE} opacity="0.08" />
        ))}
      </>;
    }

    case "curly":
      return <>
        {([[78,52],[90,56],[100,52],[110,56],[122,52]] as [number,number][]).map(([cx,cy],i) => (
          <g key={i}>
            <circle cx={cx} cy={cy} r={13+(i%2)*2} fill={f} stroke={LINE} strokeWidth="1.8" strokeOpacity={lo} />
            {/* Coil shine */}
            <ellipse cx={cx-3} cy={cy-4} rx={4} ry={2.5} fill="white" opacity="0.22" transform={`rotate(-20 ${cx-3} ${cy-4})`} />
          </g>
        ))}
      </>;

    case "spiky": {
      const spiky = `M 44 90
        C 48 84 52 76 58 62
        C 60 52 64 40 68 38
        C 70 36 72 38 74 46
        C 76 56 78 64 80 68
        C 82 56 86 32 92 20
        C 94 14 98 12 100 12
        C 102 12 106 14 108 22
        C 114 36 116 56 118 66
        C 122 52 126 34 130 30
        C 132 28 136 30 138 40
        C 140 52 142 68 146 76
        C 148 82 152 88 156 90 Z`;
      return <>
        <path d={spiky} fill={f} stroke={LINE} strokeWidth="2.2" strokeOpacity={lo} />
        {/* Spike tip shines */}
        <path d="M 68 38 Q 84 20 100 12 Q 116 22 132 30"
          stroke="white" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.2" />
        {/* Inner spike strand lines */}
        <path d="M 72 62 C 78 52 84 36 92 22"
          stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.2" />
        <path d="M 116 64 C 118 50 122 36 128 32"
          stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.2" />
      </>;
    }

    case "ponytail":
      return <>
        <HairCapWithStrands p={p} />
        <ellipse cx="100" cy="42" rx="11" ry="5" fill={LINE} opacity="0.2" />
      </>;

    case "straight":
    case "braids":
    case "short":
    default:
      return <HairCapWithStrands p={p} />;
  }
}

// ─── Eyes ─────────────────────────────────────────────────────────────────────

const LX = 78, RX = 122, EY = 90;

function Lashes({ cx }: { cx: number }) {
  return <>
    <path d={`M ${cx-13} ${EY-3} Q ${cx} ${EY-17} ${cx+13} ${EY-3}`}
      stroke={LINE} strokeWidth="3.5" fill="none" strokeLinecap="round" />
    {([[-11,-9,-16,-16],[-4,-14,-5,-21],[4,-14,5,-21],[11,-9,16,-16]] as [number,number,number,number][]).map(([dx1,dy1,dx2,dy2],i) => (
      <line key={i} x1={cx+dx1} y1={EY+dy1} x2={cx+dx2} y2={EY+dy2}
        stroke={LINE} strokeWidth="1.5" strokeLinecap="round" />
    ))}
    {/* Lower lash hint */}
    <path d={`M ${cx-11} ${EY+11} Q ${cx} ${EY+14} ${cx+11} ${EY+11}`}
      stroke={LINE} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.4" />
  </>;
}

function EyeGlints({ cx }: { cx: number }) {
  return <>
    {/* Primary catchlight — large, top-left */}
    <ellipse cx={cx-4} cy={EY-4.5} rx={4.5} ry={3.5} fill="white" opacity="0.96" />
    {/* Secondary catchlight — small, bottom-right */}
    <circle  cx={cx+4.5} cy={EY+3} r={1.8} fill="white" opacity="0.72" />
    {/* Micro pupil highlight */}
    <circle  cx={cx-2} cy={EY+1} r={0.9} fill="white" opacity="0.5" />
  </>;
}

function OneEye({ cx, shape, p }: { cx: number; shape: EyeShape; p: string }) {
  const iG = `url(#${p}iris)`;
  const sG = `url(#${p}sclera)`;

  switch (shape) {
    case "big":
      return <g>
        <circle cx={cx} cy={EY} r={15} fill={sG} stroke={LINE} strokeWidth="2" strokeOpacity={LINE_OP} />
        <circle cx={cx} cy={EY} r={10.5} fill={iG} />
        {/* Iris depth ring */}
        <circle cx={cx} cy={EY} r={10.5} fill="none" stroke={LINE} strokeWidth="1" opacity="0.2" />
        <circle cx={cx} cy={EY} r={5.5} fill="#060300" />
        <EyeGlints cx={cx} />
        <Lashes cx={cx} />
      </g>;

    case "starry":
      return <g>
        <circle cx={cx} cy={EY} r={13} fill={sG} stroke={LINE} strokeWidth="2" strokeOpacity={LINE_OP} />
        <circle cx={cx} cy={EY} r={9} fill={iG} />
        <circle cx={cx} cy={EY} r={9} fill="none" stroke={LINE} strokeWidth="0.8" opacity="0.2" />
        {/* 4-pointed star catchlight */}
        <path d={[
          `M ${cx} ${EY-6.5}`,
          `L ${cx+1.8} ${EY-2} L ${cx+6.5} ${EY-2}`,
          `L ${cx+3} ${EY+1.2} L ${cx+4} ${EY+5.5}`,
          `L ${cx} ${EY+3}`,
          `L ${cx-4} ${EY+5.5} L ${cx-3} ${EY+1.2}`,
          `L ${cx-6.5} ${EY-2} L ${cx-1.8} ${EY-2} Z`,
        ].join(" ")} fill="white" opacity="0.92" />
        <Lashes cx={cx} />
      </g>;

    case "almond":
      return <g>
        <ellipse cx={cx} cy={EY} rx={13} ry={9} fill={sG} />
        <ellipse cx={cx} cy={EY} rx={8.5} ry={6} fill={iG} />
        <ellipse cx={cx} cy={EY} rx={4.5} ry={3.2} fill="#060300" />
        <EyeGlints cx={cx} />
        <path d={`M ${cx-13} ${EY} Q ${cx} ${EY-11} ${cx+13} ${EY} Q ${cx} ${EY+9} ${cx-13} ${EY}`}
          stroke={LINE} strokeWidth="2.5" fill="none" strokeOpacity={LINE_OP} />
      </g>;

    case "sleepy":
      return <g>
        <ellipse cx={cx} cy={EY+3} rx={12} ry={8} fill={sG} />
        <ellipse cx={cx} cy={EY+3} rx={7} ry={5} fill={iG} />
        <ellipse cx={cx} cy={EY+3} rx={3.5} ry={2.5} fill="#060300" />
        <ellipse cx={cx-2.5} cy={EY+1.5} rx={2.8} ry={2} fill="white" opacity="0.9" />
        <path d={`M ${cx-12} ${EY+3} Q ${cx} ${EY-7} ${cx+12} ${EY+3}`}
          stroke={LINE} strokeWidth="5" fill="none" strokeLinecap="round" strokeOpacity={LINE_OP} />
        <text x={cx+11} y={EY-15} fontSize="7" fill="#94A3B8" fontWeight="bold">z</text>
        <text x={cx+17} y={EY-22} fontSize="5" fill="#94A3B8" fontWeight="bold">z</text>
      </g>;

    case "round":
    default:
      return <g>
        <circle cx={cx} cy={EY} r={12} fill={sG} stroke={LINE} strokeWidth="2" strokeOpacity={LINE_OP} />
        <circle cx={cx} cy={EY} r={8} fill={iG} />
        <circle cx={cx} cy={EY} r={8} fill="none" stroke={LINE} strokeWidth="0.8" opacity="0.22" />
        <circle cx={cx} cy={EY} r={4.5} fill="#060300" />
        <EyeGlints cx={cx} />
        <path d={`M ${cx-12} ${EY-2} Q ${cx} ${EY-16} ${cx+12} ${EY-2}`}
          stroke={LINE} strokeWidth="3" fill="none" strokeLinecap="round" strokeOpacity={LINE_OP} />
      </g>;
  }
}

function Eyes({ shape, p }: { shape: EyeShape; p: string }) {
  return <>
    <OneEye cx={LX} shape={shape} p={p} />
    <OneEye cx={RX} shape={shape} p={p} />
  </>;
}

// ─── Eyebrows ─────────────────────────────────────────────────────────────────

function Eyebrows({ hc }: { hc: string }) {
  const c = h(dk(hc, 4));
  return <>
    <path d={`M ${LX-13} ${EY-19} Q ${LX} ${EY-26} ${LX+13} ${EY-17}`}
      stroke={c} strokeWidth="5" fill="none" strokeLinecap="round" />
    <path d={`M ${RX-13} ${EY-17} Q ${RX} ${EY-26} ${RX+13} ${EY-19}`}
      stroke={c} strokeWidth="5" fill="none" strokeLinecap="round" />
  </>;
}

// ─── Nose ─────────────────────────────────────────────────────────────────────

function Nose({ sk }: { sk: string }) {
  return <>
    <path d="M 97 110 Q 100 116 103 110"
      stroke={h(dk(sk, 36))} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.45" />
    {/* Nose highlight (top-left lit) */}
    <circle cx="101" cy="109" r="2" fill="white" opacity="0.48" />
  </>;
}

// ─── Mouth ────────────────────────────────────────────────────────────────────

function Mouth({ style }: { style: MouthStyle }) {
  const dark   = "#1A0800";
  const teeth  = "#FEFCFC";
  const tongue = "#F87191";

  const lipArch = (
    <path d="M 85 116 Q 93 112 100 114 Q 107 112 115 116"
      stroke={dark} strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.4" />
  );
  const lipGlow = (
    <ellipse cx="100" cy="129" rx="10" ry="2.8" fill="white" opacity="0.22" />
  );

  switch (style) {
    case "bigsmile":
      return <>
        <path d="M 80 118 Q 100 144 120 118 Z" fill={dark} />
        <path d="M 82 119 Q 100 139 118 119 Q 100 130 82 119 Z" fill={teeth} />
        <path d="M 80 118 Q 100 144 120 118" stroke={dark} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {lipArch}
        {lipGlow}
      </>;

    case "grin":
      return <>
        <path d="M 80 116 Q 100 138 120 116 Z" fill={dark} />
        <path d="M 82 117 Q 100 133 118 117 Z" fill={teeth} />
        <path d="M 80 116 Q 100 136 120 116" stroke={dark} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {lipArch}
        <ellipse cx="100" cy="128" rx="9" ry="2.5" fill="white" opacity="0.2" />
      </>;

    case "shy":
      return <>
        <path d="M 90 117 Q 100 127 110 117"
          stroke={dark} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M 91 117 Q 96 114 100 115 Q 104 114 109 117"
          stroke={dark} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.35" />
      </>;

    case "tongue":
      return <>
        <path d="M 82 116 Q 100 138 118 116 Z" fill={dark} />
        <path d="M 84 117 Q 100 133 116 117 Z" fill={teeth} />
        <ellipse cx="100" cy="130" rx="10.5" ry="8.5" fill={tongue} />
        {/* Tongue groove */}
        <line x1="100" y1="122" x2="100" y2="136" stroke={h("D35A70")} strokeWidth="1.5" opacity="0.45" strokeLinecap="round" />
        {/* Tongue highlight */}
        <ellipse cx="96" cy="126" rx="4" ry="2.5" fill="white" opacity="0.25" transform="rotate(-10 96 126)" />
        <path d="M 82 116 Q 100 136 118 116" stroke={dark} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {lipArch}
      </>;

    case "smile":
    default:
      return <>
        <path d="M 85 116 Q 100 132 115 116"
          stroke={dark} strokeWidth="3" fill="none" strokeLinecap="round" />
        {lipArch}
        <ellipse cx="100" cy="124" rx="7" ry="2" fill="white" opacity="0.18" />
      </>;
  }
}

// ─── Outfit ───────────────────────────────────────────────────────────────────

// Shared waist fold shadow used by all outfits
const FOLD = (
  <path d="M 70 178 Q 100 188 130 178"
    stroke={LINE} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.07" />
);

function Outfit({ style, color }: { style: OutfitStyle; color: string }) {
  const c  = h(color);
  const cd = h(dk(color, 32));
  const cl = h(lt(color, 26));
  const lo = LINE_OP;
  const ol = { stroke: LINE, strokeWidth: "2.5", strokeOpacity: lo } as const;

  const torso = "M 68 155 C 50 168 36 200 32 240 L 168 240 C 164 200 150 168 132 155 Z";

  switch (style) {
    case "overalls":
      return <>
        <path d={torso} fill={c} {...ol} />
        {/* Bib */}
        <rect x="83" y="148" width="34" height="44" rx="7" fill={cd}
          stroke={LINE} strokeWidth="1.8" strokeOpacity={lo} />
        {/* Pocket */}
        <rect x="91" y="158" width="18" height="14" rx="4" fill={c} opacity="0.4"
          stroke={LINE} strokeWidth="1.2" strokeOpacity="0.35" />
        <line x1="91" y1="165" x2="109" y2="165" stroke={LINE} strokeWidth="1" opacity="0.25" />
        {/* Straps */}
        {([[85,149,80,142,72,140,72,152],[115,149,120,142,128,140,128,152]] as number[][]).map((pts, i) => (
          <g key={i}>
            <path d={`M ${pts[0]} ${pts[1]} C ${pts[2]} ${pts[3]} ${pts[4]} ${pts[5]} ${pts[6]} ${pts[7]}`}
              stroke={cd} strokeWidth="10" fill="none" strokeLinecap="round" />
            <path d={`M ${pts[0]} ${pts[1]} C ${pts[2]} ${pts[3]} ${pts[4]} ${pts[5]} ${pts[6]} ${pts[7]}`}
              stroke={LINE} strokeWidth="2" fill="none" strokeLinecap="round" strokeOpacity={lo} />
          </g>
        ))}
        {/* Buttons */}
        <circle cx="72" cy="152" r="5" fill={cl} stroke={cd} strokeWidth="1.5" />
        <circle cx="128" cy="152" r="5" fill={cl} stroke={cd} strokeWidth="1.5" />
        {/* Button cross detail */}
        <line x1="70" y1="152" x2="74" y2="152" stroke={cd} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
        <line x1="72" y1="150" x2="72" y2="154" stroke={cd} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
        {FOLD}
      </>;

    case "dress":
      return <>
        <path d="M 70 155 C 50 170 20 202 14 240 L 186 240 C 180 202 150 170 130 155 Z"
          fill={c} {...ol} />
        {/* V-neck */}
        <path d="M 86 155 L 100 170 L 114 155" fill={cd} opacity="0.44"
          stroke={LINE} strokeWidth="1.5" strokeOpacity={lo} />
        {/* Waist sash */}
        <rect x="58" y="171" width="84" height="9" rx="4.5" fill={cd} opacity="0.38" />
        {/* Bow */}
        <path d="M 87 175 L 96 170 L 96 179 Z" fill={cd} opacity="0.7" />
        <path d="M 113 175 L 104 170 L 104 179 Z" fill={cd} opacity="0.7" />
        <circle cx="100" cy="175" r="4.5" fill={cl} stroke={cd} strokeWidth="1" />
        {/* Skirt fold lines */}
        <path d="M 40 200 Q 100 210 160 200" stroke={LINE} strokeWidth="1.5" fill="none" opacity="0.07" />
        <path d="M 30 218 Q 100 228 170 218" stroke={LINE} strokeWidth="1.5" fill="none" opacity="0.06" />
        {FOLD}
      </>;

    case "hoodie":
      return <>
        <path d={torso} fill={c} {...ol} />
        {/* Hood opening */}
        <path d="M 83 155 Q 100 162 117 155 Q 117 146 100 144 Q 83 146 83 155 Z"
          fill={cd} opacity="0.42" stroke={LINE} strokeWidth="1.5" strokeOpacity={lo} />
        {/* Pocket */}
        <rect x="82" y="172" width="36" height="30" rx="11" fill={cd} opacity="0.24"
          stroke={LINE} strokeWidth="1.5" strokeOpacity="0.32" />
        {/* Drawstrings */}
        {([95, 105] as number[]).map((x, i) => (
          <g key={i}>
            <line x1={x} y1="156" x2={i===0?91:109} y2="172"
              stroke={cd} strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
            <circle cx={i===0?91:109} cy="173" r="3.5" fill={cd} />
          </g>
        ))}
        {/* Sleeve cuffs */}
        <path d="M 34 170 Q 46 176 62 172" stroke={cd} strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.5" />
        <path d="M 166 170 Q 154 176 138 172" stroke={cd} strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.5" />
        {FOLD}
      </>;

    case "vest":
      return <>
        {/* White shirt */}
        <path d={torso} fill="#F8FAFC" {...ol} />
        {/* Left vest panel */}
        <path d="M 68 155 C 54 168 44 198 42 240 L 91 240 L 91 157 Z"
          fill={c} stroke={LINE} strokeWidth="1.8" strokeOpacity={lo} />
        {/* Right vest panel */}
        <path d="M 132 155 C 146 168 156 198 158 240 L 109 240 L 109 157 Z"
          fill={c} stroke={LINE} strokeWidth="1.8" strokeOpacity={lo} />
        {/* Collar */}
        <path d="M 87 155 L 100 167 L 113 155" fill="#E5E7EB"
          stroke={LINE} strokeWidth="1.5" strokeOpacity={lo} />
        {/* Shirt buttons */}
        {[168, 183, 198, 213].map(y => (
          <circle key={y} cx={100} cy={y} r={3.5} fill={cd}
            stroke={LINE} strokeWidth="1" strokeOpacity={lo} />
        ))}
        {/* Breast pocket */}
        <rect x="56" y="168" width="23" height="17" rx="3.5" fill={cd} opacity="0.26"
          stroke={LINE} strokeWidth="1.2" strokeOpacity="0.38" />
        <line x1="56" y1="176" x2="79" y2="176" stroke={LINE} strokeWidth="1" opacity="0.18" />
        {FOLD}
      </>;

    case "tshirt":
    default:
      return <>
        <path d={torso} fill={c} {...ol} />
        {/* Sleeves */}
        <path d="M 68 155 Q 46 150 32 172 Q 44 184 62 174 Z" fill={c}
          stroke={LINE} strokeWidth="2" strokeOpacity={lo} />
        <path d="M 132 155 Q 154 150 168 172 Q 156 184 138 174 Z" fill={c}
          stroke={LINE} strokeWidth="2" strokeOpacity={lo} />
        {/* Collar */}
        <path d="M 87 155 Q 100 165 113 155" stroke={cd} strokeWidth="2.5" fill="none" opacity="0.42" />
        {/* Side seam hints */}
        <path d="M 68 155 C 64 168 58 190 54 216" stroke={LINE} strokeWidth="1" fill="none" opacity="0.08" />
        <path d="M 132 155 C 136 168 142 190 146 216" stroke={LINE} strokeWidth="1" fill="none" opacity="0.08" />
        {FOLD}
      </>;
  }
}

// ─── Accessories ──────────────────────────────────────────────────────────────

function Accessories({ style, color }: { style: AccessoryStyle; color: string }) {
  const c  = h(color);
  const cd = h(dk(color, 26));
  const cl = h(lt(color, 42));

  switch (style) {
    case "earrings":
      return <>
        <circle cx="44" cy="100" r="5.5" fill={c} stroke={cd} strokeWidth="1.2" />
        <ellipse cx="42" cy="98" rx="2.5" ry="1.5" fill="white" opacity="0.5" transform="rotate(-25 42 98)" />
        <circle cx="156" cy="100" r="5.5" fill={c} stroke={cd} strokeWidth="1.2" />
        <ellipse cx="154" cy="98" rx="2.5" ry="1.5" fill="white" opacity="0.5" transform="rotate(-25 154 98)" />
        <line x1="44" y1="105" x2="44" y2="108" stroke={cd} strokeWidth="2" strokeLinecap="round" />
        <line x1="156" y1="105" x2="156" y2="108" stroke={cd} strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="44" cy="115" rx="4.5" ry="6.5" fill={c} stroke={cd} strokeWidth="1" />
        <ellipse cx="43" cy="112" rx="2" ry="1.5" fill="white" opacity="0.45" />
        <ellipse cx="156" cy="115" rx="4.5" ry="6.5" fill={c} stroke={cd} strokeWidth="1" />
        <ellipse cx="155" cy="112" rx="2" ry="1.5" fill="white" opacity="0.45" />
      </>;

    case "glasses":
      return <>
        <rect x="60" y="80" width="30" height="22" rx="9"
          stroke={c} strokeWidth="3.5" fill={cl} fillOpacity="0.18" />
        <rect x="110" y="80" width="30" height="22" rx="9"
          stroke={c} strokeWidth="3.5" fill={cl} fillOpacity="0.18" />
        <line x1="90" y1="91" x2="110" y2="91" stroke={c} strokeWidth="3" strokeLinecap="round" />
        <path d="M 60 89 Q 50 89 44 92" stroke={c} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M 140 89 Q 150 89 156 92" stroke={c} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {/* Lens shine */}
        <line x1="66" y1="83" x2="70" y2="89" stroke="white" strokeWidth="2" opacity="0.55" strokeLinecap="round" />
        <line x1="116" y1="83" x2="120" y2="89" stroke="white" strokeWidth="2" opacity="0.55" strokeLinecap="round" />
      </>;

    case "bow":
      return <>
        <path d="M 100 44 C 96 35 73 28 67 38 C 63 49 76 57 100 50 Z" fill={c} stroke={cd} strokeWidth="1.5" />
        <path d="M 100 44 C 104 35 127 28 133 38 C 137 49 124 57 100 50 Z" fill={c} stroke={cd} strokeWidth="1.5" />
        {/* Bow shadow folds */}
        <path d="M 100 44 C 96 35 73 28 67 38 C 63 49 76 57 100 50 Z" fill={cd} opacity="0.18" />
        <path d="M 100 44 C 104 35 127 28 133 38 C 137 49 124 57 100 50 Z" fill={cd} opacity="0.18" />
        <ellipse cx="100" cy="47" rx="9.5" ry="7" fill={cd} stroke={cd} strokeWidth="1" />
        {/* Bow shine */}
        <ellipse cx="78" cy="34" rx="6" ry="3.5" fill="white" opacity="0.24" transform="rotate(-15 78 34)" />
        <ellipse cx="122" cy="34" rx="6" ry="3.5" fill="white" opacity="0.24" transform="rotate(15 122 34)" />
        <ellipse cx="98" cy="45" rx="3" ry="2" fill="white" opacity="0.3" />
      </>;

    case "crown":
      return <>
        <path d="M 57 62 L 62 42 L 78 56 L 100 32 L 122 56 L 138 42 L 143 62 Z"
          fill={c} stroke={cd} strokeWidth="2" />
        <rect x="56" y="58" width="88" height="11" rx="4" fill={cd} stroke={cd} strokeWidth="1" />
        {/* Gems */}
        <ellipse cx="100" cy="38" rx="6.5" ry="5" fill="white" opacity="0.92" />
        <ellipse cx="75" cy="52" rx="5.5" ry="4" fill="white" opacity="0.82" />
        <ellipse cx="125" cy="52" rx="5.5" ry="4" fill="white" opacity="0.82" />
        {/* Crown band shine */}
        <path d="M 70 58 Q 100 54 130 58 Q 116 52 100 50 Q 84 52 70 58 Z" fill="white" opacity="0.16" />
        {/* Crown shine */}
        <path d="M 78 56 Q 100 38 122 56 L 122 48 Q 100 30 78 48 Z" fill="white" opacity="0.12" />
      </>;

    case "headband": {
      const bandY = (x: number) => 80 - Math.sin((x - 46) / 108 * Math.PI) * 18;
      return <>
        <path d="M 46 80 Q 100 62 154 80" stroke={h(dk(color, 20))} strokeWidth="13" fill="none" strokeLinecap="round" />
        <path d="M 46 80 Q 100 62 154 80" stroke={c} strokeWidth="11" fill="none" strokeLinecap="round" />
        <path d="M 46 80 Q 100 62 154 80" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.28" />
        {/* Flower at crown */}
        {[0, 60, 120, 180, 240, 300].map((a, i) => (
          <ellipse key={i}
            cx={100 + 10 * Math.cos(a * Math.PI / 180)}
            cy={68  + 10 * Math.sin(a * Math.PI / 180)}
            rx="6.5" ry="6.5"
            fill={i % 2 === 0 ? c : cl}
            stroke={cd} strokeWidth="0.8"
          />
        ))}
        <circle cx="100" cy="68" r="6" fill="white" />
        <circle cx="100" cy="68" r="2.5" fill="#FCD34D" />
        <circle cx="99" cy="67" r="1" fill="white" opacity="0.6" />
      </>;
    }

    case "none":
    default:
      return null;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AvatarSvg({ config, size = 160, className }: Props) {
  const rawId = useId();
  const p = rawId.replace(/[^a-zA-Z0-9]/g, "_");

  const { sk, hr, hc, ey, ec, mo, ot, oc, ac, ab, bg } = config;

  return (
    <svg
      viewBox="0 0 200 240"
      width={size}
      height={Math.round(size * 1.2)}
      className={className}
      style={{ display: "block" }}
      aria-hidden
    >
      <GradDefs p={p} sk={sk} hc={hc} ec={ec} bg={bg} />

      {/* 1. Background */}
      <circle cx="100" cy="118" r="116" fill={`url(#${p}bg)`} />
      <Sparkles />

      {/* 2. Hair behind head */}
      <HairBack style={hr} p={p} />

      {/* 3. Resting arm (right) — behind body */}
      <RestingArm sk={sk} />

      {/* 4. Outfit / body */}
      <Outfit style={ot} color={oc} />

      {/* 5. Waving arm (left) — in front of body */}
      <WavingArm sk={sk} />

      {/* 6. Neck */}
      <rect x="88" y="144" width="24" height="16" rx="5" fill={`url(#${p}neck)`} />
      {/* Collarbone hint */}
      <path d="M 82 160 Q 100 163 118 160"
        stroke={h(dk(sk, 18))} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.28" />

      {/* 7. Ears — behind face */}
      <ellipse cx="44" cy="93" rx="12" ry="15"
        fill={`url(#${p}ear)`} stroke={LINE} strokeWidth="2.2" strokeOpacity={LINE_OP} />
      <ellipse cx="156" cy="93" rx="12" ry="15"
        fill={`url(#${p}ear)`} stroke={LINE} strokeWidth="2.2" strokeOpacity={LINE_OP} />
      {/* Inner pinna curves */}
      <path d="M 40 84 Q 44 93 42 103"
        stroke={LINE} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.2" />
      <path d="M 160 84 Q 156 93 158 103"
        stroke={LINE} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.2" />

      {/* 8. Face — gradient + cartoon outline */}
      <ellipse cx="100" cy="90" rx="56" ry="58"
        fill={`url(#${p}face)`} stroke={LINE} strokeWidth="2.8" strokeOpacity={LINE_OP} />

      {/* 9. Face form lighting */}
      {/* Sphere highlight — large soft ellipse, top-left */}
      <ellipse cx="76" cy="60" rx="24" ry="16" fill="white" opacity="0.16"
        transform="rotate(-28 76 60)" />
      {/* Right-side shadow — subtle depth */}
      <ellipse cx="138" cy="100" rx="18" ry="28" fill={LINE} opacity="0.055" />
      {/* Chin highlight */}
      <ellipse cx="100" cy="141" rx="13" ry="5" fill="white" opacity="0.2" />

      {/* 10. Chin shadow */}
      <ellipse cx="100" cy="147" rx="24" ry="6" fill={h(dk(sk, 14))} opacity="0.15" />

      {/* 11. Hair on top */}
      <HairTop style={hr} p={p} />

      {/* 12. Eyebrows */}
      <Eyebrows hc={hc} />

      {/* 13. Eyes */}
      <Eyes shape={ey} p={p} />

      {/* 14. Nose */}
      <Nose sk={sk} />

      {/* 15. Cheek blush — soft radial gradient */}
      <ellipse cx="65" cy="110" rx="20" ry="13" fill={`url(#${p}blushL)`} />
      <ellipse cx="135" cy="110" rx="20" ry="13" fill={`url(#${p}blushR)`} />
      {/* Blush sparkle dots */}
      {([[58,105],[62,103],[56,110]] as [number,number][]).map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="1.5" fill="white" opacity="0.55" />
      ))}
      {([[142,105],[138,103],[144,110]] as [number,number][]).map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="1.5" fill="white" opacity="0.55" />
      ))}

      {/* 16. Mouth */}
      <Mouth style={mo} />

      {/* 17. Accessories */}
      <Accessories style={ac} color={ab} />

      {/* 18. Ground shadow */}
      <ellipse cx="100" cy="238" rx="62" ry="6" fill={LINE} opacity="0.1" />
    </svg>
  );
}
