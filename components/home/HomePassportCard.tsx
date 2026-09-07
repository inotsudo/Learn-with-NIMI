"use client";

import Link from "next/link";
import { motion } from "framer-motion";

interface Props {
  stampsCollected:     number;
  totalStamps:         number;
  destinationsVisited: number;
}

export default function HomePassportCard({ stampsCollected, totalStamps, destinationsVisited }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.07 }}
      className="relative rounded-3xl overflow-hidden flex flex-col"
      style={{ background: "#FFFDF4", border: "1.5px solid #F0D080", boxShadow: "0 8px 32px rgba(200,160,60,0.13)" }}
    >
      {/* Dark navy header bar — bent tag shape matching reference */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ background: "linear-gradient(135deg,#0D2D6B,#1A4A9A)", borderRadius: "20px 20px 0 0" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">🛂</span>
          <span className="font-baloo font-black text-sm tracking-wide" style={{ color: "white" }}>YOUR PASSPORT</span>
        </div>
        <motion.span
          animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="text-sm"
        >✨</motion.span>
      </div>

      {/* Triangular stamp-border decoration */}
      <div className="flex px-3 pt-2 pb-1 gap-0.5 overflow-hidden">
        {Array.from({ length: 22 }).map((_, i) => (
          <div key={i} style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "7px solid #0D2D6B", opacity: 0.18 }} />
        ))}
      </div>

      {/* Stats */}
      <div className="flex-1 px-4 pt-1 pb-2 grid grid-cols-2 gap-3">
        {[
          { label: "Stamps Collected", value: `${stampsCollected} / ${totalStamps}` },
          { label: "Destinations Visited", value: String(destinationsVisited) },
        ].map((item) => (
          <div key={item.label}>
            <p className="font-baloo text-[10px] font-bold" style={{ color: "rgba(13,30,58,0.50)" }}>{item.label}</p>
            <p className="font-baloo font-black text-2xl leading-tight" style={{ color: "#0D1E3A" }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* AIR MAIL watermark */}
      <div
        aria-hidden
        className="absolute bottom-14 right-3 font-baloo font-black text-[11px] tracking-widest pointer-events-none select-none"
        style={{ color: "rgba(13,45,107,0.12)", transform: "rotate(-15deg)" }}
      >AIR MAIL</div>

      {/* Passport stamp icon */}
      <div className="absolute bottom-12 right-4 opacity-15 pointer-events-none select-none">
        <svg viewBox="0 0 44 44" width={44} height={44}>
          {Array.from({length:16},(_,i)=>{const a=(i/16)*2*Math.PI;return<circle key={i} cx={22+Math.cos(a)*19} cy={22+Math.sin(a)*19} r={2.8} fill="#0D2D6B"/>})}
          <circle cx="22" cy="22" r="15" fill="none" stroke="#0D2D6B" strokeWidth="1.5"/>
          <text x="22" y="18" textAnchor="middle" fontSize="6" fontWeight="900" fill="#0D2D6B" fontFamily="Arial">NIMIPIKO</text>
          <text x="22" y="26" textAnchor="middle" fontSize="5" fontWeight="700" fill="#0D2D6B" fontFamily="Arial">AIRWAYS</text>
        </svg>
      </div>

      {/* CTA */}
      <div className="px-4 pb-4 pt-1">
        <Link
          href="/user-profile"
          className="w-full flex items-center justify-center gap-2 font-baloo font-black text-sm py-3 rounded-2xl transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg,#0D2D6B,#1A4A9A)", color: "white", boxShadow: "0 4px 14px rgba(13,45,107,0.30)" }}
        >
          🛂 View Passport →
        </Link>
      </div>
    </motion.div>
  );
}
