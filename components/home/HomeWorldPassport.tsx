"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useMotion } from "@/hooks/useMotion";

/**
 * HomeWorldPassport — hero passport object for the Airways Home World.
 * Same numbers + route as HomePassportCard (/user-profile).
 * Token-drawn SVG passport book (still no image asset — shapes only,
 * per the approved dashboard reference): tilted cover inside a golden
 * orbit ring, stamp tally, level row fuses below via the marker card.
 */
export default function HomeWorldPassport({ stamps, destinations }: { stamps: number; destinations: number }) {
  const m = useMotion();
  const reduceMotion = useReducedMotion();
  return (
    <motion.div {...m.fadeUp} className="h1-pp relative overflow-hidden rounded-3xl"
      style={{ background: "linear-gradient(150deg,#14347C 0%,#0D2D6B 55%,#081E48 100%)", border: "2px solid rgba(240,208,128,0.9)", boxShadow: "0 14px 36px rgba(6,20,45,0.5), 0 0 28px rgba(245,200,66,0.22), inset 0 1px 0 rgba(255,255,255,0.14)" }}>
      {/* Gold spine on the cover edge. */}
      <div aria-hidden="true" className="absolute inset-y-0 left-0 w-2.5"
        style={{ background: "linear-gradient(180deg,#F5C842,#C9A84C)" }} />
      <div className="flex items-center gap-3 py-3 pl-5 pr-3 sm:gap-3 sm:py-4">
        {/* ── Hero passport book — token-drawn SVG in a golden orbit ring.
            Tilted like the reference; artwork is pure shapes (no asset). ── */}
        <div className="h1-ppbook relative shrink-0 w-[118px] h-[138px]">
          {/* Orbit ring — dashed gold ellipse sweeping around the book. */}
          <motion.span
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 rounded-full border-2 border-dashed"
            style={{ width: 156, height: 156, marginLeft: -78, marginTop: -78, borderColor: "rgba(245,200,66,0.55)", boxShadow: "0 0 22px rgba(245,200,66,0.35)" }}
            animate={reduceMotion ? undefined : { rotate: 360 }}
            transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
          />
          <span aria-hidden="true" className="absolute left-1/2 top-1/2 rounded-full"
            style={{ width: 132, height: 132, marginLeft: -66, marginTop: -66, border: "1.5px solid rgba(245,200,66,0.30)", transform: "scaleY(0.66) rotate(-18deg)" }} />
          <svg viewBox="0 0 96 128" className="relative block h-full w-full" style={{ filter: "drop-shadow(0 10px 20px rgba(3,12,23,0.55))" }} role="img"
            aria-label={`${stamps} stamps, ${destinations} destinations passport book`}>
            <defs>
              <linearGradient id="ppw-cover" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#1E4595" />
                <stop offset="0.6" stopColor="#0D2D6B" />
                <stop offset="1" stopColor="#0A2354" />
              </linearGradient>
              <linearGradient id="ppw-gold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#F9C932" />
                <stop offset="1" stopColor="#C9A84C" />
              </linearGradient>
            </defs>
            {/* Page block peeking from the cover edge. */}
            <rect x="16" y="7" width="74" height="114" rx="7" fill="#F0E7CE" />
            <rect x="18" y="9" width="74" height="114" rx="7" fill="#E8DCBA" />
            {/* Cover — tilted book face. */}
            <g transform="rotate(-6 48 64)">
              <rect x="8" y="5" width="76" height="118" rx="8" fill="url(#ppw-cover)" stroke="url(#ppw-gold)" strokeWidth="2.5" />
              {/* Spine */}
              <rect x="8" y="5" width="13" height="118" rx="6" fill="url(#ppw-gold)" opacity="0.92" />
              {/* Globe emblem */}
              <circle cx="52" cy="54" r="17" fill="none" stroke="#F9C932" strokeWidth="1.8" />
              <ellipse cx="52" cy="54" rx="7.5" ry="17" fill="none" stroke="#F9C932" strokeWidth="1.2" />
              <line x1="35" y1="54" x2="69" y2="54" stroke="#F9C932" strokeWidth="1.2" />
              <line x1="38" y1="45" x2="66" y2="45" stroke="#F9C932" strokeWidth="1" opacity="0.85" />
              <line x1="38" y1="63" x2="66" y2="63" stroke="#F9C932" strokeWidth="1" opacity="0.85" />
              {/* Star crowning the emblem */}
              <path d="M52 22l2.3 4.7 5.2 0.8-3.8 3.6 0.9 5.2-4.6-2.4-4.6 2.4 0.9-5.2-3.8-3.6 5.2-0.8z" fill="#F9C932" />
              {/* Cover title */}
              <text x="55" y="92" textAnchor="middle" fontSize="9.5" fontWeight="800" letterSpacing="2.4" fill="#F9C932"
                style={{ fontFamily: "inherit" }}>PASSPORT</text>
              <text x="55" y="104" textAnchor="middle" fontSize="5.4" fontWeight="700" letterSpacing="1.5" fill="#E8BC56"
                style={{ fontFamily: "inherit" }}>VOYAGE NIMIPIKO</text>
            </g>
          </svg>
        </div>

        {/* ── Passport copy — title, stamp tally, primary route. ── */}
        <div className="min-w-0 flex-1">
          <p className="font-baloo text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "#E8BC56" }}>NIMIPIKO Airways</p>
          <p className="font-baloo text-xl font-black leading-tight sm:text-2xl" style={{ color: "#FFFDF4" }}>My Passport</p>
          <p className="mt-0.5 font-nunito text-[12px] font-bold tabular-nums" style={{ color: "rgba(240,232,212,0.85)" }}>
            {stamps} stamps · {destinations} destinations
          </p>
          <Link href="/user-profile" className="mt-2 inline-flex min-h-[44px] items-center rounded-xl px-4 font-baloo text-xs font-black"
            style={{ background: "linear-gradient(135deg,#F9C932,#E8A820)", color: "#06101F" }}>
            View →
          </Link>
        </div>
      </div>
      {/* Route strip — Airways travel identity; existing stamps/destinations only. */}
      <div className="flex items-center gap-2 border-t px-6 py-2" style={{ borderColor: "rgba(240,208,128,0.25)", background: "rgba(6,16,31,0.25)" }}>
        <span aria-hidden="true" className="font-baloo text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "#E8BC56" }}>✈ Home base → next adventure</span>
        {/* Stamp row — one gold pip per collected stamp (max 12 shown), same data. */}
        <span aria-hidden="true" className="ml-auto flex items-center gap-1">
          {Array.from({ length: Math.min(12, Math.max(0, stamps)) }).map((_, i) => (
            <span key={i} className="inline-block h-2 w-2 rounded-full" style={{ background: "linear-gradient(135deg,#F5C842,#C9A84C)" }} />
          ))}
        </span>
      </div>
    </motion.div>
  );
}
