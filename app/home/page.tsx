"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { Heart, Star, Flame, Play, ChevronRight, Check } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import {
  getChildren, ensureParentRow, getStorageUrl,
  getCurrentLevel, getTotalStars,
  getWeekStreak, getActivityDates,
  getChildAchievements,
  getChildCosmetics, type ChildCosmetics,
  getStreakShieldsPurchased, getUsedShieldDates,
} from "@/lib/queries";
import { resolveShields } from "@/lib/streakShields";
import { computeStreaks } from "@/lib/parentInsights";
import type { Child, ChildAchievement } from "@/lib/queries";
import { getStoryLibrary, getStorySlots, getStoryDetails, getPopularStories, type PopularStory } from "@/lib/storyRepository";
import { getActiveSubscription } from "@/lib/payments/products";
import type { StoryLibraryItem, StorySlot } from "@/lib/story-types";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import AppShell              from "@/components/layout/AppShell";
import { Bone }             from "@/components/ui/Bone";
import { RefreshingBadge }  from "@/components/layout/RefreshingBadge";
import WhoIsPlaying          from "@/components/home/WhoIsPlaying";
import CreateChildModal      from "@/components/home/CreateChildModal";
import CreateExplorerProfile from "@/components/home/CreateExplorerProfile";
import HomeAdventureSection  from "@/components/home/HomeAdventureSection";
import HomeStoryLibrarySection from "@/components/home/HomeStoryLibrarySection";
import HomeStoryJourneyPanel from "@/components/home/HomeStoryJourneyPanel";
import HomeWeekStreakPanel   from "@/components/home/HomeWeekStreakPanel";
import HomeAchievementsPanel from "@/components/home/HomeAchievementsPanel";
import HomeCommunityPanel    from "@/components/home/HomeCommunityPanel";
import HomeMasterpiecePanel  from "@/components/home/HomeMasterpiecePanel";
import HomeAssignmentsPanel  from "@/components/home/HomeAssignmentsPanel";
import NotificationOptInPrompt from "@/components/home/NotificationOptInPrompt";
import WelcomeBackOverlay      from "@/components/home/WelcomeBackOverlay";
import NimiProactiveBanner        from "@/components/home/NimiProactiveBanner";
import NimiRecommendationsPanel   from "@/components/home/NimiRecommendationsPanel";
import { SHOP_ITEM_MAP } from "@/components/shop/_shopData";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

const LEVELS = [
  { labelKey: "levelNameSeed",      icon: "🌱", maxXp: 100  },
  { labelKey: "levelNameExplorer",  icon: "🚶", maxXp: 250  },
  { labelKey: "levelNameCreator",   icon: "✏️",  maxXp: 500  },
  { labelKey: "levelNameScientist", icon: "🔬", maxXp: 800  },
  { labelKey: "levelNameHero",      icon: "⭐", maxXp: 1200 },
];

const ACTIVITIES = [
  { img: "/icons/story/Read.png",       labelKey: "activityRead",       subKey: "activityReadSub",       href: "/stories" },
  { img: "/icons/story/create.png",     labelKey: "activityCreate",     subKey: "activityCreateSub",     href: "/stories" },
  { img: "/icons/story/play.png",       labelKey: "activityPlay",       subKey: "activityPlaySub",       href: "/stories" },
  { img: "/icons/story/sing.png",       labelKey: "activitySing",       subKey: "activitySingSub",       href: "/stories" },
  { img: "/icons/story/challenges.png", labelKey: "activityChallenges", subKey: "activityChallengesSub", href: "/treasure" },
  { img: "/icons/story/Community.png",  labelKey: "activityCommunity",  subKey: "activityCommunitySub",  href: "/community" },
];


const CATEGORY_VISUALS: Record<string, { emoji: string; bg: string; accent: string; label: string }> = {
  morning:   { emoji: "🎵", bg: "from-purple-50 to-pink-100",    accent: "#ec4899", label: "Morning Song"  },
  movement:  { emoji: "🤸", bg: "from-pink-50   to-red-100",     accent: "#f43f5e", label: "Move & Groove" },
  artistic:  { emoji: "🎨", bg: "from-amber-50  to-yellow-100",  accent: "#fbbf24", label: "Art Time"      },
  histoire:  { emoji: "📖", bg: "from-blue-50   to-sky-100",     accent: "#38bdf8", label: "Story Time"    },
  zoom:      { emoji: "🔍", bg: "from-green-50  to-emerald-100", accent: "#34d399", label: "Zoom In"       },
  discovery: { emoji: "🌍", bg: "from-teal-50   to-cyan-100",    accent: "#22d3ee", label: "Discover"      },
  flipflop:  { emoji: "🎧", bg: "from-violet-50 to-purple-100",  accent: "#a78bfa", label: "Flip Flop"     },
  coloring:  { emoji: "🦋", bg: "from-pink-50   to-rose-100",    accent: "#fb7185", label: "Color"         },
};



const CAT_BADGE_DISPLAY: Record<string, { emoji: string; label: string; from: string; to: string; glow: string }> = {
  morning:   { emoji: "🎵", label: "Music Master",   from: "#ec4899", to: "#db2777", glow: "#ec4899" },
  movement:  { emoji: "🤸", label: "Move Champion",  from: "#f43f5e", to: "#e11d48", glow: "#f43f5e" },
  artistic:  { emoji: "🎨", label: "Art Star",       from: "#fbbf24", to: "#f59e0b", glow: "#fbbf24" },
  histoire:  { emoji: "📖", label: "Story Master",   from: "#38bdf8", to: "#0ea5e9", glow: "#38bdf8" },
  zoom:      { emoji: "🔍", label: "Zoom Explorer",  from: "#34d399", to: "#10b981", glow: "#34d399" },
  discovery: { emoji: "🌍", label: "Discoverer",     from: "#22d3ee", to: "#06b6d4", glow: "#22d3ee" },
  flipflop:  { emoji: "🎧", label: "Audio Legend",   from: "#a78bfa", to: "#7c3aed", glow: "#a78bfa" },
  coloring:  { emoji: "🦋", label: "Color Expert",   from: "#fb7185", to: "#e11d48", glow: "#fb7185" },
};

