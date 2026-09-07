"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Play, Crown } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";
import type { StoryLibraryItem, StorySlot } from "@/lib/story-types";
import { useLanguage } from "@/contexts/LanguageContext";

const SLOT_ICONS: Record<string, string> = {
  flipflop_audio: "🎧",
  story_pdf:      "📖",
  coloring:       "🎨",
  move_explore:   "🤸",
  sing_along:     "🎵",
  bonus_video:    "🎬",
};

interface Props {
  curStory:          StoryLibraryItem | undefined;
  slots:             StorySlot[];
  pct:               number;
  hasSubscription?:  boolean;
  nextPremiumStory?: StoryLibraryItem | null;
}

export default function HomeStoryJourneyPanel({ curStory, slots, pct, hasSubscription, nextPremiumStory }: Props) {
  const { t } = useLanguage();
  const done  = slots.filter(s => s.completed).length;
  const total = slots.length || 6;
  const nextSlot = slots.find(s => !s.completed);
  const showPremiumUpsell = !!nextPremiumStory && !hasSubscription && (!curStory || curStory.complete);

  return (
    <div
      className="overflow-hidden rounded-3xl shadow-2xl"
      style={{
        background: "linear-gradient(160deg,#06101F 0%,#0A1828 60%,#0D1E3A 100%)",
        border: "1px solid rgba(201,168,76,0.25)",
      }}
    >
      {/* Gold top bar */}
      <div className="h-1 w-full" style={{ background: "linear-gradient(90deg,#C9A84C,#F5C842,#C9A84C)" }} />

      {/* Airways header strip */}
      <div
        className="px-4 pt-3.5 pb-3"
        style={{ borderBottom: "1px solid rgba(201,168,76,0.15)", background: "rgba(201,168,76,0.06)" }}
      >
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-base">✈️</span>
          <p className="font-nunito font-bold text-[10px] uppercase tracking-[0.18em]"
            style={{ color: "var(--airways-gold-text, #E8BC56)" }}>
            {curStory?.complete ? "Next Flight" : "Today's Mission"}
          </p>
        </div>
        <h3 className="font-baloo font-black text-mlg leading-tight"
          style={{ color: "var(--airways-text-primary, #F0E8D4)" }}>
          {t("journeyTitle")}
        </h3>
      </div>

      {/* Body */}
      <div className="px-4 py-3.5 flex flex-col gap-3">

        {!curStory && !showPremiumUpsell ? (
          <div className="flex flex-col items-center py-3 gap-2 text-center">
            <motion.span aria-hidden="true" className="text-4xl leading-none"
              animate={{ y: [0,-6,0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
              🌍
            </motion.span>
            <p className="font-nunito text-xs" style={{ color: "var(--airways-text-muted, rgba(240,232,212,0.55))" }}>
              {t("journeyChooseStory")}
            </p>
          </div>
        ) : curStory ? (
          <>
            {/* Story cover + info row */}
            <div className="flex items-center gap-3">
              {curStory.cover_url ? (
                <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 shadow-md border"
                  style={{ borderColor: "rgba(201,168,76,0.25)" }}>
                  <Image src={getStorageUrl(curStory.cover_url)} alt={curStory.title} fill className="object-cover" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl shrink-0 border"
                  style={{ background: "rgba(201,168,76,0.10)", borderColor: "rgba(201,168,76,0.25)" }}>
                  {curStory.theme_emoji ?? "📖"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-baloo font-black text-sm leading-tight line-clamp-2"
                  style={{ color: "var(--airways-text-primary, #F0E8D4)" }}>
                  {curStory.title}
                </p>
                <p className="font-nunito font-bold text-2xs mt-0.5"
                  style={{ color: "var(--airways-gold-text, #E8BC56)" }}>
                  {curStory.complete
                    ? "✓ " + t("journeyCompleted")
                    : t("journeyMissionsOf").replace("{done}", String(done)).replace("{total}", String(total))}
                </p>
              </div>
            </div>

            {/* Next activity indicator */}
            {nextSlot && !curStory.complete && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.18)" }}>
                <span className="text-base">{SLOT_ICONS[nextSlot.slot_key] ?? "▶"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-baloo font-black text-xs leading-tight truncate"
                    style={{ color: "var(--airways-text-primary, #F0E8D4)" }}>
                    {nextSlot.title}
                  </p>
                  <p className="font-nunito text-[10px]" style={{ color: "rgba(240,232,212,0.45)" }}>
                    Next activity
                  </p>
                </div>
              </div>
            )}

            {/* Mission progress dots */}
            {slots.length > 0 && !curStory.complete && (
              <div className="flex gap-1.5">
                {slots.map((slot, i) => (
                  <motion.div
                    key={slot.slot_key}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: i * 0.06, ease: "easeOut" }}
                    className="flex-1 h-2 rounded-full origin-left"
                    style={slot.completed ? {
                      background: "linear-gradient(90deg,#C9A84C,#F5C842)",
                    } : {
                      background: "rgba(255,255,255,0.10)",
                    }}
                  />
                ))}
              </div>
            )}

            {/* Progress percentage */}
            {!curStory.complete && (
              <p className="font-nunito text-3xs text-right -mt-1.5"
                style={{ color: "rgba(240,232,212,0.35)" }}>
                {pct}{t("journeyPctComplete")}
              </p>
            )}
          </>
        ) : null}

        {/* CTA */}
        {showPremiumUpsell ? (
          <Link
            href="/pricing"
            className="flex items-center justify-center gap-2 w-full font-baloo font-black text-white text-sml py-3 rounded-xl shadow-md hover:-translate-y-0.5 active:scale-95 transition-all"
            style={{ background: "linear-gradient(135deg,#6d28d9,#5b21b6)", boxShadow: "0 4px 14px rgba(109,40,217,0.35)" }}
          >
            <Crown className="w-3.5 h-3.5 text-yellow-300" />
            Unlock next story
          </Link>
        ) : curStory && !curStory.complete ? (
          <Link
            href={`/stories/${curStory.slug}`}
            className="flex items-center justify-center gap-2 w-full font-baloo font-black text-sml py-3 rounded-xl transition-all hover:-translate-y-0.5 active:scale-95"
            style={{
              background: "linear-gradient(135deg,#F5C842,#C9A84C)",
              color: "#07111F",
              boxShadow: "0 4px 14px rgba(201,168,76,0.35)",
            }}
          >
            <Play className="w-4 h-4 fill-current" />
            {t("storyStatusContinue")}
          </Link>
        ) : !curStory ? (
          <Link
            href="/stories"
            className="flex items-center justify-center gap-2 w-full font-baloo font-black text-sml py-3 rounded-xl transition-all hover:-translate-y-0.5 active:scale-95"
            style={{
              background: "linear-gradient(135deg,#F5C842,#C9A84C)",
              color: "#07111F",
              boxShadow: "0 4px 14px rgba(201,168,76,0.35)",
            }}
          >
            <Play className="w-4 h-4 fill-current" />
            {t("homeAdventureStartJourney")}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
