"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { Check, Play, ChevronRight } from "lucide-react";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";

const STORY_STEPS = [
  {
    number: 1, title: "MAGIC STORIES", subtitle: "WITH NIMI",
    description: "Listen to Nimi tell the story page by page.",
    emoji: "🎧", numBg: "bg-blue-600", border: "border-blue-200",
    titleColor: "text-blue-700", btnColor: "bg-blue-600 hover:bg-blue-700",
    href: "/missions/magic-stories", isPiko: false,
  },
  {
    number: 2, title: "SHINY", subtitle: "READERS",
    description: "Read the story with your family and discover new words.",
    emoji: "📄", numBg: "bg-cyan-600", border: "border-cyan-200",
    titleColor: "text-cyan-700", btnColor: "bg-cyan-600 hover:bg-cyan-700",
    href: "/missions/shiny-readers", isPiko: false,
  },
  {
    number: 3, title: "LITTLE", subtitle: "CREATORS",
    description: "Bring the story to life with colors and creativity.",
    emoji: "🎨", numBg: "bg-orange-500", border: "border-orange-200",
    titleColor: "text-orange-600", btnColor: "bg-orange-500 hover:bg-orange-600",
    href: "/missions/little-creators", isPiko: false,
  },
  {
    number: 4, title: "MOVE &", subtitle: "GROOVE",
    description: "Jump, clap, hug and move along with Nimi and Piko!",
    emoji: "🎵", numBg: "bg-pink-600", border: "border-pink-200",
    titleColor: "text-pink-700", btnColor: "bg-pink-600 hover:bg-pink-700",
    href: "/missions/move-groove", isPiko: false,
  },
  {
    number: 5, title: "SING ALONG", subtitle: "WITH NIMI",
    description: "Sing along and practice the story words through music.",
    emoji: "🎤", numBg: "bg-[var(--nimi-green)]", border: "border-[var(--ds-border-brand)]/30",
    titleColor: "text-[var(--ds-brand-primary)]", btnColor: "bg-[var(--nimi-green)] hover:bg-[var(--ds-brand-hover)]",
    href: "/missions/sing-along", isPiko: false,
  },
  {
    number: 6, title: "JOURNEY", subtitle: "WITH NIMI",
    description: "Watch the animated story and enjoy the adventure!",
    emoji: "▶️", numBg: "bg-[var(--nimi-green)]", border: "border-[var(--ds-border-brand)]/30",
    titleColor: "text-[var(--ds-brand-primary)]", btnColor: "bg-[var(--nimi-green)] hover:bg-[var(--ds-brand-hover)]",
    href: "/missions/journey", isPiko: true,
  },
];

interface Props {
  completedSteps: number[];
}

