"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { DURATION, SPRING } from "@/lib/design-system/motion";
import { Lock, CheckCircle2, Play, Star, Search, ChevronLeft, ChevronRight } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import MagicLoader from "@/components/magic/MagicLoader";
import { getChildren, getStorageUrl, getTotalStars, getWeekStreak, getConsecutiveStreak, getChildAchievements, type Child } from "@/lib/queries";
import supabase from "@/lib/supabaseClient";
import { getStoryLibrary, getCurrentStoryId } from "@/lib/storyRepository";
import type { StoryLibraryItem } from "@/lib/story-types";
import { PageSurface, HeroBanner } from "@/components/layout/primitives";
import StatsSidebar from "@/components/home/StatsSidebar";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";
const PAGE_SIZE = 8;

const CATEGORY_META: Record<string, { emoji: string; key: string }> = {
  animals: { emoji: "🐾", key: "storyCatAnimals" },
  friendship: { emoji: "❤️", key: "storyCatFriendship" },
  bedtime: { emoji: "🌙", key: "storyCatBedtime" },
  adventure: { emoji: "🚀", key: "storyCatAdventure" },
  values: { emoji: "⭐", key: "storyCatValues" },
  nature: { emoji: "🌿", key: "storyCatNature" },
  family: { emoji: "👨‍👩‍👧", key: "storyCatFamily" },
  creativity: { emoji: "🎨", key: "storyCatCreativity" },
};

