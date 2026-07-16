"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets, type ThemeAssets } from "@/lib/design-system/assetRegistry";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import type { StoryLibraryItem, StorySlot } from "@/lib/story-types";

interface Props {
  childName:    string;
  childAvatar:  string | null;
  story:        StoryLibraryItem;
  slots:        StorySlot[];
  introViewed?: number;
}

// ─── World layer sub-components ─────────────────────────────────────────────
// Each renders one visual layer of the hero world.
// All consume `assets` from the parent — no theme conditionals inside.

interface AtmosphereProps {
  assets:        ThemeAssets;
  gradientClass: string;
}

// Layer 1 + 2: world background image tinted by the theme gradient.
function WorldAtmosphere({ assets, gradientClass }: AtmosphereProps) {
  return (
    <>
      <img
        src={assets.hero.background}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
       loading="lazy" />
      {/* Theme gradient tint — reinforces world palette, aids readability */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} opacity-55`} />
    </>
  );
}

interface WorldElementsProps {
  assets:        ThemeAssets;
  floatY:        number;   // float amplitude in px (negative = up)
  floatDuration: number;   // seconds per float cycle
  reduced:       boolean;
}

// Layer 3: foreground world elements + mascot + ornaments (shown when no cover).
function WorldElements({ assets, floatY, floatDuration, reduced }: WorldElementsProps) {
  const floatAnim    = reduced ? {} : { y: [0, floatY, 0] };
  const floatSlow    = reduced ? {} : { duration: floatDuration,        repeat: Infinity, ease: "easeInOut" as const };
  const floatFast    = reduced ? {} : { duration: floatDuration * 0.75, repeat: Infinity, ease: "easeInOut" as const, delay: 0.8 };
  // Ornaments drift slower and shallower — creates parallax depth between layers
  const ornamentAnim = reduced ? {} : { y: [0, floatY * 0.2, 0] };
  const ornamentSlow = reduced ? {} : { duration: floatDuration * 1.7, repeat: Infinity, ease: "easeInOut" as const, delay: 0.4 };

  return (
    <>
      {/* Foreground world illustration — expands to 68% for world immersion */}
      <motion.img
        src={assets.hero.foreground}
        alt=""
        className="absolute bottom-0 right-0 h-full w-auto max-w-[68%] object-contain object-bottom pointer-events-none select-none"
        animate={floatAnim}
        transition={floatSlow}
        draggable={false}
      />
      {/* World mascot — enlarged, slightly faster drift for depth separation */}
      <motion.img
        src={assets.hero.mascot}
        alt=""
        className="absolute bottom-[5%] right-[3%] w-24 h-24 sm:w-32 sm:h-32 object-contain drop-shadow-2xl pointer-events-none select-none"
        animate={floatAnim}
        transition={floatFast}
        draggable={false}
      />
      {/* Thematic ornaments — slowest drift, deepest parallax layer */}
      <motion.img
        src={assets.hero.ornaments}
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none opacity-80"
        animate={ornamentAnim}
        transition={ornamentSlow}
        draggable={false}
      />
    </>
  );
}

interface OverlaysProps {
  assets:  ThemeAssets;
  reduced: boolean;
}

// Layer 5 + 6: frame border decoration + atmospheric particles.
// Rendered as siblings of the bg container so they sit above content (z-[8] / z-30).
// Both use pointer-events-none — never block clicks.
function WorldOverlays({ assets, reduced }: OverlaysProps) {
  return (
    <>
      {/* Parchment corners / glass shell border — subtle enchanted pulse */}
      <motion.img
        src={assets.hero.frame}
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-[8]"
        animate={reduced ? {} : { opacity: [0.85, 1, 0.85] }}
        transition={reduced ? {} : { duration: 5, repeat: Infinity, ease: "easeInOut" }}
        draggable={false}
      />
      {/* Ambient particles — sparkle dust (HP) or rising bubbles (Ocean) */}
      <motion.img
        src={assets.hero.particles}
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-30 opacity-50"
        animate={reduced ? {} : { opacity: [0.25, 0.55, 0.25] }}
        transition={reduced ? {} : { duration: 4, repeat: Infinity, ease: "easeInOut" }}
        draggable={false}
      />
    </>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function StoryHero({ childName, childAvatar, story, slots, introViewed = 0 }: Props) {
  const { themeId, theme } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const m      = useThemeMotion();

  const done       = slots.filter(s => s.completed).length;
  const total      = slots.length || 6;
  const pct        = Math.round((done / total) * 100);
  const isComplete = done >= total && total > 0;

  // Hero-scale float: multiply theme hoverLift for drama (HP −12 px, Ocean −6 px).
  const heroFloatY = m.hoverLift * 3;

  return (
    <Link href={`/stories/${story.slug}`} className="block h-full">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative leaf overflow-hidden cursor-pointer group bg-white border border-ds-border shadow-ds-card h-full flex flex-col"
      >

        {/* ═══ HERO AREA — layered world system ═══ */}
        <div className="relative min-h-[260px] sm:min-h-[320px] flex-1">

          {/* ── Background container (Layers 1–4) ── */}
          <div className="absolute inset-0 overflow-hidden">

            {/* Layer 1+2: World atmosphere — always present */}
            <WorldAtmosphere assets={assets} gradientClass={theme.gradients.storyHeader} />

            {/* Layer 3: Story cover image OR world foreground elements */}
            {story.cover_url ? (
              <img
                src={getStorageUrl(story.cover_url)}
                alt={story.title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
               loading="lazy" />
            ) : (
              <WorldElements
                assets={assets}
                floatY={heroFloatY}
                floatDuration={4}
                reduced={m.reduced}
              />
            )}

            {/* Layer 4: Text readability — left-to-right and bottom-to-top fades */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>

          {/* ── Layer 5+6: World overlays — frame & particles, above text ── */}
          <WorldOverlays assets={assets} reduced={m.reduced} />

          {/* Current Story ribbon — z-20, above frame/text */}
          <img
            src={assets.storyCurrentCover}
            alt="Current Story"
            className="absolute top-3 sm:top-4 left-3 sm:left-4 z-20 h-[28px] sm:h-[36px] w-auto drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
           loading="lazy" />

          {/* Content text — z-10 */}
          <div className="relative z-10 p-5 sm:p-7 md:p-8 pt-12 sm:pt-14 max-w-[65%] sm:max-w-[55%] flex flex-col justify-center min-h-[260px] sm:min-h-[320px]">
            <h2 className="font-baloo font-black text-white text-[32px] sm:text-[38px] md:text-[42px] leading-[1.1] drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
              {story.title}
            </h2>
            <p className="font-nunito text-white/80 text-[14px] sm:text-[16px] mt-2 sm:mt-3 leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)]">
              {isComplete
                ? `Amazing work, ${childName}! You've completed this story.`
                : `Join ${childName}, Nimi and Piko on an adventure with ${story.title}!`}
            </p>
            <motion.div whileHover={m.buttonHover} whileTap={m.buttonPress} className="mt-4 sm:mt-5 w-fit">
              <img
                src={assets.storyContinue}
                alt={isComplete ? "View Certificate" : introViewed < 4 ? "Start Intro" : "Continue Story"}
                className="h-[36px] sm:h-[44px] w-auto drop-shadow-[0_4px_16px_rgba(0,0,0,0.4)]"
               loading="lazy" />
            </motion.div>
          </div>
        </div>

        {/* ═══ PROGRESS BAR ═══ */}
        <div className="bg-white px-4 sm:px-6 py-3 flex items-center gap-2 sm:gap-3 border-t border-ds-border">
          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 shrink-0" />
          <span className="font-nunito text-gray-700 text-[14px] sm:text-[16px] font-bold shrink-0">
            Story Progress
          </span>
          <div className="flex-1 bg-gray-100 rounded-full h-2.5 sm:h-3 overflow-hidden">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${theme.gradients.progress}`}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </div>
          <span className="font-nunito text-gray-900 font-bold text-[14px] sm:text-[16px] shrink-0 tabular-nums">
            {done} / {total} Missions Completed
          </span>
        </div>

      </motion.div>
    </Link>
  );
}
