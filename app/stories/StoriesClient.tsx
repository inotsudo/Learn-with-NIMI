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
      <div className={`w-full xl:flex xl:gap-8 xl:items-start pb-28 content-enter transition-opacity duration-300${refreshing ? " opacity-50 pointer-events-none" : ""}`}>
      <main className="flex-1 min-w-0">

        {/* ═══ AIRWAYS: PICK YOUR ADVENTURE ═══ */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative rounded-3xl overflow-hidden mb-4"
          style={{
            minHeight: 150,
            background: "linear-gradient(135deg, #030C17 0%, #0D2548 50%, #1A3558 100%)",
            border: "1px solid rgba(201,168,76,0.25)",
          }}>

          {/* Gold horizon shimmer */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 60% 80% at 90% 50%, rgba(201,168,76,0.10) 0%, transparent 65%)" }} />
          {/* Star field */}
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none select-none z-10">
            {([
              [10,15],[22,8],[38,20],[55,5],[68,18],[82,10],[92,25],
              [15,40],[45,35],[73,42],[88,30],[5,55],[30,48],[60,52],
            ] as [number,number][]).map(([x,y],i) => (
              <motion.div key={i} className="absolute w-0.5 h-0.5 rounded-full bg-white"
                style={{ left: `${x}%`, top: `${y}%` }}
                animate={{ opacity: [0.15,0.7,0.15] }}
                transition={{ duration: 2+i*0.3, repeat: Infinity, delay: i*0.2 }} />
            ))}
          </div>
          {/* Flying plane */}
          <motion.div className="absolute top-[12%] text-2xl leading-none opacity-50 z-10"
            animate={{ x: ["-5%","105%"] }} transition={{ duration: 12, repeat: Infinity, ease: "linear" }}>✈️</motion.div>

          <div className="relative z-20 flex items-stretch min-h-[150px]">
            {/* Left — greeting + CTA */}
            <div className="flex-1 flex flex-col justify-center px-5 py-4 sm:px-6">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.45 }}>
                <p className="font-nunito font-bold text-[10px] tracking-[0.15em] uppercase mb-0.5" style={{ color: "rgba(240,232,212,0.45)" }}>
                  ✈️ PICK YOUR ADVENTURE
                </p>
                <h1 className="font-baloo font-black leading-tight drop-shadow-md mb-1" style={{ fontSize: "clamp(1.35rem,3.5vw,2rem)", color: "var(--airways-text-primary, #F0E8D4)" }}>
                  {childName ? `Where to, ${childName}?` : "Where shall we fly? ✈️"}
                </h1>
                <p className="font-nunito font-semibold text-xs mb-2.5 leading-snug" style={{ color: "rgba(240,232,212,0.55)" }}>
                  Choose a destination and start your journey with Nimi!
                </p>
              </motion.div>
              <motion.button
                onClick={() => document.getElementById("story-shelf")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.28, ...SPRING.bounce }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-2 font-baloo font-black text-sm px-5 py-2 rounded-full cursor-pointer self-start"
                style={{ background: "linear-gradient(135deg, #C9A84C, #F5C842)", color: "#07111F", boxShadow: "0 4px 18px rgba(201,168,76,0.45)" }}>
                Board Now ✈️
              </motion.button>
            </div>

            {/* Middle — stat chips (desktop) */}
            <div className="hidden sm:flex flex-col justify-center gap-1.5 px-2">
              <motion.div
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35, duration: 0.4 }}
                className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.25)", minWidth: 135 }}>
                <span className="text-base">🗺️</span>
                <div>
                  <p className="font-baloo font-black text-xs leading-none" style={{ color: "var(--airways-gold-text,#E8BC56)" }}>{inProgress}</p>
                  <p className="font-nunito text-3xs leading-none mt-0.5" style={{ color: "rgba(240,232,212,0.40)" }}>
                    {inProgress === 1 ? "Journey in progress" : "Journeys in progress"}
                  </p>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45, duration: 0.4 }}
                className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.25)", minWidth: 135 }}>
                <span className="text-base">🏅</span>
                <div>
                  <p className="font-baloo font-black text-xs leading-none" style={{ color: "var(--airways-gold-text,#E8BC56)" }}>{completedCount}</p>
                  <p className="font-nunito text-3xs leading-none mt-0.5" style={{ color: "rgba(240,232,212,0.40)" }}>
                    {completedCount === 1 ? "Destination reached" : "Destinations reached"}
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Right — Nimi + Piko characters */}
            <div className="relative shrink-0 flex items-end justify-end pr-2 overflow-hidden" style={{ width: "clamp(100px, 18vw, 180px)" }}>
              <motion.img
                src="/themes/default/characters/piko.png"
                alt="Piko"
                animate={{ y: [0, -7, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                className="absolute bottom-0"
                style={{
                  height: "clamp(90px, 13vw, 145px)",
                  width: "auto",
                  objectFit: "contain",
                  left: "0%",
                  filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.22))",
                }}
                draggable={false}
              />
              <motion.img
                src="/themes/default/characters/nimi.png"
                alt="Nimi"
                initial={{ y: 0, rotate: 0 }}
                animate={{ y: [0, -6, 0], rotate: [0, 8, -4, 0] }}
                transition={{
                  y: { duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.5 },
                  rotate: { duration: 1.2, repeat: 0, delay: 0.4, ease: "easeInOut" },
                }}
                className="absolute bottom-0"
                style={{
                  height: "clamp(110px, 15vw, 165px)",
                  width: "auto",
                  objectFit: "contain",
                  right: "4px",
                  filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.28))",
                }}
                draggable={false}
              />
            </div>

          </div>
        </motion.div>

        {/* ═══ CONTINUE ADVENTURE — green hero ═══ */}
        {currentStory && !currentStory.complete && (() => {
          const pct = Math.round((currentStory.progress ?? 0) * 100);
          const progressLabel =
            pct === 0   ? "Ready for an adventure! 🗺️" :
            pct < 25    ? "Just getting started! 🌱" :
            pct < 50    ? "You're on your way! 🚀" :
            pct < 75    ? "Halfway there! ⚡" :
            pct < 100   ? "Almost there! 🔥" :
                          "Adventure complete! ⭐";
          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.45 }}
              className="relative leaf-lg overflow-hidden mb-4 cursor-pointer group"
              style={{
                background: "linear-gradient(130deg, #1F5C38 0%, #2D7A4F 45%, #163D28 100%)",
                minHeight: 120,
              }}>

              <Link href={`/stories/${currentStory.slug}`} className="block">
                <div className="relative z-20 flex items-center min-h-[120px]">

              {/* Floating music notes — decorative, screen-reader hidden */}
              <div aria-hidden="true" className="absolute inset-0 pointer-events-none select-none z-10">
              {(["⭐","✨","💫"] as string[]).map((n, i) => (
                <motion.span key={i} className="absolute pointer-events-none select-none"
                  style={{ top: `${[10,18,6][i]}%`, left: `${[48,60,72][i]}%`, fontSize: 18, color: "#F5C842" }}
                  animate={{ y: [0,-10,0], scale: [0.85, 1.25, 0.85], opacity: [0.55,1,0.55] }}
                  transition={{ duration: 2.4+i*0.5, repeat: Infinity, delay: i*0.6 }}>{n}</motion.span>
              ))}
              </div>

              {/* Teal sound wave bars — positioned on outer container, bottom-right of banner */}
              <div className="absolute right-3 bottom-5 flex items-end gap-0.5 z-10 pointer-events-none" style={{ height: 40 }}>
                {[0.4,0.7,1,0.75,0.5,0.85,0.6,1,0.65,0.4].map((h,i) => (
                  <motion.div key={i}
                    animate={{ scaleY: [h, h*0.35+0.6, h] }}
                    transition={{ duration: 0.55+i*0.07, repeat: Infinity, ease: "easeInOut", delay: i*0.055 }}
                    style={{ width: 3, borderRadius: 2, background: "rgba(245,200,66,0.55)",
                      height: `${h*40}px`, transformOrigin: "bottom" }} />
                ))}
              </div>

                  {/* Left — story info */}
                  <div className="flex-1 px-5 py-3 sm:px-6 flex flex-col justify-center">
                    <p className="font-nunito font-black uppercase tracking-[0.12em] text-white/55 mb-0.5"
                      style={{ fontSize: 9 }}>
                      {t("storyContinueAdventure")}
                    </p>
                    <h2 className="font-baloo font-black text-white leading-tight mb-1"
                      style={{ fontSize: "clamp(1rem, 2.8vw, 1.4rem)" }}>
                      {currentStory.title}
                    </h2>
                    <p className="font-nunito font-semibold text-white/70 text-xs mb-2 leading-snug">
                      {progressLabel}
                    </p>
                    <div className="flex items-center gap-3">
                      <motion.div
                        whileHover={{ scale: 1.07, boxShadow: "0 6px 24px rgba(245,156,11,0.5)" }}
                        whileTap={{ scale: 0.94 }}
                        className="inline-flex items-center gap-1.5 font-baloo font-black text-sm px-5 py-2 rounded-full shadow-lg"
                        style={{
                          background: "linear-gradient(135deg, #F5C842, #F59E0B)",
                          color: "#07111F",
                          boxShadow: "0 4px 18px rgba(245,156,11,0.4)",
                        }}>
                        Continue <Play className="w-3.5 h-3.5 fill-current" />
                      </motion.div>
                    </div>
                  </div>

                  {/* Right — characters */}
                  <div className="shrink-0 relative flex items-end justify-end overflow-hidden"
                    style={{ width: "clamp(100px, 18vw, 180px)", minHeight: 120 }}>
                    <motion.img
                      src="/themes/default/characters/piko.png"
                      alt="Piko"
                      animate={{ y: [0,-5,0] }}
                      transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                      className="absolute bottom-0"
                      style={{ height: "clamp(85px,13vw,135px)", width: "auto", objectFit: "contain",
                        left: "5%", filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))" }}
                      draggable={false}
                    />
                    <motion.img
                      src="/themes/default/characters/nimi.png"
                      alt="Nimi"
                      animate={{ y: [0,-6,0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute bottom-0"
                      style={{ height: "clamp(100px,15vw,155px)", width: "auto", objectFit: "contain",
                        right: 4, filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.32))" }}
                      draggable={false}
                    />
                  </div>

                </div>

                {/* Progress % pill — absolute on the banner itself (not inside overflow-hidden char div) */}
                <div className="absolute bottom-4 right-5 pointer-events-none select-none z-30">
                  <span className="font-baloo font-black text-sm px-3 py-1 rounded-full"
                    style={{ background: "rgba(0,0,0,0.60)", color: "#F5C842",
                      border: "1.5px solid rgba(245,200,66,0.4)", backdropFilter: "blur(6px)" }}>
                    {pct}%
                  </span>
                </div>
              </Link>
            </motion.div>
          );
        })()}

        {/* ═══ STORY LIBRARY PANEL ═══ */}
        <div className="leaf-lg mt-1"
          style={{
            background: "var(--ds-surface-card)",
            border: "1px solid var(--ds-border-primary)",
            boxShadow: "var(--shadow-card-md, 0 2px 20px rgba(0,0,0,0.07))",
          }}>
        <div className="p-4 sm:p-5 pb-5">

        {/* ═══ PICK YOUR ADVENTURE ═══ */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-baloo font-black text-[var(--ds-text-primary)] text-lg flex items-center gap-2">
              Pick Your Adventure <span aria-hidden="true">🗺️</span>
            </h2>
            {/* Compact inline search */}
            <div className="relative hidden sm:block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ds-text-tertiary)]" />
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder={t("storySearchPlaceholder")}
                className="bg-[var(--ds-surface-card)] border border-ds-border rounded-full pl-9 pr-4 py-2 text-xs text-ds-text placeholder:text-[var(--ds-text-tertiary)] focus:outline-none focus:border-[var(--ds-state-focus)] focus:ring-2 focus:ring-[var(--ds-state-focus)]/20 transition w-52" />
            </div>
          </div>
          {/* Mobile search */}
          <div className="relative sm:hidden mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ds-text-tertiary)]" />
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder={t("storySearchPlaceholder")}
              className="w-full bg-[var(--ds-surface-card)] border border-ds-border rounded-full pl-9 pr-4 py-2 text-xs text-ds-text placeholder:text-[var(--ds-text-tertiary)] focus:outline-none focus:border-[var(--ds-state-focus)] focus:ring-2 focus:ring-[var(--ds-state-focus)]/20 transition" />
          </div>
          {/* Category pills */}
          {hasCategories && (
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {categoryTabs.map(cat => (
                <motion.button key={cat.key}
                  onClick={() => { setCategory(cat.key); setPage(1); }}
                  animate={category === cat.key ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  whileTap={{ scale: 0.93 }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-baloo font-black text-xs whitespace-nowrap shrink-0 transition-all border ${
                    category === cat.key ? cat.activeClass : cat.inactiveClass
                  } ${category === cat.key ? "shadow-sm" : ""}`}>
                  <span className="text-sm leading-none">{cat.emoji}</span>
                  {cat.label}
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* ═══ BOOK SHELF ═══ */}
        <div id="story-shelf" />
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 py-2">
            {Array.from({ length: 8 }).map((_, i) => <Bone key={i} className="leaf-lg" style={{ height: "clamp(160px, 20vw, 230px)" }} />)}
          </div>
        ) : stories.length === 0 ? (
          /* No stories at all for this child — coming soon state */
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.45 }}
            className="flex items-center gap-5 px-6 py-5 leaf-lg mt-2"
            style={{ background: "linear-gradient(135deg, #FFF9E6 0%, #FFF3C4 100%)", border: "1.5px solid #F5C842" }}>
            <motion.img
              src="/themes/default/characters/nimi.png" alt="Nimi"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              style={{ height: 72, width: "auto", objectFit: "contain", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.12))", flexShrink: 0 }}
              draggable={false}
            />
            <div className="flex-1 min-w-0">
              <p className="font-baloo font-black text-gray-800 text-base leading-tight mb-0.5">More adventures are coming! 🚀</p>
              <p className="font-nunito text-gray-600 text-sm leading-snug">Nimi is getting new stories ready for you. Check back soon!</p>
            </div>
            <motion.span animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.15, 1] }}
              transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 1 }}
              className="text-3xl shrink-0 select-none" aria-hidden>✨</motion.span>
          </motion.div>
        ) : paginated.length === 0 ? (
          /* Stories exist but search/category filter returned nothing */
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-12 px-8 text-center">
            <motion.img
              src="/themes/default/characters/piko.png" alt="Piko"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              style={{ height: 80, width: "auto", objectFit: "contain", filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.12))" }}
              className="mb-3" draggable={false}
            />
            <p className="font-baloo font-black text-[var(--ds-text-primary)] text-xl mb-1">{t("storyNoResults")}</p>
            <p className="font-nunito text-[var(--ds-text-tertiary)] text-sm">Try a different search or pick another category!</p>
          </motion.div>
        ) : (
          <>
            {/* Club upgrade wall */}
            {!hasSubscription && category === "all" && !search.trim() && paginated.some(s => s.is_free) && stories.some(s => !s.is_free && !s.unlocked) && (
              <Link href="/pricing" className="block mb-5">
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.01 }} whileTap={m.buttonPress}
                  className="flex items-center gap-4 leaf-lg px-5 py-4 cursor-pointer group bg-ds-club shadow-ds-club">
                  <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: DURATION.loopSlow, repeat: Infinity }}
                    className="w-12 h-12 rounded-2xl bg-[var(--ds-surface-card)]/20 flex items-center justify-center shrink-0 border border-white/30">
                    <Crown className="w-6 h-6 text-yellow-300" />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <p className="font-baloo font-black text-white text-base leading-tight">You&apos;ve reached the end of your free stories!</p>
                    <p className="text-white/70 text-xs mt-0.5">
                      {stories.filter(s => !s.is_free && !s.unlocked).length} more adventures are waiting — join Club to unlock them all.
                    </p>
                  </div>
                  <span className="shrink-0 font-baloo font-black text-yellow-300 text-sml group-hover:text-yellow-200 transition-colors whitespace-nowrap">
                    Unlock All →
                  </span>
                </motion.div>
              </Link>
            )}

            {/* Book shelf */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
              <AnimatePresence mode="popLayout">
              {paginated.map((story, i) => {
                const isCurrent      = story.sid === currentId;
                const hasCover       = !!story.cover_url;
                const isPremiumLocked = !story.is_free && !hasSubscription;
                const spineColor     = CATEGORY_SPINE[story.category ?? ""] ?? "#3b2a1a";

                return (
                  <motion.div key={story.sid}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * DURATION.fast, ...SPRING.soft }}
                    style={{ perspective: "600px" }}>

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

        {/* ═══ PAGINATION ═══ */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <motion.button whileTap={m.buttonPress}
              onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="w-10 h-10 rounded-full bg-[var(--ds-surface-card)] border border-ds-border flex items-center justify-center text-[var(--ds-text-tertiary)] disabled:opacity-20 hover:border-[var(--ds-border-brand)] hover:text-ds-brand transition">
              <ChevronLeft size={18} />
            </motion.button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <motion.button key={i} whileTap={m.buttonPress}
                onClick={() => setPage(i + 1)}
                className={`w-10 h-10 rounded-full font-baloo font-black text-sm transition ${
                  page === i + 1
                    ? "bg-ds-action text-white shadow-md scale-110"
                    : "bg-[var(--ds-surface-card)] border border-ds-border text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] hover:border-[var(--ds-border-brand)]"
                }`}>
                {i + 1}
              </motion.button>
            ))}
            <motion.button whileTap={m.buttonPress}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="w-10 h-10 rounded-full bg-[var(--ds-surface-card)] border border-ds-border flex items-center justify-center text-[var(--ds-text-tertiary)] disabled:opacity-20 hover:border-[var(--ds-border-brand)] hover:text-ds-brand transition">
              <ChevronRight size={18} />
            </motion.button>
          </div>
        )}

        </div>{/* /p-4 sm:p-5 */}
        </div>{/* /story library panel */}

      </main>

      {/* Stats sidebar — desktop only */}
      <aside className="hidden xl:block xl:w-[300px] xl:shrink-0 sticky top-[68px]">
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
    </AppShell>
  );
}
