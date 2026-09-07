"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { Crown } from "lucide-react";
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
import HomeAdventureSection       from "@/components/home/HomeAdventureSection";
import HomeQuickActions           from "@/components/home/HomeQuickActions";
import HomeContinueAdventureCard  from "@/components/home/HomeContinueAdventureCard";
import HomePassportCard           from "@/components/home/HomePassportCard";
import HomeTodayStarsCard         from "@/components/home/HomeTodayStarsCard";
import HomeJourneyMapPanel        from "@/components/home/HomeJourneyMapPanel";
import HomeAirwaysDashboard       from "@/components/home/HomeAirwaysDashboard";
import NotificationOptInPrompt    from "@/components/home/NotificationOptInPrompt";
import WelcomeBackOverlay         from "@/components/home/WelcomeBackOverlay";
import NimiProactiveBanner        from "@/components/home/NimiProactiveBanner";
import { SHOP_ITEM_MAP } from "@/components/shop/_shopData";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

const LEVELS = [
  { labelKey: "levelNameSeed",      icon: "🌱", maxXp: 10   },
  { labelKey: "levelNameExplorer",  icon: "🚶", maxXp: 25   },
  { labelKey: "levelNameCreator",   icon: "✏️",  maxXp: 50   },
  { labelKey: "levelNameScientist", icon: "🔬", maxXp: 80   },
  { labelKey: "levelNameHero",      icon: "⭐", maxXp: 120  },
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

interface Props {
  initialChildren?: Child[];
  initialHasSubscription?: boolean;
}

function InlineToast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, [onDone]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 48, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.9 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-notification flex items-center gap-2.5 bg-gray-900/90 backdrop-blur-sm text-white px-4 py-2.5 rounded-2xl shadow-2xl pointer-events-none"
    >
      <span className="text-mbase leading-none">⚠️</span>
      <span className="font-nunito font-semibold text-sml leading-snug max-w-[220px]">{message}</span>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function HomeClient({ initialChildren, initialHasSubscription }: Props = {}) {
  const router = useRouter();
  const m = useThemeMotion();
  const { setLanguage, t } = useLanguage();
  const { themeId, theme } = useAppTheme();
  const assets = getThemeAssets(themeId);

  const activeChildRef       = useRef<Child | null>(null);
  const switchGenRef         = useRef(0);
  const selectGenRef         = useRef(0);          // guards child-switch race
  const subscriptionLoadedRef = useRef(initialChildren !== undefined); // RSC path resolves immediately
  const silentRefreshingRef  = useRef(false);      // prevents concurrent silentRefresh calls
  const [loading,         setLoading]         = useState(true);
  const [initError,       setInitError]       = useState(false);
  const [refreshing,      setRefreshing]      = useState(false);
  const [children,        setChildren]        = useState<Child[]>([]);
  const [activeChild,     setActiveChild]     = useState<Child | null>(null);
  const [noChildrenYet,   setNoChildrenYet]   = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [isTrial,           setIsTrial]           = useState(false);
  const [trialDaysLeft,     setTrialDaysLeft]     = useState(0);
  const [trialJustExpired,  setTrialJustExpired]  = useState(false);
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
  const [langToast,          setLangToast]          = useState<string | null>(null);
  const langToastKey = useRef(0);

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
      try {
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
        const cur = lib.find(s => s.unlocked && !s.complete) ?? lib[0];
        if (cur) getStorySlots(updated.id, cur.sid, lang).then(setSlots).catch(() => {});
        else setSlots([]);
      } catch {
        langToastKey.current++;
        setLangToast("Couldn't load content for this language. Please try again.");
      } finally {
        if (gen === switchGenRef.current) setRefreshing(false);
      }
      }, 200);
    };
    window.addEventListener("app:languageChange", handler as EventListener);
    return () => {
      window.removeEventListener("app:languageChange", handler as EventListener);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, []);

  useEffect(() => {
    let visTimer: ReturnType<typeof setTimeout> | null = null;
    const handleVisibility = () => {
      if (document.visibilityState !== "visible" || !activeChildRef.current) return;
      if (visTimer) clearTimeout(visTimer);
      visTimer = setTimeout(() => {
        if (activeChildRef.current) void silentRefresh(activeChildRef.current);
      }, 300);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (visTimer) clearTimeout(visTimer);
    };
  }, []);

  async function init() {
    try {
      if (initialChildren !== undefined) {
        setChildren(initialChildren);
        setHasSubscription(!!initialHasSubscription);
        // subscriptionLoadedRef already true (initialised from prop)
        if (initialChildren.length === 0) { router.replace("/onboarding"); return; }
        const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
        const saved = initialChildren.find(c => c.id === savedId) ?? initialChildren[0];
        await select(saved, initialChildren);
        return;
      }

      // Fire auth validation, parent-row upsert, and children fetch all in parallel.
      // All three internally call auth.getUser() which the Supabase client deduplicates.
      const [{ data: { user } }, , list] = await Promise.all([
        supabase.auth.getUser(),
        ensureParentRow(),
        getChildren(),
      ]);
      if (!user) { router.replace("/loginpage"); return; }
      setChildren(list);
      getActiveSubscription(user.id).then(async (sub) => {
        subscriptionLoadedRef.current = true;
        setHasSubscription(!!sub);
        if (sub?.payment_provider === "trial" && sub.current_period_end) {
          setIsTrial(true);
          const msLeft = new Date(sub.current_period_end).getTime() - Date.now();
          setTrialDaysLeft(Math.max(0, Math.ceil(msLeft / 86_400_000)));
        } else if (!sub) {
          const dismissed = typeof window !== "undefined"
            && localStorage.getItem("nimipiko_trial_expiry_seen") === "1";
          if (!dismissed) {
            const { data } = await supabase
              .from("nimipiko_subscriptions")
              .select("id")
              .eq("parent_id", user.id)
              .eq("payment_provider", "trial")
              .eq("status", "expired")
              .limit(1)
              .maybeSingle();
            if (data) setTrialJustExpired(true);
          }
        }
      }).catch(() => { subscriptionLoadedRef.current = true; }); // failure → treat as free plan
      if (list.length === 0) { router.replace("/onboarding"); return; }
      const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
      const saved   = list.find(c => c.id === savedId) ?? list[0];
      await select(saved, list);
    } catch (err) {
      console.error("[home] init failed:", err);
      setInitError(true);
      setLoading(false);
    }
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
    const gen = ++selectGenRef.current;
    setActiveChild(child);
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

    try {
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
      // Discard if a newer child selection was triggered while we were fetching
      if (gen !== selectGenRef.current) return;
      const { usedDates: homeDates1 } = await resolveShields(child.id, child.language, actDates);
      if (gen !== selectGenRef.current) return;
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
          if (gen !== selectGenRef.current) return;
          setSlots(freshSlots);
          saveHomeSnapshot(snapshotKey, { stories: lib, slots: freshSlots, level: lvl,
            totalStars: stars, weekStreak: streak, achievements: ach,
            consecutiveStreak: cStreak, popularStories: popular, cosmetics: cos });
        }).catch(() => {});
      } else {
        setSlots([]);
        saveHomeSnapshot(snapshotKey, { stories: lib, slots: [], level: lvl,
          totalStars: stars, weekStreak: streak, achievements: ach,
          consecutiveStreak: cStreak, popularStories: popular, cosmetics: cos });
      }

      // Community creations — best-effort, never blocks
      void loadCommunityCreations();
    } catch (err) {
      console.error("[home] select failed:", err);
      // Restore picker so the user can choose again rather than getting a stuck skeleton
      setActiveChild(null);
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function silentRefresh(child: Child) {
    if (silentRefreshingRef.current) return;
    silentRefreshingRef.current = true;
    setRefreshing(true);
    try {
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
    const cur = lib.find(s => s.unlocked && !s.complete) ?? lib[0];
    const snapshotKey = `nimipiko_home_${child.id}_${lang}`;
    if (cur) {
      getStorySlots(child.id, cur.sid, lang).then(freshSlots => {
        setSlots(freshSlots);
        saveHomeSnapshot(snapshotKey, { stories: lib, slots: freshSlots, level: lvl,
          totalStars: stars, weekStreak: streak, achievements: ach,
          consecutiveStreak: cStreak, popularStories: popular, cosmetics: cos });
      }).catch(() => {});
    } else {
      setSlots([]);
      saveHomeSnapshot(snapshotKey, { stories: lib, slots: [], level: lvl,
        totalStars: stars, weekStreak: streak, achievements: ach,
        consecutiveStreak: cStreak, popularStories: popular, cosmetics: cos });
    }
    } finally {
      setRefreshing(false);
      silentRefreshingRef.current = false;
    }
  }

  async function handleCreated(child: Child) {
    setNoChildrenYet(false);
    await select(child, [...children, child]);
  }

  if (initError) return (
    <AppShell>
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="text-5xl leading-none">😕</span>
        <div>
          <p className="font-baloo font-black text-[var(--ds-text-primary)] text-xl mb-1">Couldn&apos;t load your dashboard</p>
          <p className="font-nunito text-[var(--ds-text-secondary)] text-sm">Check your connection and try again.</p>
        </div>
        <button
          onClick={() => { setInitError(false); setLoading(true); void init(); }}
          className="font-baloo font-black px-8 py-3.5 leaf shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all"
          style={{ background: "linear-gradient(135deg,var(--ds-brand-primary),var(--ds-brand-hover))", color: "var(--ds-nav-bg)", boxShadow: "var(--ds-shadow-cta)" }}
        >
          Try Again
        </button>
      </div>
    </AppShell>
  );

  if (noChildrenYet) { router.replace("/onboarding"); return null; }

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

  const curStory         = stories.find(s => s.unlocked && !s.complete) ?? stories[0];
  // First premium-locked story — used as a Club upsell when a free user has finished all free stories
  const nextPremiumStory = !hasSubscription && !stories.find(s => s.unlocked && !s.complete)
    ? (stories.find(s => !s.unlocked && !s.is_free) ?? null)
    : null;
  const doneSlots  = slots.filter(s => s.completed).length;
  const totalSlots = slots.length;
  const pct        = totalSlots > 0 ? Math.round((doneSlots / totalSlots) * 100) : 0;
  const xp         = totalStars;
  // Derive star-level: first bucket whose maxXp >= stars; -1 means stars exceeds all → last level.
  const xpLvlIdxFinal = (() => {
    const i = LEVELS.findIndex(l => xp <= l.maxXp);
    return i === -1 ? LEVELS.length - 1 : i;
  })();
  const levelInfo  = LEVELS[xpLvlIdxFinal];
  const prevMax    = xpLvlIdxFinal > 0 ? LEVELS[xpLvlIdxFinal - 1].maxXp : 0;
  const xpIn       = Math.max(0, xp - prevMax);
  const xpNeeded   = levelInfo.maxXp - prevMax;
  const xpPct      = Math.min(100, Math.round((xpIn / xpNeeded) * 100));
  const xpLevel    = xpLvlIdxFinal + 1;
  // 0 = Mon … 6 = Sun, matching the weekStreak array order
  const todayIdx  = (new Date().getDay() + 6) % 7;

  // The desktop dashboard is deliberately composed as one travel-desk grid:
  // content and live data stay here; visual layout lives in the focused view.
  if (!loading) {
    return (
      <AppShell>
        <RefreshingBadge show={refreshing} />
        <HomeAirwaysDashboard
          childName={activeChild?.name ?? "Explorer"}
          themeId={themeId}
          greeting={greeting}
          stories={stories}
          curStory={curStory}
          slots={slots}
          doneSlots={doneSlots}
          totalSlots={totalSlots}
          progress={pct}
          totalStars={totalStars}
          streak={consecutiveStreak}
          stampsCollected={achievements.filter((achievement) => achievement.type === "badge").length}
          hasSubscription={hasSubscription}
          nextPremiumStory={nextPremiumStory}
        />
        {welcomeBack.show && activeChild && (
          <WelcomeBackOverlay childName={activeChild.name} daysAway={welcomeBack.daysAway} onDismiss={() => setWelcomeBack({ show: false, daysAway: 0 })} />
        )}
        {activeChild && <NotificationOptInPrompt childId={activeChild.id} childName={activeChild.name} />}
        <AnimatePresence>
          {langToast && (
            <InlineToast key={`lang-toast-${langToastKey.current}`} message={langToast} onDone={() => setLangToast(null)} />
          )}
        </AnimatePresence>
      </AppShell>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════ */
  return (
    <AppShell>
      <RefreshingBadge show={refreshing} />
      {loading ? (
        <>
          <div className="min-h-screen pb-24">
            <Bone className="w-full rounded-none" style={{ height: 380 }} />
            <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6 flex flex-col xl:flex-row gap-6">
              <div className="flex-1 min-w-0 space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-[40%_1fr] gap-5">
                  <Bone className="h-[340px] leaf-lg" />
                  <Bone className="h-[340px] leaf-lg" />
                </div>
              </div>
              <div className="w-full xl:w-[284px] xl:shrink-0 space-y-4">
                <Bone className="h-[180px] leaf-lg" />
                <Bone className="h-[220px] leaf-lg" />
                <Bone className="h-[140px] leaf-lg" />
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className={`min-h-screen content-enter transition-opacity duration-300${refreshing ? " opacity-50 pointer-events-none" : ""}`} style={{ background: "#F5F0E6" }}>

          {/* ════════════════════════════════ HERO ══════════════════════════ */}
          <motion.div
            initial="hidden" animate="visible" variants={stagger}
            className="relative">

            {/* ═══════════════════════ HERO: WORLD STAGE ═══════════════════════ */}
            <div className="relative overflow-hidden" style={{ minHeight: 520 }}>

              {/* ── AIRWAYS: Airport scene — real image ── */}
              <div aria-hidden="true" className="absolute inset-0 pointer-events-none select-none">
                {/* Photo background — covers full hero */}
                <img
                  src="/airport-hero.png"
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ objectPosition: "center bottom" }}
                />
                {/* Very light vignette left — just enough to keep boarding pass readable */}
                <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(6,16,31,0.28) 0%, rgba(6,16,31,0.06) 38%, transparent 58%)" }} />
                {/* Bottom fade to page cream */}
                <div className="absolute inset-x-0 bottom-0" style={{ height: 80, background: "linear-gradient(to top, #F5F0E6, transparent)" }} />
              </div>{/* end airport scene */}



              {/* ══════════════════════════════════════════════════════════════
                   Layer 3 — CONTENT: greeting left, characters right
              ══════════════════════════════════════════════════════════════ */}
              <div className="relative z-10 flex flex-col md:flex-row md:items-end px-6 sm:px-10 lg:px-14 pb-10 pt-8 max-w-[1400px] mx-auto min-h-[420px] gap-3 justify-between">

                {/* ── LEFT: Greeting text ────────────────────────────────── */}
                <motion.div variants={up} className="flex flex-col justify-end pb-2 max-w-[380px]">
                  {/* Sparkle + time-of-day */}
                  <p className="font-baloo font-bold text-base drop-shadow" style={{ color: "white", textShadow: "0 1px 6px rgba(0,0,0,0.45)" }}>
                    {greeting},
                  </p>
                  {/* Name */}
                  <h1 className="font-baloo font-black leading-none drop-shadow" style={{ fontSize: "clamp(2.4rem,5.5vw,3.5rem)", color: "#14233B", textShadow: "0 2px 12px rgba(255,255,255,0.70)" }}>
                    {activeChild?.name ?? "Explorer"}! <span className="inline-block animate-bounce" style={{ animationDuration: "2s" }}>⭐</span>
                  </h1>
                  {/* Subtitle */}
                  <p className="font-baloo font-bold text-lg mt-1 drop-shadow" style={{ color: "#14233B", textShadow: "0 1px 8px rgba(255,255,255,0.60)" }}>
                    Where shall we fly today?
                  </p>
                </motion.div>

                {/* ── RIGHT: Characters on world stage ──────────────────── */}
                <motion.div variants={up} className="relative flex flex-1 items-end justify-end self-stretch shrink-0">
                  {/* Stage spotlight — gold runway glow rising from ground */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[340px] sm:w-[440px] h-[110px] pointer-events-none"
                    style={{ background: "radial-gradient(ellipse 70% 60% at 50% 100%, rgba(201,168,76,0.35) 0%, rgba(201,168,76,0.08) 50%, transparent 75%)" }} />

                  {/* NIMI with outfit badge */}
                  <div className="relative">
                    <motion.img src={`/themes/${themeId}/characters/nimi.png`} alt="Nimi"
                    className="h-[170px] sm:h-[205px] lg:h-[235px] w-auto object-contain drop-shadow-2xl select-none"
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
                    className="h-[155px] sm:h-[185px] lg:h-[215px] w-auto object-contain drop-shadow-2xl select-none"
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

                  {/* ZILO */}
                  <motion.img src={`/themes/${themeId}/characters/zilo.png`} alt="Zilo"
                    className="h-[160px] sm:h-[195px] lg:h-[225px] w-auto object-contain drop-shadow-2xl select-none"
                    animate={{ y: [0, -8, 0] }} transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </motion.div>

              </div>{/* end content */}

              {/* ── Transition: tarmac → cream page ─────────────────────── */}
              <div aria-hidden="true" className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none" style={{ lineHeight: 0 }}>
                <svg viewBox="0 0 1440 56" xmlns="http://www.w3.org/2000/svg" className="w-full block" preserveAspectRatio="none">
                  <path d="M0,20 C360,44 720,4 1080,28 C1260,40 1380,14 1440,22 L1440,56 L0,56 Z" fill="rgba(205,198,188,0.45)" />
                  <path d="M0,34 C240,52 540,16 840,36 C1080,52 1320,22 1440,38 L1440,56 L0,56 Z" fill="rgba(220,213,202,0.72)" />
                  <path d="M0,46 C300,28 600,56 900,40 C1100,30 1280,52 1440,44 L1440,56 L0,56 Z" fill="#F5F0E6" />
                </svg>
              </div>

            </div>{/* end hero card */}
          </motion.div>

          {/* ── Quick Actions row ────────────────────────────────────────── */}
          <div className="relative z-30 px-5 sm:px-8 lg:px-10 pt-4 pb-2 max-w-[1400px] mx-auto">
            <HomeQuickActions curStorySlug={curStory?.slug} />
          </div>

          {/* ════════════════ BELOW HERO ════════════════ */}
          <div className="px-5 sm:px-8 lg:px-10 pb-6 pt-2 max-w-[1400px] mx-auto flex flex-col gap-4">

            {/* Trial-expired banner */}
            {trialJustExpired && (
              <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl px-4 py-3.5 shadow-sm">
                  <span className="text-2xl shrink-0">⏳</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-baloo font-black text-amber-900 text-sm leading-tight">Your 7-day free trial has ended</p>
                    <p className="text-amber-700 text-xs mt-0.5">
                      You&apos;re now on the free plan — 3 stories & 10 Nimi chats/day.{" "}
                      <Link href="/pricing" className="font-black underline underline-offset-2 hover:text-amber-900">Subscribe to restore full access →</Link>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (typeof window !== "undefined") localStorage.setItem("nimipiko_trial_expiry_seen", "1");
                      setTrialJustExpired(false);
                    }}
                    className="w-7 h-7 rounded-full hover:bg-amber-100 flex items-center justify-center text-amber-500 hover:text-amber-700 transition shrink-0 text-base font-black"
                    aria-label="Dismiss"
                  >✕</button>
                </div>
              </motion.div>
            )}

            {/* 3-column cards row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <HomeContinueAdventureCard
                curStory={curStory}
                slots={slots}
                doneSlots={doneSlots}
                totalSlots={totalSlots}
                pct={pct}
                storyNumber={(stories.findIndex((s) => s.sid === curStory?.sid) + 1) || 1}
                hasSubscription={hasSubscription}
              />
              <HomePassportCard
                stampsCollected={achievements.filter((a) => a.type === "badge").length}
                totalStamps={42}
                destinationsVisited={stories.filter((s) => s.complete).length}
              />
              <HomeTodayStarsCard
                totalStars={totalStars}
                consecutiveStreak={consecutiveStreak}
              />
            </div>

            {/* Proactive Nimi Banner */}
            {activeChild && (
              <NimiProactiveBanner childId={activeChild.id} language={activeChild.language} />
            )}

            {/* "Caught up" banner — shown when no more stories unlocked */}
            {stories.length > 0 && stories.every((s) => s.complete || !s.unlocked) && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="relative rounded-3xl overflow-hidden"
                style={{ background: "linear-gradient(135deg, #E8F4FF 0%, #D6EAFF 50%, #EBF5FF 100%)", border: "1px solid rgba(59,130,246,0.18)", minHeight: 140 }}
              >
                {/* Floating islands illustration — colourful sky background */}
                <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #87CEEB 0%, #98D8F0 40%, #B0E4FF 70%, #C8EDFF 100%)" }} />
                {/* Clouds */}
                {[[8,12,70,28],[22,35,50,22],[55,8,60,24],[70,28,45,18]].map(([l,t,w,h],i) => (
                  <div key={i} className="absolute rounded-full" style={{ left:`${l}%`, top:`${t}%`, width:w, height:h, background:"rgba(255,255,255,0.80)" }} />
                ))}
                {/* Green islands */}
                <div className="absolute bottom-0 left-[8%] w-24 h-16 rounded-t-full" style={{ background: "linear-gradient(to top, #5BA85A, #7EC87D)" }} />
                <div className="absolute bottom-0 left-[18%] w-16 h-10 rounded-t-full" style={{ background: "linear-gradient(to top, #4A9649, #6DB86C)" }} />
                <div className="absolute bottom-0 right-[5%] w-32 h-20 rounded-t-full" style={{ background: "linear-gradient(to top, #5BA85A, #7EC87D)" }} />
                {/* Flying plane */}
                <motion.span className="absolute text-2xl" style={{ top: "15%", left: "60%" }}
                  animate={{ x: [0, 30, 0], y: [0, -6, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>✈️</motion.span>

                {/* Text content */}
                <div className="relative z-10 flex items-center justify-between px-8 py-6">
                  <div>
                    <p className="font-baloo font-black text-xl md:text-2xl" style={{ color: "#0D2D6B" }}>
                      🎉 You&apos;re all caught up, {activeChild?.name ?? "Explorer"}!
                    </p>
                    <p className="font-nunito text-sm mt-1" style={{ color: "rgba(13,45,107,0.65)" }}>
                      You&apos;ve explored every destination in the library so far — more adventures are on the way!
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Trial countdown */}
            {isTrial && (
              <Link href="/pricing">
                <div className="flex items-center gap-3 rounded-2xl p-4 cursor-pointer transition-all"
                  style={{
                    background: trialDaysLeft <= 2 ? "linear-gradient(135deg,rgba(239,68,68,0.10),rgba(220,38,38,0.06))" : "linear-gradient(135deg,rgba(201,168,76,0.10),rgba(201,168,76,0.05))",
                    border: trialDaysLeft <= 2 ? "1px solid rgba(239,68,68,0.22)" : "1px solid rgba(201,168,76,0.22)",
                  }}
                >
                  <span className="text-xl shrink-0">{trialDaysLeft <= 2 ? "⚡" : "⏳"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-baloo font-black text-sm" style={{ color: "#14233B" }}>
                      {trialDaysLeft === 0 ? "Trial ending today!" : `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left on trial`}
                    </p>
                    <p className="font-nunito text-xs mt-0.5" style={{ color: "rgba(20,35,59,0.52)" }}>
                      {trialDaysLeft <= 2 ? "Subscribe now to keep full access" : "Subscribe to continue flying →"}
                    </p>
                  </div>
                  <Crown className="w-4 h-4 shrink-0" style={{ color: trialDaysLeft <= 2 ? "#F87171" : "#C9A84C" }} />
                </div>
              </Link>
            )}

          </div>{/* end below hero */}

        </div>
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

      <AnimatePresence>
        {langToast && (
          <InlineToast key={`lang-toast-${langToastKey.current}`} message={langToast} onDone={() => setLangToast(null)} />
        )}
      </AnimatePresence>
    </AppShell>
  );
}
