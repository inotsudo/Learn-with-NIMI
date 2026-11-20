"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { flightNumber } from "@/lib/airways/airwaysData";
import { gateNum, seatNum } from "@/lib/airways/formatters";
import type { WorldCopy } from "./scenes";

const SPRING = { type: "spring", stiffness: 360, damping: 24 } as const;
const NAVY = "#0B1A33";
const GOLD = "#E8BC56";

export interface JourneyStory { title: string; order: number }

/* ─── Shared shell: the scene, defocused, with a glass desk in front ───── */
function DeskShell({ backdrop, label, closeLabel, touch, onClose, children }: {
  backdrop: string; label: string; closeLabel: string; touch: number; onClose: () => void; children: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const size = Math.max(56, touch * 0.75);
  return (
    <motion.div className="fixed inset-0 flex flex-col" style={{ zIndex: 45 }} role="dialog" aria-modal="true" aria-label={label}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <Image src={backdrop} alt="" fill sizes="(orientation: portrait) 100vh, 100vw" className="object-cover" style={{ filter: "blur(20px) brightness(0.45) saturate(1.25)", transform: "scale(1.12)" }} />
        <div className="absolute inset-0" style={{ background: "rgba(6,16,31,0.3)" }} />
      </div>
      <div className="relative z-10 flex justify-end px-4 pt-4 sm:px-6">
        <motion.button ref={closeRef} type="button" aria-label={closeLabel} onClick={onClose} whileTap={{ scale: 0.9 }}
          className="nw-toy-btn grid place-items-center rounded-full text-2xl text-white"
          style={{ width: size, height: size, background: "rgba(255,247,224,0.1)", border: "1.5px solid rgba(227,196,106,0.6)", backdropFilter: "blur(10px)" }}>
          ✕
        </motion.button>
      </div>
      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-4 pb-8">
        {children}
      </div>
    </motion.div>
  );
}

/** The one big gold action of a desk (icon-only for Little Explorers). */
function DeskAction({ icon, label, showLabel, onClick, pulse = false }: { icon: string; label: string; showLabel: boolean; onClick: () => void; pulse?: boolean }) {
  return (
    <motion.button type="button" aria-label={label} onClick={onClick}
      initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={SPRING} whileTap={{ scale: 0.92 }} whileHover={{ y: -3 }}
      className="nw-toy-btn relative flex items-center justify-center gap-3 rounded-full font-baloo font-extrabold"
      style={{
        minHeight: showLabel ? 64 : 104, minWidth: showLabel ? 0 : 104, padding: showLabel ? "0 30px" : 0, fontSize: showLabel ? 19 : 44,
        color: NAVY, background: "radial-gradient(circle at 35% 30%, #FFF7E0, #FDE68A 40%, #D4A830 85%)",
        boxShadow: "0 8px 0 rgba(120,82,18,0.55), 0 0 40px rgba(253,230,138,0.6)",
      }}>
      {pulse && <span className="nw-pulse-ring absolute inset-0 rounded-full" style={{ border: "3px solid #FDE68A" }} aria-hidden="true" />}
      <span aria-hidden="true">{icon}</span>
      {showLabel && <span>{label}</span>}
    </motion.button>
  );
}

const today = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

/* ─── Passport control: the passport opens and gets its destination stamp ─ */
export function PassportControl({
  backdrop, copy, showLabels, touch, childName, story, stamped, speak, onStamp, onContinue, onClose,
}: {
  backdrop: string; copy: WorldCopy; showLabels: boolean; touch: number;
  childName: string; story: JourneyStory; stamped: boolean;
  speak: (text: string) => void; onStamp: () => void; onContinue: () => void; onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(stamped);
  const [inked, setInked] = useState(stamped);
  const initial = (childName.trim()[0] ?? "★").toUpperCase();
  const flight = flightNumber(story.order);
  const date = useMemo(() => today(), []);

  const openPassport = () => { if (!open) { setOpen(true); speak(copy.tapStamp); } };
  const stamp = () => { setInked(true); onStamp(); };

  return (
    <DeskShell backdrop={backdrop} label={copy.desk} closeLabel={copy.close} touch={touch} onClose={onClose}>
      {showLabels && (
        <p className="rounded-full px-4 py-2 text-center font-baloo text-base font-extrabold text-white sm:text-lg" style={{ background: "rgba(255,247,224,0.08)", border: "1px solid rgba(227,196,106,0.45)" }}>
          🛂 {copy.desk} · {copy.destinationN(story.order)}
        </p>
      )}

      {/* the booklet: cover on the right page, swings open to the ID + visa spread */}
      {/* closed: only the cover shows, centred; open: the full spread */}
      <motion.div className="relative w-[min(92vw,600px)]" style={{ perspective: 1600 }}
        animate={{ x: open ? "0%" : "-25%" }} transition={reduce ? { duration: 0 } : { duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
        <div className="relative grid grid-cols-2 overflow-visible rounded-[18px]" style={{ aspectRatio: "1.42", filter: "drop-shadow(0 26px 40px rgba(0,0,0,0.5))" }}>
          {/* left page — identity */}
          <motion.div className="relative flex flex-col gap-[3%] overflow-hidden rounded-l-[18px] p-[6%]" style={{ background: "linear-gradient(160deg,#FBF4DE,#F1E3BC)", color: NAVY }}
            animate={{ opacity: open ? 1 : 0 }} transition={{ duration: reduce ? 0 : 0.5, delay: open && !reduce ? 0.35 : 0 }} aria-hidden={!open}>
            <p className="font-baloo text-[clamp(8px,2.2vw,13px)] font-extrabold tracking-[0.14em]" style={{ color: "#8A6A1E" }}>{copy.passenger}</p>
            <div className="flex items-center gap-[6%]">
              <span className="grid aspect-square w-[34%] place-items-center rounded-xl font-baloo text-[clamp(20px,7vw,46px)] font-extrabold text-white" style={{ background: `linear-gradient(135deg,#1A3558,${NAVY})`, border: `2px solid ${GOLD}` }}>{initial}</span>
              <div className="min-w-0">
                <p className="truncate font-baloo text-[clamp(13px,4vw,24px)] font-extrabold leading-tight">{childName.toUpperCase()}</p>
                <p className="text-[clamp(7px,1.9vw,11px)] font-bold opacity-70">{copy.republic}</p>
              </div>
            </div>
            <div className="mt-auto grid grid-cols-2 gap-[4%] text-[clamp(7px,2vw,12px)] font-bold">
              <p><span className="block opacity-60">{copy.flight}</span>{flight}</p>
              <p><span className="block opacity-60">{copy.date}</span>{date}</p>
            </div>
            <p className="truncate font-mono text-[clamp(6px,1.7vw,10px)] opacity-60">P&lt;NMP&lt;{childName.toUpperCase().replace(/[^A-Z]/g, "")}&lt;&lt;&lt;&lt;{flight}</p>
          </motion.div>

          {/* right page — visa page where the stamp lands */}
          <div className="relative grid place-items-center overflow-hidden rounded-r-[18px]" style={{ background: "linear-gradient(200deg,#FBF4DE,#EEDDB2)" }}>
            <p className="absolute left-[8%] top-[6%] font-baloo text-[clamp(8px,2.2vw,13px)] font-extrabold tracking-[0.14em]" style={{ color: "#8A6A1E" }}>{copy.visas}</p>
            {inked && (
              <motion.div
                initial={reduce ? false : { scale: 2.4, opacity: 0, rotate: -28 }}
                animate={{ scale: 1, opacity: 0.92, rotate: -12 }}
                transition={{ type: "spring", stiffness: 520, damping: 18 }}
                className="grid aspect-square w-[66%] place-items-center rounded-full text-center"
                style={{ border: "4px double #B4232A", color: "#B4232A", mixBlendMode: "multiply" }}
                aria-label={`${copy.destinationN(story.order)} — ${story.title}`}
                role="img"
              >
                <div className="px-[10%] font-baloo font-extrabold leading-tight">
                  <p className="text-[clamp(7px,1.9vw,11px)] tracking-[0.18em]">NIMIPIKO AIRWAYS</p>
                  <p className="text-[clamp(10px,3vw,18px)]">{copy.destinationN(story.order).toUpperCase()}</p>
                  <p className="line-clamp-2 text-[clamp(7px,2vw,12px)]">{story.title}</p>
                  <p className="text-[clamp(7px,1.8vw,10px)] opacity-80">{flight} · {date}</p>
                </div>
              </motion.div>
            )}
          </div>

          {/* the cover, hinged on the spine; tap to open */}
          <motion.button
            type="button"
            aria-label={copy.openPassport}
            onClick={openPassport}
            disabled={open}
            className="nw-toy-btn absolute inset-y-0 right-0 flex w-1/2 flex-col items-center justify-center gap-[6%] rounded-r-[18px] text-center"
            style={{ transformOrigin: "0% 50%", transformStyle: "preserve-3d", background: `linear-gradient(135deg,#1A3558,${NAVY} 70%)`, border: `2px solid ${GOLD}`, color: GOLD, backfaceVisibility: "hidden", pointerEvents: open ? "none" : "auto" }}
            animate={{ rotateY: open ? -178 : 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            whileHover={open ? undefined : { rotateY: -8 }}
          >
            <span className="text-[clamp(26px,8vw,52px)]" aria-hidden="true">✈️</span>
            <span className="px-[8%] font-baloo text-[clamp(9px,2.6vw,16px)] font-extrabold tracking-[0.12em]">{copy.passportCover}</span>
            <span className="font-baloo text-[clamp(11px,3.2vw,20px)] font-extrabold tracking-[0.2em]">NIMIPIKO</span>
          </motion.button>
        </div>
      </motion.div>

      {!open ? (
        showLabels ? <p className="font-baloo text-sm font-bold text-white/85">{copy.openPassport}</p> : null
      ) : !inked ? (
        <DeskAction icon="🛂" label={copy.stampIt} showLabel={showLabels} onClick={stamp} pulse />
      ) : (
        <DeskAction icon="✈️" label={copy.toGate} showLabel={showLabels} onClick={onContinue} pulse />
      )}
    </DeskShell>
  );
}

/** A deterministic barcode from the flight + name (decorative). */
function Barcode({ seed }: { seed: string }) {
  const bars = useMemo(() => {
    let h = 2166136261;
    for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return Array.from({ length: 46 }, (_, i) => 1 + ((h >>> (i % 29)) & 3));
  }, [seed]);
  return (
    <div className="flex h-10 items-stretch gap-[2px]" aria-hidden="true">
      {bars.map((w, i) => <span key={i} style={{ width: w, background: i % 2 ? "transparent" : NAVY }} />)}
    </div>
  );
}

/* ─── Boarding pass: name, flight, gate, seat, destination → board ────── */
export function BoardingPass({
  backdrop, copy, showLabels, touch, childName, childAge, story, onBoard, onClose,
}: {
  backdrop: string; copy: WorldCopy; showLabels: boolean; touch: number;
  childName: string; childAge: number | null; story: JourneyStory;
  onBoard: () => void; onClose: () => void;
}) {
  const flight = flightNumber(story.order);
  const field = (label: string, value: string, wide = false) => (
    <div className={wide ? "col-span-2" : undefined}>
      <p className="text-[10px] font-extrabold tracking-[0.16em] sm:text-[11px]" style={{ color: "#8A6A1E" }}>{label}</p>
      <p className="truncate font-baloo text-base font-extrabold leading-tight sm:text-lg" style={{ color: NAVY }}>{value}</p>
    </div>
  );
  return (
    <DeskShell backdrop={backdrop} label={copy.boardingTitle} closeLabel={copy.close} touch={touch} onClose={onClose}>
      <motion.div
        initial={{ y: 60, opacity: 0, rotate: -2 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={SPRING}
        className="w-[min(92vw,440px)] overflow-hidden rounded-[22px]"
        style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.55), 0 0 50px rgba(253,230,138,0.2)" }}
        role="group" aria-label={copy.boardingTitle}
      >
        <div className="flex items-center justify-between px-5 py-3" style={{ background: `linear-gradient(135deg,${NAVY},#1A3558)`, color: GOLD }}>
          <div>
            <p className="text-[10px] font-extrabold tracking-[0.22em]">{copy.boardingTitle.toUpperCase()}</p>
            <p className="font-baloo text-lg font-extrabold text-white">NIMIPIKO AIRWAYS ✈️</p>
          </div>
          <p className="font-baloo text-2xl font-extrabold">{flight}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-4" style={{ background: "linear-gradient(180deg,#FFFBEF,#F6EBCB)" }}>
          {field(copy.passenger, childName.toUpperCase(), true)}
          {field(copy.from, copy.airport)}
          {field(copy.destination, `${copy.destinationN(story.order)} · ${story.title}`)}
          {field(copy.gateL, gateNum(story.order))}
          {field(copy.seat, seatNum(childAge, story.order))}
          {field(copy.classL, copy.championClass)}
          {field(copy.date, today())}
        </div>
        <div className="flex items-center justify-between gap-3 px-5 py-3" style={{ background: "#F6EBCB", borderTop: "2px dashed rgba(11,26,51,0.25)" }}>
          <Barcode seed={`${flight}${childName}`} />
          <span className="font-mono text-[11px] font-bold" style={{ color: NAVY }}>{flight}·{gateNum(story.order)}</span>
        </div>
      </motion.div>
      <DeskAction icon="✈️" label={copy.board} showLabel={showLabels} onClick={onBoard} pulse />
    </DeskShell>
  );
}
