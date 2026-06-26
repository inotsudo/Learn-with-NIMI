"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Play } from "lucide-react";
import type { StorySlot } from "@/lib/story-types";

interface Props {
  storySlug: string;
  slots: StorySlot[];
}

const MISSIONS: {
  key: string;
  num: number;
  title: string;
  desc: string;
  emoji: string;
  mascot: "nimi" | "piko";
  gradient: string;
  glow: string;
}[] = [
  { key: "flipflop_audio", num: 1, title: "MAGIC STORIES\nWITH NIMI",  desc: "Listen to Nimi tell the story page by page.",           emoji: "🎧", mascot: "nimi", gradient: "from-violet-600 to-purple-800",  glow: "shadow-violet-500/30" },
  { key: "story_pdf",      num: 2, title: "SHINY\nREADERS",            desc: "Read the story with your family and discover new words.", emoji: "📖", mascot: "piko", gradient: "from-blue-600 to-indigo-800",    glow: "shadow-blue-500/30" },
  { key: "coloring",       num: 3, title: "LITTLE\nCREATORS",          desc: "Bring the story to life with colors and creativity.",     emoji: "🎨", mascot: "nimi", gradient: "from-orange-500 to-red-700",     glow: "shadow-orange-500/30" },
  { key: "move_explore",   num: 4, title: "MOVE &\nGROOVE",            desc: "Jump, clap, hug and move along with Nimi and Piko!",      emoji: "🤸", mascot: "piko", gradient: "from-emerald-500 to-green-800",  glow: "shadow-emerald-500/30" },
  { key: "sing_along",     num: 5, title: "SING ALONG\nWITH NIMI",     desc: "Sing along and practice the story words through music.",  emoji: "🎤", mascot: "nimi", gradient: "from-pink-500 to-fuchsia-800",   glow: "shadow-pink-500/30" },
  { key: "bonus_video",    num: 6, title: "JOURNEY\nWITH NIMI",        desc: "Watch the animated story and enjoy the adventure!",       emoji: "🎬", mascot: "piko", gradient: "from-red-500 to-rose-800",       glow: "shadow-red-500/30" },
];

export default function StoryMissionGrid({ storySlug, slots }: Props) {
  if (slots.length === 0) return null;

  const done = slots.filter(s => s.completed).length;

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
          <span className="text-lg">⭐</span>
        </div>
        <div>
          <h2 className="font-black text-white text-base">Story Missions</h2>
          <p className="theme-text-muted text-[11px] font-semibold">Complete all 6 to earn your certificate! · {done}/6 done</p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {MISSIONS.map((m, i) => {
          const slot = slots.find(s => s.slot_key === m.key);
          const completed = slot?.completed ?? false;
          const title = slot?.title || m.title.split("\n")[0];

          return (
            <motion.div
              key={m.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.4 }}
            >
              <Link href={`/stories/${storySlug}/mission/${m.key}`}>
                <div className={`relative rounded-[20px] overflow-hidden shadow-xl ${m.glow} hover:scale-[1.05] hover:shadow-2xl transition-all duration-300 cursor-pointer h-full flex flex-col group`}>

                  {/* Background gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-b ${m.gradient}`} />
                  {completed && <div className="absolute inset-0 bg-green-600/20" />}

                  {/* Content */}
                  <div className="relative z-10 p-3 flex flex-col h-full">

                    {/* Number badge */}
                    <div className={`w-7 h-7 ${completed ? "bg-green-500" : "bg-white/20"} backdrop-blur rounded-lg flex items-center justify-center font-black text-white text-xs shadow-md border border-white/20`}>
                      {m.num}
                    </div>

                    {/* Mascot + emoji */}
                    <div className="flex-1 flex items-center justify-center py-2">
                      <div className="relative">
                        <img
                          src={m.mascot === "nimi" ? "/nimi-logo-circle.png" : "/piko-logo-circle.png.png"}
                          alt=""
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-white/30 shadow-xl object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-sm shadow-lg border border-white/20">
                          {m.emoji}
                        </div>
                      </div>
                    </div>

                    {/* Title */}
                    <p className="font-black text-white text-[10px] sm:text-[11px] uppercase leading-tight text-center min-h-[24px] whitespace-pre-line">
                      {m.title}
                    </p>

                    {/* Description */}
                    <p className="text-white/60 text-[8px] text-center leading-snug mt-1 min-h-[20px] hidden sm:block">
                      {m.desc}
                    </p>

                    {/* Status button */}
                    <div className="mt-2">
                      {completed ? (
                        <div className="flex items-center justify-center gap-1.5 bg-green-500 rounded-full py-1.5 shadow-lg">
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          <span className="text-white text-[10px] font-black tracking-wide">COMPLETED</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 bg-white/15 backdrop-blur border border-white/20 rounded-full py-1.5 shadow-md group-hover:bg-white/25 transition">
                          <Play className="w-3.5 h-3.5 text-white fill-white" />
                          <span className="text-white text-[10px] font-black tracking-wide">START</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Decorative sparkles */}
                  <motion.span className="absolute top-2 right-2 text-yellow-300/40 text-[10px]"
                    animate={{ opacity: [0.2, 0.8, 0.2], scale: [1, 1.3, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3 }}>✦</motion.span>
                  <motion.span className="absolute bottom-8 right-3 text-white/20 text-[8px]"
                    animate={{ opacity: [0.1, 0.5, 0.1] }}
                    transition={{ duration: 3, repeat: Infinity, delay: 0.5 + i * 0.2 }}>✦</motion.span>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
