"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { WORLD } from "@/lib/design-system/world";

/**
 * A glass boarding pass: kicker + title on the left, a stub field
 * (SEAT 12A, CLASS EXPLORER…) on the right, then the content.
 */
export default function TicketCard({
  id,
  kicker = "CARTE D'EMBARQUEMENT",
  title,
  stub,
  children,
  className = "",
}: {
  /** Used for aria-labelledby: the title gets `${id}-title`. */
  id: string;
  kicker?: string;
  title: ReactNode;
  stub?: { label: string; value: string };
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...WORLD.spring.soft, delay: 0.05 }}
      aria-labelledby={`${id}-title`}
      className={`wui-glass mx-auto w-full max-w-[440px] rounded-[26px] p-5 sm:p-7 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-baloo text-[10px] font-extrabold tracking-[0.26em]" style={{ color: WORLD.color.goldBright }}>{kicker}</p>
          <h1 id={`${id}-title`} className="mt-1 font-baloo text-[22px] font-extrabold leading-tight text-[#FFF7E0]">{title}</h1>
        </div>
        {stub && (
          <div className="shrink-0 text-right">
            <p className="font-baloo text-[10px] font-extrabold tracking-[0.26em] text-[#FFF7E0]/50">{stub.label}</p>
            <p className="font-baloo text-lg font-extrabold" style={{ color: WORLD.color.goldLight }}>{stub.value}</p>
          </div>
        )}
      </div>
      {children}
    </motion.section>
  );
}

/** Error / success line inside a card. Renders nothing when empty. */
export function WorldNotice({ error, ok, className = "" }: { error?: string; ok?: string; className?: string }) {
  const text = error || ok;
  if (!text) return null;
  return (
    <motion.div
      key={text}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      role={error ? "alert" : "status"}
      className={`wui-notice ${error ? "wui-notice--error" : "wui-notice--ok"} ${className}`}
    >
      {text}
    </motion.div>
  );
}

/** Big hero title for the wide-screen column. */
export function HeroTitle({ lead, gold, emoji }: { lead: ReactNode; gold: ReactNode; emoji?: string }) {
  return (
    <motion.h2
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="font-baloo font-extrabold leading-[1.02] text-[#FFF7E0]"
      style={{ fontSize: "clamp(2.2rem,4.6vw,3.6rem)", textShadow: "0 4px 24px rgba(0,0,0,0.55)" }}
    >
      {lead}<br /><span style={{ color: WORLD.color.goldLight }}>{gold}</span>{emoji && <> <span aria-hidden="true">{emoji}</span></>}
    </motion.h2>
  );
}