function parseBadgeSlug(slug: string): { emoji: string; label: string; from: string; to: string; glow: string } {
  if (slug.startsWith("trilingual-story-"))
    return { emoji: "🌐", label: "Trilingual!", from: "#14b8a6", to: "#0d9488", glow: "#14b8a6" };
  if (slug.startsWith("story-streak-")) {
    const n = slug.split("-")[2] ?? "5";
    return { emoji: "🔥", label: `${n}-Story Streak`, from: "#f97316", to: "#ea580c", glow: "#f97316" };
  }
  if (slug.startsWith("story-") && slug.includes("-complete-"))
    return { emoji: "📚", label: "Story Complete", from: "#818cf8", to: "#6366f1", glow: "#818cf8" };
  if (slug.startsWith("level-") && slug.includes("-complete-")) {
    const n = slug.split("-")[1] ?? "1";
    return { emoji: "⭐", label: `Level ${n} Champ`, from: "#fbbf24", to: "#f59e0b", glow: "#fbbf24" };
  }
  const cat = slug.split("-")[0] ?? "";
  return CAT_BADGE_DISPLAY[cat] ?? { emoji: "🏅", label: "Achievement", from: "#818cf8", to: "#6366f1", glow: "#818cf8" };
}

const LOCKED_BADGE_PLACEHOLDERS = [
  { emoji: "🎨", label: "Art Star",    from: "#fbbf24", to: "#f59e0b", glow: "#fbbf24" },
  { emoji: "🧩", label: "Puzzle Pro",  from: "#818cf8", to: "#6366f1", glow: "#818cf8" },
  { emoji: "🔥", label: "Streak Hero", from: "#f97316", to: "#ea580c", glow: "#f97316" },
];




const up      = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const } } };
const pop     = { hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as const } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };

interface HomeSnapshot {
  ts: number;
  stories: StoryLibraryItem[];
  slots: StorySlot[];
  level: number;
  totalStars: number;
  weekStreak: boolean[];
  achievements: ChildAchievement[];
  consecutiveStreak: number;
  popularStories: PopularStory[];
  cosmetics: ChildCosmetics;
}

