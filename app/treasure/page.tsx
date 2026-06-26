"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Lock, ChevronRight } from "lucide-react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import MagicBackground from "@/components/magic/MagicBackground";
import MagicLoader from "@/components/magic/MagicLoader";
import { useLanguage } from "@/contexts/LanguageContext";
import { getChildren, getChildAchievements } from "@/lib/queries";
import type { ChildAchievement } from "@/lib/queries";
import { getStoryLibrary } from "@/lib/storyRepository";
import type { StoryLibraryItem } from "@/lib/story-types";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

const BADGES = [
  { slug: "story-explorer", icon: "/assets/badge-explorer.svg", tKey: "badgeExplorer", bg: "from-yellow-400 to-amber-500" },
  { slug: "kind-heart", icon: "/assets/badge-kindheart.svg", tKey: "badgeKindHeart", bg: "from-pink-400 to-fuchsia-500" },
  { slug: "healthy-hero", icon: "/assets/badge-hero.svg", tKey: "badgeHealthy", bg: "from-blue-400 to-cyan-500" },
  { slug: "rainbow-star", icon: "/assets/star-mascot.svg", tKey: "badgeRainbow", bg: "from-green-400 to-emerald-500" },
  { slug: "music-master", icon: "/assets/icon-sing.svg", tKey: "badgeMusic", bg: "from-purple-400 to-violet-500" },
  { slug: "super-champion", icon: "/assets/trophy.svg", tKey: "badgeChampion", bg: "from-orange-400 to-red-500" },
];