export default function StoryJourney({ completedSteps }: Props) {
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const m = useThemeMotion();
  return (
    <div
      className="border border-ds-border shadow-[0_16px_40px_rgba(15,23,42,0.06)] p-4 sm:p-5"
      style={{
        borderRadius: 'var(--leaf-r)',
        backgroundImage: `linear-gradient(145deg, rgba(255,255,255,0.96), rgba(248,251,244,0.92)), url('${assets.storyCard.background}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="mb-4 flex justify-center">
        <div className="rounded-full border border-[var(--ds-border-brand)]/25 bg-white/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--ds-brand-primary)] shadow-sm">
          Your story adventure
        </div>
      </div>
      <h2 className="text-center font-black text-[var(--ds-brand-primary)] text-[13px] sm:text-sm lg:text-[15px] uppercase tracking-wide mb-4">
        COMPLETE ALL 6 STEPS TO EARN YOUR STORY CERTIFICATE!
      </h2>

      {/* ── Desktop xl+: 6 equal cards in one row ── */}
      <div className="hidden xl:flex items-stretch">
        {STORY_STEPS.flatMap((step, idx) => {
          const done = completedSteps.includes(step.number);
          const card = (
            <Link key={`c${step.number}`} href={step.href} className="flex-1 min-w-0">
              <motion.div whileHover={{ scale: 1.04, y: -4 }} whileTap={m.buttonPress}
                className={`relative overflow-hidden border-2 ${step.border} flex flex-col h-full shadow-[0_10px_24px_rgba(15,23,42,0.08)] hover:shadow-[0_14px_30px_rgba(15,23,42,0.12)] transition-all cursor-pointer`}
                style={{
                  borderRadius: 'var(--leaf-r)',
                  backgroundImage: `linear-gradient(145deg, rgba(255,255,255,0.94), rgba(249,250,246,0.9)), url('${assets.storyCard.frame}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}>
                <div className="absolute inset-0 pointer-events-none opacity-25" style={{ backgroundImage: `url('${assets.storyCard.ornaments}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div className="flex items-start gap-1.5 px-2.5 pt-3 pb-1">
                  <div className={`w-7 h-7 ${step.numBg} rounded-full flex items-center justify-center text-white font-black text-[13px] flex-shrink-0 shadow`}>
                    {step.number}
                  </div>
                  <div>
                    <p className={`font-black text-[10px] uppercase leading-tight ${step.titleColor}`}>{step.title}</p>
                    <p className={`font-black text-[10px] uppercase leading-tight ${step.titleColor}`}>{step.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center justify-center flex-1 py-2 px-2">
                  <div className="relative">
                    <img src={step.isPiko ? assets.pikoCircle : assets.nimiCircle}
                      alt={step.isPiko ? "PIKO" : "NIMI"}
                      className="w-[60px] h-[60px] rounded-full object-cover border-4 border-white shadow-md"  loading="lazy" />
                    <div className="absolute -bottom-1.5 -right-1.5 bg-white/90 rounded-full w-7 h-7 flex items-center justify-center text-base shadow border border-gray-200 leading-none">
                      {step.emoji}
                    </div>
                  </div>
                </div>
                <p className="relative text-[var(--ds-text-secondary)] text-[9px] text-center px-2 mb-2 leading-snug min-h-[26px]">
                  {step.description}
                </p>
                <div className="px-2.5 pb-3">
                  <div className={`w-full py-1.5 rounded-full text-white text-[10px] font-black flex items-center justify-center gap-1 ${step.btnColor}`}>
                    {done
                      ? <><Check className="w-3 h-3" strokeWidth={3} /> COMPLETED</>
                      : <><Play className="w-3 h-3 fill-white" /> START</>}
                  </div>
                </div>
              </motion.div>
            </Link>
          );
          if (idx < STORY_STEPS.length - 1) {
            return [card, (
              <div key={`a${idx}`} className="flex items-center justify-center w-5 flex-shrink-0 self-center">
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            )];
          }
          return [card];
        })}
      </div>

      {/* ── Tablet lg: 3×2 grid (no scroll) ── */}
      <div className="hidden lg:grid xl:hidden grid-cols-3 gap-3">
        {STORY_STEPS.map(step => {
          const done = completedSteps.includes(step.number);
          return (
            <Link key={`gc${step.number}`} href={step.href}>
              <motion.div whileHover={{ scale: 1.03, y: -3 }} whileTap={m.buttonPress}
                className={`relative overflow-hidden border-2 ${step.border} flex flex-col shadow-[0_10px_24px_rgba(15,23,42,0.08)] hover:shadow-[0_14px_30px_rgba(15,23,42,0.12)] transition-all cursor-pointer h-full`}
                style={{
                  borderRadius: 'var(--leaf-r)',
                  backgroundImage: `linear-gradient(145deg, rgba(255,255,255,0.94), rgba(249,250,246,0.9)), url('${assets.storyCard.frame}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}>
                <div className="absolute inset-0 pointer-events-none opacity-25" style={{ backgroundImage: `url('${assets.storyCard.ornaments}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div className="flex items-start gap-1.5 px-2.5 pt-3 pb-1">
                  <div className={`w-7 h-7 ${step.numBg} rounded-full flex items-center justify-center text-white font-black text-[13px] flex-shrink-0 shadow`}>
                    {step.number}
                  </div>
                  <div>
                    <p className={`font-black text-[10px] uppercase leading-tight ${step.titleColor}`}>{step.title}</p>
                    <p className={`font-black text-[10px] uppercase leading-tight ${step.titleColor}`}>{step.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center justify-center flex-1 py-2 px-2">
                  <div className="relative">
                    <img src={step.isPiko ? assets.pikoCircle : assets.nimiCircle}
                      alt={step.isPiko ? "PIKO" : "NIMI"}
                      className="w-14 h-14 rounded-full object-cover border-4 border-white shadow-md"  loading="lazy" />
                    <div className="absolute -bottom-1.5 -right-1.5 bg-white/90 rounded-full w-6 h-6 flex items-center justify-center text-sm shadow border border-gray-200 leading-none">
                      {step.emoji}
                    </div>
                  </div>
                </div>
                <p className="relative text-[var(--ds-text-secondary)] text-[9px] text-center px-2 mb-2 leading-snug min-h-[24px]">
                  {step.description}
                </p>
                <div className="px-2.5 pb-3">
                  <div className={`w-full py-1.5 rounded-full text-white text-[10px] font-black flex items-center justify-center gap-1 ${step.btnColor}`}>
                    {done
                      ? <><Check className="w-3 h-3" strokeWidth={3} /> DONE</>
                      : <><Play className="w-3 h-3 fill-white" /> START</>}
                  </div>
                </div>
              </motion.div>
            </Link>
          );
        })}
      </div>

      {/* ── Mobile / sm: horizontal scroll ── */}
      <div className="lg:hidden overflow-x-auto pb-3 -mx-1">
        <div className="flex items-center px-1" style={{ minWidth: "max-content", gap: "6px" }}>
          {STORY_STEPS.flatMap((step, idx) => {
            const done = completedSteps.includes(step.number);
            const card = (
              <Link key={`mc${step.number}`} href={step.href}>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={m.buttonPress}
                  className={`relative overflow-hidden w-[138px] sm:w-[155px] md:w-[165px] border-2 ${step.border} flex flex-col shadow-[0_10px_24px_rgba(15,23,42,0.08)] cursor-pointer`}
                  style={{
                    borderRadius: 'var(--leaf-r)',
                    backgroundImage: `linear-gradient(145deg, rgba(255,255,255,0.94), rgba(249,250,246,0.9)), url('${assets.storyCard.frame}')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}>
                  <div className="absolute inset-0 pointer-events-none opacity-25" style={{ backgroundImage: `url('${assets.storyCard.ornaments}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <div className="flex items-start gap-1.5 px-2.5 pt-3 pb-1">
                    <div className={`w-7 h-7 ${step.numBg} rounded-full flex items-center justify-center text-white font-black text-[13px] flex-shrink-0 shadow`}>
                      {step.number}
                    </div>
                    <div>
                      <p className={`font-black text-[10px] uppercase leading-tight ${step.titleColor}`}>{step.title}</p>
                      <p className={`font-black text-[10px] uppercase leading-tight ${step.titleColor}`}>{step.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center py-2 px-2">
                    <div className="relative">
                      <img src={step.isPiko ? assets.pikoCircle : assets.nimiCircle}
                        alt={step.isPiko ? "PIKO" : "NIMI"}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-4 border-white shadow-md"  loading="lazy" />
                      <div className="absolute -bottom-1.5 -right-1.5 bg-white rounded-full w-6 h-6 flex items-center justify-center text-sm shadow border border-gray-200 leading-none">
                        {step.emoji}
                      </div>
                    </div>
                  </div>
                  <p className="relative text-[var(--ds-text-secondary)] text-[9px] text-center px-2 mb-2 leading-snug min-h-[24px]">
                    {step.description}
                  </p>
                  <div className="px-2.5 pb-3">
                    <div className={`w-full py-1.5 rounded-full text-white text-[10px] font-black flex items-center justify-center gap-1 ${step.btnColor}`}>
                      {done
                        ? <><Check className="w-3 h-3" strokeWidth={3} /> DONE</>
                        : <><Play className="w-3 h-3 fill-white" /> START</>}
                    </div>
                  </div>
                </motion.div>
              </Link>
            );
            if (idx < STORY_STEPS.length - 1) {
              return [card, <ChevronRight key={`ma${idx}`} className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />];
            }
            return [card];
          })}
        </div>
      </div>
    </div>
  );
}