function saveHomeSnapshot(key: string, snap: Omit<HomeSnapshot, "ts">) {
  try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), ...snap })); } catch { /* quota */ }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function HomePage() {
  const router = useRouter();
  const m = useThemeMotion();
  const { setLanguage, t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);

  const activeChildRef  = useRef<Child | null>(null);
  const switchGenRef    = useRef(0);
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);
  const [children,        setChildren]        = useState<Child[]>([]);
  const [activeChild,     setActiveChild]     = useState<Child | null>(null);
  const [showPicker,      setShowPicker]      = useState(false);
  const [noChildrenYet,   setNoChildrenYet]   = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [stories,          setStories]          = useState<StoryLibraryItem[]>([]);
  const [slots,            setSlots]            = useState<StorySlot[]>([]);
  const [popularStories,   setPopularStories]   = useState<PopularStory[]>([]);
  const [level,            setLevel]            = useState(1);
  const [totalStars,       setTotalStars]       = useState(0);
  const [weekStreak,         setWeekStreak]         = useState<boolean[]>([false,false,false,false,false,false,false]);
  const [communityCreations, setCommunityCreations] = useState<Array<{ id: string; imageUrl: string; childName: string; type: string }>>([]);
  const [achievements,       setAchievements]       = useState<ChildAchievement[]>([]);
  const [consecutiveStreak,  setConsecutiveStreak]  = useState(0);
  const [favorites,          setFavorites]          = useState<Set<string>>(new Set());
  const [cosmetics,          setCosmetics]          = useState<ChildCosmetics>({ nimi_outfit: null, piko_outfit: null, frame: null, title_badge: null });
  const [welcomeBack,        setWelcomeBack]        = useState<{ show: boolean; daysAway: number }>({ show: false, daysAway: 0 });

  useEffect(() => { void init(); }, []);

  // Keep ref current so the language-change handler below always sees the
  // latest child without re-registering the event listener on every render.
  useEffect(() => { activeChildRef.current = activeChild; }, [activeChild]);

  // When the global language switcher fires, reload all per-language data.
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const handler = (e: Event) => {
      const lang = (e as CustomEvent<{ language: Language }>).detail?.language;
      if (!lang) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
      const child = activeChildRef.current;
      if (!child) return;
      const gen = ++switchGenRef.current;
      const updated = { ...child, language: lang };
      activeChildRef.current = updated;
      setActiveChild(updated);
      setRefreshing(true);
      const [lib, lvl, stars, streak, ach, actDates, popular, cos] = await Promise.all([
        getStoryLibrary(updated.id, lang),
        getCurrentLevel(updated.id, lang),
        getTotalStars(updated.id, lang),
        getWeekStreak(updated.id, lang),
        getChildAchievements(updated.id),
        getActivityDates(updated.id, lang),
        getPopularStories(),
        getChildCosmetics(updated.id),
        getStreakShieldsPurchased(updated.id),
        getUsedShieldDates(updated.id, lang),
      ]);
      if (gen !== switchGenRef.current) return;
      const { usedDates: homeDates3 } = await resolveShields(updated.id, lang, actDates);
      if (gen !== switchGenRef.current) return;
      setStories(lib);
      setLevel(lvl);
      setTotalStars(stars);
      setWeekStreak(streak);
      setAchievements(ach);
      setConsecutiveStreak(computeStreaks(actDates, new Date(), homeDates3).current);
      setPopularStories(popular);
      setCosmetics(cos);
      setRefreshing(false);
      const cur = lib.find(s => s.unlocked && !s.complete) ?? lib[0];
      if (cur) getStorySlots(updated.id, cur.sid, lang).then(setSlots);
      else setSlots([]);
      }, 200);
    };
    window.addEventListener("app:languageChange", handler as EventListener);
    return () => {
      window.removeEventListener("app:languageChange", handler as EventListener);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && activeChildRef.current) {
        void silentRefresh(activeChildRef.current);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  async function init() {
    // Fire auth validation, parent-row upsert, and children fetch all in parallel.
    // All three internally call auth.getUser() which the Supabase client deduplicates.
    const [{ data: { user } }, , list] = await Promise.all([
      supabase.auth.getUser(),
      ensureParentRow(),
      getChildren(),
    ]);
    if (!user) { router.replace("/loginpage"); return; }
    setChildren(list);
    getActiveSubscription(user.id).then(sub => setHasSubscription(!!sub));
    if (list.length === 0) { router.replace("/onboarding"); return; }
    const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
    const saved   = list.find(c => c.id === savedId);
    if (saved) await select(saved, list);
    else       { setShowPicker(true); setLoading(false); }
  }

  async function loadCommunityCreations() {
    const { data } = await supabase
      .from("creations")
      .select("id, image_url, child_name, type")
      .eq("is_public", true)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(3);
    if (data) setCommunityCreations(
      data
        .filter(r => { const url = (r.image_url as string | null) ?? ""; return url.length > 0 && !url.startsWith("/") && !url.startsWith("assets/"); })
        .map(r => ({ id: r.id as string, imageUrl: (r.image_url as string | null) ?? "", childName: (r.child_name as string | null) ?? "", type: (r.type as string | null) ?? "art" }))
    );
  }

  async function select(child: Child, list?: Child[]) {
    setActiveChild(child);
    setShowPicker(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(ACTIVE_CHILD_KEY, child.id);
      try {
        const raw = localStorage.getItem(`nimi_favs_${child.id}`);
        setFavorites(raw ? new Set(JSON.parse(raw) as string[]) : new Set());
      } catch { setFavorites(new Set()); }

      // Welcome-back overlay: show if returning after 3+ days away.
      const visitKey  = `nimipiko_last_visit_${child.id}`;
      const todayStr  = new Date().toISOString().slice(0, 10);
      const lastVisit = localStorage.getItem(visitKey);
      if (lastVisit && lastVisit !== todayStr) {
        const diffDays = Math.round(
          (new Date(todayStr).getTime() - new Date(lastVisit).getTime()) / 86400000
        );
        if (diffDays >= 3) setWelcomeBack({ show: true, daysAway: diffDays });
      }
      localStorage.setItem(visitKey, todayStr);
    }
    setLanguage(child.language);
    if (list) setChildren(list);

    // SWR: restore last session's snapshot so returning users skip the loading skeleton.
    const snapshotKey = `nimipiko_home_${child.id}_${child.language}`;
    const TWO_HOURS   = 2 * 60 * 60 * 1000;
    let hasCachedData = false;
    if (typeof window !== "undefined") {
      try {
        const raw  = localStorage.getItem(snapshotKey);
        const snap = raw ? (JSON.parse(raw) as HomeSnapshot) : null;
        if (snap && Date.now() - snap.ts < TWO_HOURS) {
          setStories(snap.stories);
          setLevel(snap.level);
          setTotalStars(snap.totalStars);
          setWeekStreak(snap.weekStreak);
          setAchievements(snap.achievements);
          setConsecutiveStreak(snap.consecutiveStreak);
          setPopularStories(snap.popularStories);
          setCosmetics(snap.cosmetics);
          if (snap.slots.length > 0) setSlots(snap.slots);
          setLoading(false);
          hasCachedData = true;
        }
      } catch { /* corrupt snapshot — ignore, proceed with fresh load */ }
    }
    if (hasCachedData) setRefreshing(true);

    const [lib, lvl, stars, streak, ach, actDates, popular, cos] = await Promise.all([
      getStoryLibrary(child.id, child.language),
      getCurrentLevel(child.id, child.language),
      getTotalStars(child.id, child.language),
      getWeekStreak(child.id, child.language),
      getChildAchievements(child.id),
      getActivityDates(child.id, child.language),
      getPopularStories(),
      getChildCosmetics(child.id),
      // Pre-warm resolveShields inputs so the await below is a cache-hit
      getStreakShieldsPurchased(child.id),
      getUsedShieldDates(child.id, child.language),
    ]);
    const { usedDates: homeDates1 } = await resolveShields(child.id, child.language, actDates);
    const cStreak = computeStreaks(actDates, new Date(), homeDates1).current;
    setStories(lib);
    setLevel(lvl);
    setTotalStars(stars);
    setWeekStreak(streak);
    setAchievements(ach);
    setConsecutiveStreak(cStreak);
    setPopularStories(popular);
    setCosmetics(cos);
    if (hasCachedData) setRefreshing(false); else setLoading(false);

    // Fetch slots and save complete snapshot once slots are known.
    const cur = lib.find(s => s.unlocked && !s.complete) ?? lib[0];
    if (cur) {
      getStorySlots(child.id, cur.sid, child.language).then(freshSlots => {
        setSlots(freshSlots);
        saveHomeSnapshot(snapshotKey, { stories: lib, slots: freshSlots, level: lvl,
          totalStars: stars, weekStreak: streak, achievements: ach,
          consecutiveStreak: cStreak, popularStories: popular, cosmetics: cos });
      });
    } else {
      setSlots([]);
      saveHomeSnapshot(snapshotKey, { stories: lib, slots: [], level: lvl,
        totalStars: stars, weekStreak: streak, achievements: ach,
        consecutiveStreak: cStreak, popularStories: popular, cosmetics: cos });
    }

    // Community creations — best-effort, never blocks
    void loadCommunityCreations();
  }

  async function silentRefresh(child: Child) {
    setRefreshing(true);
    const lang = child.language;
    const [lib, lvl, stars, streak, ach, actDates, popular, cos] = await Promise.all([
      getStoryLibrary(child.id, lang),
      getCurrentLevel(child.id, lang),
      getTotalStars(child.id, lang),
      getWeekStreak(child.id, lang),
      getChildAchievements(child.id),
      getActivityDates(child.id, lang),
      getPopularStories(),
      getChildCosmetics(child.id),
      getStreakShieldsPurchased(child.id),
      getUsedShieldDates(child.id, lang),
    ]);
    const { usedDates: homeDates2 } = await resolveShields(child.id, lang, actDates);
    const cStreak = computeStreaks(actDates, new Date(), homeDates2).current;
    setStories(lib);
    setLevel(lvl);
    setTotalStars(stars);
    setWeekStreak(streak);
    setAchievements(ach);
    setConsecutiveStreak(cStreak);
    setPopularStories(popular);
    setCosmetics(cos);
    setRefreshing(false);
    const cur = lib.find(s => s.unlocked && !s.complete) ?? lib[0];
    const snapshotKey = `nimipiko_home_${child.id}_${lang}`;
    if (cur) {
      getStorySlots(child.id, cur.sid, lang).then(freshSlots => {
        setSlots(freshSlots);
        saveHomeSnapshot(snapshotKey, { stories: lib, slots: freshSlots, level: lvl,
          totalStars: stars, weekStreak: streak, achievements: ach,
          consecutiveStreak: cStreak, popularStories: popular, cosmetics: cos });
      });
    } else {
      setSlots([]);
      saveHomeSnapshot(snapshotKey, { stories: lib, slots: [], level: lvl,
        totalStars: stars, weekStreak: streak, achievements: ach,
        consecutiveStreak: cStreak, popularStories: popular, cosmetics: cos });
    }
  }

  async function handleCreated(child: Child) {
    setShowCreateModal(false);
    setNoChildrenYet(false);
    await select(child, [...children, child]);
  }

  if (noChildrenYet) return <AppShell><CreateExplorerProfile onCreated={handleCreated} /></AppShell>;
  if (showPicker) return (
    <>
      <WhoIsPlaying children={children} onSelect={c => select(c)}
        onAddChild={() => {
          if (children.length >= 1 && !hasSubscription) { router.push("/pricing?reason=add-child"); return; }
          setShowPicker(false);
          setShowCreateModal(true);
        }} />
      {showCreateModal && (
        <CreateChildModal onCreated={handleCreated} onClose={() => { setShowCreateModal(false); setShowPicker(true); }} />
      )}
    </>
  );

  /* ─── Derived ──────────────────────────────────────────────────────────── */
  const WEEK_DAYS = [t("dayMon"), t("dayTue"), t("dayWed"), t("dayThu"), t("dayFri"), t("daySat"), t("daySun")];

  // Streak broke = no current streak, had activity earlier this week, haven't done today yet.
  const todayDotIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const streakBroke = consecutiveStreak === 0
    && !weekStreak[todayDotIdx]
    && weekStreak.slice(0, todayDotIdx).some(Boolean);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return t("greetingMorning");
    if (h < 17) return t("greetingAfternoon");
    return t("greetingEvening");
  })();
  const dateLocale = activeChild?.language === "fr" ? "fr-FR" : "en-US";

  const curStory   = stories.find(s => s.unlocked && !s.complete) ?? stories[0];
  const doneSlots  = slots.filter(s => s.completed).length;
  const totalSlots = slots.length;
  const pct        = totalSlots > 0 ? Math.round((doneSlots / totalSlots) * 100) : 0;
  const xp         = totalStars * 10;
  // Derive the XP-bar level from XP directly so the bracket always matches the earned XP.
  // The DB `level` value (story-completion based) is kept for the footer stat only.
  const xpLvlIdx  = Math.min(
    Math.max(0, LEVELS.findIndex(l => xp <= l.maxXp)),
    LEVELS.length - 1,
  );
  // findIndex returns -1 when xp > all maxXp thresholds → clamp to last level
  const xpLvlIdxFinal = xp > LEVELS[LEVELS.length - 1].maxXp ? LEVELS.length - 1 : xpLvlIdx;
  const levelInfo  = LEVELS[xpLvlIdxFinal];
  const prevMax    = xpLvlIdxFinal > 0 ? LEVELS[xpLvlIdxFinal - 1].maxXp : 0;
  const xpIn       = Math.max(0, xp - prevMax);
  const xpNeeded   = levelInfo.maxXp - prevMax;
  const xpPct      = Math.min(100, Math.round((xpIn / xpNeeded) * 100));
  const xpLevel    = xpLvlIdxFinal + 1;
  // 0 = Mon … 6 = Sun, matching the weekStreak array order
  const todayIdx  = (new Date().getDay() + 6) % 7;

  /* ═══════════════════════════════════════════════════════════════════════ */
  return (
    <AppShell>
      <RefreshingBadge show={refreshing} />
      {loading ? (
        <>
          <div className="min-h-screen pb-24">
            <Bone className="w-full rounded-none" style={{ height: 380 }} />
            <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6 flex flex-col xl:flex-row gap-6">
              <div className="flex-1 space-y-8">
                <div className="leaf-lg border border-gray-100 p-5 space-y-4">
                  <Bone className="h-7 w-48" />
                  <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => <Bone key={i} className="aspect-square leaf" />)}
                  </div>
                </div>
                <div className="leaf-lg border border-gray-100 p-5 space-y-4">
                  <Bone className="h-7 w-56" />
                  <div className="flex gap-4 overflow-hidden">
                    {Array.from({ length: 4 }).map((_, i) => <Bone key={i} className="shrink-0 w-[160px] h-[220px] leaf" />)}
                  </div>
                </div>
              </div>
              <div className="w-full xl:w-[284px] space-y-5">
                <Bone className="h-[280px] leaf-lg" />
                <Bone className="h-[180px] leaf-lg" />
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className={`min-h-screen content-enter transition-opacity duration-300${refreshing ? " opacity-50 pointer-events-none" : ""}`} style={{ background: "linear-gradient(180deg, #ecfdf5 0%, #f4fef6 8%, #f9fafb 20%, #ffffff 36%)" }}>

          {/* ════════════════════════════════ HERO ══════════════════════════ */}
          <motion.div
            initial="hidden" animate="visible" variants={stagger}
            className="relative">

            {/* ═══════════════════════ HERO: WORLD STAGE ═══════════════════════ */}
            <div className="relative overflow-hidden" style={{ minHeight: 460 }}>

              {/* ── Layer 1: Bright daytime sky → lush ground ── */}
              <div className="absolute inset-0 pointer-events-none" style={{
                background: "linear-gradient(180deg, #0ea5e9 0%, #38bdf8 25%, #7dd3fc 50%, #d1fae5 72%, #4ade80 88%, #22c55e 100%)"
              }} />
              {/* Warm sun glow high up */}
              <div className="absolute inset-x-0 top-0 h-[45%] pointer-events-none"
                style={{ background: "radial-gradient(ellipse 60% 55% at 50% 0%, rgba(254,240,138,0.30) 0%, transparent 70%)" }} />

              {/* ── Sky decorations: clouds, stars, birds ── */}
              {/* Clouds */}
              <motion.div className="absolute top-[6%] left-[18%] text-[36px] pointer-events-none select-none leading-none opacity-80"
                animate={{ x: [0, 18, 0], y: [0, -4, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}>☁️</motion.div>
              <motion.div className="absolute top-[3%] left-[52%] text-[28px] pointer-events-none select-none leading-none opacity-70"
                animate={{ x: [0, -14, 0], y: [0, -3, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}>☁️</motion.div>
              <motion.div className="absolute top-[8%] right-[20%] text-[32px] pointer-events-none select-none leading-none opacity-75"
                animate={{ x: [0, 12, 0], y: [0, -5, 0] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}>⛅</motion.div>
              {/* Stars in sky */}
              <motion.div className="absolute top-[4%] left-[28%] text-[20px] pointer-events-none select-none leading-none"
                animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}>⭐</motion.div>
              <motion.div className="absolute top-[2%] right-[30%] text-[16px] pointer-events-none select-none leading-none"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}>✨</motion.div>
              <motion.div className="absolute top-[10%] left-[42%] text-[14px] pointer-events-none select-none leading-none"
                animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0.9, 0.4] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}>⭐</motion.div>
              {/* Birds flying */}
              <motion.div className="absolute top-[12%] left-[32%] text-[20px] pointer-events-none select-none leading-none opacity-80"
                animate={{ x: [0, 30, 60, 90], y: [0, -6, 2, -4], opacity: [0, 0.8, 0.8, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}>🐦</motion.div>
              <motion.div className="absolute top-[18%] right-[35%] text-[18px] pointer-events-none select-none leading-none opacity-80"
                animate={{ x: [0, -25, -50, -75], y: [0, -5, 3, -3], opacity: [0, 0.8, 0.8, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}>🦅</motion.div>
              {/* Butterflies near flowers */}
              <motion.div className="absolute bottom-[22%] left-[18%] text-[22px] pointer-events-none select-none leading-none opacity-85"
                animate={{ x: [0, 12, -8, 0], y: [0, -8, -14, 0], rotate: [0, 15, -10, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}>🦋</motion.div>
              <motion.div className="absolute bottom-[20%] right-[18%] text-[20px] pointer-events-none select-none leading-none opacity-80"
                animate={{ x: [0, -10, 8, 0], y: [0, -10, -6, 0], rotate: [0, -12, 8, 0] }}
                transition={{ duration: 4.0, repeat: Infinity, ease: "easeInOut", delay: 2.2 }}>🦋</motion.div>
              {/* Flowers near ground */}
              <motion.div className="absolute bottom-[14%] left-[22%] text-[18px] pointer-events-none select-none leading-none opacity-80"
                animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.1, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>🌸</motion.div>
              <motion.div className="absolute bottom-[12%] right-[22%] text-[20px] pointer-events-none select-none leading-none opacity-80"
                animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.12, 1] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}>🌺</motion.div>
              <motion.div className="absolute bottom-[16%] left-[28%] text-[16px] pointer-events-none select-none leading-none opacity-70"
                animate={{ rotate: [0, 6, -6, 0] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}>🌼</motion.div>
              <motion.div className="absolute bottom-[13%] right-[28%] text-[16px] pointer-events-none select-none leading-none opacity-70"
                animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}>🌷</motion.div>

              {/* ── Layer 2: World environment assets ── */}
              {/* Left forest edge */}
              <img src="/themes/default/world/tree-2.png" alt="" aria-hidden
                className="absolute bottom-0 left-0 h-[230px] w-auto object-contain pointer-events-none select-none"  loading="lazy" />
              <img src="/themes/default/world/tree-1.png" alt="" aria-hidden
                className="absolute bottom-0 left-[7%] h-[175px] w-auto object-contain pointer-events-none select-none opacity-85"  loading="lazy" />
              <img src="/themes/default/world/birdhouse.png" alt="" aria-hidden
                className="absolute bottom-14 left-[14%] h-[90px] w-auto object-contain pointer-events-none select-none opacity-90"  loading="lazy" />
              {/* Right forest edge */}
              <img src="/themes/default/world/greenhouse.png" alt="" aria-hidden
                className="absolute bottom-0 right-0 h-[210px] w-auto object-contain pointer-events-none select-none"  loading="lazy" />
              <img src="/themes/default/world/tree-4.png" alt="" aria-hidden
                className="absolute bottom-0 right-[7%] h-[170px] w-auto object-contain pointer-events-none select-none opacity-85"  loading="lazy" />
              <img src="/themes/default/world/tree-3.png" alt="" aria-hidden
                className="absolute bottom-0 right-[15%] h-[145px] w-auto object-contain pointer-events-none select-none opacity-75"  loading="lazy" />
              {/* Ground flowers + stones */}
              <img src="/themes/default/world/flower-garden.png" alt="" aria-hidden
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[65px] w-auto object-contain pointer-events-none select-none opacity-80"  loading="lazy" />
              <img src="/themes/default/world/stepping-stones.png" alt="" aria-hidden
                className="absolute bottom-0 left-[38%] h-[42px] w-auto object-contain pointer-events-none select-none opacity-60"  loading="lazy" />

              {/* ── Corner art frames ── */}
              <Image src="/themes/default/decorations/corner-tl.png" alt="" aria-hidden
                width={110} height={110} className="absolute top-0 left-0 pointer-events-none select-none opacity-55" />
              <Image src="/themes/default/decorations/corner-tr.png" alt="" aria-hidden
                width={110} height={110} className="absolute top-0 right-0 pointer-events-none select-none opacity-55" />

              {/* ── Floating magical orbs ── */}
              <motion.img src="/themes/default/decorations/floating-1.png" alt="" aria-hidden
                className="absolute top-10 left-[36%] w-12 pointer-events-none select-none"
                animate={{ y: [0, -10, 0], rotate: [0, 6, 0] }}
                transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }} />
              <motion.img src="/themes/default/decorations/floating-2.png" alt="" aria-hidden
                className="absolute top-14 right-[36%] w-10 pointer-events-none select-none"
                animate={{ y: [0, -8, 0], rotate: [0, -5, 0] }}
                transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: 0.8 }} />
              <motion.img src="/themes/default/decorations/floating-3.png" alt="" aria-hidden
                className="absolute top-7 left-1/2 -translate-x-1/2 w-9 pointer-events-none select-none"
                animate={{ y: [0, -13, 0] }}
                transition={{ duration: 5.1, repeat: Infinity, ease: "easeInOut", delay: 1.4 }} />

              {/* ── Confetti — kept inside the safe center band [33%–67%] ── */}
              <div className="absolute top-6  left-[34%]  w-2   h-6  bg-rose-400    rounded-sm rotate-12  opacity-90 pointer-events-none" />
              <div className="absolute top-4  left-[40%]  w-1.5 h-5  bg-yellow-300  rounded-sm -rotate-8  opacity-85 pointer-events-none" />
              <div className="absolute top-10 left-[46%]  w-3   h-3  bg-emerald-300 rounded-full           opacity-85 pointer-events-none" />
              <div className="absolute top-5  right-[34%] w-2   h-7  bg-pink-300    rounded-sm rotate-18  opacity-85 pointer-events-none" />
              <div className="absolute top-9  right-[40%] w-3   h-3  bg-orange-300  rounded-full           opacity-80 pointer-events-none" />
              <div className="absolute top-7  right-[46%] w-1.5 h-5  bg-cyan-300    rounded-sm -rotate-10 opacity-85 pointer-events-none" />
              <Image src="/themes/default/decorations/sparkle.png" alt="" aria-hidden
                width={32} height={32} className="absolute top-5 left-[38%] opacity-80 pointer-events-none select-none" />
              <Image src="/themes/default/decorations/sparkle.png" alt="" aria-hidden
                width={24} height={24} className="absolute top-8 right-[38%] opacity-70 pointer-events-none select-none" />

              {/* ══════════════════════════════════════════════════════════════
                   Layer 3 — CONTENT (3 columns, items aligned to bottom)
              ══════════════════════════════════════════════════════════════ */}
              <div className="relative z-10 flex flex-col items-center justify-end px-4 sm:px-6 pb-14 sm:pb-18 pt-5 sm:pt-8 max-w-[900px] mx-auto min-h-[420px]">

                {/* ── LEFT: Continue Your Story card ─────────────────────── */}
                <motion.div variants={up}
                  className="hidden">
                  {curStory ? (
                    <div className="relative rounded-3xl p-5 overflow-hidden"
                      style={{
                        background: "linear-gradient(150deg,#34d399 0%,#10b981 28%,#059669 60%,#047857 100%)",
                        boxShadow: "0 24px 64px rgba(5,150,105,0.50), 0 2px 0 rgba(255,255,255,0.18) inset",
                        border: "1.5px solid rgba(255,255,255,0.18)",
                      }}>

                      {/* Top-right glow blob */}
                      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
                        style={{ background: "radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)" }} />

                      {/* Stars */}
                      <motion.span className="absolute top-3 right-4 text-[26px] pointer-events-none select-none drop-shadow-lg"
                        animate={{ y: [0, -5, 0], rotate: [0, 10, 0] }}
                        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}>⭐</motion.span>
                      <motion.span className="absolute top-7 right-[52px] text-[16px] pointer-events-none select-none opacity-80"
                        animate={{ y: [0, -4, 0], scale: [1, 1.3, 1] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}>✨</motion.span>

                      <p className="font-baloo font-black text-white text-[16px] mb-4 pr-16 drop-shadow">
                        Continue Your Story
                      </p>

                      {/* Cover + info */}
                      <div className="flex gap-3 mb-4">
                        <div className="relative w-[110px] h-[110px] rounded-2xl overflow-hidden shrink-0"
                          style={{ boxShadow: "0 0 0 3px rgba(255,255,255,0.3), 0 8px 24px rgba(0,0,0,0.35)" }}>
                          <Image src={curStory.cover_url ? getStorageUrl(curStory.cover_url) : "/current-story.png"}
                            alt={curStory.title} fill className="object-cover" />
                          <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-xl">
                              <Play className="w-4 h-4 fill-violet-600 text-violet-600 ml-0.5" />
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
                          <p className="font-baloo font-black text-white text-[17px] leading-tight line-clamp-2 drop-shadow">
                            {curStory.title}
                          </p>
                          <p className="font-nunito text-white/65 text-[12px]">
                            Page {doneSlots} of {totalSlots || "?"}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex-1 h-3 rounded-full overflow-hidden"
                              style={{ background: "rgba(255,255,255,0.18)" }}>
                              <motion.div className="h-full rounded-full"
                                style={{ background: "linear-gradient(90deg, var(--ds-brand-soft), var(--ds-brand-primary))" }}
                                initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }} />
                            </div>
                            <span className="font-baloo font-black text-white text-[13px] shrink-0">{pct}%</span>
                          </div>
                        </div>
                      </div>

                      <Link href={`/stories/${curStory.slug}`}
                        className="flex items-center justify-center gap-2 w-full font-baloo font-black text-amber-900 text-[16px] py-3.5 leaf transition-all hover:-translate-y-0.5 active:scale-95"
                        style={{
                          background: "linear-gradient(135deg,#fcd34d,#f59e0b)",
                          boxShadow: "0 4px 20px rgba(245,158,11,0.5), 0 1px 0 rgba(255,255,255,0.4) inset",
                        }}>
                        Continue My Journey
                        <Play className="w-[15px] h-[15px] fill-amber-900 stroke-0" />
                      </Link>
                    </div>
                  ) : (
                    <div className="relative rounded-3xl p-5 shadow-2xl overflow-hidden"
                      style={{ background: "linear-gradient(150deg,#34d399 0%,#059669 45%,#047857 100%)" }}>
                      <motion.span className="absolute top-3 right-5 text-2xl pointer-events-none select-none"
                        animate={{ y: [0, -5, 0] }} transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}>🔭</motion.span>
                      <p className="font-baloo font-black text-white text-[17px] mb-1 pr-10">Your story awaits!</p>
                      <p className="font-nunito text-white/80 text-[13px] mb-5">Zilo found some great ones at the Library.</p>
                      <Link href="/stories"
                        className="flex items-center justify-center gap-2 w-full font-baloo font-black text-amber-900 text-[16px] py-3.5 leaf shadow-xl transition-all hover:-translate-y-0.5 active:scale-95"
                        style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)" }}>
                        Start Your Journey <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  )}
                </motion.div>

                {/* ── CENTER: Greeting glass card + Characters ─────────── */}
                <div className="w-full flex flex-col items-center justify-end gap-0">

                  {/* Greeting */}
                  <motion.div variants={up}
                    className="mb-4 w-full max-w-[360px] rounded-2xl border border-white/50 shadow-2xl overflow-hidden text-center"
                    style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)" }}>

                    {/* Name + XP section */}
                    <div className="px-5 pt-4 pb-3">
                      <p className="font-nunito font-semibold text-sky-600 text-[11px] tracking-wide mb-0.5 uppercase">
                        {greeting} ✨
                      </p>
                      <h1 className="font-baloo font-black text-gray-900"
                        style={{ fontSize: "clamp(1.4rem,3.8vw,2rem)", lineHeight: 1.15 }}>
                        {activeChild?.name ?? "Explorer"}!
                      </h1>
                      {cosmetics.title_badge && SHOP_ITEM_MAP[cosmetics.title_badge] && (
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-black px-2.5 py-0.5 rounded-full mt-1 shadow-sm ${SHOP_ITEM_MAP[cosmetics.title_badge].titleColor ?? "bg-gray-100 text-gray-600"}`}>
                          {SHOP_ITEM_MAP[cosmetics.title_badge].emoji} {t(SHOP_ITEM_MAP[cosmetics.title_badge].nameKey)}
                        </span>
                      )}
                      {/* XP bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-nunito font-bold text-gray-400 text-[10px]">{levelInfo?.icon} Lv.{xpLevel} · {levelInfo ? t(levelInfo.labelKey) : ""}</span>
                          <span className="font-baloo font-black text-emerald-600 text-[10px]">{xpIn}/{xpNeeded} XP</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div className="h-full rounded-full"
                            style={{ background: "linear-gradient(90deg,#34d399,#059669)" }}
                            initial={{ width: 0 }} animate={{ width: `${xpPct}%` }}
                            transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }} />
                        </div>
                      </div>
                    </div>

                    {/* Stats footer — 3-cell divided bar */}
                    <div className="flex items-stretch divide-x divide-gray-100 bg-gray-50/70 border-t border-gray-100">
                      <div className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5">
                        <Flame className="w-[15px] h-[15px] fill-orange-400 text-orange-400" />
                        <span className="font-baloo font-black text-orange-500 text-[14px] leading-none">{consecutiveStreak}</span>
                        <span className="font-nunito text-gray-400 text-[9px] leading-none">{t("homeStatStreak")}</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5">
                        <Star className="w-[15px] h-[15px] fill-amber-400 text-amber-400" />
                        <span className="font-baloo font-black text-amber-500 text-[14px] leading-none">{totalStars}</span>
                        <span className="font-nunito text-gray-400 text-[9px] leading-none">{t("homeStatStars")}</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5">
                        <Heart className="w-[15px] h-[15px] fill-rose-400 text-rose-400" />
                        <span className="font-baloo font-black text-rose-500 text-[14px] leading-none">{level}</span>
                        <span className="font-nunito text-gray-400 text-[9px] leading-none">{t("homeStatLevel")}</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Characters on their world stage */}
                  <motion.div variants={up} className="relative flex items-end justify-center">
                    {/* Stage spotlight — warm glow rising from ground under characters */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[340px] sm:w-[440px] h-[110px] pointer-events-none"
                      style={{ background: "radial-gradient(ellipse 70% 60% at 50% 100%, rgba(251,191,36,0.30) 0%, rgba(52,211,153,0.14) 50%, transparent 75%)" }} />

                    {/* NIMI with outfit badge */}
                    <div className="relative">
                      <motion.img src={`/themes/${themeId}/characters/nimi.png`} alt="Nimi"
                        className="h-[185px] sm:h-[225px] lg:h-[265px] w-auto object-contain drop-shadow-2xl select-none"
                        animate={{ y: [0, -9, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      {cosmetics.nimi_outfit && SHOP_ITEM_MAP[cosmetics.nimi_outfit] && (
                        <motion.span
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          className="absolute bottom-6 right-0 text-4xl drop-shadow-xl leading-none pointer-events-none select-none"
                          title={t(SHOP_ITEM_MAP[cosmetics.nimi_outfit].nameKey)}
                        >
                          {SHOP_ITEM_MAP[cosmetics.nimi_outfit].emoji}
                        </motion.span>
                      )}
                    </div>

                    {/* PIKO with outfit badge */}
                    <div className="relative mx-2">
                      <motion.img src={`/themes/${themeId}/characters/piko.png`} alt="Piko"
                        className="h-[165px] sm:h-[200px] lg:h-[235px] w-auto object-contain drop-shadow-2xl select-none"
                        animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      {cosmetics.piko_outfit && SHOP_ITEM_MAP[cosmetics.piko_outfit] && (
                        <motion.span
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          className="absolute bottom-6 right-0 text-4xl drop-shadow-xl leading-none pointer-events-none select-none"
                          title={t(SHOP_ITEM_MAP[cosmetics.piko_outfit].nameKey)}
                        >
                          {SHOP_ITEM_MAP[cosmetics.piko_outfit].emoji}
                        </motion.span>
                      )}
                    </div>

                    <motion.img src={`/themes/${themeId}/characters/zilo.png`} alt="Zilo"
                      className="h-[175px] sm:h-[215px] lg:h-[250px] w-auto object-contain drop-shadow-2xl select-none"
                      animate={{ y: [0, -8, 0] }} transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </motion.div>
                </div>

                {/* ── RIGHT: Trust + Streak + Level ───────────────────── */}
                <motion.div variants={up}
                  className="hidden">

                  {/* Latest Achievement — only shown when the child has at least one badge */}
                  {achievements.length > 0 && (() => {
                    const latest = achievements[achievements.length - 1];
                    const badge  = parseBadgeSlug(latest.slug);
                    const today  = new Date().toDateString();
                    return (
                      <div className="px-4 py-3.5 rounded-2xl border border-white/50 shadow-2xl"
                        style={{ background: "rgba(255,255,255,0.65)", backdropFilter: "blur(18px)" }}>
                        <p className="font-baloo font-black text-sky-700 text-[11px] uppercase tracking-widest mb-2.5">Latest Badge</p>
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <div className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-[28px] shadow-lg"
                              style={{ background: `linear-gradient(145deg,${badge.from},${badge.to})` }}>
                              {badge.emoji}
                            </div>
                            <motion.div
                              className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center shadow-md"
                              animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.8, repeat: Infinity }}>
                              <Star className="w-2.5 h-2.5 fill-white text-white" />
                            </motion.div>
                          </div>
                          <div>
                            <p className="font-baloo font-black text-amber-600 text-[15px] leading-tight">{badge.label}</p>
                            <p className="font-nunito font-bold text-emerald-600 text-[11px]">
                              {new Date(latest.earned_at).toDateString() === today ? "Earned today 🎉" : "Recently earned ✨"}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Streak card — frosted */}
                  <div className="rounded-2xl p-4 shadow-xl border border-amber-200/60"
                    style={{ background: "rgba(254,243,199,0.92)", backdropFilter: "blur(14px)" }}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
                      <span className="font-baloo font-black text-orange-600 text-[17px]">{consecutiveStreak} {consecutiveStreak === 1 ? t("homeStreakDayLabel") : t("homeStreakDaysLabel")} {t("heroStreakLabel")}</span>
                    </div>
                    <p className="font-nunito font-bold text-amber-700 text-[12px] mb-3">
                      {consecutiveStreak >= 7 ? t("homeStreakUnstoppable") : consecutiveStreak >= 3 ? t("homeStreakOnFire") : consecutiveStreak > 0 ? t("homeStreakKeepItUp") : t("homeStreakStart")}
                    </p>
                    <div className="flex justify-between">
                      {WEEK_DAYS.map((day, i) => {
                        const done    = weekStreak[i];
                        const isToday = i === todayIdx;
                        const future  = i > todayIdx;
                        return (
                          <div key={i} className="flex flex-col items-center gap-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all ${
                              done    ? "bg-emerald-500 shadow-emerald-200" :
                              isToday ? "bg-amber-100 border-2 border-amber-400" :
                              future  ? "bg-amber-50 border border-amber-100 opacity-40" :
                                        "bg-amber-100/60 border border-amber-200"
                            }`}>
                              {done    ? <Check className="w-4 h-4 text-white" strokeWidth={2.5} /> :
                               isToday ? <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-300" /> :
                                         null}
                            </div>
                            <span className={`font-nunito font-bold text-[9px] ${
                              done ? "text-emerald-700" : isToday ? "text-amber-600 font-black" : "text-amber-400"
                            }`}>{day}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </motion.div>

              </div>{/* end 3-column */}

              {/* ── Wave bottom transition ─────────────────────────────────── */}
              <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none" style={{ lineHeight: 0 }}>
                <svg viewBox="0 0 1440 110" xmlns="http://www.w3.org/2000/svg"
                  className="w-full block" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="waveGradA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d1fae5" stopOpacity="0" />
                      <stop offset="100%" stopColor="#d1fae5" stopOpacity="0.55" />
                    </linearGradient>
                  </defs>
                  {/* Wave 1 — deep back, airy */}
                  <path
                    d="M0,38 C240,76 480,8 720,42 C960,78 1200,12 1440,46 L1440,110 L0,110 Z"
                    fill="rgba(209,250,229,0.22)" />
                  {/* Wave 2 — mid layer, gradient */}
                  <path
                    d="M0,57 C180,92 360,22 540,58 C720,94 900,20 1080,55 C1260,90 1380,34 1440,58 L1440,110 L0,110 Z"
                    fill="url(#waveGradA)" />
                  {/* Wave 3 — front, solid mint */}
                  <path
                    d="M0,76 C200,46 400,104 600,74 C800,44 1000,100 1200,72 C1320,56 1400,82 1440,76 L1440,110 L0,110 Z"
                    fill="#d1fae5" />
                </svg>
              </div>

            </div>{/* end hero card */}
          </motion.div>

          {/* ── Campus Welcome Strip ──────────────────────────────────────── */}
          <div className="relative z-10 -mt-5 px-4 sm:px-6 pb-2 max-w-[1400px] mx-auto">
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white/85 backdrop-blur-sm rounded-2xl shadow-sm border border-emerald-100 w-fit">
              <motion.img
                src={assets.nimiCircle}
                alt="Nimi"
                className="w-6 h-6 rounded-full object-cover shrink-0 border border-emerald-200"
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <span className="font-baloo font-black text-emerald-700 text-[12px] sm:text-[13px]">{t("homeCampusOpen")}</span>
              <span className="font-nunito text-emerald-500 text-[11px] hidden sm:inline">
                • {new Date().toLocaleDateString(dateLocale, { weekday: "long", month: "long", day: "numeric" })}
              </span>
            </div>
          </div>

          {/* ════════════════════════ QUICK ACTIONS ═════════════════════════ */}
          <div className="relative z-10 px-4 sm:px-6 pt-3 pb-1 max-w-[1400px] mx-auto">
            <motion.div
              initial="hidden" animate="visible" variants={stagger}
              className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 sm:gap-3">
              {ACTIVITIES.map(({ img, labelKey, subKey, href }) => (
                <motion.div key={labelKey} variants={pop}>
                  <Link href={href}
                    className="group flex flex-col items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-white hover:border-emerald-200 rounded-2xl px-2 py-3 sm:py-4 shadow-sm hover:shadow-md hover:-translate-y-1 active:scale-95 transition-all">
                    <img src={img} alt={t(labelKey)} className="w-10 h-10 sm:w-11 sm:h-11 object-contain drop-shadow-sm group-hover:scale-110 transition-transform duration-200" />
                    <p className="font-baloo font-black text-gray-800 text-[12px] sm:text-[13px] leading-tight text-center">{t(labelKey)}</p>
                    <p className="font-nunito text-gray-400 text-[9px] sm:text-[10px] text-center hidden sm:block leading-tight">{t(subKey)}</p>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* ════════════════════════════ BELOW HERO ════════════════════════ */}
          <div className="relative">

            {/* ── Campus walkway — subtle dashed thread through all zones ── */}
            <div
              className="absolute inset-y-0 pointer-events-none select-none hidden xl:block"
              aria-hidden
              style={{
                left: 22,
                width: 2,
                background: "repeating-linear-gradient(to bottom, #86efac 0px, #86efac 5px, transparent 5px, transparent 17px)",
                opacity: 0.14,
              }}
            />


            {/* ── Main flex grid ──────────────────────────────────────────── */}
            <div className="relative z-10 flex flex-col xl:flex-row xl:items-start gap-6 px-4 lg:px-6 py-6 max-w-[1400px] mx-auto">

              {/* ══ MAIN COLUMN ══════════════════════════════════════════════ */}
              <main className="flex-1 min-w-0 space-y-10">

                {/* ── YOUR ADVENTURE ─────────────────────────────────────── */}
                <HomeAdventureSection
                  curStory={curStory}
                  doneSlots={doneSlots}
                  totalSlots={totalSlots}
                  pct={pct}
                  slots={slots}
                  up={up}
                  stagger={stagger}
                />

                {/* ── STORY LIBRARY ─────────────────────────────────────────── */}
                <HomeStoryLibrarySection
                  stories={stories}
                  curStory={curStory}
                  hasSubscription={hasSubscription}
                  up={up}
                  stagger={stagger}
                  pop={pop}
                  onPrefetch={activeChild ? (storyId) => {
                    void getStoryDetails(storyId, activeChild.language);
                    void getStorySlots(activeChild.id, storyId, activeChild.language);
                  } : undefined}
                />

              </main>

              {/* ══ RIGHT PANEL ════════════════════════════════════════════════ */}
              <aside className="w-full xl:w-[284px] xl:shrink-0 xl:self-start xl:sticky xl:top-[80px]">
                <div className="flex flex-col gap-5 xl:max-h-[calc(100vh-100px)] xl:overflow-y-auto" style={{ scrollbarWidth: "none" }}>

                  {/* ── Proactive Nimi Banner ────────────────────────────────── */}
                  {activeChild && (
                    <NimiProactiveBanner childId={activeChild.id} language={activeChild.language} />
                  )}

                  {/* ── Story Journey ───────────────────────────────────────── */}
                  <HomeStoryJourneyPanel curStory={curStory} slots={slots} pct={pct} />

                  {/* ── Assignments ─────────────────────────────────────────── */}
                  {activeChild?.teacher_id && (
                    <HomeAssignmentsPanel childId={activeChild.id} language={activeChild.language} />
                  )}

                  {/* ── Week Streak ─────────────────────────────────────────── */}
                  <HomeWeekStreakPanel weekStreak={weekStreak} consecutiveStreak={consecutiveStreak} totalStars={totalStars} streakBroke={streakBroke} />

                  {/* ── Nimi Recommendations ────────────────────────────────── */}
                  {activeChild && (
                    <NimiRecommendationsPanel childId={activeChild.id} language={activeChild.language} />
                  )}

                  {/* ── My Achievements ─────────────────────────────────────── */}
                  <HomeAchievementsPanel achievements={achievements} />

                  {/* ── Community Creations ─────────────────────────────────── */}
                  <HomeCommunityPanel communityCreations={communityCreations} />

                  {/* ── Masterpiece Studio ──────────────────────────────── */}
                  <HomeMasterpiecePanel />

                </div>
              </aside>

            </div>{/* end main flex */}
          </div>{/* end relative wrapper */}

        </div>
      )}

      {showCreateModal && (
        <CreateChildModal onCreated={handleCreated} onClose={() => setShowCreateModal(false)} />
      )}

      {welcomeBack.show && activeChild && (
        <WelcomeBackOverlay
          childName={activeChild.name}
          daysAway={welcomeBack.daysAway}
          onDismiss={() => setWelcomeBack({ show: false, daysAway: 0 })}
        />
      )}

      {activeChild && (
        <NotificationOptInPrompt childId={activeChild.id} childName={activeChild.name} />
      )}
    </AppShell>
  );
}