export default function TreasurePage() {
  const { t } = useLanguage();
  const [childName, setChildName] = useState("Explorer");
  const [achievements, setAchievements] = useState<ChildAchievement[]>([]);
  const [stories, setStories] = useState<StoryLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const list = await getChildren();
      const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
      const child = list.find(c => c.id === savedId) ?? list[0];
      if (!child) { setLoading(false); return; }
      setChildName(child.name);
      const [achs, lib] = await Promise.all([
        getChildAchievements(child.id),
        getStoryLibrary(child.id, child.language),
      ]);
      setAchievements(achs);
      setStories(lib);
      setLoading(false);
    })();
  }, []);

  const earned = achievements.filter(a => a.type === "badge" && a.slug.startsWith("story-") && a.slug.includes("-complete-")).length;
  const totalStars = earned * 50;
  const completedStories = stories.filter(s => s.complete).length;

  if (loading) {
    return (
      <AppShell>
        <MagicLoader variant="treasure" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen relative overflow-hidden theme-bg flex flex-col">
        <MagicBackground variant="castle" />
        {/* Sparkle background */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 15 }).map((_, i) => (
            <motion.div key={i} className="absolute w-1.5 h-1.5 bg-yellow-400/30 rounded-full"
              style={{ top: `${8 + (i * 41) % 80}%`, left: `${5 + (i * 57) % 85}%` }}
              animate={{ opacity: [0.15, 0.6, 0.15], scale: [1, 1.5, 1] }}
              transition={{ duration: 2.5 + (i % 3), repeat: Infinity, delay: i * 0.3 }} />
          ))}
        </div>

        <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 flex-1 w-full">

          {/* ═══ BIG TREASURE HEADER ═══ */}
          <div className="text-center mb-10">
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              className="flex items-center justify-center gap-4 mb-4">
              <motion.img src="/nimi-logo-circle.png" alt="NIMI"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-[3px] border-yellow-400/50 shadow-xl"
                animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }} />
              <motion.img src="/assets/trophy.svg" alt="Trophy"
                className="w-20 h-20 sm:w-28 sm:h-28 drop-shadow-[0_4px_24px_rgba(245,158,11,0.4)]"
                animate={{ y: [0, -8, 0], rotate: [0, 3, -3, 0] }} transition={{ duration: 3.5, repeat: Infinity }} />
              <motion.img src="/piko-logo-circle.png.png" alt="PIKO"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-[3px] border-blue-400/50 shadow-xl"
                animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, delay: 1 }} />
            </motion.div>
            <h1 className="font-baloo font-black text-[32px] sm:text-[42px] text-yellow-300 leading-tight">
              {childName}&apos;s Treasure! ✨
            </h1>

            {/* Big star count */}
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }}
              className="inline-flex items-center gap-3 mt-4 bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border-2 border-yellow-400/25 rounded-full px-6 py-3">
              <img src="/assets/star-mascot.svg" alt="" className="w-10 h-10" />
              <span className="font-baloo font-black text-yellow-300 text-[32px]">{totalStars}</span>
              <span className="font-nunito text-yellow-200/60 text-[14px] font-bold">Stars</span>
            </motion.div>
          </div>

          {/* ═══ MY BADGES — the main attraction ═══ */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5 mb-10">
            {BADGES.map((badge, i) => {
              const isEarned = earned > i;
              return (
                <motion.div key={badge.slug}
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.1, type: "spring", stiffness: 300 }}
                  className={`relative rounded-[24px] p-4 sm:p-5 flex flex-col items-center text-center border-[3px] ${
                    isEarned
                      ? `bg-gradient-to-br ${badge.bg} border-white/30 shadow-[0_8px_30px_rgba(0,0,0,0.3)]`
                      : "theme-card theme-border"
                  }`}
                >
                  {/* Badge icon — BIG */}
                  <motion.div
                    animate={isEarned ? { scale: [1, 1.06, 1], rotate: [0, 3, -3, 0] } : {}}
                    transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }}
                    className="mb-3">
                    <img src={badge.icon} alt={t(badge.tKey)}
                      className={`w-20 h-20 sm:w-24 sm:h-24 drop-shadow-lg ${isEarned ? "" : "grayscale opacity-20"}`} />
                  </motion.div>

                  {/* Label */}
                  <p className={`font-baloo font-black text-[15px] sm:text-[17px] leading-tight ${
                    isEarned ? "text-white drop-shadow" : "theme-text-muted/30"
                  }`}>
                    {t(badge.tKey)}
                  </p>

                  {/* Status */}
                  {isEarned ? (
                    <span className="mt-2 bg-white/20 text-white text-[11px] font-nunito font-bold rounded-full px-3 py-1">
                      ✅ Earned!
                    </span>
                  ) : (
                    <span className="mt-2 flex items-center gap-1 theme-text-muted/40 text-[11px] font-nunito font-bold">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  )}

                  {/* Earned glow */}
                  {isEarned && (
                    <motion.div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg border-2 border-white/50"
                      initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4 + i * 0.1, type: "spring" }}>
                      <span className="text-[14px]">⭐</span>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* ═══ STORY PROGRESS — simple visual ═══ */}
          <div className="theme-card border-2 theme-border rounded-[24px] p-5 sm:p-6 shadow-xl mb-8">
            <h2 className="font-baloo font-black text-white text-[22px] sm:text-[26px] text-center mb-5">
              📚 My Stories
            </h2>
            <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
              {stories.map((story, i) => (
                <motion.div key={story.sid}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.1, type: "spring" }}>
                  <Link href={story.unlocked ? `/stories/${story.slug}` : "#"}
                    className={story.unlocked ? "" : "pointer-events-none"}>
                    <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-[24px] sm:text-[28px] font-black border-[3px] shadow-lg transition ${
                      story.complete
                        ? "bg-green-500 border-green-300/50 text-white shadow-green-500/20"
                        : story.unlocked
                          ? "bg-yellow-500 border-yellow-300/50 text-white shadow-yellow-500/20"
                          : "theme-card-active theme-border theme-text-muted"
                    }`}>
                      {story.complete ? "✅" : story.unlocked ? story.sort_order : <Lock className="w-5 h-5" />}
                    </div>
                  </Link>
                  <p className={`font-nunito text-[10px] sm:text-[11px] font-bold text-center mt-1.5 max-w-[80px] leading-tight ${
                    story.complete ? "text-green-300" : story.unlocked ? "text-yellow-300" : "theme-text-muted/30"
                  }`}>
                    {story.title}
                  </p>
                </motion.div>
              ))}
            </div>
            <p className="font-nunito text-center theme-text-muted text-[14px] font-bold mt-5">
              {completedStories}/{stories.length} stories completed!
            </p>
          </div>

          {/* ═══ BOTTOM CTA ═══ */}
          <div className="text-center">
            <motion.div className="flex items-center justify-center gap-2 mb-4"
              animate={{ y: [0, -4, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
              <img src="/assets/star-mascot.svg" alt="" className="w-10 h-10" />
              <img src="/assets/star-mascot.svg" alt="" className="w-8 h-8 opacity-60" />
              <img src="/assets/star-mascot.svg" alt="" className="w-10 h-10" />
            </motion.div>
            <p className="font-baloo font-black text-yellow-300 text-[20px] sm:text-[24px]">
              Keep playing to fill your treasure!
            </p>
            <Link href="/">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="mt-4 font-baloo font-black bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[18px] rounded-full px-8 py-3.5 shadow-[0_4px_20px_rgba(34,197,94,0.3)] inline-flex items-center gap-2">
                🏠 Back to Home
              </motion.button>
            </Link>
          </div>

        </main>
      </div>
    </AppShell>
  );
}
