"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { DURATION, SPRING } from "@/lib/design-system/motion";
import { CheckCircle2, Star, Search, ChevronLeft, ChevronRight, Crown, Play } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Bone } from "@/components/ui/Bone";
import { RefreshingBadge } from "@/components/layout/RefreshingBadge";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { getChildren, getStorageUrl, getTotalStars, getWeekStreak, getConsecutiveStreak, getChildBadges, getBadgeImages, getTodayMissions, type Child } from "@/lib/queries";
import { getStoryLibrary, getCurrentStoryId } from "@/lib/storyRepository";
import { getActiveSubscription } from "@/lib/payments/products";
import supabase from "@/lib/supabaseClient";
import type { StoryLibraryItem } from "@/lib/story-types";
import StatsSidebar from "@/components/home/StatsSidebar";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";
const PAGE_SIZE = 8;

const CATEGORY_SPINE: Record<string, string> = {
  animals:    "#1a5c3a",
  friendship: "#8b1a4a",
  bedtime:    "#1a2d6b",
  adventure:  "#7a2800",
  values:     "#7a5500",
  nature:     "#1a4d1a",
  family:     "#4a0d6e",
  creativity: "#0d2d8b",
};

const CATEGORY_META: Record<string, { emoji: string; key: string; activeClass: string; inactiveClass: string }> = {
  animals:    { emoji: "🦁", key: "storyCatAnimals",    activeClass: "bg-amber-500 text-white border-amber-500",       inactiveClass: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" },
  friendship: { emoji: "❤️", key: "storyCatFriendship", activeClass: "bg-pink-500 text-white border-pink-500",         inactiveClass: "bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100" },
  bedtime:    { emoji: "🌙", key: "storyCatBedtime",    activeClass: "bg-indigo-500 text-white border-indigo-500",     inactiveClass: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100" },
  adventure:  { emoji: "🚀", key: "storyCatAdventure",  activeClass: "bg-orange-500 text-white border-orange-500",    inactiveClass: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100" },
  values:     { emoji: "⭐", key: "storyCatValues",     activeClass: "bg-yellow-500 text-white border-yellow-500",    inactiveClass: "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100" },
  nature:     { emoji: "🌿", key: "storyCatNature",     activeClass: "bg-teal-500 text-white border-teal-500",        inactiveClass: "bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100" },
  family:     { emoji: "👨‍👩‍👧", key: "storyCatFamily",    activeClass: "bg-violet-500 text-white border-violet-500",   inactiveClass: "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100" },
  creativity: { emoji: "🎨", key: "storyCatCreativity", activeClass: "bg-blue-500 text-white border-blue-500",        inactiveClass: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" },
  school:     { emoji: "🏫", key: "storyCatSchool",     activeClass: "bg-sky-500 text-white border-sky-500",          inactiveClass: "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100" },
  funny:      { emoji: "😂", key: "storyCatFunny",      activeClass: "bg-lime-500 text-white border-lime-500",        inactiveClass: "bg-lime-50 text-lime-700 border-lime-200 hover:bg-lime-100" },
};

// BC1: Hoisted to module scope — defining components inside .map() creates a
// new type each render and causes React to unmount/remount every card on any state change.
interface BookBodyProps {
  story: StoryLibraryItem;
  isCurrent: boolean;
  hasCover: boolean;
  spineColor: string;
  dimmed?: boolean;
  locked?: "premium" | "sequence";
}

function BookBody({ story, isCurrent, hasCover, spineColor, dimmed = false, locked }: BookBodyProps) {
  const pct = Math.round((story.progress ?? 0) * 100);
  const isInProgress = pct > 0 && !story.complete;
  const reduced = useReducedMotion();

  return (
    <div className="relative group flex flex-col gap-1.5">

      {/* Card shell */}
      <motion.div
        whileHover={reduced ? {} : { scale: 1.03, y: -4, boxShadow: "0 16px 40px rgba(0,0,0,0.22)" }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="relative leaf-lg overflow-hidden cursor-pointer"
        style={{
          height: "clamp(160px, 20vw, 230px)",
          opacity: dimmed ? 0.55 : 1,
          outline: isCurrent ? "3px solid var(--ds-color-brand-gold, #F5C842)" : undefined,
          outlineOffset: isCurrent ? "2px" : undefined,
          boxShadow: "var(--shadow-card-sm, 0 2px 10px rgba(0,0,0,0.10))",
        }}>

        {/* Cover image or fallback */}
        {hasCover ? (
          <>
            <Image
              src={getStorageUrl(story.cover_url!)}
              alt={story.title}
              fill
              className={`object-cover transition-transform duration-500 ${reduced ? "" : "group-hover:scale-105"}`}
              draggable={false}
            />
            {/* Gradient overlay — bottom-heavy so artwork is dominant */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 transition-all duration-300 group-hover:brightness-110"
            style={{ background: `linear-gradient(145deg, ${spineColor}ee, ${spineColor}88)` }}>
            <motion.span
              className="text-5xl drop-shadow-md"
              animate={reduced ? {} : { rotate: [0, 4, -4, 0] }}
              transition={{ duration: 4, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}>
              {story.theme_emoji}
            </motion.span>
            <p className="font-baloo font-black text-white text-center text-xs px-3 leading-tight drop-shadow-sm">{story.title}</p>
          </div>
        )}

        {/* Hover play/read affordance — fades in on hover */}
        {!locked && !story.complete && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center gap-1.5 transition-opacity duration-200 pointer-events-none ${reduced ? "opacity-0" : "opacity-0 group-hover:opacity-100"}`}>
            <div className="flex flex-col items-center gap-1">
              <div className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", border: "2px solid rgba(255,255,255,0.75)" }}>
                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
              </div>
              <span className="font-baloo font-black text-white text-xs drop-shadow-md"
                style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
                {isInProgress ? "Continue" : "Read"}
              </span>
            </div>
          </div>
        )}

        {/* "Current story" gold pulse ring */}
        {isCurrent && (
          <motion.div
            className="absolute inset-0 leaf-lg pointer-events-none"
            animate={{ boxShadow: ["0 0 0 0 rgba(245,200,66,0.5)", "0 0 0 6px rgba(245,200,66,0)", "0 0 0 0 rgba(245,200,66,0)"] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          />
        )}

        {/* Completion badge */}
        {story.complete && (
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...SPRING.bounce, delay: 0.1 }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full border-2 border-white shadow-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#F5C842,#C9A84C)" }}
            title="Completed!">
            <CheckCircle2 className="w-4 h-4 text-white" strokeWidth={2.5} />
          </motion.div>
        )}

        {/* Premium lock overlay */}
        {locked === "premium" && (
          <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-1.5 backdrop-blur-[1px]">
            <div className="w-10 h-10 rounded-full bg-yellow-400/20 border-2 border-yellow-400/60 flex items-center justify-center">
              <Star className="w-5 h-5 text-yellow-300" />
            </div>
            <p className="font-baloo font-black text-white text-xs text-center px-2 drop-shadow">Club</p>
          </div>
        )}

        {/* In-progress bar pinned to bottom of card */}
        {isInProgress && !locked && (
          <div className="absolute bottom-0 inset-x-0 h-2 bg-black/25">
            <motion.div
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-400"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        )}
      </motion.div>

      {/* Title below the card */}
      <div className="px-0.5 flex items-start justify-between gap-1 transition-transform duration-200 group-hover:-translate-y-0.5">
        <p className="font-baloo font-black text-[var(--ds-text-primary)] text-xs leading-tight line-clamp-2 flex-1">
          {story.title}
        </p>
        {isInProgress && !locked && (
          <span className="shrink-0 font-baloo font-black text-[10px] text-orange-500 leading-none mt-0.5">{pct}%</span>
        )}
      </div>
    </div>
  );
}

interface Props {
  initialChildren?: Child[];
  initialHasSubscription?: boolean;
}

export default function StoriesClient({ initialChildren, initialHasSubscription }: Props = {}) {
  const { t } = useLanguage();
  const m = useThemeMotion();
  const [stories, setStories] = useState<StoryLibraryItem[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [childName, setChildName] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [totalStars, setTotalStars] = useState(0);
  const [weekStreak, setWeekStreak] = useState<boolean[]>([false,false,false,false,false,false,false]);
  const [streakCount, setStreakCount] = useState(0);
  const [badges, setBadges] = useState<import("@/lib/queries").ChildBadge[]>([]);
  const [badgeImageMap, setBadgeImageMap] = useState<Record<string, string>>({});
  const [missionsCompleted, setMissionsCompleted] = useState(0);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);

  const activeChildRef = useRef<Child | null>(null);
  const switchGenRef   = useRef(0);

  const loadForChild = useCallback(async (child: Child, lang: Language, silent = false) => {
    const gen = silent ? ++switchGenRef.current : 0;
    if (silent) setRefreshing(true); else setLoading(true);
    const [lib, cur, streak, consStreak, badges, stars, todayMissions, imageMap] = await Promise.all([
      getStoryLibrary(child.id, lang),
      getCurrentStoryId(child.id, lang),
      getWeekStreak(child.id, lang),
      getConsecutiveStreak(child.id, lang),
      getChildBadges(child.id, lang),
      getTotalStars(child.id, lang),
      getTodayMissions(child.id, lang),
      getBadgeImages(),
    ]);

    if (silent && gen !== switchGenRef.current) return;
    setChildName(child.name ?? "");
    setStories(lib);
    setCurrentId(cur);
    setWeekStreak(streak);
    setStreakCount(consStreak);
    setBadges(badges);
    setBadgeImageMap(imageMap);
    setTotalStars(stars);
    setMissionsCompleted(todayMissions.length);
    if (silent) setRefreshing(false); else setLoading(false);
  }, []);

  useEffect(() => {
    void (async () => {
      if (initialChildren !== undefined) {
        if (initialHasSubscription) setHasSubscription(true);
        const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
        const child = initialChildren.find(c => c.id === savedId) ?? initialChildren[0];
        if (!child) { setLoading(false); return; }
        activeChildRef.current = child;
        await loadForChild(child, child.language);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      // Fetch subscription + children in parallel — both only need user.id
      const [sub, list] = await Promise.all([
        user ? getActiveSubscription(user.id) : Promise.resolve(null),
        getChildren(),
      ]);
      if (sub) setHasSubscription(true);
      const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
      const child = list.find(c => c.id === savedId) ?? list[0];
      if (!child) { setLoading(false); return; }
      activeChildRef.current = child;
      await loadForChild(child, child.language);
    })();
  }, [loadForChild]);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const handler = (e: Event) => {
      const lang = (e as CustomEvent<{ language: Language }>).detail?.language;
      if (!lang) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        const child = activeChildRef.current;
        if (!child) return;
        const updated = { ...child, language: lang };
        activeChildRef.current = updated;
        setCategory("all");
        setPage(1);
        await loadForChild(updated, lang, true);
      }, 200);
    };
    window.addEventListener("app:languageChange", handler as EventListener);
    return () => {
      window.removeEventListener("app:languageChange", handler as EventListener);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [loadForChild]);

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState !== "visible") return;
      const child = activeChildRef.current;
      if (child) void loadForChild(child, child.language, true);
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [loadForChild]);

  const activeCategories = Array.from(new Set(stories.map(s => s.category).filter(Boolean))) as string[];
  const hasCategories = activeCategories.length >= 1;

  const categoryTabs = [
    { key: "all", emoji: "⊞", label: t("storyCatAll"), activeClass: "bg-ds-action text-white border-ds-action", inactiveClass: "bg-[var(--ds-surface-card)] text-[var(--ds-text-secondary)] border-ds-border hover:bg-[var(--ds-surface-card-hover)]" },
    ...activeCategories.map(c => ({
      key: c,
      emoji: CATEGORY_META[c]?.emoji ?? "📖",
      label: CATEGORY_META[c] ? t(CATEGORY_META[c].key) : c.charAt(0).toUpperCase() + c.slice(1),
      activeClass: CATEGORY_META[c]?.activeClass ?? "bg-ds-action text-white border-ds-action",
      inactiveClass: CATEGORY_META[c]?.inactiveClass ?? "bg-[var(--ds-surface-card)] text-[var(--ds-text-secondary)] border-ds-border hover:bg-[var(--ds-surface-card-hover)]",
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
  const inProgress = stories.filter(s => !s.complete && (s.progress ?? 0) > 0).length;

  return (
    <AppShell>
      <RefreshingBadge show={refreshing} />

      <div className={`min-h-screen w-full bg-[#f8f2e7] transition-opacity duration-300${refreshing ? " opacity-50 pointer-events-none" : ""}`}>
        <div className="w-full xl:flex xl:gap-6 xl:items-start pb-24">
        <main className="flex-1 min-w-0">

          {/* ── HERO — airport photo, same as home ── */}
          <section className="relative overflow-hidden bg-[#8bd9ff]" style={{ minHeight: 280 }}>
            <img src="/airport-hero.png" alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
            {/* Left white fade so text is readable */}
            <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(255,255,255,.75)_0%,rgba(255,255,255,.32)_38%,transparent_62%)]" />
            {/* Bottom fade into page bg */}
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#f8f2e7] to-transparent" />
            {/* Clouds */}
            <div aria-hidden className="absolute left-[3%] top-[18%] h-12 w-32 rounded-full bg-white/70 blur-[2px]" />
            <div aria-hidden className="absolute left-[14%] top-[10%] h-8 w-22 rounded-full bg-white/55 blur-[1px]" />

            {/* Greeting text — left column, same as home */}
            <div className="relative z-10 flex min-h-[280px] flex-col justify-end px-5 pb-12 pt-8 sm:px-10 lg:px-12">
              <div className="relative max-w-[380px]">
                <span aria-hidden className="absolute -left-2 top-7 text-2xl text-[#ffc400]">✦</span>
                <p className="font-baloo text-[18px] font-black leading-none text-[#0e368b] drop-shadow-[0_2px_0_rgba(255,255,255,.9)] sm:text-[22px]">
                  ✈️ My Journey,
                </p>
                <h1 className="mt-1 font-baloo font-black leading-[.85] tracking-tight text-[#0e368b] drop-shadow-[0_2px_0_rgba(255,255,255,.95)]"
                  style={{ fontSize: "clamp(2.2rem,6vw,3.4rem)" }}>
                  {childName ? `${childName}!` : "Explorer!"}
                  <span className="inline-block text-[#ffbc14] ml-2">🗺️</span>
                </h1>
                <p className="mt-2 font-baloo text-[15px] font-black text-[#123a87] drop-shadow-[0_1px_0_rgba(255,255,255,.85)] sm:text-[18px]">
                  Where shall we fly today?
                </p>
                <div className="mt-2 h-[3px] w-48 -rotate-[3deg] rounded-full bg-[#ffc400]" />

                {/* Stat chips */}
                <div className="mt-4 flex gap-2 flex-wrap">
                  {[
                    { icon:"🗺️", val:inProgress,    label:"In progress",        bg:"#fff", border:"#bdd4f0", text:"#0e368b" },
                    { icon:"🏅", val:completedCount, label:"Completed",           bg:"#fff", border:"#bdd4f0", text:"#0e368b" },
                    { icon:"⭐", val:totalStars,     label:"Stars earned",        bg:"#fff5cc", border:"#f5d142", text:"#7a5800" },
                  ].map(chip => (
                    <div key={chip.label}
                      className="flex items-center gap-1.5 rounded-2xl px-3 py-1.5 shadow-sm"
                      style={{ background:chip.bg, border:`1.5px solid ${chip.border}` }}>
                      <span className="text-base leading-none">{chip.icon}</span>
                      <div>
                        <p className="font-baloo font-black text-[13px] leading-none" style={{ color:chip.text }}>{chip.val}</p>
                        <p className="font-baloo text-[9px] leading-none mt-0.5" style={{ color:`${chip.text}99` }}>{chip.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <motion.button
                  onClick={() => document.getElementById("story-shelf")?.scrollIntoView({ behavior:"smooth", block:"start" })}
                  initial={{ opacity:0, scale:0.85 }} animate={{ opacity:1, scale:1 }}
                  transition={{ delay:0.22, ...SPRING.bounce }}
                  whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
                  className="mt-4 inline-flex items-center gap-2 font-baloo font-black text-sm px-6 py-2.5 rounded-full cursor-pointer shadow-lg"
                  style={{ background:"linear-gradient(135deg,#ffd331,#ffbc14)", color:"#0e2d6b",
                    boxShadow:"0 4px 16px rgba(255,188,20,0.45), 0 2px 0 rgba(0,0,0,0.08)" }}>
                  Board Now ✈️
                </motion.button>
              </div>
            </div>

            {/* Nimi + Piko — right side, same as home */}
            <div className="absolute bottom-3 right-3 z-10 hidden items-end gap-1 sm:flex lg:right-8">
              <motion.img src="/themes/default/characters/nimi.png" alt="Nimi"
                animate={{ y:[0,-6,0] }} transition={{ duration:4.5, repeat:Infinity, ease:"easeInOut" }}
                className="h-[150px] w-auto object-contain drop-shadow-2xl lg:h-[200px]" draggable={false} />
              <motion.img src="/themes/default/characters/piko.png" alt="Piko"
                animate={{ y:[0,-5,0] }} transition={{ duration:5.2, repeat:Infinity, delay:.4, ease:"easeInOut" }}
                className="h-[130px] w-auto object-contain drop-shadow-2xl lg:h-[175px]" draggable={false} />
            </div>
          </section>

          {/* ── CONTINUE ADVENTURE — warm card like home ── */}
          <div className="px-3 sm:px-5 lg:px-7 -mt-4">
          {currentStory && !currentStory.complete && (() => {
            const pct = Math.round((currentStory.progress ?? 0) * 100);
            const progressLabel =
              pct === 0  ? "Ready for an adventure! 🗺️" :
              pct < 25   ? "Just getting started! 🌱" :
              pct < 50   ? "You're on your way! 🚀" :
              pct < 75   ? "Halfway there! ⚡" :
              pct < 100  ? "Almost there! 🔥" :
                           "Adventure complete! ⭐";
            return (
              <motion.div
                initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.12, duration:0.4 }}
                className="relative overflow-hidden rounded-[24px] mb-3 cursor-pointer group"
                style={{
                  background:"linear-gradient(135deg,#fffdf8 0%,#fff9e8 60%,#fff3c4 100%)",
                  border:"2px solid #edc953",
                  boxShadow:"0 7px 0 rgba(173,145,100,.10), 0 12px 28px rgba(33,58,85,.10)",
                }}
              >
                <Link href={`/stories/${currentStory.slug}`} className="block">
                  <div className="flex items-center min-h-[110px] gap-4 px-4 py-4 sm:px-6">
                    {/* Spinning label badge */}
                    <div className="absolute top-3 left-4">
                      <span className="inline-flex items-center gap-1 -rotate-1 rounded-full px-3 py-1 font-baloo text-[12px] font-black shadow-sm"
                        style={{ background:"#ffd331", color:"#092d78" }}>
                        Continue Your Adventure ✈
                      </span>
                    </div>

                    {/* Cover */}
                    <div className="shrink-0 mt-5 w-[76px] h-[96px] rounded-[18px] overflow-hidden border-2 shadow-md"
                      style={{ borderColor:"#edc953", background:"#f6d562" }}>
                      {currentStory.cover_url
                        ? <img src={getStorageUrl(currentStory.cover_url)} alt={currentStory.title ?? "Story"} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-4xl">📚</div>
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 pt-5">
                      <p className="font-baloo font-black text-[10px] uppercase tracking-widest" style={{ color:"#7790b3" }}>Current story</p>
                      <h2 className="font-baloo font-black text-[#082b78] leading-tight" style={{ fontSize:"clamp(1rem,2.5vw,1.3rem)" }}>
                        {currentStory.title}
                      </h2>
                      <p className="font-baloo font-semibold text-[#7891b6] text-xs mt-1 mb-3">{progressLabel}</p>
                      <motion.div
                        whileHover={{ scale:1.05 }} whileTap={{ scale:0.94 }}
                        className="inline-flex items-center gap-1.5 font-baloo font-black text-sm px-5 py-2 rounded-full shadow-md"
                        style={{ background:"linear-gradient(135deg,#ffd331,#ffbc14)", color:"#0e2d6b",
                          boxShadow:"0 4px 14px rgba(255,188,20,0.38)" }}>
                        Continue <Play className="w-3.5 h-3.5 fill-current" />
                      </motion.div>
                    </div>

                    {/* Progress pill */}
                    {pct > 0 && (
                      <div className="shrink-0 self-end mb-2">
                        <span className="font-baloo font-black text-sm px-3 py-1 rounded-full"
                          style={{ background:"rgba(8,43,120,0.08)", color:"#082b78", border:"1.5px solid rgba(8,43,120,0.14)" }}>
                          {pct}%
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })()}

          {/* ── STORY LIBRARY PANEL ── */}
          <div className="rounded-[24px] overflow-hidden mb-4"
            style={{
              background:"#fff",
              border:"1.5px solid rgba(0,0,0,0.07)",
              boxShadow:"0 4px 0 rgba(0,0,0,0.05), 0 8px 28px rgba(33,58,85,0.09)",
            }}>
            <div className="p-4 sm:p-5">

              {/* Header + search */}
              <div className="flex items-center justify-between mb-3 gap-3">
                <h2 className="font-baloo font-black text-[#082b78] text-lg flex items-center gap-2">
                  All Adventures <span aria-hidden>📚</span>
                </h2>
                <div className="relative hidden sm:block">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#7791b3]" />
                  <input type="text" value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    placeholder={t("storySearchPlaceholder")}
                    className="rounded-full pl-9 pr-4 py-2 text-xs font-baloo font-semibold outline-none w-48 transition"
                    style={{ background:"#f4f7fb", border:"1.5px solid #c8d9ef", color:"#082b78" }} />
                </div>
              </div>
              <div className="relative sm:hidden mb-3">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#7791b3]" />
                <input type="text" value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder={t("storySearchPlaceholder")}
                  className="w-full rounded-full pl-9 pr-4 py-2 text-xs font-baloo font-semibold outline-none transition"
                  style={{ background:"#f4f7fb", border:"1.5px solid #c8d9ef", color:"#082b78" }} />
              </div>

              {/* Category pills — keep original colorful styles */}
              {hasCategories && (
                <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth:"none" }}>
                  {categoryTabs.map(cat => {
                    const isActive = category === cat.key;
                    return (
                      <motion.button key={cat.key}
                        onClick={() => { setCategory(cat.key); setPage(1); }}
                        whileTap={{ scale:0.93 }}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-baloo font-black text-xs whitespace-nowrap shrink-0 transition-all border ${
                          isActive
                            ? cat.key === "all"
                              ? ""
                              : cat.activeClass
                            : cat.inactiveClass
                        }`}
                        style={isActive && cat.key === "all"
                          ? { background:"linear-gradient(135deg,#ffd331,#ffbc14)", color:"#0e2d6b",
                              borderColor:"transparent", boxShadow:"0 3px 10px rgba(255,188,20,0.35)" }
                          : undefined
                        }>
                        <span className="text-sm leading-none">{cat.emoji}</span>
                        {cat.label}
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* Book shelf */}
              <div id="story-shelf" className="mt-3" />
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 py-2">
                  {Array.from({ length:8 }).map((_, i) => (
                    <Bone key={i} className="rounded-2xl" style={{ height:"clamp(160px,20vw,230px)" }} />
                  ))}
                </div>
              ) : stories.length === 0 ? (
                <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
                  transition={{ delay:0.2 }}
                  className="flex items-center gap-5 px-6 py-6 rounded-3xl mt-2"
                  style={{ background:"linear-gradient(135deg,#FFF9E6,#FFF3C4)", border:"1.5px solid #F5C842" }}>
                  <motion.img src="/themes/default/characters/nimi.png" alt="Nimi"
                    animate={{ y:[0,-5,0] }} transition={{ duration:3, repeat:Infinity, ease:"easeInOut" }}
                    style={{ height:72, width:"auto", flexShrink:0, filter:"drop-shadow(0 4px 8px rgba(0,0,0,0.12))" }}
                    draggable={false} />
                  <div className="flex-1 min-w-0">
                    <p className="font-baloo font-black text-[#082b78] text-base leading-tight mb-0.5">More adventures are coming! 🚀</p>
                    <p className="font-baloo text-[#7791b3] text-sm leading-snug">Nimi is getting new stories ready — check back soon!</p>
                  </div>
                </motion.div>
              ) : paginated.length === 0 ? (
                <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                  className="flex flex-col items-center justify-center py-14 px-8 text-center">
                  <motion.img src="/themes/default/characters/piko.png" alt="Piko"
                    animate={{ y:[0,-6,0] }} transition={{ duration:3, repeat:Infinity, ease:"easeInOut" }}
                    style={{ height:80, width:"auto", filter:"drop-shadow(0 4px 10px rgba(0,0,0,0.12))" }}
                    className="mb-4" draggable={false} />
                  <p className="font-baloo font-black text-[#082b78] text-xl mb-1">{t("storyNoResults")}</p>
                  <p className="font-baloo text-[#7791b3] text-sm">Try a different search or pick another category!</p>
                </motion.div>
              ) : (
                <>
                  {/* Club upgrade wall */}
                  {!hasSubscription && category === "all" && !search.trim() && paginated.some(s => s.is_free) && stories.some(s => !s.is_free && !s.unlocked) && (
                    <Link href="/pricing" className="block mb-5">
                      <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
                        whileHover={{ scale:1.01 }} whileTap={m.buttonPress}
                        className="flex items-center gap-4 rounded-3xl px-5 py-4 cursor-pointer group bg-ds-club shadow-ds-club">
                        <motion.div animate={{ y:[0,-4,0] }} transition={{ duration:DURATION.loopSlow, repeat:Infinity }}
                          className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 border border-white/30">
                          <Crown className="w-6 h-6 text-yellow-300" />
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <p className="font-baloo font-black text-white text-base leading-tight">You&apos;ve reached the end of your free stories!</p>
                          <p className="font-baloo text-white/70 text-xs mt-0.5">
                            {stories.filter(s => !s.is_free && !s.unlocked).length} more adventures are waiting — join Club to unlock them all.
                          </p>
                        </div>
                        <span className="shrink-0 font-baloo font-black text-yellow-300 text-sml group-hover:text-yellow-200 transition whitespace-nowrap">
                          Unlock All →
                        </span>
                      </motion.div>
                    </Link>
                  )}

                  {/* Book grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                    <AnimatePresence mode="popLayout">
                      {paginated.map((story, i) => {
                        const isCurrent       = story.sid === currentId;
                        const hasCover        = !!story.cover_url;
                        const isPremiumLocked = !story.is_free && !hasSubscription;
                        const spineColor      = CATEGORY_SPINE[story.category ?? ""] ?? "#3b2a1a";
                        return (
                          <motion.div key={story.sid}
                            initial={{ opacity:0, y:20, scale:0.95 }}
                            animate={{ opacity:1, y:0, scale:1 }}
                            exit={{ opacity:0, scale:0.95 }}
                            transition={{ delay:i * DURATION.fast, ...SPRING.soft }}
                            style={{ perspective:"600px" }}>
                            {isPremiumLocked ? (
                              <Link href="/pricing">
                                <BookBody story={story} isCurrent={isCurrent} hasCover={hasCover} spineColor={spineColor} dimmed locked="premium" />
                              </Link>
                            ) : (
                              <Link href={`/stories/${story.slug}`}>
                                <BookBody story={story} isCurrent={isCurrent} hasCover={hasCover} spineColor={spineColor} />
                              </Link>
                            )}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <motion.button whileTap={m.buttonPress}
                    onClick={() => setPage(p => Math.max(1, p-1))} disabled={page <= 1}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition disabled:opacity-25"
                    style={{ background:"#f4f7fb", border:"1.5px solid #c8d9ef", color:"#7791b3" }}>
                    <ChevronLeft size={18} />
                  </motion.button>
                  {Array.from({ length:totalPages }).map((_, i) => (
                    <motion.button key={i} whileTap={m.buttonPress}
                      onClick={() => setPage(i+1)}
                      className="w-10 h-10 rounded-full font-baloo font-black text-sm transition"
                      style={page === i+1
                        ? { background:"linear-gradient(135deg,#ffd331,#ffbc14)", color:"#0e2d6b",
                            boxShadow:"0 4px 12px rgba(255,188,20,0.40)", transform:"scale(1.10)" }
                        : { background:"#f4f7fb", border:"1.5px solid #c8d9ef", color:"#7791b3" }
                      }>
                      {i+1}
                    </motion.button>
                  ))}
                  <motion.button whileTap={m.buttonPress}
                    onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page >= totalPages}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition disabled:opacity-25"
                    style={{ background:"#f4f7fb", border:"1.5px solid #c8d9ef", color:"#7791b3" }}>
                    <ChevronRight size={18} />
                  </motion.button>
                </div>
              )}

            </div>
          </div>{/* /library panel */}
          </div>{/* /px wrapper */}

        </main>

        {/* Stats sidebar — desktop only */}
        <aside className="hidden xl:block xl:w-[290px] xl:shrink-0 sticky top-5 px-4 pt-4">
          <StatsSidebar
            weekStreak={weekStreak}
            streakCount={streakCount}
            badges={badges}
            badgeImageMap={badgeImageMap}
            todayStars={totalStars}
            activitiesCompleted={missionsCompleted}
          />
        </aside>

        </div>
      </div>
    </AppShell>
  );
}
