"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  balance: number;
}

export default function ShopHeader({ balance }: Props) {
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden -mx-4 sm:-mx-5 lg:-mx-6 -mt-4 sm:-mt-6 mb-5"
      style={{ minHeight: 230, background: "linear-gradient(138deg,#fffbe6 0%,#fff8d6 38%,#fef3b0 65%,#fde87a 100%)" }}>
      {/* Warm gold-cream gradient — treasure/reward aesthetic, no photo */}
      {/* Subtle glow in the upper-right corner */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 78% 15%, rgba(255,195,0,.28) 0%, transparent 58%)" }} />
      <div className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
        style={{ background: "linear-gradient(to top, #f8f2e7, transparent)" }} />

      {/* Left content */}
      <div className="relative z-10 flex min-h-[230px] flex-col justify-end px-5 pb-10 pt-8 sm:px-10" style={{ maxWidth: "60%" }}>
        <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 font-baloo text-[11px] font-black -rotate-1 mb-2 self-start"
          style={{ background:"#0e368b", color:"#ffd331" }}>
          The Star Shop ⭐
        </span>
        <h1 className="font-baloo font-black text-[#0e368b] leading-tight"
          style={{ fontSize: "clamp(1.7rem,4.5vw,2.5rem)" }}>
          {t("rewardShopTitle")}
        </h1>
        <p className="mt-1 font-baloo font-bold text-[14px] text-[#123a87]">
          {t("rewardShopSubtitle")}
        </p>
        <div className="mt-2 h-[3px] w-40 -rotate-[3deg] rounded-full bg-[#0e368b]" />
        {/* Balance chip */}
        <div className="mt-3">
          <motion.div
            initial={{ scale:0, opacity:0 }}
            animate={{ scale:1, opacity:1 }}
            transition={{ delay:0.15, type:"spring", stiffness:260 }}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 shadow-sm"
            style={{ background:"rgba(255,255,255,0.72)", border:"2px solid rgba(14,54,139,.20)" }}>
            <span className="text-lg leading-none">⭐</span>
            <span className="font-baloo font-black text-[#0e368b] text-base leading-none">{balance}</span>
            <span className="font-baloo font-bold text-[10px] text-[#0e368b99] uppercase tracking-wide">{t("shopStarsAvailable")}</span>
          </motion.div>
        </div>
      </div>

      {/* Nimi + Piko stand out clearly on the gold gradient */}
      <div className="absolute right-0 bottom-0 z-10 flex items-end pr-2 pb-0">
        <motion.img src="/themes/default/characters/nimi.png" alt="Nimi"
          className="h-[145px] sm:h-[178px] w-auto object-contain drop-shadow-2xl select-none"
          animate={{ y:[0,-7,0] }} transition={{ duration:3, repeat:Infinity, ease:"easeInOut" }}
          draggable={false} />
        <motion.img src="/themes/default/characters/piko.png" alt="Piko"
          className="h-[125px] sm:h-[155px] w-auto object-contain drop-shadow-2xl select-none"
          animate={{ y:[0,-5,0] }} transition={{ duration:2.8, repeat:Infinity, ease:"easeInOut", delay:0.4 }}
          draggable={false} />
      </div>
    </section>
  );
}
