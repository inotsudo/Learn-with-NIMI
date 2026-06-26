"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, CheckCircle2, Play, Star, Search, ChevronLeft, ChevronRight } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import MagicBackground from "@/components/magic/MagicBackground";
import MagicLoader from "@/components/magic/MagicLoader";
import { getChildren, getStorageUrl, getTotalStars } from "@/lib/queries";
import supabase from "@/lib/supabaseClient";
import { getStoryLibrary, getCurrentStoryId } from "@/lib/storyRepository";
import type { StoryLibraryItem } from "@/lib/story-types";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";
const PAGE_SIZE = 8;

const CATEGORY_META: Record<string, { emoji: string; label: string }> = {
  animals: { emoji: "🐾", label: "Animals" },
  friendship: { emoji: "❤️", label: "Friendship" },
  bedtime: { emoji: "🌙", label: "Bedtime" },
  adventure: { emoji: "🚀", label: "Adventure" },
  values: { emoji: "⭐", label: "Values" },
  nature: { emoji: "🌿", label: "Nature" },
  family: { emoji: "👨‍👩‍👧", label: "Family" },
  creativity: { emoji: "🎨", label: "Creativity" },
};

export default function StoryLibraryPage() {
  const [stories, setStories] = useState<StoryLibraryItem[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalStars, setTotalStars] = useState(0);
  const [storyStars, setStoryStars] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    void (async () => {
      const list = await getChildren();
      const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
      const child = list.find(c => c.id === savedId) ?? list[0];
      if (!child) { setLoading(false); return; }
      const [lib, cur] = await Promise.all([
        getStoryLibrary(child.id, child.language),
        getCurrentStoryId(child.id, child.language),
      ]);
      setStories(lib);
      setCurrentId(cur);

      // Fetch total stars and per-story stars
      const stars = await getTotalStars(child.id, child.language);
      setTotalStars(stars);

      const { data: progressData } = await supabase
        .from("child_progress")
        .select("mission_id, missions(stars, story_slots(story_id))")
        .eq("child_id", child.id)
        .eq("language", child.language);

      const perStory: Record<string, number> = {};
      for (const row of progressData ?? []) {
        const m = row.missions as any;
        const storyId = Array.isArray(m?.story_slots) ? m.story_slots[0]?.story_id : m?.story_slots?.story_id;
        if (storyId) perStory[storyId] = (perStory[storyId] ?? 0) + (m?.stars ?? 0);
      }
      setStoryStars(perStory);

      setLoading(false);
    })();
  }, []);

  // Build category tabs from actual story data
  const activeCategories = Array.from(new Set(stories.map(s => s.category).filter(Boolean))) as string[];
  const categoryTabs = [
    { key: "all", emoji: "📚", label: "All Stories" },
    ...activeCategories.map(c => ({
      key: c,
      emoji: CATEGORY_META[c]?.emoji ?? "📖",
      label: CATEGORY_META[c]?.label ?? c.charAt(0).toUpperCase() + c.slice(1),
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

  return (
    <AppShell>
      <div className="min-h-screen theme-bg relative">
        <MagicBackground variant="forest" />
        <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-5 pb-28 w-full">

          {/* Header */}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-purple-500/20 shrink-0">
              <span className="text-3xl">📚</span>
            </div>
            <div className="flex-1">
              <h1 className="font-baloo font-black text-[26px] sm:text-[30px] text-white leading-tight">Story Library</h1>
              <p className="theme-text-faint text-[13px] font-nunito">✨ Open a book and start your adventure!</p>
            </div>
          </div>

          {/* Filters + Search */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
            {activeCategories.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 flex-1" style={{ scrollbarWidth: "none" }}>
                {categoryTabs.map(cat => (
                  <button key={cat.key} onClick={() => { setCategory(cat.key); setPage(1); }}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-baloo font-bold text-[12px] whitespace-nowrap shrink-0 transition-all ${
                      category === cat.key
                        ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/20"
                        : "theme-card theme-text-faint border theme-border hover:theme-text-faint"
                    }`}>
                    <span className="text-[14px]">{cat.emoji}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            )}
            <div className={`relative w-full shrink-0 ${activeCategories.length > 1 ? "sm:w-56" : "sm:w-72"}`}>
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 theme-text-faint" />
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search stories..."
                className="w-full theme-card border theme-border rounded-xl pl-9 pr-3 py-2.5 text-[13px] text-white placeholder:theme-text-faint focus:outline-none focus:theme-border-strong/30 transition" />
            </div>
          </div>

          {/* Story Grid */}
          {loading ? (
            <div className="py-16">
              <MagicLoader variant="stories" fullPage={false} />
            </div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-5xl block mb-3">📚</span>
              <p className="font-baloo font-bold text-white/40 text-[18px]">No stories found</p>
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
                    transition={{ delay: i * 0.05, type: "spring", stiffness: 120 }}>

                    {story.unlocked ? (
                      <Link href={`/stories/${story.slug}`}>
                        <motion.div whileHover={{ y: -4 }} whileTap={{ scale: 0.97 }}
                          className={`rounded-[20px] overflow-hidden theme-card border transition-all cursor-pointer group ${
                            story.complete ? "border-green-400/25" : isCurrent ? "border-yellow-400/25" : "theme-border hover:theme-border"
                          }`}>

                          {/* Image */}
                          <div className="relative aspect-[4/3] overflow-hidden">
                            {hasCover ? (
                              <img src={getStorageUrl(story.cover_url!)} alt={story.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" draggable={false} />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center">
                                <span className="text-5xl">{story.theme_emoji}</span>
                              </div>
                            )}

                            {/* Number badge */}
                            <div className="absolute top-2.5 left-2.5 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-lg flex items-center justify-center font-baloo font-black text-white text-[14px] border border-white/10">
                              {story.sort_order}
                            </div>

                            {/* Status badge */}
                            {story.complete ? (
                              <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-green-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg">
                                <CheckCircle2 className="w-3 h-3" /> Complete
                              </div>
                            ) : isCurrent ? (
                              <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}
                                className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg">
                                <Play className="w-3 h-3 fill-white" /> Continue
                              </motion.div>
                            ) : null}
                          </div>

                          {/* Info */}
                          <div className="p-3">
                            <h3 className="font-baloo font-black text-white text-[14px] sm:text-[15px] leading-tight truncate">{story.title}</h3>

                            {/* Stars — out of 5 */}
                            <div className="flex items-center gap-0.5 mt-1.5">
                              {Array.from({ length: 5 }).map((_, j) => {
                                const starProgress = done / 6 * 5;
                                return <Star key={j} className={`w-3.5 h-3.5 ${j < starProgress ? "text-yellow-400 fill-yellow-400" : "theme-text-muted/20 fill-purple-500/20"}`} />;
                              })}
                            </div>

                            {/* Progress bar — in-progress only */}
                            {!story.complete && story.progress > 0 && (
                              <div className="mt-2 w-full theme-accent/15 rounded-full h-1.5 overflow-hidden">
                                <motion.div className="bg-gradient-to-r from-green-400 to-emerald-500 h-full rounded-full"
                                  initial={{ width: 0 }} animate={{ width: `${story.progress * 100}%` }} transition={{ duration: 0.8 }} />
                              </div>
                            )}
                          </div>
                        </motion.div>
                      </Link>
                    ) : (
                      /* Locked */
                      <div className="rounded-[20px] overflow-hidden theme-card border theme-border">
                        <div className="relative aspect-[4/3] overflow-hidden">
                          {hasCover ? (
                            <img src={getStorageUrl(story.cover_url!)} alt="" className="w-full h-full object-cover grayscale opacity-30" draggable={false} />
                          ) : (
                            <div className="w-full h-full theme-card flex items-center justify-center">
                              <span className="text-5xl opacity-10">{story.theme_emoji}</span>
                            </div>
                          )}
                          <div className="absolute top-2.5 left-2.5 w-8 h-8 bg-black/30 rounded-lg flex items-center justify-center font-baloo font-black text-white/30 text-[14px]">
                            {story.sort_order}
                          </div>
                          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white/50 text-[10px] font-bold px-2.5 py-1 rounded-full">
                            <Lock className="w-3 h-3" /> Locked
                          </div>
                        </div>
                        <div className="p-3">
                          <h3 className="font-baloo font-black text-white/25 text-[14px] sm:text-[15px] leading-tight truncate">{story.title}</h3>
                          <div className="flex items-center gap-0.5 mt-1.5">
                            {Array.from({ length: 5 }).map((_, j) => (
                              <Star key={j} className="w-3.5 h-3.5 theme-text-muted/10 fill-purple-500/10" />
                            ))}
                          </div>
                          <p className="theme-text-faint text-[10px] font-bold mt-1.5 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> Complete the previous story to unlock
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="w-9 h-9 rounded-lg theme-card border theme-border flex items-center justify-center text-white/50 disabled:opacity-20 hover:theme-accent/10 transition">
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button key={i} onClick={() => setPage(i + 1)}
                  className={`w-9 h-9 rounded-lg font-baloo font-bold text-[13px] transition ${
                    page === i + 1
                      ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg"
                      : "theme-card border theme-border theme-text-faint hover:text-white/60"
                  }`}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="w-9 h-9 rounded-lg theme-card border theme-border flex items-center justify-center text-white/50 disabled:opacity-20 hover:theme-accent/10 transition">
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </main>
      </div>
    </AppShell>
  );
}