export default function StoryLibraryPage() {
  const { t } = useLanguage();
  const m = useThemeMotion();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const [stories, setStories] = useState<StoryLibraryItem[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalStars, setTotalStars] = useState(0);
  const [storyStars, setStoryStars] = useState<Record<string, number>>({});
  const [weekStreak, setWeekStreak] = useState<boolean[]>([false,false,false,false,false,false,false]);
  const [streakCount, setStreakCount] = useState(0);
  const [badgeCount, setBadgeCount] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);

  const activeChildRef = useRef<Child | null>(null);

  const loadForChild = async (child: Child, lang: Language) => {
    setLoading(true);
    const [lib, cur, streak, consStreak, ach] = await Promise.all([
      getStoryLibrary(child.id, lang),
      getCurrentStoryId(child.id, lang),
      getWeekStreak(child.id, lang),
      getConsecutiveStreak(child.id, lang),
      getChildAchievements(child.id),
    ]);
    setStories(lib);
    setCurrentId(cur);
    setWeekStreak(streak);
    setStreakCount(consStreak);
    setBadgeCount(ach.filter(a => a.type === "badge" && a.language === lang).length);

    const stars = await getTotalStars(child.id, lang);
    setTotalStars(stars);

    const { data: progressData } = await supabase
      .from("child_progress")
      .select("mission_id, missions(stars, story_slots(story_id))")
      .eq("child_id", child.id)
      .eq("language", lang);

    const perStory: Record<string, number> = {};
    for (const row of progressData ?? []) {
      const m = row.missions as { stars?: number; story_slots?: { story_id?: string } | { story_id?: string }[] } | null;
      const storyId = Array.isArray(m?.story_slots) ? m.story_slots[0]?.story_id : m?.story_slots?.story_id;
      if (storyId) perStory[storyId] = (perStory[storyId] ?? 0) + (m?.stars ?? 0);
    }
    setStoryStars(perStory);
    setLoading(false);
  };

  useEffect(() => {
    void (async () => {
      const list = await getChildren();
      const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
      const child = list.find(c => c.id === savedId) ?? list[0];
      if (!child) { setLoading(false); return; }
      activeChildRef.current = child;
      await loadForChild(child, child.language);
    })();
  }, []);

  // Reload stories when the global language switcher fires.
  useEffect(() => {
    const handler = async (e: Event) => {
      const lang = (e as CustomEvent<{ language: Language }>).detail?.language;
      const child = activeChildRef.current;
      if (!lang || !child) return;
      const updated = { ...child, language: lang };
      activeChildRef.current = updated;
      setCategory("all");
      setPage(1);
      await loadForChild(updated, lang);
    };
    window.addEventListener("app:languageChange", handler as EventListener);
    return () => window.removeEventListener("app:languageChange", handler as EventListener);
  }, []);

  // Build category tabs from actual story data
  const activeCategories = Array.from(new Set(stories.map(s => s.category).filter(Boolean))) as string[];
  const categoryTabs = [
    { key: "all", emoji: "📚", label: t("storyCatAll") },
    ...activeCategories.map(c => ({
      key: c,
      emoji: CATEGORY_META[c]?.emoji ?? "📖",
      label: CATEGORY_META[c] ? t(CATEGORY_META[c].key) : c.charAt(0).toUpperCase() + c.slice(1),
    })),
  ];

  const filtered = stories.filter(s => {
    if (category !== "all" && s.category !== category) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!s.title.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const currentStory = stories.find(s => s.sid === currentId);
  const completedCount = stories.filter(s => s.complete).length;

  return (
    <AppShell>
      <PageSurface>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 pb-28 w-full xl:flex xl:gap-6 xl:items-start">
      <main className="flex-1 min-w-0">

          {/* ═══ HEADER — gradient hero ═══ */}
          <HeroBanner zone="library" className="mb-6">
            <div className="absolute -top-6 -right-6 w-36 h-36 rounded-full bg-white/10" />
            <div className="absolute -bottom-8 -left-8 w-44 h-44 rounded-full bg-white/10" />
            {(([
              { top: "20%", left: "6%",  size: 16, delay: 0 },
              { top: "65%", left: "14%", size: 11, delay: 0.7 },
              { top: "25%", right: "5%", size: 20, delay: 0.4 },
              { top: "70%", right: "9%", size: 13, delay: 1.1 },
            ]) as Array<{top:string;size:number;delay:number;left?:string;right?:string}>).map((s, i) => (
              <motion.span key={i} className="absolute pointer-events-none select-none"
                style={{ top: s.top, left: s.left, right: s.right, fontSize: s.size }}
                animate={{ opacity:[0.3,1,0.3], scale:[0.7,1.3,0.7], rotate:[0,20,-20,0] }}
                transition={{ duration: DURATION.loopBase + DURATION.moderate, repeat: Infinity, delay: s.delay }} aria-hidden>⭐</motion.span>
            ))}
            <div className="relative z-10 flex items-center gap-4 px-5 py-5 sm:px-7 sm:py-6">
              <motion.img src={assets.nimiCircle} alt="Nimi"
                animate={{ y:[0,-5,0] }} transition={{ duration: DURATION.loopSlow, repeat: Infinity }}
                className="w-16 h-16 rounded-full border-2 border-white/40 shadow-lg shrink-0" draggable={false} />
              <div className="flex-1">
                <p className="text-white/55 text-[10px] font-nunito font-bold uppercase tracking-[0.14em] mb-0.5">The Library</p>
                <h1 className="font-baloo font-black text-white text-[26px] sm:text-[34px] leading-tight drop-shadow-md">{t("storyLibraryTitle")}</h1>
                <p className="text-white/80 text-[13px] font-nunito font-semibold mt-0.5">{t("storyLibrarySubtitle")}</p>
              </div>
              {completedCount > 0 && (
                <div className="flex items-center gap-1.5 bg-white/20 border border-white/30 rounded-full px-3 py-1.5 shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span className="font-baloo font-black text-white text-[14px]">{completedCount}</span>
                </div>
              )}
            </div>
          </HeroBanner>

          {/* ═══ CONTINUE HERO — current story card ═══ */}
          {currentStory && !currentStory.complete && (
            <Link href={`/stories/${currentStory.slug}`}>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01 }} whileTap={m.buttonPress}
                className="page-shell mb-6 overflow-hidden cursor-pointer">
                <div className="relative h-36 sm:h-44">
                  {currentStory.cover_url ? (
                    <Image src={getStorageUrl(currentStory.cover_url)} alt={currentStory.title} fill className="object-cover" draggable={false} />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <span className="text-6xl">{currentStory.theme_emoji}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute bottom-0 inset-x-0 p-4 sm:p-5">
                    <p className="text-yellow-300/80 text-[11px] font-black uppercase tracking-wider mb-1">{t("storyContinueAdventure")}</p>
                    <h2 className="font-baloo font-black text-white text-[20px] sm:text-[24px] leading-tight">{currentStory.theme_emoji} {currentStory.title}</h2>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex-1 bg-white/15 rounded-full h-2.5 overflow-hidden">
                        <motion.div className="bg-gradient-to-r from-yellow-400 to-orange-400 h-full rounded-full"
                          initial={{ width: 0 }} animate={{ width: `${currentStory.progress * 100}%` }} transition={{ duration: DURATION.loopSpark }} />
                      </div>
                      <span className="text-white/70 font-baloo font-black text-[13px]">{Math.round(currentStory.progress * 100)}%</span>
                    </div>
                  </div>
                  <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: DURATION.loopFast, repeat: Infinity }}
                    className="absolute top-4 right-4 w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-xl">
                    <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                  </motion.div>
                </div>
              </motion.div>
            </Link>
          )}

          {/* ═══ FILTERS ═══ */}
          <div className="page-shell flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5 p-4 sm:p-5">
            {activeCategories.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 flex-1" style={{ scrollbarWidth: "none" }}>
                {categoryTabs.map(cat => (
                  <button key={cat.key} onClick={() => { setCategory(cat.key); setPage(1); }}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full font-baloo font-bold text-[13px] whitespace-nowrap shrink-0 transition-all ${
                      category === cat.key
                        ? "bg-ds-action text-white shadow-lg"
                        : "bg-white text-gray-500 border border-ds-border hover:text-gray-700 hover:bg-gray-50"
                    }`}>
                    <span className="text-[16px]">{cat.emoji}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            )}
            <div className={`relative w-full shrink-0 ${activeCategories.length > 1 ? "sm:w-56" : "sm:w-72"}`}>
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder={t("storySearchPlaceholder")}
                className="w-full bg-ds-input border border-ds-border rounded-full pl-9 pr-4 py-2.5 text-[13px] text-ds-text placeholder:text-gray-400 focus:outline-none focus:border-[var(--ds-state-focus)] focus:ring-2 focus:ring-[var(--ds-state-focus)]/20 transition" />
            </div>
          </div>

          {/* ═══ STORY GRID ═══ */}
          {loading ? (
            <div className="py-16">
              <MagicLoader variant="stories" fullPage={false} />
            </div>
          ) : paginated.length === 0 ? (
            <div className="page-shell text-center py-16">
              <motion.span className="text-6xl block mb-4" animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: DURATION.loopBase, repeat: Infinity }}>📚</motion.span>
              <p className="font-baloo font-bold text-gray-400 text-[18px]">{t("storyNoResults")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginated.map((story, i) => {
                const isCurrent = story.sid === currentId;
                const done = Math.round(story.progress * 6);
                const hasCover = !!story.cover_url;

                return (
                  <motion.div key={story.sid}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * DURATION.fast, ...SPRING.soft }}>

                    {story.unlocked ? (
                      <Link href={`/stories/${story.slug}`}>
                        <motion.div whileHover={{ y: m.hoverLift }} whileTap={m.buttonPress}
                          className={`overflow-hidden page-card transition-all cursor-pointer group ${
                            story.complete ? "border-[var(--ds-border-brand)]/50" : isCurrent ? "border-[var(--ds-border-brand)]/30" : "border-ds-border hover:border-[var(--ds-border-brand)]"
                          }`}
                          style={{ borderRadius: 'var(--leaf-r-lg)' }}>

                          <div className="relative aspect-[4/3] overflow-hidden">
                            {hasCover ? (
                              <Image src={getStorageUrl(story.cover_url!)} alt={story.title} fill
                                className="object-cover group-hover:scale-105 transition-transform duration-500" draggable={false} />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                <motion.span className="text-5xl" animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                                  transition={{ duration: DURATION.loopBase, repeat: Infinity }}>{story.theme_emoji}</motion.span>
                              </div>
                            )}

                            <div className="absolute top-2.5 left-2.5 w-8 h-8 bg-white/80 rounded-xl flex items-center justify-center font-baloo font-black text-gray-700 text-[14px] border border-gray-200">
                              {story.sort_order}
                            </div>

                            {story.complete ? (
                              <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-ds-action text-white text-2xs font-black px-2.5 py-1 rounded-full shadow-lg">
                                <CheckCircle2 className="w-3 h-3" /> {t("storyStatusComplete")}
                              </div>
                            ) : isCurrent ? (
                              <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: DURATION.loopBase, repeat: Infinity }}
                                className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg">
                                <Play className="w-3 h-3 fill-white" /> {t("storyStatusContinue")}
                              </motion.div>
                            ) : null}
                          </div>

                          <div className="p-3">
                            <h3 className="font-baloo font-black text-ds-text text-[14px] sm:text-[15px] leading-tight truncate">{story.title}</h3>
                            <div className="flex items-center gap-0.5 mt-1.5">
                              {Array.from({ length: 5 }).map((_, j) => {
                                const starProgress = done / 6 * 5;
                                return <Star key={j} className={`w-3.5 h-3.5 ${j < starProgress ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-100"}`} />;
                              })}
                            </div>
                            {!story.complete && story.progress > 0 && (
                              <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(to right, var(--nimi-green), #0e9d60)' }}
                                  initial={{ width: 0 }} animate={{ width: `${story.progress * 100}%` }} transition={{ duration: DURATION.loopBounce }} />
                              </div>
                            )}
                          </div>
                        </motion.div>
                      </Link>
                    ) : (
                      <div>
                        <motion.div whileHover={{ scale: 1.01 }}
                          className="overflow-hidden page-card opacity-60 hover:opacity-80 transition-all group" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                          <div className="relative aspect-[4/3] overflow-hidden">
                            {hasCover ? (
                              <Image src={getStorageUrl(story.cover_url!)} alt="" fill className="object-cover grayscale opacity-25 group-hover:opacity-35 transition-opacity" draggable={false} />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                <span className="text-5xl opacity-20">{story.theme_emoji}</span>
                              </div>
                            )}
                            <div className="absolute top-2.5 left-2.5 w-8 h-8 bg-gray-200/80 rounded-xl flex items-center justify-center font-baloo font-black text-gray-400 text-[14px]">
                              {story.sort_order}
                            </div>
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                              <div className="w-12 h-12 bg-white/90 shadow-md rounded-full flex items-center justify-center">
                                <Lock className="w-5 h-5 text-gray-500" />
                              </div>
                              <div className="bg-gray-800/80 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                🏆 Finish Story {story.sort_order - 1} first
                              </div>
                            </div>
                          </div>
                          <div className="p-3">
                            <h3 className="font-baloo font-black text-gray-400 text-[14px] sm:text-[15px] leading-tight truncate">{story.title}</h3>
                            <p className="text-gray-400 text-[10px] font-semibold mt-1.5 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> Complete Story {story.sort_order - 1} to unlock
                            </p>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="w-10 h-10 rounded-full bg-white border border-ds-border flex items-center justify-center text-gray-400 disabled:opacity-20 transition">
                <ChevronLeft size={18} />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button key={i} onClick={() => setPage(i + 1)}
                  className={`w-10 h-10 rounded-full font-baloo font-bold text-[14px] transition ${
                    page === i + 1
                      ? "bg-ds-action text-white shadow-sm"
                      : "bg-white border border-ds-border text-gray-500 hover:text-gray-700"
                  }`}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="w-10 h-10 rounded-full bg-white border border-ds-border flex items-center justify-center text-gray-400 disabled:opacity-20 transition">
                <ChevronRight size={18} />
              </button>
            </div>
          )}
      </main>

      {/* Stats sidebar — desktop only */}
      <aside className="hidden xl:block xl:w-[280px] xl:shrink-0 sticky top-[80px]">
        <StatsSidebar
          weekStreak={weekStreak}
          streakCount={streakCount}
          badgeCount={badgeCount}
          todayStars={totalStars}
          activitiesCompleted={completedCount}
        />
      </aside>

      </div>
      </PageSurface>
    </AppShell>
  );
}
