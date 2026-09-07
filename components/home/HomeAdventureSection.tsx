"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import { Play, Crown, ChevronRight } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";
import type { StoryLibraryItem, StorySlot } from "@/lib/story-types";
import { useLanguage } from "@/contexts/LanguageContext";

const SLOT_ICONS: Record<string, string> = {
  flipflop_audio:     "🎧",
  story_pdf:          "📖",
  coloring:           "🎨",
  move_explore:       "🤸",
  sing_along:         "🎵",
  bonus_video:        "🎬",
  challenge_1:        "🏅",
  challenge_2:        "🏅",
  challenge_3:        "🏅",
  destination_video:  "🌍",
};

const SLOT_LABELS: Record<string, string> = {
  flipflop_audio:     "Listen",
  story_pdf:          "Read",
  coloring:           "Create",
  move_explore:       "Move",
  sing_along:         "Sing",
  bonus_video:        "Watch",
  challenge_1:        "Challenge",
  challenge_2:        "Challenge",
  challenge_3:        "Challenge",
  destination_video:  "Discover",
};

function slotLabel(slotKey: string): string {
  return SLOT_LABELS[slotKey] ?? slotKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Props {
  curStory:         StoryLibraryItem | undefined;
  storyNumber:      number;
  doneSlots:        number;
  totalSlots:       number;
  pct:              number;
  slots:            StorySlot[];
  up:               Variants;
  stagger:          Variants;
  hasSubscription?: boolean;
  nextPremiumStory?: StoryLibraryItem | null;
}

function EmptyAdventure() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 px-6 py-10 text-center h-full">
      <motion.span
        className="text-6xl leading-none select-none"
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >✈️</motion.span>
      <div>
        <p className="font-baloo font-black text-lg leading-tight mb-1" style={{ color: "var(--airways-text-primary, #F0E8D4)" }}>
          Ready for your first flight?
        </p>
        <p className="font-nunito text-sm" style={{ color: "var(--airways-text-muted, rgba(240,232,212,0.55))" }}>
          Pick a destination and start exploring!
        </p>
      </div>
      <Link
        href="/stories"
        className="flex items-center gap-2 font-baloo font-black text-sm px-6 py-3 rounded-2xl transition-all hover:-translate-y-0.5 active:scale-95"
        style={{ background: "linear-gradient(135deg,#F5C842,#C9A84C)", color: "#07111F" }}
      >
        Choose Destination <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function PremiumUpsell({ story }: { story: StoryLibraryItem }) {
  return (
    <Link href="/pricing" className="flex flex-col h-full">
      <div
        className="relative flex-1 overflow-hidden rounded-2xl flex flex-col items-center justify-center gap-4 px-5 text-center"
        style={{ background: "linear-gradient(145deg,#4c1d95,#5b21b6,#6d28d9)" }}
      >
        {story.cover_url && (
          <Image
            src={getStorageUrl(story.cover_url)}
            alt=""
            fill
            className="object-cover blur-sm brightness-40 opacity-50"
          />
        )}
        <div className="relative z-10 flex flex-col items-center gap-3">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center border border-white/30 shadow-2xl"
          >
            <Crown className="w-8 h-8 text-yellow-300" />
          </motion.div>
          <div>
            <p className="font-baloo font-black text-white text-xl leading-tight">
              🎉 All free stories complete!
            </p>
            <p className="font-nunito text-white/70 text-sml mt-1">
              Next: <span className="text-white/90 font-bold">{story.title}</span>
            </p>
          </div>
          <span className="font-baloo font-black text-sm px-5 py-2 rounded-full shadow-lg" style={{ background: "linear-gradient(135deg,#F5C842,#C9A84C)", color: "#07111F" }}>
            👑 Upgrade to Club →
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function HomeAdventureSection({
  curStory, storyNumber, doneSlots, totalSlots, pct, slots,
  up, stagger, hasSubscription, nextPremiumStory,
}: Props) {
  const { t } = useLanguage();
  const showPremiumUpsell =
    !!nextPremiumStory && !hasSubscription && (!curStory || curStory.complete);

  const displayTotal = totalSlots || 6;
  const displayPct = curStory?.complete ? 100 : pct;

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={stagger}
      className="relative h-full"
    >
      <motion.div
        variants={up}
        className="relative h-full overflow-hidden flex flex-col rounded-3xl border shadow-2xl"
        style={{
          background: "linear-gradient(160deg, #06101F 0%, #0A1828 60%, #0D1E3A 100%)",
          border: "1px solid rgba(201,168,76,0.25)",
        }}
      >
        {/* Gold top bar */}
        <div className="h-1 w-full shrink-0" style={{ background: "linear-gradient(90deg,#C9A84C,#F5C842,#C9A84C)" }} />

        {/* Section header — title/book number on the left, Story Progress + bar on the right,
            matching the reference's header (not a separate progress block lower in the body). */}
        <div className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg leading-none shrink-0">📖</span>
            <div className="min-w-0">
              <p className="font-nunito font-bold text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--airways-gold-text, #E8BC56)" }}>
                Adventure Book
              </p>
              <h2 className="font-baloo font-black text-sml leading-tight truncate" style={{ color: "var(--airways-text-primary, #F0E8D4)" }}>
                {curStory ? `Book ${storyNumber}: ${curStory.title}` : t("homeAdventureLabel")}
              </h2>
            </div>
          </div>
          {curStory && (
            <div className="shrink-0 text-right">
              <p className="font-nunito font-bold text-[9px] uppercase tracking-wide" style={{ color: "var(--airways-text-muted, rgba(240,232,212,0.55))" }}>
                Story Progress
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                <div className="h-1.5 w-16 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.10)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg,#C9A84C,#F5C842)" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${displayPct}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                </div>
                <span className="font-baloo font-black text-2xs" style={{ color: "var(--airways-gold-text, #E8BC56)" }}>{displayPct}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col min-h-0 px-4 pb-4 gap-3 pt-3">

          {showPremiumUpsell && nextPremiumStory ? (
            <PremiumUpsell story={nextPremiumStory} />
          ) : !curStory ? (
            <EmptyAdventure />
          ) : (
            <>
              {/* Cover (left) + welcome card with activity row (right) — side by side, matching
                  the reference, instead of stacking a full-width cover above everything else. */}
              <div className="flex gap-3 shrink-0">
                <Link
                  href={`/stories/${curStory.slug}`}
                  className="group relative block shrink-0 overflow-hidden rounded-xl shadow-xl"
                  aria-label={`Open story: ${curStory.title}`}
                  style={{ width: 92, aspectRatio: "3/4" }}
                >
                  {curStory.cover_url ? (
                    <Image
                      src={getStorageUrl(curStory.cover_url)}
                      alt={curStory.title}
                      fill
                      priority
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#0D1E3A,#1A3558)" }}>
                      <span className="text-4xl leading-none select-none">{curStory.theme_emoji ?? "📖"}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.35)" }}>
                    <Play className="w-6 h-6" style={{ fill: "#F5C842", color: "#F5C842" }} />
                  </div>
                  <div className="absolute top-1 left-1">
                    {curStory.complete ? (
                      <span className="flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-black" style={{ background: "linear-gradient(135deg,#F5C842,#C9A84C)", color: "#07111F" }}>🏆</span>
                    ) : (
                      <span className="flex items-center rounded-full bg-white/90 px-1.5 py-0.5 text-[8px] font-black" style={{ color: "#07111F" }}>✈️</span>
                    )}
                  </div>
                </Link>

                <div className="flex-1 min-w-0 rounded-xl p-3" style={{ background: "linear-gradient(135deg,#FFFDF8,#F7EEDC)", border: "1px solid rgba(177,120,34,.18)" }}>
                  <p className="font-baloo font-black text-sml leading-tight" style={{ color: "#14233B" }}>
                    {curStory.complete ? "Destination reached! 🎉" : "Welcome to your adventure!"}
                  </p>
                  <p className="mt-1 font-nunito text-[10px] leading-snug" style={{ color: "rgba(20,35,59,0.65)" }}>
                    Meet Nimi, Piko and Zilo as they learn, play and grow in {curStory.title}.
                  </p>

                  {/* Activity row — Listen / Read / Create / Move / Sing / Watch, wraps onto a
                      second centered row for stories with more than 6 activities. */}
                  {slots.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1.5">
                      {slots.map((slot, i) => {
                        const icon = SLOT_ICONS[slot.slot_key] ?? "▶";
                        const label = slotLabel(slot.slot_key);
                        const isNext = i === doneSlots && !curStory.complete;
                        return (
                          <div key={slot.slot_key} className="flex flex-col items-center gap-0.5" style={{ width: 44 }}>
                            <div
                              className="flex h-7 w-7 items-center justify-center rounded-full text-xs"
                              style={slot.completed ? {
                                background: "linear-gradient(135deg,#C9A84C,#F5C842)", color: "#07111F",
                              } : isNext ? {
                                background: "rgba(177,120,34,0.14)", border: "1.5px solid #C9A84C",
                              } : {
                                background: "rgba(20,35,59,0.06)", border: "1px solid rgba(20,35,59,0.12)", opacity: 0.55,
                              }}
                            >
                              {slot.completed ? "✓" : icon}
                            </div>
                            <span className="font-baloo font-black text-[8px] leading-none text-center truncate w-full" style={{ color: isNext || slot.completed ? "#A96113" : "rgba(20,35,59,0.45)" }}>
                              {label}
                            </span>
                            <span className="font-nunito text-[7px] leading-none" style={{ color: "rgba(20,35,59,0.35)" }}>
                              Step {i + 1}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Primary CTA */}
              {curStory.complete ? (
                <Link
                  href="/stories"
                  className="flex items-center justify-center gap-2 w-full font-baloo font-black text-sm py-3 rounded-2xl transition-all hover:-translate-y-0.5 active:scale-95 shadow-md shrink-0"
                  style={{ background: "linear-gradient(135deg,#F5C842,#C9A84C)", color: "#07111F", boxShadow: "0 4px 14px rgba(201,168,76,0.35)" }}
                >
                  <span>🗺️</span> Choose Next Destination
                </Link>
              ) : (
                <Link
                  href={`/stories/${curStory.slug}`}
                  className="flex items-center justify-center gap-2 w-full font-baloo font-black text-sm py-3 rounded-2xl transition-all hover:-translate-y-0.5 active:scale-95 shrink-0"
                  style={{ background: "linear-gradient(135deg,#F5C842,#C9A84C)", color: "#07111F", boxShadow: "0 4px 14px rgba(201,168,76,0.35)" }}
                >
                  <Play className="w-4 h-4 fill-current" />
                  {doneSlots === 0 ? "✈️ Begin Adventure" : t("homeAdventureKeepGoing")}
                </Link>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.section>
  );
}
