"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";
import type { StoryLibraryItem, StorySlot } from "@/lib/story-types";


interface Props {
  childName: string;
  childAvatar: string | null;
  story: StoryLibraryItem;
  slots: StorySlot[];
  introViewed?: number;
}

const EMOTION_ORBS = [
  { color: "from-yellow-300 to-yellow-500", emoji: "😊", size: "w-10 h-10 sm:w-12 sm:h-12", pos: "top-[8%] right-[12%]", delay: 0, y: [-4, 4, -4] },
  { color: "from-blue-300 to-blue-500",     emoji: "😢", size: "w-8 h-8 sm:w-10 sm:h-10",   pos: "top-[5%] right-[38%]",  delay: 0.5, y: [-6, 2, -6] },
  { color: "from-green-300 to-green-500",   emoji: "😄", size: "w-9 h-9 sm:w-11 sm:h-11",   pos: "top-[18%] right-[4%]",  delay: 1, y: [-3, 5, -3] },
  { color: "from-purple-300 to-purple-500", emoji: "😠", size: "w-7 h-7 sm:w-9 sm:h-9",     pos: "bottom-[30%] right-[8%]", delay: 1.5, y: [-5, 3, -5] },
  { color: "from-pink-300 to-pink-500",     emoji: "😡", size: "w-8 h-8 sm:w-10 sm:h-10",   pos: "bottom-[22%] right-[30%]", delay: 0.8, y: [-4, 4, -4] },
  { color: "from-lime-300 to-lime-500",     emoji: "🤢", size: "w-7 h-7 sm:w-8 sm:h-8",     pos: "top-[40%] right-[2%]",  delay: 1.2, y: [-3, 5, -3] },
];

function StoryScene() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Rich layered background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a0840] via-[#2d1570] to-[#0d0530]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(147,51,234,0.3),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(59,130,246,0.15),transparent_50%)]" />

      {/* Star field */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div key={i}
          className="absolute w-1 h-1 bg-white rounded-full"
          style={{ top: `${5 + (i * 37) % 85}%`, left: `${10 + (i * 53) % 80}%` }}
          animate={{ opacity: [0.2, 0.8, 0.2], scale: [1, 1.5, 1] }}
          transition={{ duration: 2 + (i % 3), repeat: Infinity, delay: i * 0.2 }}
        />
      ))}

      {/* Emotion face orbs */}
      {EMOTION_ORBS.map((orb, i) => (
        <motion.div key={i}
          className={`absolute ${orb.pos} ${orb.size} rounded-full bg-gradient-to-br ${orb.color} flex items-center justify-center shadow-lg border-2 border-white/30`}
          animate={{ y: orb.y }}
          transition={{ duration: 2.5 + i * 0.3, repeat: Infinity, delay: orb.delay }}>
          <span className="text-[10px] sm:text-[14px]">{orb.emoji}</span>
        </motion.div>
      ))}

      {/* NIMI character — bottom left of scene */}
      <motion.div className="absolute bottom-[10%] left-[15%] sm:left-[20%]"
        animate={{ y: [0, -8, 0] }} transition={{ duration: 3.5, repeat: Infinity }}>
        <div className="relative">
          <img src="/nimi-logo-circle.png" alt="NIMI"
            className="w-20 h-20 sm:w-28 sm:h-28 rounded-full border-4 border-yellow-400/60 shadow-[0_0_30px_rgba(250,204,21,0.3)]" />
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-yellow-300 text-[9px] sm:text-[11px] font-black bg-black/40 backdrop-blur px-2 py-0.5 rounded-full">NIMI</span>
        </div>
      </motion.div>

      {/* PIKO character — bottom right of scene */}
      <motion.div className="absolute bottom-[12%] right-[10%] sm:right-[15%]"
        animate={{ y: [0, -8, 0] }} transition={{ duration: 3.5, repeat: Infinity, delay: 1.2 }}>
        <div className="relative">
          <img src="/piko-logo-circle.png.png" alt="PIKO"
            className="w-20 h-20 sm:w-28 sm:h-28 rounded-full border-4 border-blue-400/60 shadow-[0_0_30px_rgba(59,130,246,0.3)]" />
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-blue-300 text-[9px] sm:text-[11px] font-black bg-black/40 backdrop-blur px-2 py-0.5 rounded-full">PIKO</span>
        </div>
      </motion.div>

      {/* Sparkle particles */}
      {[
        { pos: "top-[15%] left-[30%]", size: 14, delay: 0 },
        { pos: "top-[60%] right-[20%]", size: 10, delay: 0.6 },
        { pos: "bottom-[40%] left-[25%]", size: 12, delay: 1.1 },
        { pos: "top-[30%] right-[45%]", size: 8, delay: 0.3 },
      ].map((s, i) => (
        <motion.img key={i} src="/assets/star-mascot.svg" alt=""
          className={`absolute ${s.pos} opacity-40`}
          style={{ width: s.size, height: s.size }}
          animate={{ opacity: [0.2, 0.5, 0.2], scale: [0.8, 1.2, 0.8], rotate: [0, 15, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: s.delay }}
        />
      ))}
    </div>
  );
}

export default function StoryHero({ childName, childAvatar, story, slots, introViewed = 0 }: Props) {
  const done = slots.filter(s => s.completed).length;
  const total = slots.length || 6;
  const pct = Math.round((done / total) * 100);
  const isComplete = done >= total && total > 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const coverSide = story.cover_url ? (
    <img src={getStorageUrl(story.cover_url)} alt={story.title}
      className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
  ) : (
    <StoryScene />
  );

  return (
    <Link href={`/stories/${story.slug}`} className="block h-full">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="relative rounded-[20px] overflow-hidden cursor-pointer group theme-card border-2 theme-border shadow-[0_8px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] h-full flex flex-col">

          {/* Full-bleed scene/cover behind, text floats on top */}
          <div className="relative min-h-[260px] sm:min-h-[320px] flex-1">
            {/* Background — covers entire card */}
            <div className="absolute inset-0">
              {story.cover_url ? (
                <img src={getStorageUrl(story.cover_url)} alt={story.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
              ) : (
                <StoryScene />
              )}
              {/* Smooth left-to-right dark fade so text is readable */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#0d0625] via-[#0d0625]/75 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d0625]/60 via-transparent to-transparent" />
            </div>

            {/* Current Story ribbon — actual asset */}
            <img src="/current-story.png" alt="Current Story"
              className="absolute top-3 sm:top-4 left-3 sm:left-4 z-20 h-[28px] sm:h-[36px] w-auto drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]" />

            {/* Text overlay — left side */}
            <div className="relative z-10 p-5 sm:p-7 md:p-8 pt-12 sm:pt-14 max-w-[65%] sm:max-w-[55%] flex flex-col justify-center min-h-[260px] sm:min-h-[320px]">
              <h2 className="font-baloo font-black text-white text-[32px] sm:text-[38px] md:text-[42px] leading-[1.1] drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                {story.title}
              </h2>
              <p className="font-nunito theme-text/80 text-[14px] sm:text-[16px] mt-2 sm:mt-3 leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)]">
                Join {childName}, Nimi and Piko on a magical journey to understand feelings!
              </p>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="mt-4 sm:mt-5 w-fit">
                <img src="/continue.png" alt={isComplete ? "View Certificate" : introViewed < 4 ? "Start Intro" : "Continue Story"}
                  className="h-[36px] sm:h-[44px] w-auto drop-shadow-[0_4px_16px_rgba(0,0,0,0.4)]" />
              </motion.div>
            </div>
          </div>

          {/* BOTTOM — progress bar */}
          <div className="theme-bg px-4 sm:px-6 py-3 flex items-center gap-2 sm:gap-3 border-t theme-border">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 shrink-0" />
            <span className="font-nunito text-yellow-300 text-[14px] sm:text-[16px] font-bold shrink-0">Story Progress</span>
            <div className="flex-1 theme-darker rounded-full h-2.5 sm:h-3 overflow-hidden">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-500"
                initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.2, ease: "easeOut" }} />
            </div>
            <span className="font-nunito text-white font-bold text-[14px] sm:text-[16px] shrink-0 tabular-nums">{done} / {total} Missions Completed</span>
          </div>
        </motion.div>
    </Link>
  );
}
